-- Onboarding, independent technical-account controls, and catalog maintenance.
-- Apply only after the two earlier reviewed migrations; no fixture import here.
begin;
alter table app_private.account_links add column technical_enabled boolean not null default true;
alter table app_private.access_requests add column reviewed_at timestamptz, add column decision_reason text;
create unique index access_one_pending_email on app_private.access_requests(lower(requested_email)) where status='pending';
alter table app_private.invitations add column delivery_state text not null default 'pending' check(delivery_state in ('pending','sending','sent','failed')),
 add column delivery_attempt_id uuid, add column delivery_started_at timestamptz, add column delivered_at timestamptz;
create table app_private.bootstrap_receipts(singleton boolean primary key default true check(singleton),auth_user_id uuid not null,created_at timestamptz not null default now());
alter table app_private.bootstrap_receipts enable row level security;
revoke all on app_private.bootstrap_receipts from public,anon,authenticated,service_role;

create or replace function app_private.current_member_id() returns uuid language sql stable security definer set search_path='' as $$
 select l.member_id from app_private.account_links l join public.members m on m.id=l.member_id
 join auth.sessions s on s.user_id=l.auth_user_id and s.id::text=(auth.jwt()->>'session_id')
 where l.auth_user_id=(select auth.uid()) and l.enabled and l.technical_enabled and m.status='active'
 and s.created_at>=l.session_valid_after and (s.not_after is null or s.not_after>now()) limit 1
$$;
create or replace function public.resolve_login_identifier(p_identifier text) returns text language sql stable security invoker set search_path='' as $$
 select u.email from app_private.account_links l join public.members m on m.id=l.member_id join auth.users u on u.id=l.auth_user_id
 where l.enabled and l.technical_enabled and m.status='active' and (l.username=lower(btrim(p_identifier)) or lower(u.email)=lower(btrim(p_identifier))) limit 1
$$;
create or replace function public.submit_access_request(p_email text,p_name text) returns void language plpgsql security invoker set search_path='' as $$
 begin
 if p_email is null or length(p_email)>254 or btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_name is null or length(btrim(p_name)) not between 2 and 120 then raise exception 'Invalid request' using errcode='22023'; end if;
 insert into app_private.access_requests(requested_email,claimed_name) values(lower(btrim(p_email)),btrim(p_name)) on conflict(lower(requested_email)) where status='pending' do nothing;
 end $$;

create function app_private.onboarding_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare a uuid:=app_private.current_member_id(); result_data jsonb;
 begin
 if a is null then raise exception 'Not authorized' using errcode='42501'; end if;
 select jsonb_build_object(
 'requests',case when app_private.org_authority(a) then coalesce((select jsonb_agg(row_to_json(r)) from
  (select id,claimed_name as name,requested_email as email,status,matched_member_id as "memberId",created_at as "createdAt",decision_reason as reason from app_private.access_requests order by created_at desc limit 100) r),'[]'::jsonb) else '[]'::jsonb end,
 'invitations',coalesce((select jsonb_agg(row_to_json(i)) from (select id,member_id as "memberId",expected_email as email,delivery_state as delivery,expires_at as "expiresAt",consumed_at as "consumedAt",revoked_at as "revokedAt" from app_private.invitations where app_private.manages_member(a,member_id) order by created_at desc limit 100) i),'[]'::jsonb),
 'accounts',case when app_private.actor_has(a,'technical_admin') then coalesce((select jsonb_agg(jsonb_build_object('memberId',member_id,'username',username,'enabled',technical_enabled)) from app_private.account_links),'[]'::jsonb) else '[]'::jsonb end,
 'linkedMemberIds',coalesce((select jsonb_agg(member_id) from app_private.account_links where app_private.manages_member(a,member_id)),'[]'::jsonb)
 ) into result_data;
 return result_data;
 end $$;
create or replace function public.member_workspace() returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.member_workspace()||jsonb_build_object('onboarding',app_private.onboarding_workspace())
$$;

