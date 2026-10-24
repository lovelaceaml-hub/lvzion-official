-- Additive operations for the Worship Duty module. No records imported.
begin;
create table app_private.worship_setup_versions (
 singleton boolean primary key default true check(singleton), version integer not null default 0 check(version>=0)
);
insert into app_private.worship_setup_versions default values;
alter table app_private.worship_setup_versions enable row level security;
revoke all on app_private.worship_setup_versions from public,anon,authenticated,service_role;

-- Publication projects already-reviewed draft assignments into My Week.
create function app_private.worship_publish_activities() returns trigger language plpgsql set search_path='' as $$
declare v_module uuid:=app_private.worship_module_id();
begin
 if old.status='draft' and new.status='published' then
  if exists(select 1 from app_private.worship_assignments a where a.service_id=new.id and a.member_id is not null
   and (not app_private.worship_eligible(a.member_id,a.duty_id) or not app_private.worship_available(a.member_id,new.id)))
   then raise exception 'Review draft assignments: participation, qualification or availability changed' using errcode='23514';end if;
  insert into app_private.module_activities(module_id,recipient_member_id,title,context,begins_at,ends_at,external_reference)
   select v_module,a.member_id,d.label,new.worship_type||' · '||new.period,new.begins_at,new.ends_at,
    new.id::text||':'||a.duty_id||':'||a.member_id::text
   from app_private.worship_assignments a join app_private.worship_duties d on d.id=a.duty_id
   where a.service_id=new.id and a.member_id is not null
   on conflict(module_id,external_reference) where external_reference is not null
   do update set status='scheduled',context=excluded.context,begins_at=excluded.begins_at,ends_at=excluded.ends_at;
  insert into app_private.module_notices(module_id,recipient_member_id,requires_action)
   select distinct v_module,member_id,false from app_private.worship_assignments where service_id=new.id and member_id is not null;
 end if;
 return new;
end $$;
revoke all on function app_private.worship_publish_activities() from public,anon,authenticated;
create trigger worship_published_activities after update of status on app_private.worship_services
 for each row execute function app_private.worship_publish_activities();

alter function app_private.worship_setup_workspace() rename to worship_setup_workspace_base;
alter function app_private.worship_setup_command(jsonb) rename to worship_setup_command_base;
revoke all on function app_private.worship_setup_workspace_base(),app_private.worship_setup_command_base(jsonb) from public,anon,authenticated;
create function app_private.worship_setup_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_data jsonb;
begin
 v_data:=app_private.worship_setup_workspace_base();
 return v_data||jsonb_build_object(
  'version',(select version from app_private.worship_setup_versions where singleton),
  'members',coalesce((select jsonb_agg(x.value||jsonb_build_object(
   'managerDepartments',coalesce((select jsonb_agg(w.department_key order by w.department_key)
    from app_private.role_assignments r join app_private.worship_departments w on w.department_id=r.department_id
    where r.member_id=(x.value->>'id')::uuid and r.role_key='department_manager' and r.ended_at is null and r.appointed_at<=now()),'[]'::jsonb),
   'songEditor',exists(select 1 from app_private.worship_song_editor_grants g where g.member_id=(x.value->>'id')::uuid and g.ended_at is null and g.granted_at<=now()),
   'manualDepartments',coalesce((select jsonb_agg(p.department_key order by p.department_key) from app_private.worship_roster_preferences p
     where p.member_id=(x.value->>'id')::uuid and p.manual_only),'[]'::jsonb),
   'availabilityVersion',coalesce((select version from app_private.worship_availability_versions where member_id=(x.value->>'id')::uuid),0),
   'serviceAvailability',coalesce((select jsonb_agg(jsonb_build_object('serviceId',a.service_id,'available',a.available))
    from app_private.worship_service_availability a join app_private.worship_services s on s.id=a.service_id
    where a.member_id=(x.value->>'id')::uuid and s.begins_at>now()),'[]'::jsonb)
   ) order by x.ordinality) from jsonb_array_elements(v_data->'members') with ordinality x(value,ordinality)),'[]'::jsonb),
  'songs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',code,'title',title,'seconds',duration_seconds,'active',active) order by code,id)
   from (select * from app_private.worship_songs order by code,id limit 500) songs),'[]'::jsonb),
  'membersHasMore',(select count(*)>200 from public.members where status='active'),
  'songsHasMore',(select count(*)>500 from app_private.worship_songs),
  'servicesHasMore',(select count(*)>120 from app_private.worship_services where begins_at>=now()-interval '7 days' and begins_at<now()+interval '365 days')
 );
end $$;

