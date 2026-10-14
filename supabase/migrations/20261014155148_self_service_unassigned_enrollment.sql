-- Unapplied development candidate. No hosted migration or enrollment activation.
begin;
create table app_private.enrollment_settings (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 allowed_emails text[] not null default '{}', allowed_email_domains text[] not null default '{}',
 allow_any_email boolean not null default false
);
insert into app_private.enrollment_settings(singleton,enabled) values(true,false);
create table app_private.self_service_enrollments (
 member_id uuid primary key references public.members on delete restrict,
 created_at timestamptz not null default clock_timestamp(), reviewed_at timestamptz,
 reviewed_by uuid references public.members on delete restrict,
 decision text not null default 'pending' check(decision in ('pending','assigned','rejected'))
);
alter table app_private.enrollment_settings enable row level security;
alter table app_private.self_service_enrollments enable row level security;
revoke all on app_private.enrollment_settings,app_private.self_service_enrollments from public,anon,authenticated;
grant select on app_private.enrollment_settings to service_role;
create function public.self_service_signup_enabled() returns boolean language sql stable security invoker set search_path='' as $$
 select enabled from app_private.enrollment_settings where singleton
$$;
revoke all on function public.self_service_signup_enabled() from public,anon,authenticated;
grant execute on function public.self_service_signup_enabled() to service_role;

-- This helper authenticates own-record access only. Organizational/module authority
-- continues to use current_member_id(), which still requires ACTIVE membership.
create function app_private.own_account_member_id() returns uuid language sql stable security definer set search_path='' as $$
 select l.member_id from app_private.account_links l join public.members m on m.id=l.member_id
 join auth.users u on u.id=l.auth_user_id
 join auth.sessions s on s.user_id=l.auth_user_id and s.id::text=(auth.jwt()->>'session_id')
 where l.auth_user_id=(select auth.uid()) and u.email_confirmed_at is not null
 and l.enabled and l.technical_enabled and m.status in ('active','intake')
 and s.created_at>=l.session_valid_after and (s.not_after is null or s.not_after>now()) limit 1
$$;
create or replace function public.my_membership_id() returns uuid language sql stable security invoker set search_path='' as $$select app_private.own_account_member_id()$$;
create or replace function public.resolve_login_identifier(p_identifier text) returns text language sql stable security invoker set search_path='' as $$
 select u.email from app_private.account_links l join public.members m on m.id=l.member_id join auth.users u on u.id=l.auth_user_id
 where l.enabled and l.technical_enabled and m.status in ('active','intake') and (l.username=lower(btrim(p_identifier)) or lower(u.email)=lower(btrim(p_identifier))) limit 1
$$;
create policy own_unassigned_name on public.members for select to authenticated using(id=(select app_private.own_account_member_id()));
create policy own_unassigned_placements on public.member_placements for select to authenticated using(member_id=(select app_private.own_account_member_id()));

create function app_private.complete_self_service_enrollment(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
 declare mid uuid; email_address text; now_at timestamptz:=clock_timestamp();
 begin
 perform pg_advisory_xact_lock(741085);
 -- Check the real Auth row and session, never user-editable authorization metadata.
 select lower(u.email) into email_address from auth.users u join auth.sessions s on s.user_id=u.id
 where u.id=auth.uid() and u.email_confirmed_at is not null and u.email is not null
 and s.id::text=(auth.jwt()->>'session_id') and (s.not_after is null or s.not_after>now());
 if email_address is null then raise exception 'Verified email and current session required' using errcode='42501'; end if;
 select member_id into mid from app_private.account_links where auth_user_id=auth.uid();
 if mid is not null then
  if app_private.own_account_member_id() is null then raise exception 'Account unavailable' using errcode='42501'; end if;
  return mid;
 end if;
 if not coalesce((select enabled from app_private.enrollment_settings where singleton),false) then raise exception 'Self-service signup is disabled' using errcode='42501'; end if;
 if not exists(select 1 from app_private.enrollment_settings where singleton and (allow_any_email or email_address=any(allowed_emails) or split_part(email_address,'@',2)=any(allowed_email_domains))) then raise exception 'Email is outside the approved enrollment scope' using errcode='42501'; end if;
 if p_name is null or length(btrim(p_name)) not between 2 and 120 then raise exception 'Name required' using errcode='22023'; end if;
 -- An email already associated with a record uses invitation/verification instead.
 -- Never auto-match by a name or silently replace a link.
 if exists(select 1 from app_private.member_private_contacts where lower(email)=email_address)
 or exists(select 1 from app_private.invitations where expected_email=email_address and consumed_at is null and revoked_at is null and expires_at>now())
 or exists(select 1 from app_private.access_requests where lower(requested_email)=email_address and status='approved') then
  raise exception 'Use the verified existing-record invitation workflow' using errcode='42501';
 end if;
 mid:=gen_random_uuid();
 insert into public.members(id,display_name,status) values(mid,btrim(p_name),'intake');
 -- Internal unique identifier, not a chosen login username. Email is the signup login.
 insert into app_private.account_links(member_id,auth_user_id,username) values(mid,auth.uid(),'m_'||left(replace(mid::text,'-',''),28));
 insert into app_private.member_private_contacts(member_id,email) values(mid,email_address);
 insert into app_private.self_service_enrollments(member_id) values(mid);
 insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,after_state)
 values(mid,auth.uid(),'enrollment.created',mid,'Email confirmed; awaiting independent membership verification',jsonb_build_object('status','intake','placement',null));
 return mid;
 end $$;