create function app_private.admin_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare a uuid; r text; k text; v jsonb; allowed text[]; t uuid; item_id uuid; kind text; request_row app_private.access_requests%rowtype;
 receipt app_private.command_receipts%rowtype; out_data jsonb:='{}'; dept_scope uuid; desired boolean;
 begin
 perform pg_advisory_xact_lock(741085);a:=app_private.current_member_id();
 if a is null then raise exception 'Not authorized' using errcode='42501';end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then raise exception 'Invalid command' using errcode='22023';end if;
 allowed:=case p_action when 'access.review' then array['id','memberId','decision','verified','reason'] when 'invitation.revoke' then array['id','reason'] when 'account.access' then array['memberId','enabled','reason'] when 'organization.rename' then array['id','kind','name','reason'] when 'organization.archive' then array['id','kind','reason'] end;
 if allowed is null then raise exception 'Unknown command' using errcode='22023';end if;
 for k,v in select * from jsonb_each(p_payload) loop if not(k=any(allowed)) or jsonb_typeof(v)<>'string' or length(v#>>'{}')>500 then raise exception 'Invalid fields' using errcode='22023';end if;end loop;
 select * into receipt from app_private.command_receipts where actor_member_id=a and request_id=p_request_id;
 if found then if receipt.action<>p_action or receipt.payload_hash<>md5(p_payload::text) then raise exception 'Request ID reused' using errcode='22023';end if;return receipt.result;end if;
 r:=btrim(p_payload->>'reason');if r is null or length(r) not between 5 and 500 then raise exception 'Meaningful reason required' using errcode='22023';end if;
 t:=nullif(p_payload->>'memberId','')::uuid;item_id:=nullif(p_payload->>'id','')::uuid;
 if p_action='access.review' then
  if not app_private.org_authority(a) then raise exception 'Organizational review authority required' using errcode='42501';end if;
  select * into request_row from app_private.access_requests where id=item_id for update;
  if request_row.id is null or request_row.status<>'pending' then raise exception 'Request already reviewed or unavailable' using errcode='22023';end if;
  if p_payload->>'decision'='approved' then
   if (p_payload->>'verified') is distinct from 'yes' or not exists(select 1 from public.members where id=t and status='active') or exists(select 1 from app_private.account_links where member_id=t) then raise exception 'Verify identity and match one active, unlinked member' using errcode='22023';end if;
   update app_private.access_requests set status='approved',matched_member_id=t,reviewed_by=a,reviewed_at=clock_timestamp(),decision_reason=r where id=item_id;
  elsif p_payload->>'decision'='rejected' then t:=null;update app_private.access_requests set status='rejected',reviewed_by=a,reviewed_at=clock_timestamp(),decision_reason=r where id=item_id;
  else raise exception 'Invalid decision' using errcode='22023';end if;
  out_data:=jsonb_build_object('id',item_id,'status',p_payload->>'decision');
 elsif p_action='invitation.revoke' then
  select member_id into t from app_private.invitations where id=item_id and consumed_at is null for update;
  if t is null or not app_private.manages_member(a,t) then raise exception 'Not authorized' using errcode='42501';end if;
  update app_private.invitations set revoked_at=clock_timestamp() where id=item_id;
  out_data:=jsonb_build_object('id',item_id,'revoked',true);
 elsif p_action='account.access' then
  if not app_private.actor_has(a,'technical_admin') or t=a then raise exception 'Separate technical authority required; no self-suspension' using errcode='42501';end if;
  if p_payload->>'enabled' not in ('true','false') or not(p_payload?'enabled') then raise exception 'Invalid account state' using errcode='22023';end if;
  desired:=(p_payload->>'enabled')::boolean;
  update app_private.account_links set technical_enabled=desired,session_valid_after=clock_timestamp() where member_id=t;
  if not found then raise exception 'Account unavailable' using errcode='22023';end if;
  out_data:=jsonb_build_object('enabled',desired);
 else
  kind:=p_payload->>'kind';
  if kind='department' then
   if not app_private.actor_has(a,'department_administrator') then raise exception 'Separate department authority required' using errcode='42501';end if;dept_scope:=item_id;
  elsif kind in ('category','group','unit') then
   if not app_private.org_authority(a) then raise exception 'Organizational authority required' using errcode='42501';end if;
  else raise exception 'Invalid hierarchy kind' using errcode='22023';end if;
  if p_action='organization.rename' then
   if length(btrim(p_payload->>'name')) not between 1 and 80 or not(p_payload?'name') then raise exception 'Invalid name' using errcode='22023';end if;
   if kind='category' then update public.age_categories set name=btrim(p_payload->>'name') where id=item_id and is_active;
   elsif kind='group' then update public.church_groups set name=btrim(p_payload->>'name') where id=item_id and is_active;
   elsif kind='unit' then update public.church_units set name=btrim(p_payload->>'name') where id=item_id and is_active;
   else update public.departments set name=btrim(p_payload->>'name') where id=item_id and is_active;end if;
   if not found then raise exception 'Entry unavailable' using errcode='22023';end if;
  else
   -- Do not strand active children, current placements or active appointments.
   if kind='category' then
    if exists(select 1 from public.church_groups where age_category_id=item_id and is_active) then raise exception 'Archive child groups first' using errcode='23514';end if;
    update public.age_categories set is_active=false where id=item_id;
   elsif kind='group' then
    if exists(select 1 from public.church_units where group_id=item_id and is_active) or exists(select 1 from public.member_placements where group_id=item_id and ended_at is null) or exists(select 1 from app_private.role_assignments where group_id=item_id and ended_at is null) then raise exception 'Move placements and end appointments before archival' using errcode='23514';end if;
    update public.church_groups set is_active=false where id=item_id;
   elsif kind='unit' then
    if exists(select 1 from public.member_placements where unit_id=item_id and ended_at is null) or exists(select 1 from app_private.role_assignments where unit_id=item_id and ended_at is null) then raise exception 'Move placements and end appointments before archival' using errcode='23514';end if;
    update public.church_units set is_active=false where id=item_id;
   else
    if exists(select 1 from public.department_memberships where department_id=item_id and ended_at is null) or exists(select 1 from app_private.role_assignments where department_id=item_id and ended_at is null) then raise exception 'End memberships and appointments before archival' using errcode='23514';end if;
    update public.departments set is_active=false where id=item_id;
   end if;
   if not found then raise exception 'Entry unavailable' using errcode='22023';end if;
  end if;
  out_data:=jsonb_build_object('id',item_id,'kind',kind);
 end if;
 out_data:=out_data||jsonb_build_object('ok',true,'memberId',t);
 insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,after_state,department_id) values(a,auth.uid(),p_action,t,r,out_data,dept_scope);
 insert into app_private.command_receipts(actor_member_id,request_id,action,payload_hash,result) values(a,p_request_id,p_action,md5(p_payload::text),out_data);
 return out_data;
 end $$;

