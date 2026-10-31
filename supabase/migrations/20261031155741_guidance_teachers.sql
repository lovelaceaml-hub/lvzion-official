-- Guidance Teachers: separate LV Zion app. Approved interview, 2026-10-31.
-- No service dates, recurrence, assignments, members or new manager grants are seeded.
begin;
create table app_private.guidance_services(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(btrim(title)) between 2 and 80 and title !~ '[[:cntrl:]]'),
 service_date date not null check(service_date between date '2000-01-01' and date '2100-12-31'),
 start_time time not null,end_time time not null,
 status text not null default 'scheduled' check(status in ('scheduled','cancelled')),
 version integer not null default 1 check(version>0),
 created_by uuid not null references public.members on delete restrict,
 updated_by uuid not null references public.members on delete restrict,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 check(end_time>start_time),check(extract(second from start_time)=0 and extract(second from end_time)=0)
);
create index guidance_services_date_idx on app_private.guidance_services(service_date,start_time) where status='scheduled';
create unique index guidance_services_identity_idx on app_private.guidance_services(service_date,start_time,lower(btrim(title))) where status='scheduled';
create index guidance_services_created_by_idx on app_private.guidance_services(created_by);
create index guidance_services_updated_by_idx on app_private.guidance_services(updated_by);
create table app_private.guidance_slots(
 service_id uuid not null references app_private.guidance_services on delete restrict,
 location text not null check(location in ('main','small')),
 position smallint not null check(position in (1,2)),
 member_id uuid references public.members on delete restrict,
 primary key(service_id,location,position),unique(service_id,member_id)
);
create index guidance_slots_member_idx on app_private.guidance_slots(member_id,service_id) where member_id is not null;
create table app_private.guidance_receipts(
 actor_id uuid not null references public.members on delete restrict,request_id uuid not null,
 command jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),
 primary key(actor_id,request_id)
);
create table app_private.guidance_audit(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.members on delete restrict,
 service_id uuid not null references app_private.guidance_services on delete restrict,
 operation text not null check(operation in ('create','edit','assign','cancel')),
 before_data jsonb,after_data jsonb,created_at timestamptz not null default clock_timestamp()
);
create index guidance_audit_service_idx on app_private.guidance_audit(service_id,created_at);
create index guidance_audit_actor_idx on app_private.guidance_audit(actor_id);
do $$ declare t text;begin
 foreach t in array array['guidance_services','guidance_slots','guidance_receipts','guidance_audit'] loop
  execute format('alter table app_private.%I enable row level security',t);
  execute format('revoke all on app_private.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;

create function app_private.guidance_module_id() returns uuid language sql stable set search_path='' as $$
 select id from app_private.app_modules where module_key='guidance-teachers'
$$;

-- Private SECURITY DEFINER implementations intentionally cross the private-table boundary.
-- Every entry point verifies auth.uid(), the current member and the module-specific permission.
-- Public wrappers below remain SECURITY INVOKER; no client receives table access or a service key.
create function app_private.guidance_teachers_workspace(p_date date) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_module uuid:=app_private.guidance_module_id();v_manager boolean;v_view boolean;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_allowed(actor,v_module),false) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_date is null or p_date not between date '2000-01-01' and date '2100-12-31' then raise exception 'Invalid date' using errcode='22023';end if;
 v_manager:=coalesce(app_private.module_manager(actor,v_module),false);
 v_view:=v_manager or exists(select 1 from app_private.guidance_slots a join app_private.guidance_services s on s.id=a.service_id where a.member_id=actor and s.status='scheduled');
 return jsonb_build_object('date',to_char(p_date,'YYYY-MM-DD'),'viewerId',actor,'canView',v_view,'canManage',v_manager,
  'services',case when not v_view then '[]'::jsonb else coalesce((
   select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'date',to_char(s.service_date,'YYYY-MM-DD'),
    'startTime',left(s.start_time::text,5),'endTime',left(s.end_time::text,5),'version',s.version,
    'slots',(select jsonb_agg(jsonb_build_object('location',a.location,'position',a.position,'memberId',a.member_id,'name',m.display_name) order by a.location,a.position)
     from app_private.guidance_slots a left join public.members m on m.id=a.member_id where a.service_id=s.id)) order by s.start_time,s.id)
   from app_private.guidance_services s where s.service_date=p_date and s.status='scheduled'
  ),'[]'::jsonb) end);