create function public.complete_self_service_enrollment(p_name text) returns uuid language sql security invoker set search_path='' as $$select app_private.complete_self_service_enrollment(p_name)$$;

-- A minimized own-record projection for intake, plus an explicit organizational queue.
create function app_private.enrollment_projection() returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare mid uuid:=app_private.own_account_member_id(); result_data jsonb;
 begin
 if mid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select jsonb_build_object('self',jsonb_build_object('id',m.id,'name',m.display_name,'status',m.status,'groupId',p.group_id,'unitId',p.unit_id),
 'enrollment',jsonb_build_object('state',case when m.status='intake' then 'unassigned' else 'assigned' end,
 'placementHistory',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'startedAt',h.started_at,'endedAt',h.ended_at,'reason',h.reason) order by h.started_at desc) from public.member_placements h where h.member_id=mid),'[]'::jsonb)),
 'unassignedMembers',case when app_private.org_authority(app_private.current_member_id()) then coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.display_name,'email',c.email,'createdAt',e.created_at) order by e.created_at)
 from public.members x join app_private.self_service_enrollments e on e.member_id=x.id left join app_private.member_private_contacts c on c.member_id=x.id where x.status='intake' and e.decision='pending'),'[]'::jsonb) else '[]'::jsonb end)
 into result_data from public.members m left join public.member_placements p on p.member_id=m.id and p.ended_at is null where m.id=mid;
 return result_data;
 end $$;
create or replace function public.member_workspace() returns jsonb language plpgsql stable security invoker set search_path='' as $$
 declare mid uuid:=app_private.own_account_member_id(); base_data jsonb;
 begin
 if mid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if app_private.current_member_id() is not null then
  base_data:=app_private.member_workspace()||jsonb_build_object('onboarding',app_private.onboarding_workspace());
 else
  base_data:=jsonb_build_object('permissions',jsonb_build_object('organization',false,'memberManagement',false,'departmentAdmin',false,'technical',false),
  'contacts',app_private.own_enrollment_contacts(),'directory','[]'::jsonb,'managedMembers','[]'::jsonb,'categories','[]'::jsonb,'groups','[]'::jsonb,'units','[]'::jsonb,'departments','[]'::jsonb,'appointments','[]'::jsonb,'transfers','[]'::jsonb,
  'audit',app_private.own_enrollment_audit(),'onboarding',jsonb_build_object('requests','[]'::jsonb,'invitations','[]'::jsonb,'accounts','[]'::jsonb,'linkedMemberIds','[]'::jsonb));
 end if;
 return base_data||app_private.enrollment_projection();
 end $$;
-- Private helpers expose only the authenticated person's contacts and own history.
create function app_private.own_enrollment_contacts() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('email',email,'phone',phone) from app_private.member_private_contacts where member_id=app_private.own_account_member_id()),'{}'::jsonb)
$$;
create function app_private.own_enrollment_audit() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_agg(row_to_json(x)) from (select id,occurred_at as "at",operation as action,target_member_id as "memberId",reason from app_private.audit_events where target_member_id=app_private.own_account_member_id() order by id desc limit 30)x),'[]'::jsonb)
$$;