-- Delivery reservation is scoped to the originating caller's exact idempotent command.
create function app_private.invitation_delivery(p_request_id uuid,p_attempt_id uuid,p_state text) returns jsonb language plpgsql security definer set search_path='' as $$
 declare a uuid; invite_id uuid; i app_private.invitations%rowtype;
 begin
 perform pg_advisory_xact_lock(741085);a:=app_private.current_member_id();
 if a is null then raise exception 'Not authorized' using errcode='42501';end if;
 select (result->>'id')::uuid into invite_id from app_private.command_receipts where actor_member_id=a and request_id=p_request_id and action='invitation.create';
 select * into i from app_private.invitations where id=invite_id for update;
 if i.id is null or i.created_by<>a or not app_private.manages_member(a,i.member_id) or i.revoked_at is not null or i.consumed_at is not null or i.expires_at<=now() then raise exception 'Invitation unavailable' using errcode='42501';end if;
 if p_state='claim' then
  if i.delivery_state='sent' then return jsonb_build_object('claimed',false,'sent',true);end if;
  if i.delivery_state='sending' and i.delivery_started_at>now()-interval '2 minutes' then raise exception 'Delivery in progress' using errcode='40001';end if;
  update app_private.invitations set delivery_state='sending',delivery_attempt_id=p_attempt_id,delivery_started_at=clock_timestamp() where id=i.id;
  return jsonb_build_object('claimed',true,'email',i.expected_email,'id',i.id);
 elsif p_state in ('sent','failed') and i.delivery_attempt_id=p_attempt_id then
  update app_private.invitations set delivery_state=p_state,delivered_at=case when p_state='sent' then clock_timestamp() end where id=i.id;
  insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,after_state) values(a,auth.uid(),'invitation.delivery',i.member_id,'Invitation delivery status recorded',jsonb_build_object('id',i.id,'state',p_state));
  return jsonb_build_object('ok',true);
 else raise exception 'Invalid delivery state' using errcode='22023';end if;
 end $$;

-- Independently validate before password setting; the activation also rechecks it.
create function app_private.validate_invitation(p_digest text) returns uuid language plpgsql stable security definer set search_path='' as $$
 declare target uuid;
 begin
 if auth.uid() is null then raise exception 'Verified identity required' using errcode='42501';end if;
 select i.member_id into target from app_private.invitations i join auth.users u on u.id=auth.uid() join public.members m on m.id=i.member_id
 where i.token_digest=p_digest and lower(u.email)=i.expected_email and u.email_confirmed_at is not null and i.consumed_at is null and i.revoked_at is null and i.expires_at>now() and m.status='active' and app_private.manages_member(i.created_by,i.member_id);
 if target is null then raise exception 'Invitation unavailable' using errcode='42501';end if;return target;
 end $$;