end $$;

create function app_private.guidance_teachers_candidates(p_service uuid,p_query text default '') returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_service app_private.guidance_services;v_result jsonb;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_manager(actor,app_private.guidance_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_query is null or length(p_query)>80 then raise exception 'Invalid search' using errcode='22023';end if;
 select * into v_service from app_private.guidance_services where id=p_service and status='scheduled';
 if not found then raise exception 'Service unavailable' using errcode='23514';end if;
 with matches as (
  select m.id,m.display_name as name,exists(
   select 1 from app_private.guidance_slots a join app_private.guidance_services s on s.id=a.service_id
   where a.member_id=m.id and s.status='scheduled' and s.service_date=v_service.service_date
    and s.start_time<v_service.end_time and s.end_time>v_service.start_time
  ) as unavailable from public.members m
  where m.status='active' and strpos(lower(m.display_name),lower(btrim(p_query)))>0
  order by m.display_name,m.id limit 51
 ) select jsonb_build_object('serviceId',p_service,'hasMore',(select count(*)>50 from matches),
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'unavailable',x.unavailable) order by x.name,x.id)
   from (select * from matches order by name,id limit 50) x),'[]'::jsonb)) into v_result;
 return v_result;
end $$;

create function app_private.guidance_teachers_command(p_command jsonb) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare
 actor uuid:=app_private.current_member_id();v_module uuid:=app_private.guidance_module_id();v_op text;v_request uuid;v_receipt app_private.guidance_receipts;
 v_service app_private.guidance_services;v_id uuid;v_member uuid;v_slot app_private.guidance_slots;
 v_title text;v_date date;v_start time;v_end time;v_location text;v_position smallint;v_expected integer;v_keys text[];
 v_before jsonb;v_after jsonb;v_result jsonb;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_manager(actor,v_module),false) then raise exception 'Not authorized' using errcode='42501';end if;
 if jsonb_typeof(p_command) is distinct from 'object' or octet_length(p_command::text)>4096 then raise exception 'Invalid command' using errcode='22023';end if;
 v_op:=p_command->>'op';
 v_keys:=case v_op
  when 'create' then array['op','requestId','title','date','startTime','endTime']
  when 'edit' then array['op','requestId','serviceId','expectedVersion','title','date','startTime','endTime']
  when 'assign' then array['op','requestId','serviceId','expectedVersion','location','position','memberId']
  when 'cancel' then array['op','requestId','serviceId','expectedVersion'] end;
 if v_keys is null or not(p_command ?& v_keys) or exists(select 1 from jsonb_object_keys(p_command) k where not(k=any(v_keys)))
  or jsonb_typeof(p_command->'requestId') is distinct from 'string' then raise exception 'Unexpected or missing field' using errcode='22023';end if;
 v_request:=(p_command->>'requestId')::uuid;
 -- One module-local lock serializes cross-service conflict checks and receipt replays.
 perform pg_advisory_xact_lock(742611);
 select * into v_receipt from app_private.guidance_receipts where actor_id=actor and request_id=v_request;
 if found then
  if v_receipt.command<>p_command then raise exception 'Request ID reused with different details' using errcode='22023';end if;
  return v_receipt.result;
 end if;
 if v_op<>'create' then
  if jsonb_typeof(p_command->'serviceId') is distinct from 'string' or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number'
   or (p_command->>'expectedVersion') !~ '^[0-9]{1,9}$' then raise exception 'Invalid service version' using errcode='22023';end if;
  v_id:=(p_command->>'serviceId')::uuid;v_expected:=(p_command->>'expectedVersion')::integer;
  select * into v_service from app_private.guidance_services where id=v_id and status='scheduled' for update;
  if not found then raise exception 'Service no longer editable' using errcode='23514';end if;
  if v_service.version<>v_expected then raise exception 'Stale service version' using errcode='40001';end if;
  if v_service.service_date+v_service.start_time <= clock_timestamp() at time zone 'America/Los_Angeles' then raise exception 'Past services are read only' using errcode='23514';end if;
  v_before:=to_jsonb(v_service);
 end if;
 if v_op in ('create','edit') then
  if jsonb_typeof(p_command->'title') is distinct from 'string' or jsonb_typeof(p_command->'date') is distinct from 'string'
   or jsonb_typeof(p_command->'startTime') is distinct from 'string' or jsonb_typeof(p_command->'endTime') is distinct from 'string'
   or (p_command->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   or (p_command->>'startTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   or (p_command->>'endTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid service details' using errcode='22023';end if;
  v_title:=btrim(p_command->>'title');v_date:=(p_command->>'date')::date;v_start:=(p_command->>'startTime')::time;v_end:=(p_command->>'endTime')::time;
  if length(v_title) not between 2 and 80 or v_title ~ '[[:cntrl:]]' or v_end<=v_start
   or v_date+v_start<=clock_timestamp() at time zone 'America/Los_Angeles'
   or v_date>(clock_timestamp() at time zone 'America/Los_Angeles')::date+730 then raise exception 'Invalid service time or title' using errcode='23514';end if;
  if (select count(*) from app_private.guidance_services where service_date=v_date and status='scheduled' and (v_id is null or id<>v_id))>=48 then raise exception 'Too many services on this date' using errcode='23514';end if;
 end if;
 if v_op='create' then
  insert into app_private.guidance_services(title,service_date,start_time,end_time,created_by,updated_by)
   values(v_title,v_date,v_start,v_end,actor,actor) returning * into v_service;
  v_id:=v_service.id;
  insert into app_private.guidance_slots(service_id,location,position)
   select v_id,l.location,p.position from (values('main'),('small')) l(location) cross join (values(1),(2)) p(position);
  v_after:=to_jsonb(v_service);
 elsif v_op='edit' then
  if exists(select 1 from app_private.guidance_slots own_slot
    join app_private.guidance_slots other_slot on other_slot.member_id=own_slot.member_id and other_slot.service_id<>v_id
    join app_private.guidance_services s on s.id=other_slot.service_id
    where own_slot.service_id=v_id and s.status='scheduled' and s.service_date=v_date and s.start_time<v_end and s.end_time>v_start)
   then raise exception 'Assigned teacher has an overlapping service' using errcode='23505';end if;
  update app_private.guidance_services set title=v_title,service_date=v_date,start_time=v_start,end_time=v_end,
   version=version+1,updated_by=actor,updated_at=clock_timestamp() where id=v_id returning * into v_service;
  v_after:=to_jsonb(v_service);
 elsif v_op='assign' then
  if jsonb_typeof(p_command->'location') is distinct from 'string' or (p_command->>'location') not in ('main','small')
   or jsonb_typeof(p_command->'position') is distinct from 'number' or (p_command->>'position') not in ('1','2')
   or jsonb_typeof(p_command->'memberId') not in ('string','null') then raise exception 'Invalid slot' using errcode='22023';end if;
  v_location:=p_command->>'location';v_position:=(p_command->>'position')::smallint;v_member:=(p_command->>'memberId')::uuid;
  if v_member is not null and not exists(select 1 from public.members where id=v_member and status='active') then raise exception 'Member is not active' using errcode='23514';end if;
  if v_member is not null and exists(select 1 from app_private.guidance_slots a join app_private.guidance_services s on s.id=a.service_id
   where a.member_id=v_member and s.status='scheduled' and s.service_date=v_service.service_date and s.start_time<v_service.end_time and s.end_time>v_service.start_time
    and not(a.service_id=v_id and a.location=v_location and a.position=v_position)) then raise exception 'Teacher already assigned at this time' using errcode='23505';end if;
  select * into v_slot from app_private.guidance_slots where service_id=v_id and location=v_location and position=v_position for update;
  if not found then raise exception 'Slot unavailable' using errcode='23514';end if;
  v_before:=to_jsonb(v_slot);
  update app_private.guidance_slots set member_id=v_member where service_id=v_id and location=v_location and position=v_position returning * into v_slot;
  update app_private.guidance_services set version=version+1,updated_by=actor,updated_at=clock_timestamp() where id=v_id returning * into v_service;
  v_after:=to_jsonb(v_slot);
 else
  update app_private.guidance_services set status='cancelled',version=version+1,updated_by=actor,updated_at=clock_timestamp() where id=v_id returning * into v_service;
  v_after:=to_jsonb(v_service);
 end if;
 -- Sync only this app's own activity rows. No email, push or external scheduling side effects.
 update app_private.module_activities set status='cancelled' where module_id=v_module and left(external_reference,37)=v_id::text||':';
 if v_service.status='scheduled' then
  insert into app_private.module_activities(module_id,recipient_member_id,title,context,location_label,begins_at,ends_at,status,external_reference)
   select v_module,a.member_id,v_service.title||' · Guidance Teacher','Guidance Teacher '||a.position,
    case a.location when 'main' then 'Main Sanctuary' else 'Small Sanctuary' end,
    (v_service.service_date+v_service.start_time) at time zone 'America/Los_Angeles',
    (v_service.service_date+v_service.end_time) at time zone 'America/Los_Angeles','scheduled',v_id::text||':'||a.location||':'||a.position
   from app_private.guidance_slots a where a.service_id=v_id and a.member_id is not null
   on conflict(module_id,external_reference) where external_reference is not null do update set
    recipient_member_id=excluded.recipient_member_id,title=excluded.title,context=excluded.context,location_label=excluded.location_label,
    begins_at=excluded.begins_at,ends_at=excluded.ends_at,status=excluded.status;
 end if;
 insert into app_private.guidance_audit(actor_id,service_id,operation,before_data,after_data) values(actor,v_id,v_op,v_before,v_after);
 v_result:=jsonb_build_object('ok',true,'serviceId',v_id,'version',v_service.version);
 insert into app_private.guidance_receipts(actor_id,request_id,command,result) values(actor,v_request,p_command,v_result);
 return v_result;
end $$;

create function public.guidance_teachers_workspace(p_date date) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.guidance_teachers_workspace(p_date)$$;
create function public.guidance_teachers_candidates(p_service uuid,p_query text default '') returns jsonb language sql stable security invoker set search_path='' as $$select app_private.guidance_teachers_candidates(p_service,p_query)$$;
create function public.guidance_teachers_command(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.guidance_teachers_command(p_command)$$;
revoke all on function app_private.guidance_module_id() from public,anon,authenticated,service_role;
revoke all on function app_private.guidance_teachers_workspace(date),app_private.guidance_teachers_candidates(uuid,text),app_private.guidance_teachers_command(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.guidance_teachers_workspace(date),public.guidance_teachers_candidates(uuid,text),public.guidance_teachers_command(jsonb) from public,anon,authenticated,service_role;
grant execute on function app_private.guidance_teachers_workspace(date),app_private.guidance_teachers_candidates(uuid,text),app_private.guidance_teachers_command(jsonb) to authenticated;
grant execute on function public.guidance_teachers_workspace(date),public.guidance_teachers_candidates(uuid,text),public.guidance_teachers_command(jsonb) to authenticated;
-- Catalog registration only. The existing owner-everywhere rule provides management;
-- all other coordinators require a deliberately granted module manager permission.
insert into app_private.app_modules(module_key,display_name,short_name,description,accent,route_path,status,approved_at,approved_by)
 values('guidance-teachers','Guidance Teachers','Guidance','Coordinate two Guidance Teachers in each sanctuary for every service.','#7753c2','/modules/guidance-teachers','approved',clock_timestamp(),
 (select l.member_id from app_private.bootstrap_receipts b join app_private.account_links l on l.auth_user_id=b.auth_user_id where l.enabled and l.technical_enabled limit 1));
commit;