-- Initial placement and verification are one serialized, audited transaction.
-- Unit/group leaders have no global authority over an unassigned queue.
create function app_private.enrollment_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare actor uuid; target uuid; dest uuid; grp uuid; why text; key text; val jsonb; out_data jsonb; receipt app_private.command_receipts%rowtype; now_at timestamptz:=clock_timestamp();
 begin
 perform pg_advisory_xact_lock(741085);actor:=app_private.current_member_id();
 if actor is null or not app_private.org_authority(actor) then raise exception 'Organizational membership authority required' using errcode='42501'; end if;
 if p_action not in ('enrollment.assign','enrollment.reject') or p_action is null or p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then raise exception 'Invalid command' using errcode='22023'; end if;
 for key,val in select * from jsonb_each(p_payload) loop
  if not(key=any(case when p_action='enrollment.assign' then array['memberId','unitId','verified','reason'] else array['memberId','reason'] end)) or jsonb_typeof(val)<>'string' or length(val#>>'{}')>500 then raise exception 'Invalid command fields' using errcode='22023'; end if;
 end loop;
 select * into receipt from app_private.command_receipts where actor_member_id=actor and request_id=p_request_id;
 if found then
  if receipt.action<>p_action or receipt.payload_hash<>md5(p_payload::text) then raise exception 'Request ID reused' using errcode='22023'; end if;
  return receipt.result;
 end if;
 why:=btrim(p_payload->>'reason');target:=(p_payload->>'memberId')::uuid;
 if why is null or length(why) not between 5 and 500 then raise exception 'Document verification or rejection' using errcode='22023'; end if;
 perform 1 from public.members m join app_private.self_service_enrollments e on e.member_id=m.id
 where m.id=target and m.status='intake' and e.decision='pending' for update;
 if not found then raise exception 'Enrollment already reviewed or unavailable' using errcode='22023'; end if;
 if exists(select 1 from public.member_placements where member_id=target and ended_at is null) then raise exception 'Enrollment already placed' using errcode='23514'; end if;
 if p_action='enrollment.assign' then
  if (p_payload->>'verified') is distinct from 'yes' then raise exception 'Independent identity verification required' using errcode='22023'; end if;
  dest:=(p_payload->>'unitId')::uuid;
  select u.group_id into grp from public.church_units u join public.church_groups g on g.id=u.group_id join public.age_categories c on c.id=g.age_category_id where u.id=dest and u.is_active and g.is_active and c.is_active;
  if grp is null or not app_private.manages_unit(actor,dest) then raise exception 'Active authorized placement required' using errcode='42501'; end if;
  insert into public.member_placements(member_id,group_id,unit_id,started_at,reason) values(target,grp,dest,now_at,why);
  update public.members set status='active',updated_at=now_at where id=target;
  update app_private.self_service_enrollments set decision='assigned',reviewed_at=now_at,reviewed_by=actor where member_id=target;
  -- Do not re-enable a separately suspended account or grant any leadership/module role.
  out_data:=jsonb_build_object('ok',true,'memberId',target,'status','active','groupId',grp,'unitId',dest);
 else
  update public.members set status='inactive',updated_at=now_at where id=target;
  update app_private.account_links set enabled=false,session_valid_after=now_at where member_id=target;
  update app_private.self_service_enrollments set decision='rejected',reviewed_at=now_at,reviewed_by=actor where member_id=target;
  out_data:=jsonb_build_object('ok',true,'memberId',target,'status','inactive');
 end if;
 insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,before_state,after_state)
 values(actor,auth.uid(),p_action,target,why,jsonb_build_object('status','intake','placement',null),out_data);
 insert into app_private.command_receipts(actor_member_id,request_id,action,payload_hash,result) values(actor,p_request_id,p_action,md5(p_payload::text),out_data);
 return out_data;
 end $$;
create function public.enrollment_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.enrollment_command(p_action,p_payload,p_request_id)$$;
revoke all on function app_private.own_account_member_id(),app_private.complete_self_service_enrollment(text),public.complete_self_service_enrollment(text),app_private.enrollment_projection(),app_private.own_enrollment_contacts(),app_private.own_enrollment_audit(),app_private.enrollment_command(text,jsonb,uuid),public.enrollment_command(text,jsonb,uuid) from public,anon;
grant execute on function app_private.own_account_member_id(),app_private.complete_self_service_enrollment(text),public.complete_self_service_enrollment(text),app_private.enrollment_projection(),app_private.own_enrollment_contacts(),app_private.own_enrollment_audit(),app_private.enrollment_command(text,jsonb,uuid),public.enrollment_command(text,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