alter function app_private.activate_invitation(text,text) rename to apply_invitation_activation;
revoke all on function app_private.apply_invitation_activation(text,text) from public,anon,authenticated;
create function app_private.activate_invitation(p_digest text,p_username text) returns uuid language plpgsql security definer set search_path='' as $$
 begin perform pg_advisory_xact_lock(741085);perform app_private.validate_invitation(p_digest);return app_private.apply_invitation_activation(p_digest,p_username);end $$;
create or replace function public.activate_invitation(p_digest text,p_username text) returns uuid language sql security invoker set search_path='' as $$select app_private.activate_invitation(p_digest,p_username)$$;

-- One-time bootstrap has no browser/API route; only a verified server operator can call it.
create function app_private.bootstrap_foundation(p_auth_user_id uuid,p_name text,p_username text,p_category text,p_group text,p_unit text,p_roles text[],p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
 declare mid uuid;cid uuid;gid uuid;uid uuid;role_name text;
 begin
 perform pg_advisory_xact_lock(741085);
 if exists(select 1 from public.members) or exists(select 1 from app_private.bootstrap_receipts) then raise exception 'Bootstrap is only for a completely empty foundation' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=p_auth_user_id and email_confirmed_at is not null) then raise exception 'Verified Auth user required' using errcode='42501';end if;
 if p_roles is null or cardinality(p_roles)=0 or not('member_administrator'=any(p_roles)) or not(p_roles<@array['member_administrator','technical_admin','department_administrator']) or length(btrim(p_reason))<10 then raise exception 'Explicit bootstrap roles and rationale required' using errcode='22023';end if;
 insert into public.age_categories(name) values(p_category) returning id into cid;
 insert into public.church_groups(age_category_id,name) values(cid,p_group) returning id into gid;
 insert into public.church_units(group_id,name) values(gid,p_unit) returning id into uid;
 insert into public.members(display_name,status) values(p_name,'active') returning id into mid;
 insert into public.member_placements(member_id,group_id,unit_id,reason) values(mid,gid,uid,p_reason);
 insert into app_private.account_links(member_id,auth_user_id,username) values(mid,p_auth_user_id,lower(p_username));
 for role_name in select distinct unnest(p_roles) loop insert into app_private.role_assignments(member_id,role_key,appointed_by) values(mid,role_name,mid);end loop;
 insert into app_private.bootstrap_receipts(auth_user_id) values(p_auth_user_id);
 insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,after_state) values(mid,p_auth_user_id,'foundation.bootstrap',mid,p_reason,jsonb_build_object('roles',p_roles));return mid;
 end $$;
create function public.bootstrap_foundation(p_auth_user_id uuid,p_name text,p_username text,p_category text,p_group text,p_unit text,p_roles text[],p_reason text) returns uuid language sql security invoker set search_path='' as $$select app_private.bootstrap_foundation(p_auth_user_id,p_name,p_username,p_category,p_group,p_unit,p_roles,p_reason)$$;
create function public.admin_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.admin_command(p_action,p_payload,p_request_id)$$;
create function public.invitation_delivery(p_request_id uuid,p_attempt_id uuid,p_state text) returns jsonb language sql security invoker set search_path='' as $$select app_private.invitation_delivery(p_request_id,p_attempt_id,p_state)$$;
create function public.validate_invitation(p_digest text) returns uuid language sql stable security invoker set search_path='' as $$select app_private.validate_invitation(p_digest)$$;
revoke all on function public.bootstrap_foundation(uuid,text,text,text,text,text,text[],text),app_private.bootstrap_foundation(uuid,text,text,text,text,text,text[],text) from public,anon,authenticated;
grant execute on function public.bootstrap_foundation(uuid,text,text,text,text,text,text[],text),app_private.bootstrap_foundation(uuid,text,text,text,text,text,text[],text) to service_role;
revoke all on function public.admin_command(text,jsonb,uuid),public.invitation_delivery(uuid,uuid,text),public.validate_invitation(text),app_private.admin_command(text,jsonb,uuid),app_private.invitation_delivery(uuid,uuid,text),app_private.validate_invitation(text),app_private.activate_invitation(text,text),app_private.onboarding_workspace() from public,anon;
grant execute on function public.admin_command(text,jsonb,uuid),public.invitation_delivery(uuid,uuid,text),public.validate_invitation(text),app_private.admin_command(text,jsonb,uuid),app_private.invitation_delivery(uuid,uuid,text),app_private.validate_invitation(text),app_private.activate_invitation(text,text),app_private.onboarding_workspace() to authenticated;
grant select(requested_email,status) on app_private.access_requests to service_role;
notify pgrst,'reload schema';
commit;
