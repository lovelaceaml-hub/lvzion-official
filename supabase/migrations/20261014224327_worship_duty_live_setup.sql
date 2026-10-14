-- Owner-only operational setup for Worship Duty. Existing Firebase remains authoritative for its own app.
-- Intended for the verified LV Zion Official owner; no member records or services are imported.
begin;
create table app_private.worship_service_editor_grants(
 member_id uuid primary key references public.members on delete restrict,
 granted_by uuid not null references public.members on delete restrict,
 granted_at timestamptz not null default clock_timestamp(),
 ended_at timestamptz
);
alter table app_private.worship_service_editor_grants enable row level security;
revoke all on app_private.worship_service_editor_grants from public,anon,authenticated,service_role;
do $owners$
declare v_owner uuid;v_count integer;
begin
 select count(*),min(l.member_id) into v_count,v_owner
 from app_private.bootstrap_receipts b
 join app_private.account_links l on l.auth_user_id=b.auth_user_id
 where l.enabled and l.technical_enabled;
 if v_count<>1 then raise exception 'Verified owner required' using errcode='42501';end if;
 if not exists(select 1 from app_private.module_access_grants g join app_private.app_modules m on m.id=g.module_id
  where g.member_id=v_owner and m.module_key='worship-duty' and g.permission='manager' and g.ended_at is null) then
  raise exception 'Worship manager grant required' using errcode='42501';
 end if;
 insert into app_private.worship_service_editor_grants(member_id,granted_by) values(v_owner,v_owner);
end $owners$;

create function app_private.worship_setup_authorized() returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from app_private.bootstrap_receipts b
 join app_private.account_links a on a.auth_user_id=b.auth_user_id
 join app_private.worship_service_editor_grants e on e.member_id=a.member_id and e.ended_at is null
 join app_private.module_access_grants g on g.member_id=a.member_id and g.permission='manager' and g.ended_at is null
 join app_private.app_modules m on m.id=g.module_id and m.module_key='worship-duty' and m.status='approved'
 where a.member_id=app_private.current_member_id() and a.enabled and a.technical_enabled
 and app_private.module_allowed(a.member_id,m.id))
$$;
revoke all on function app_private.worship_setup_authorized() from public,anon,authenticated;

create function app_private.worship_setup_workspace() returns jsonb
 language plpgsql stable security definer set search_path='' as $$
begin
 if not app_private.worship_setup_authorized() then raise exception 'Worship setup access denied' using errcode='42501';end if;
 return jsonb_build_object(
  'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'worship',s.worship_type,'period',s.period,
   'startsAt',s.begins_at,'endsAt',s.ends_at,'status',s.status,'version',s.version) order by s.begins_at,s.id)
   from (select * from app_private.worship_services where begins_at>=now()-interval '7 days' and begins_at<now()+interval '365 days' order by begins_at,id limit 120) s),'[]'::jsonb),
  'departments',coalesce((select jsonb_agg(department_key order by department_key) from app_private.worship_departments),'[]'::jsonb),
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.display_name,
   'departments',coalesce((select jsonb_agg(w.department_key order by w.department_key)
    from public.department_memberships dm join app_private.worship_departments w on w.department_id=dm.department_id
    where dm.member_id=x.id and dm.started_at<=now() and dm.ended_at is null),'[]'::jsonb),
   'duties',coalesce((select jsonb_agg(q.duty_id order by q.duty_id)
    from app_private.worship_qualifications q where q.member_id=x.id and q.enabled),'[]'::jsonb),
   'hasAccess',app_private.module_allowed(x.id,app_private.worship_module_id())) order by x.display_name,x.id)
   from (select id,display_name from public.members where status='active' order by display_name,id limit 200) x),'[]'::jsonb),
  'songCount',(select count(*) from app_private.worship_songs where active)
 );
end $$;

create function app_private.worship_setup_command(p_command jsonb) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare
 v_actor uuid;v_op text;v_service app_private.worship_services;v_service_id uuid;v_start timestamptz;v_end timestamptz;
 v_name text;v_period text;v_member uuid;v_duty text;v_expected integer;v_before jsonb;v_after jsonb;
 v_module uuid:=app_private.worship_module_id();v_department uuid;v_valid boolean;v_song uuid;