create function app_private.worship_setup_command(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid;v_op text;v_version integer;v_member uuid;v_department uuid;v_song uuid;v_before jsonb;v_after jsonb;v_enabled boolean;v_service uuid;v_av integer;
begin
 perform pg_advisory_xact_lock(741085);
 if not app_private.worship_setup_authorized() then raise exception 'Setup access denied' using errcode='42501';end if;
 v_actor:=app_private.current_member_id();
 if jsonb_typeof(p_command) is distinct from 'object' or octet_length(p_command::text)>4096 then raise exception 'Invalid input' using errcode='22023';end if;
 v_op:=p_command->>'op';
 if v_op in ('create','move','publish','cancel') then
  -- Retain exact service compare-and-swap and all lifecycle checks.
  return app_private.worship_setup_command_base(p_command);
 end if;
 if jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or coalesce(p_command->>'expectedVersion','')!~'^[0-9]{1,9}$' then raise exception 'Setup version required' using errcode='22023';end if;
 select version into v_version from app_private.worship_setup_versions where singleton for update;
 if v_version<>(p_command->>'expectedVersion')::integer then raise exception 'Setup changed' using errcode='40001';end if;
 if v_op in ('qualify','access','song') then
  v_after:=app_private.worship_setup_command_base(p_command-'expectedVersion');
 elsif v_op in ('participation','manager','song_editor','manual','service_availability') then
  if exists(select 1 from jsonb_object_keys(p_command) k where k<>all(case v_op
   when 'song_editor' then array['op','memberId','enabled','expectedVersion']
   when 'service_availability' then array['op','memberId','serviceId','available','expectedAvailabilityVersion','expectedVersion']
   else array['op','memberId','department','enabled','expectedVersion'] end))
   or not(p_command?'memberId') then raise exception 'Invalid personnel fields' using errcode='22023';end if;
  v_member:=(p_command->>'memberId')::uuid;
  if v_member=v_actor or not exists(select 1 from public.members where id=v_member and status='active') then raise exception 'Verified active member required; owner authority is separate' using errcode='42501';end if;
  if v_op='service_availability' then
   if jsonb_typeof(p_command->'available') is distinct from 'boolean' or jsonb_typeof(p_command->'expectedAvailabilityVersion') is distinct from 'number'
    or coalesce(p_command->>'expectedAvailabilityVersion','')!~'^[0-9]{1,9}$' then raise exception 'Availability fields required' using errcode='22023';end if;
   v_service:=(p_command->>'serviceId')::uuid;
   if not exists(select 1 from app_private.worship_services where id=v_service and status<>'cancelled' and begins_at>clock_timestamp())
    or not app_private.module_allowed(v_member,app_private.worship_module_id()) then raise exception 'Service or participant unavailable' using errcode='23514';end if;
   insert into app_private.worship_availability_versions(member_id) values(v_member) on conflict do nothing;
   select version into v_av from app_private.worship_availability_versions where member_id=v_member for update;
   if v_av<>(p_command->>'expectedAvailabilityVersion')::integer then raise exception 'Member availability changed' using errcode='40001';end if;
   select to_jsonb(a) into v_before from app_private.worship_service_availability a where member_id=v_member and service_id=v_service;
   insert into app_private.worship_service_availability(member_id,service_id,available) values(v_member,v_service,(p_command->>'available')::boolean)
    on conflict(member_id,service_id) do update set available=excluded.available;
   update app_private.worship_availability_versions set version=version+1 where member_id=v_member;
  else
   if jsonb_typeof(p_command->'enabled') is distinct from 'boolean' then raise exception 'Enabled required' using errcode='22023';end if;
   v_enabled:=(p_command->>'enabled')::boolean;
   if v_op<>'song_editor' then
    select department_id into v_department from app_private.worship_departments where department_key=p_command->>'department';
    if v_department is null or not app_private.manages_department(v_actor,v_department) then raise exception 'Department authority required' using errcode='42501';end if;
   end if;
   if v_op='participation' then
    select jsonb_build_object('enabled',exists(select 1 from public.department_memberships where member_id=v_member and department_id=v_department and ended_at is null)) into v_before;
    if v_enabled then
     insert into public.department_memberships(member_id,department_id) values(v_member,v_department) on conflict(member_id,department_id) where ended_at is null do nothing;
    else
     update public.department_memberships set ended_at=clock_timestamp() where member_id=v_member and department_id=v_department and ended_at is null;
     update app_private.worship_qualifications q set enabled=false from app_private.worship_duties d where q.member_id=v_member and q.duty_id=d.id and d.department_key=p_command->>'department';
     update app_private.role_assignments set ended_at=clock_timestamp(),ended_by=v_actor where member_id=v_member and role_key='department_manager' and department_id=v_department and ended_at is null;
    end if;
   elsif v_op='manager' then
    if not exists(select 1 from public.department_memberships where member_id=v_member and department_id=v_department and ended_at is null and started_at<=now()) then raise exception 'Department participation required' using errcode='42501';end if;
    select jsonb_build_object('enabled',app_private.actor_has(v_member,'department_manager',v_department)) into v_before;
    if v_enabled then
     insert into app_private.role_assignments(member_id,role_key,department_id,appointed_by) values(v_member,'department_manager',v_department,v_actor)
      on conflict(member_id,role_key,unit_id,group_id,department_id) where ended_at is null do nothing;
     update app_private.module_access_grants set permission='manager' where member_id=v_member and module_id=app_private.worship_module_id() and ended_at is null;
     if not found then raise exception 'Approve module access first' using errcode='42501';end if;
    else update app_private.role_assignments set ended_at=clock_timestamp(),ended_by=v_actor where member_id=v_member and role_key='department_manager' and department_id=v_department and ended_at is null;
    end if;
   elsif v_op='song_editor' then
    if not app_private.module_allowed(v_member,app_private.worship_module_id()) then raise exception 'Approve module access first' using errcode='42501';end if;
    select jsonb_build_object('enabled',exists(select 1 from app_private.worship_song_editor_grants where member_id=v_member and ended_at is null)) into v_before;
    if v_enabled then insert into app_private.worship_song_editor_grants(member_id,granted_by,reason) values(v_member,v_actor,'Owner-approved independent song editor') on conflict(member_id) where ended_at is null do nothing;
    else update app_private.worship_song_editor_grants set ended_at=clock_timestamp() where member_id=v_member and ended_at is null;end if;
   elsif v_op='manual' then
    if not exists(select 1 from public.department_memberships where member_id=v_member and department_id=v_department and ended_at is null) then raise exception 'Department participation required' using errcode='42501';end if;
    select to_jsonb(p) into v_before from app_private.worship_roster_preferences p where member_id=v_member and department_key=p_command->>'department';
    insert into app_private.worship_roster_preferences(member_id,department_key,manual_only) values(v_member,p_command->>'department',v_enabled)
     on conflict(member_id,department_key) do update set manual_only=excluded.manual_only;
   end if;
  end if;
  v_after:=p_command-'expectedVersion';
 elsif v_op='song_update' then
  if not(p_command?&array['op','songId','code','title','seconds','active','expectedVersion']) or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('op','songId','code','title','seconds','active','expectedVersion'))
   or jsonb_typeof(p_command->'active') is distinct from 'boolean' or jsonb_typeof(p_command->'seconds') is distinct from 'number'
   or coalesce(p_command->>'seconds','')!~'^[0-9]{1,4}$' then raise exception 'Invalid song fields' using errcode='22023';end if;
  v_song:=(p_command->>'songId')::uuid;
  select to_jsonb(s) into v_before from app_private.worship_songs s where id=v_song for update;
  if not found then raise exception 'Song unavailable' using errcode='23514';end if;
  if (v_before->>'code' is distinct from btrim(p_command->>'code') or v_before->>'title' is distinct from btrim(p_command->>'title') or (v_before->>'duration_seconds')::integer is distinct from (p_command->>'seconds')::integer)
   and (exists(select 1 from app_private.worship_program_items where song_id=v_song) or exists(select 1 from app_private.worship_audit where operation='program' and (strpos(coalesce(before_data::text,''),v_song::text)>0 or strpos(coalesce(after_data::text,''),v_song::text)>0)))
   then raise exception 'Used song metadata is historical; add a new catalog revision' using errcode='23514';end if;
  update app_private.worship_songs set code=btrim(p_command->>'code'),title=btrim(p_command->>'title'),duration_seconds=(p_command->>'seconds')::integer,active=(p_command->>'active')::boolean where id=v_song;
  v_after:=p_command-'expectedVersion';
 else raise exception 'Unknown operation' using errcode='22023';end if;
 if v_op not in ('qualify','access','song') then
  insert into app_private.worship_audit(actor_id,operation,service_id,before_data,after_data) values(v_actor,'setup.'||v_op,v_service,v_before,v_after);
 end if;
 update app_private.worship_setup_versions set version=version+1 where singleton;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.worship_setup_workspace() returns jsonb language sql stable security invoker set search_path='' as $$select app_private.worship_setup_workspace()$$;