begin
 perform pg_advisory_xact_lock(741085);
 if not app_private.worship_setup_authorized() then raise exception 'Worship setup access denied' using errcode='42501';end if;
 v_actor:=app_private.current_member_id();
 if jsonb_typeof(p_command) is distinct from 'object' or octet_length(p_command::text)>4096 then raise exception 'Invalid setup input' using errcode='22023';end if;
 v_op:=p_command->>'op';
 if v_op='create' or v_op='move' then
  if exists(select 1 from jsonb_object_keys(p_command) k where k<>all(case when v_op='create'
   then array['op','worship','period','startsAt','endsAt'] else array['op','serviceId','expectedVersion','worship','period','startsAt','endsAt'] end)) then raise exception 'Unexpected setup field' using errcode='22023';end if;
  v_name:=btrim(p_command->>'worship');v_period:=p_command->>'period';
  if v_name is null or length(v_name) not between 2 and 80
    or v_period not in ('Early Morning','Morning','Afternoon','Evening','Commemoration') then raise exception 'Invalid service details' using errcode='22023';end if;
  v_start:=(p_command->>'startsAt')::timestamptz;v_end:=(p_command->>'endsAt')::timestamptz;
  if v_start<=clock_timestamp() or v_start>clock_timestamp()+interval '2 years'
    or v_end<=v_start or v_end>v_start+interval '24 hours' then raise exception 'Invalid service time' using errcode='23514';end if;
 end if;
 if v_op='create' then
  if exists(select 1 from app_private.worship_services
   where worship_type=v_name and period=v_period and begins_at=v_start and status<>'cancelled') then raise exception 'Service already exists' using errcode='23505';end if;
  insert into app_private.worship_services(worship_type,period,begins_at,ends_at,status)
   values(v_name,v_period,v_start,v_end,'draft') returning id into v_service_id;
  v_after:=jsonb_build_object('serviceId',v_service_id,'status','draft');
 elsif v_op in ('publish','cancel','move') then
  if jsonb_typeof(p_command->'expectedVersion') is distinct from 'number'
   or coalesce(p_command->>'expectedVersion','')!~'^[0-9]{1,9}$' then raise exception 'Service version required' using errcode='22023';end if;
  v_expected:=(p_command->>'expectedVersion')::int;v_service_id:=(p_command->>'serviceId')::uuid;
  if exists(select 1 from jsonb_object_keys(p_command) k where k<>all(case when v_op='move' then
   array['op','serviceId','expectedVersion','worship','period','startsAt','endsAt'] else array['op','serviceId','expectedVersion'] end))
   then raise exception 'Unexpected setup field' using errcode='22023';end if;
  select * into v_service from app_private.worship_services where id=v_service_id for update;
  if not found or v_service.status='cancelled' or v_service.begins_at<=clock_timestamp() then raise exception 'Service no longer editable' using errcode='23514';end if;
  if v_service.version<>v_expected then raise exception 'Service changed; refresh before saving' using errcode='40001';end if;
  v_before:=to_jsonb(v_service);
  if v_op='publish' then
   if v_service.status<>'draft' then raise exception 'Only drafts can be published' using errcode='23514';end if;
   update app_private.worship_services set status='published',version=version+1 where id=v_service_id;
  elsif v_op='cancel' then
   update app_private.worship_services set status='cancelled',version=version+1 where id=v_service_id;
   update app_private.worship_requests set status='closed',resolved_at=clock_timestamp(),resolved_by=v_actor
    where service_id=v_service_id and status='pending';
   update app_private.module_activities set status='cancelled'
    where module_id=v_module and left(external_reference,37)=v_service_id::text||':';
   insert into app_private.module_notices(module_id,recipient_member_id,requires_action)
    select distinct v_module,member_id,false from app_private.worship_assignments
    where service_id=v_service_id and member_id is not null;
  else
   if exists(select 1 from app_private.worship_services where id<>v_service_id
    and worship_type=v_name and period=v_period and begins_at=v_start and status<>'cancelled') then raise exception 'Service already exists' using errcode='23505';end if;
   if exists(select 1 from app_private.worship_programs where service_id=v_service_id and status='sung') then raise exception 'Historical song plan cannot be moved' using errcode='23514';end if;
   if exists(select 1 from app_private.worship_assignments a
    where a.service_id=v_service_id and a.member_id is not null
      and not app_private.worship_has_duty(v_name,v_period,a.duty_id)) then raise exception 'Service has an inapplicable duty' using errcode='23514';end if;
   if exists(select 1 from app_private.worship_program_items i
    where i.service_id=v_service_id and ((i.section='thanks' and not app_private.worship_has_thanks(v_name,v_period))
     or (i.section='choir' and not app_private.worship_has_choir(v_name)))) then raise exception 'Service has inapplicable song sections' using errcode='23514';end if;
   update app_private.worship_services set worship_type=v_name,period=v_period,begins_at=v_start,ends_at=v_end,version=version+1
    where id=v_service_id;
   if exists(select 1 from app_private.worship_assignments a where a.service_id=v_service_id and a.member_id is not null
      and (not app_private.worship_eligible(a.member_id,a.duty_id) or not app_private.worship_available(a.member_id,v_service_id)))
    then raise exception 'Existing assignments unavailable for the new service' using errcode='23514';end if;
   update app_private.worship_requests set status='closed',resolved_at=clock_timestamp(),resolved_by=v_actor
    where service_id=v_service_id and status='pending';
   update app_private.worship_programs set status='draft',version=version+1,updated_by=v_actor,updated_at=clock_timestamp()
    where service_id=v_service_id and status<>'sung';
   update app_private.module_activities set context=v_name||' · '||v_period,begins_at=v_start,ends_at=v_end
    where module_id=v_module and left(external_reference,37)=v_service_id::text||':';
   insert into app_private.module_notices(module_id,recipient_member_id,requires_action)
    select distinct v_module,member_id,false from app_private.worship_assignments
    where service_id=v_service_id and member_id is not null;
  end if;
  v_after:=jsonb_build_object('serviceId',v_service_id,'operation',v_op,'nextVersion',v_service.version+1);
 elsif v_op='qualify' then
  if exists(select 1 from jsonb_object_keys(p_command) k where k<>all(array['op','memberId','dutyId','enabled']))
    or jsonb_typeof(p_command->'enabled') is distinct from 'boolean' then raise exception 'Invalid qualification fields' using errcode='22023';end if;
  v_member:=(p_command->>'memberId')::uuid;v_duty:=p_command->>'dutyId';
  select w.department_id into v_department from app_private.worship_duties d
   join app_private.worship_departments w on w.department_key=d.department_key where d.id=v_duty;
  if v_department is null or not app_private.manages_department(v_actor,v_department)
   or not exists(select 1 from public.members m join public.department_memberships dm on dm.member_id=m.id
      where m.id=v_member and m.status='active' and dm.department_id=v_department and dm.ended_at is null and dm.started_at<=now())
    then raise exception 'Only a current department member can receive a duty qualification' using errcode='42501';end if;
  insert into app_private.worship_qualifications(member_id,duty_id,enabled) values(v_member,v_duty,(p_command->>'enabled')::boolean)
   on conflict(member_id,duty_id) do update set enabled=excluded.enabled;
  v_after:=jsonb_build_object('memberId',v_member,'dutyId',v_duty,'enabled',p_command->'enabled');
 elsif v_op='access' then
  if exists(select 1 from jsonb_object_keys(p_command) k where k<>all(array['op','memberId','enabled']))
   or jsonb_typeof(p_command->'enabled') is distinct from 'boolean' then raise exception 'Invalid member access fields' using errcode='22023';end if;
  v_member:=(p_command->>'memberId')::uuid;
  if not exists(select 1 from public.members m where m.id=v_member and m.status='active'
    and exists(select 1 from public.department_memberships dm join app_private.worship_departments w on w.department_id=dm.department_id
     where dm.member_id=m.id and dm.ended_at is null and dm.started_at<=now()))
    then raise exception 'Verified active department member required' using errcode='42501';end if;
  if v_member=v_actor then raise exception 'Owner access is managed separately' using errcode='42501';end if;
  if (p_command->>'enabled')::boolean then
   insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by)
    values(v_member,v_module,'viewer','Owner-approved Worship Duty member participation',v_actor)
    on conflict(member_id,module_id) where ended_at is null do nothing;
  else
   update app_private.module_access_grants set ended_at=clock_timestamp(),ended_by=v_actor
    where member_id=v_member and module_id=v_module and permission='viewer' and ended_at is null;
  end if;
  v_after:=jsonb_build_object('memberId',v_member,'accessEnabled',p_command->'enabled');
 elsif v_op='song' then
  if exists(select 1 from jsonb_object_keys(p_command) k where k<>all(array['op','code','title','seconds']))
   or jsonb_typeof(p_command->'seconds') is distinct from 'number'
   or coalesce(p_command->>'seconds','')!~'^[0-9]{1,4}$' then raise exception 'Invalid song fields' using errcode='22023';end if;
  v_name:=btrim(p_command->>'title');
  if v_name is null or length(v_name) not between 1 and 150
    or length(btrim(coalesce(p_command->>'code',''))) not between 1 and 30
    or (p_command->>'seconds')::int not between 1 and 3600 then raise exception 'Invalid song details' using errcode='22023';end if;
  insert into app_private.worship_songs(code,title,duration_seconds)
   values(btrim(p_command->>'code'),v_name,(p_command->>'seconds')::int) returning id into v_song;
  v_after:=jsonb_build_object('songId',v_song,'code',p_command->>'code');
 else
  raise exception 'Unknown Worship setup operation' using errcode='22023';
 end if;
 insert into app_private.worship_audit(actor_id,operation,service_id,before_data,after_data)
  values(v_actor,'setup.'||v_op,v_service_id,v_before,v_after);
 return jsonb_build_object('ok',true);
end $$;

create function public.worship_setup_workspace() returns jsonb
 language sql stable security invoker set search_path='' as $$select app_private.worship_setup_workspace()$$;
create function public.worship_setup_command(p_command jsonb) returns jsonb
 language sql volatile security invoker set search_path='' as $$select app_private.worship_setup_command(p_command)$$;
revoke all on function app_private.worship_setup_workspace(),app_private.worship_setup_command(jsonb),
 public.worship_setup_workspace(),public.worship_setup_command(jsonb) from public,anon,authenticated;
grant execute on function app_private.worship_setup_workspace(),app_private.worship_setup_command(jsonb),
 public.worship_setup_workspace(),public.worship_setup_command(jsonb) to authenticated;
commit;