create or replace function public.worship_setup_command(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.worship_setup_command(p_command)$$;
revoke all on function app_private.worship_setup_workspace(),app_private.worship_setup_command(jsonb),public.worship_setup_workspace(),public.worship_setup_command(jsonb) from public,anon,authenticated;
grant execute on function app_private.worship_setup_workspace(),app_private.worship_setup_command(jsonb),public.worship_setup_workspace(),public.worship_setup_command(jsonb) to authenticated;
-- A reviewed batch is one transaction. Clear changed cells first so legal swaps
-- are validated against the final combination rather than an intermediate pair.
create function app_private.worship_batch(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid;v_item jsonb;v_service app_private.worship_services;v_old uuid;v_before jsonb;v_module uuid:=app_private.worship_module_id();
begin
 perform pg_advisory_xact_lock(741085);
 v_actor:=app_private.current_member_id();
 if v_actor is null or not app_private.module_allowed(v_actor,v_module) then raise exception 'Not authorized' using errcode='42501';end if;
 if jsonb_typeof(p_command) is distinct from 'object' or not(p_command?&array['op','changes']) or p_command->>'op'<>'batch'
  or exists(select 1 from jsonb_object_keys(p_command) k where k not in ('op','changes'))
  or jsonb_typeof(p_command->'changes') is distinct from 'array' then raise exception 'Invalid batch' using errcode='22023';end if;
 if jsonb_array_length(p_command->'changes') not between 1 and 40 or octet_length(p_command::text)>12000 then raise exception 'Batch limit exceeded' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(p_command->'changes') c group by c->>'serviceId',c->>'dutyId' having count(*)>1)
  then raise exception 'Duplicate assignment cell' using errcode='22023';end if;
 for v_item in select value from jsonb_array_elements(p_command->'changes') loop
  if jsonb_typeof(v_item) is distinct from 'object' or not(v_item?&array['serviceId','dutyId','memberId','expectedVersion'])
   or exists(select 1 from jsonb_object_keys(v_item) k where k not in ('serviceId','dutyId','memberId','expectedVersion'))
   or jsonb_typeof(v_item->'expectedVersion') is distinct from 'number' or coalesce(v_item->>'expectedVersion','')!~'^[0-9]{1,9}$'
   then raise exception 'Invalid batch cell' using errcode='22023';end if;
  if not app_private.worship_can_manage(v_actor,v_item->>'dutyId') then raise exception 'Department authority required' using errcode='42501';end if;
  select * into v_service from app_private.worship_services where id=(v_item->>'serviceId')::uuid for update;
  if not found or v_service.status='cancelled' or v_service.begins_at<=clock_timestamp() then raise exception 'Service closed' using errcode='23514';end if;
  if v_service.version<>(v_item->>'expectedVersion')::integer then raise exception 'Service changed' using errcode='40001';end if;
  if not app_private.worship_has_duty(v_service.worship_type,v_service.period,v_item->>'dutyId') then raise exception 'Duty does not apply' using errcode='23514';end if;
 end loop;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) into v_before from app_private.worship_assignments a
  where exists(select 1 from jsonb_array_elements(p_command->'changes') c where (c->>'serviceId')::uuid=a.service_id and c->>'dutyId'=a.duty_id);
 for v_item in select value from jsonb_array_elements(p_command->'changes') loop
  select member_id into v_old from app_private.worship_assignments where service_id=(v_item->>'serviceId')::uuid and duty_id=v_item->>'dutyId';
  if v_old is not null then
   update app_private.module_activities set status='cancelled' where module_id=v_module and external_reference=(v_item->>'serviceId')||':'||(v_item->>'dutyId')||':'||v_old::text;
   if exists(select 1 from app_private.worship_services where id=(v_item->>'serviceId')::uuid and status='published') then
    insert into app_private.module_notices(module_id,recipient_member_id,requires_action) values(v_module,v_old,false);
   end if;
  end if;
  update app_private.worship_assignments set member_id=null,version=version+1,updated_at=clock_timestamp() where service_id=(v_item->>'serviceId')::uuid and duty_id=v_item->>'dutyId';
 end loop;
 for v_item in select value from jsonb_array_elements(p_command->'changes') loop
  perform app_private.worship_set_assignment(v_actor,(v_item->>'serviceId')::uuid,v_item->>'dutyId',(v_item->>'memberId')::uuid);
 end loop;
 update app_private.worship_services set version=version+1 where id in (select distinct (c->>'serviceId')::uuid from jsonb_array_elements(p_command->'changes') c);
 insert into app_private.worship_audit(actor_id,operation,before_data,after_data) values(v_actor,'batch',v_before,p_command->'changes');
 return jsonb_build_object('ok',true);
end $$;
create function public.worship_batch(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.worship_batch(p_command)$$;
revoke all on function app_private.worship_batch(jsonb),public.worship_batch(jsonb) from public,anon,authenticated;
grant execute on function app_private.worship_batch(jsonb),public.worship_batch(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
