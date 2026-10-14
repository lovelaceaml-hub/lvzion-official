-- UNAPPLIED REVIEW MIGRATION. Generated with Supabase CLI in a disposable workspace.
-- Requires member foundation + module runtime. No real people, module approval or grants seeded.
-- Never apply to the old application. Hosted LV Zion Official activation is a separate release gate.
begin;
create table app_private.worship_departments (
 department_key text primary key,
 department_id uuid unique references public.departments on delete restrict
);
insert into app_private.worship_departments(department_key) values
 ('Worship'),('Usher Sisters'),('Usher Brothers'),('Lobby'),('Translation'),('Media'),('Parking Lot'),('Offering');
create table app_private.worship_duties (
 id text primary key check(id ~ '^[a-z][a-z0-9_]{2,40}$'),
 label text not null check(length(label) between 2 and 60),
 department_key text not null references app_private.worship_departments on delete restrict,
 kind text not null default 'ordinary' check(kind in ('ordinary','prayer','usher','opening')),
 sort_order smallint not null unique
);
insert into app_private.worship_duties(id,label,department_key,kind,sort_order) values
 ('presider','Presider','Worship','ordinary',1),('opening_prayer','Opening Prayer','Worship','opening',2),
 ('thanks_prayer','Thanks Prayer','Worship','prayer',3),('closing_prayer','Closing Prayer','Worship','prayer',4),
 ('usher_door','Usher Door','Usher Sisters','usher',5),('usher_front','Usher Front','Usher Sisters','usher',6),('usher_back','Usher Back','Usher Sisters','usher',7),
 ('usher_1','Usher #1','Usher Brothers','usher',8),('usher_2','Usher #2','Usher Brothers','usher',9),('lobby_security','Lobby Security','Usher Brothers','ordinary',10),
 ('lobby_1','Lobby Desk #1','Lobby','ordinary',11),('lobby_2','Lobby Desk #2','Lobby','ordinary',12),
 ('translation_1','Translation #1','Translation','ordinary',13),('translation_2','Translation #2','Translation','ordinary',14),
 ('media_1','Media Booth #1','Media','ordinary',15),('media_2','Media Booth #2','Media','ordinary',16),
 ('parking_1','Parking #1','Parking Lot','ordinary',17),('parking_2','Parking #2','Parking Lot','ordinary',18),('parking_3','Parking #3','Parking Lot','ordinary',19),('parking_4','Parking #4','Parking Lot','ordinary',20),('parking_5','Parking #5','Parking Lot','ordinary',21),
 ('offering_1','Offering #1','Offering','ordinary',22),('offering_2','Offering #2','Offering','ordinary',23),('offering_3','Offering #3','Offering','ordinary',24),('offering_4','Offering #4','Offering','ordinary',25),('offering_5','Offering #5','Offering','ordinary',26),('offering_6','Offering #6','Offering','ordinary',27);
create index worship_duties_department on app_private.worship_duties(department_key);
create table app_private.worship_services (
 id uuid primary key default gen_random_uuid(), worship_type text not null check(length(btrim(worship_type)) between 2 and 80),
 period text not null check(period in ('Early Morning','Morning','Afternoon','Evening','Commemoration')),
 begins_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'draft' check(status in ('draft','published','cancelled')),
 version integer not null default 0 check(version>=0), created_at timestamptz not null default clock_timestamp(),
 check(ends_at>begins_at),check(ends_at-begins_at<=interval '24 hours')
);
create index worship_services_upcoming on app_private.worship_services(begins_at,id) where status<>'cancelled';
create table app_private.worship_qualifications (
 member_id uuid not null references public.members on delete restrict,
 duty_id text not null references app_private.worship_duties on delete restrict,
 enabled boolean not null default true, primary key(member_id,duty_id)
);
create index worship_qualifications_duty on app_private.worship_qualifications(duty_id,member_id);
create table app_private.worship_roster_preferences (
 member_id uuid not null references public.members on delete restrict,
 department_key text not null references app_private.worship_departments on delete restrict,
 manual_only boolean not null default false,primary key(member_id,department_key)
);
create table app_private.worship_weekly_unavailable (
 member_id uuid not null references public.members on delete restrict,
 period text not null check(period in ('Early Morning','Morning','Afternoon','Evening','Commemoration')),
 primary key(member_id,period)
);
create table app_private.worship_days_off (
 member_id uuid not null references public.members on delete restrict,day date not null,primary key(member_id,day)
);
create table app_private.worship_service_availability (
 member_id uuid not null references public.members on delete restrict,
 service_id uuid not null references app_private.worship_services on delete restrict,
 available boolean not null,primary key(member_id,service_id)
);
create index worship_service_availability_service on app_private.worship_service_availability(service_id);
create table app_private.worship_availability_versions (
 member_id uuid primary key references public.members on delete restrict,version integer not null default 0 check(version>=0)
);
create table app_private.worship_approved_pairs (
 duty_a text not null references app_private.worship_duties on delete restrict,
 duty_b text not null references app_private.worship_duties on delete restrict,
 approved_by uuid not null references public.members on delete restrict,
 reason text not null check(length(btrim(reason)) between 5 and 500),
 approved_at timestamptz not null default clock_timestamp(),ended_at timestamptz,
 primary key(duty_a,duty_b),check(duty_a<duty_b),
 check(duty_a<>'opening_prayer' and duty_b<>'opening_prayer'),check(ended_at is null or ended_at>approved_at)
);
create table app_private.worship_assignments (
 service_id uuid not null references app_private.worship_services on delete restrict,
 duty_id text not null references app_private.worship_duties on delete restrict,
 member_id uuid references public.members on delete restrict,
 version integer not null default 1 check(version>=1),updated_at timestamptz not null default clock_timestamp(),
 primary key(service_id,duty_id)
);
create index worship_assignments_member on app_private.worship_assignments(member_id,service_id) where member_id is not null;
create index worship_assignments_duty on app_private.worship_assignments(duty_id);
create table app_private.worship_requests (
 id uuid primary key default gen_random_uuid(),service_id uuid not null,duty_id text not null,
 requested_by uuid not null references public.members on delete restrict,
 assignment_version integer not null check(assignment_version>=1),
 status text not null default 'pending' check(status in ('pending','withdrawn','approved','declined','closed')),
 created_at timestamptz not null default clock_timestamp(),resolved_at timestamptz,resolved_by uuid references public.members on delete restrict,
 foreign key(service_id,duty_id) references app_private.worship_assignments on delete restrict
);
create unique index worship_one_pending_request on app_private.worship_requests(service_id,duty_id,requested_by) where status='pending';
create index worship_requests_member on app_private.worship_requests(requested_by,created_at desc);
create table app_private.worship_song_editor_grants (
 id uuid primary key default gen_random_uuid(),member_id uuid not null references public.members on delete restrict,
 granted_at timestamptz not null default clock_timestamp(),ended_at timestamptz,
 granted_by uuid not null references public.members on delete restrict,
 reason text not null check(length(btrim(reason)) between 5 and 500),check(ended_at is null or ended_at>granted_at)
);
create unique index worship_one_song_editor on app_private.worship_song_editor_grants(member_id) where ended_at is null;
create table app_private.worship_songs (
 id uuid primary key default gen_random_uuid(),code text not null unique check(length(code) between 1 and 30),
 title text not null check(length(btrim(title)) between 1 and 150),duration_seconds integer not null check(duration_seconds between 1 and 3600),
 active boolean not null default true
);
create table app_private.worship_programs (
 service_id uuid primary key references app_private.worship_services on delete restrict,
 status text not null default 'draft' check(status in ('draft','confirmed','sung')),
 version integer not null default 0 check(version>=0),updated_by uuid references public.members on delete restrict,
 updated_at timestamptz not null default clock_timestamp()
);
create table app_private.worship_program_items (
 service_id uuid not null references app_private.worship_programs on delete restrict,
 section text not null check(section in ('preparation','glory','thanks','choir')),
 position smallint not null check(position between 1 and 20),song_id uuid not null references app_private.worship_songs on delete restrict,
 primary key(service_id,section,position),check(section='preparation' or position=1)
);
create index worship_program_items_song on app_private.worship_program_items(song_id);
create table app_private.worship_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.members on delete restrict,
 operation text not null,service_id uuid references app_private.worship_services on delete restrict,
 before_data jsonb,after_data jsonb,created_at timestamptz not null default clock_timestamp()
);
create index worship_audit_service on app_private.worship_audit(service_id,created_at desc);

create function app_private.worship_module_id() returns uuid language sql stable set search_path='' as $$
 select id from app_private.app_modules where module_key='worship-duty'
$$;
create function app_private.worship_can_manage(p_actor uuid,p_duty text) returns boolean language sql stable set search_path='' as $$
 select p_actor is not null and app_private.module_allowed(p_actor,app_private.worship_module_id()) and exists(
  select 1 from app_private.worship_duties d join app_private.worship_departments wd on wd.department_key=d.department_key
  where d.id=p_duty and app_private.manages_department(p_actor,wd.department_id)
 ) and exists(select 1 from app_private.module_access_grants g where g.member_id=p_actor and g.module_id=app_private.worship_module_id() and g.permission='manager' and g.ended_at is null and g.granted_at<=now())
$$;
create function app_private.worship_can_plan(p_actor uuid,p_service uuid) returns boolean language sql stable set search_path='' as $$
 select p_actor is not null and app_private.module_allowed(p_actor,app_private.worship_module_id()) and (
 exists(select 1 from app_private.worship_assignments a where a.service_id=p_service and a.duty_id='presider' and a.member_id=p_actor)
 or exists(select 1 from app_private.worship_song_editor_grants g where g.member_id=p_actor and g.ended_at is null and g.granted_at<=now()))
$$;
create function app_private.worship_has_choir(p_worship text) returns boolean language sql immutable set search_path='' as $$
 select lower(regexp_replace(btrim(coalesce(nullif(p_worship,''),'Sabbath Day')),'\s+',' ','g')) in ('sabbath day','third day')
$$;
create function app_private.worship_has_thanks(p_worship text,p_period text) returns boolean language sql immutable set search_path='' as $$
 select lower(btrim(p_period))='morning' and lower(regexp_replace(btrim(coalesce(nullif(p_worship,''),'Sabbath Day')),'\s+',' ','g')) not in ('third day','prayer week','preaching week')
$$;
create function app_private.worship_has_duty(p_worship text,p_period text,p_duty text) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from app_private.worship_duties where id=p_duty) and case p_duty when 'thanks_prayer' then app_private.worship_has_thanks(p_worship,p_period) when 'closing_prayer' then app_private.worship_has_choir(p_worship) else true end
$$;
create function app_private.worship_allowed_together(p_duties text[]) returns boolean language plpgsql stable set search_path='' as $$
 declare n integer:=cardinality(p_duties);a text;b text;ka text;kb text;
 begin
  if p_duties is null or array_position(p_duties,null) is not null or n>2 or (select count(distinct x) from unnest(p_duties) x)<>n then return false;end if;
  if exists(select 1 from unnest(p_duties) x where not exists(select 1 from app_private.worship_duties where id=x)) then return false;end if;
  if n<2 then return true;end if;
  if 'opening_prayer'=any(p_duties) then return false;end if;
  a:=p_duties[1];b:=p_duties[2];select kind into ka from app_private.worship_duties where id=a;select kind into kb from app_private.worship_duties where id=b;
  return (ka='prayer' and kb='usher') or (ka='usher' and kb='prayer') or exists(select 1 from app_private.worship_approved_pairs p where p.duty_a=least(a,b) and p.duty_b=greatest(a,b) and p.ended_at is null and p.approved_at<=now());
 end
$$;
create function app_private.worship_available(p_member uuid,p_service uuid) returns boolean language sql stable set search_path='' as $$
 select coalesce((select available from app_private.worship_service_availability where member_id=p_member and service_id=p_service),
 exists(select 1 from app_private.worship_services s where s.id=p_service
 and not exists(select 1 from app_private.worship_days_off x where x.member_id=p_member and x.day=(s.begins_at at time zone 'America/Los_Angeles')::date)
 and not exists(select 1 from app_private.worship_weekly_unavailable x where x.member_id=p_member and x.period=s.period)))
$$;
create function app_private.worship_eligible(p_member uuid,p_duty text) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.members m
 join app_private.worship_qualifications q on q.member_id=m.id and q.enabled
 join app_private.worship_duties d on d.id=q.duty_id
 join app_private.worship_departments wd on wd.department_key=d.department_key
 join public.departments dept on dept.id=wd.department_id and dept.is_active
 join public.department_memberships dm on dm.member_id=m.id and dm.department_id=dept.id and dm.ended_at is null and dm.started_at<=now()
 where m.id=p_member and m.status='active' and d.id=p_duty and app_private.module_allowed(p_member,app_private.worship_module_id()))
$$;
-- Database-level invariant, not only a browser candidate filter. A service row serializes its slots.
create function app_private.worship_assignment_guard() returns trigger language plpgsql set search_path='' as $$
 declare s app_private.worship_services;others text[];
 begin
  select * into s from app_private.worship_services where id=new.service_id for update;
  if not found or not app_private.worship_has_duty(s.worship_type,s.period,new.duty_id) then raise exception 'Duty does not apply to this service' using errcode='23514';end if;
  if new.member_id is null then return new;end if;
  if not app_private.worship_eligible(new.member_id,new.duty_id) then raise exception 'Active, qualified department member required' using errcode='23514';end if;
  if not app_private.worship_available(new.member_id,new.service_id) then raise exception 'Member unavailable for this service' using errcode='23514';end if;
  select coalesce(array_agg(duty_id),'{}'::text[]) into others from app_private.worship_assignments where service_id=new.service_id and member_id=new.member_id and duty_id<>new.duty_id;
  if not app_private.worship_allowed_together(others||array[new.duty_id]) then raise exception 'Conflicting assignment' using errcode='23514';end if;
  return new;
 end
$$;
create trigger worship_assignment_invariants before insert or update of member_id,duty_id,service_id on app_private.worship_assignments for each row execute function app_private.worship_assignment_guard();
-- All local variables use v_ prefixes: no implicit block-label or ambiguous column references.
create function app_private.worship_set_assignment(p_actor uuid,p_service uuid,p_duty text,p_member uuid) returns void language plpgsql set search_path='' as $$
 declare v_service app_private.worship_services;v_old_member uuid;v_module_id uuid:=app_private.worship_module_id();v_ref text;
 begin
  select * into v_service from app_private.worship_services where id=p_service;
  select member_id into v_old_member from app_private.worship_assignments where service_id=p_service and duty_id=p_duty;
  insert into app_private.worship_assignments(service_id,duty_id,member_id) values(p_service,p_duty,p_member)
  on conflict(service_id,duty_id) do update set member_id=excluded.member_id,version=app_private.worship_assignments.version+1,updated_at=clock_timestamp();
  if v_service.status='published' and v_old_member is distinct from p_member then
   if v_old_member is not null then
    v_ref:=p_service::text||':'||p_duty||':'||v_old_member::text;
    update app_private.module_activities set status='cancelled' where module_id=v_module_id and external_reference=v_ref;
    insert into app_private.module_notices(module_id,recipient_member_id,requires_action) values(v_module_id,v_old_member,false);
   end if;
   if p_member is not null then
    v_ref:=p_service::text||':'||p_duty||':'||p_member::text;
    insert into app_private.module_activities(module_id,recipient_member_id,title,context,begins_at,ends_at,external_reference)
    select v_module_id,p_member,label,v_service.worship_type||' · '||v_service.period,v_service.begins_at,v_service.ends_at,v_ref from app_private.worship_duties where id=p_duty
    on conflict(module_id,external_reference) where external_reference is not null do update set status='scheduled',begins_at=excluded.begins_at,ends_at=excluded.ends_at;
    insert into app_private.module_notices(module_id,recipient_member_id,requires_action) values(v_module_id,p_member,false);
   end if;
  end if;
 end
$$;

create function app_private.worship_command(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
 declare v_actor uuid;v_op text;v_keys text[];v_service app_private.worship_services;v_request app_private.worship_requests;
 v_assignment app_private.worship_assignments;v_service_id uuid;v_duty_id text;v_target uuid;v_expected integer;v_result_id uuid;
 v_before jsonb;v_after jsonb;v_decision text;v_availability_version integer;v_day_off date;v_item jsonb;v_program_version integer;v_program_status text;
 begin
  -- Same lock as member_command: role/membership revocation and duty writes cannot interleave.
  perform pg_advisory_xact_lock(741085);
  v_actor:=app_private.current_member_id();
  if v_actor is null or not app_private.module_allowed(v_actor,app_private.worship_module_id()) then raise exception 'Not authorized' using errcode='42501';end if;
  if jsonb_typeof(p_command) is distinct from 'object' or octet_length(p_command::text)>12000 then raise exception 'Invalid command' using errcode='22023';end if;
  v_op:=p_command->>'op';
  v_keys:=case v_op when 'assign' then array['op','serviceId','dutyId','memberId','expectedVersion']
   when 'request' then array['op','serviceId','dutyId','expectedVersion']
   when 'withdraw' then array['op','requestId']
   when 'resolve' then array['op','requestId','decision','memberId','expectedVersion']
   when 'availability' then array['op','day','unavailable','expectedVersion']
   when 'program' then array['op','serviceId','expectedVersion','expectedProgramVersion','status','items'] end;
  if v_keys is null or exists(select 1 from jsonb_object_keys(p_command) k where not k=any(v_keys)) then raise exception 'Invalid command fields' using errcode='22023';end if;
  if v_op<>'withdraw' then
   if jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or (p_command->>'expectedVersion')!~'^[0-9]{1,9}$' then raise exception 'Expected version required' using errcode='22023';end if;
   v_expected:=(p_command->>'expectedVersion')::integer;
  end if;
  if v_op='availability' then
   if jsonb_typeof(p_command->'unavailable') is distinct from 'boolean' or coalesce(p_command->>'day','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid availability' using errcode='22023';end if;
   v_day_off:=(p_command->>'day')::date;
   if v_day_off<(now() at time zone 'America/Los_Angeles')::date or v_day_off>(now() at time zone 'America/Los_Angeles')::date+366 then raise exception 'Availability date outside allowed range' using errcode='22023';end if;
   insert into app_private.worship_availability_versions(member_id) values(v_actor) on conflict do nothing;
   select version into v_availability_version from app_private.worship_availability_versions where member_id=v_actor for update;
   if v_availability_version<>v_expected then raise exception 'Availability changed' using errcode='40001';end if;
   v_before:=jsonb_build_object('day',v_day_off,'unavailable',exists(select 1 from app_private.worship_days_off where member_id=v_actor and day=v_day_off));
   if (p_command->>'unavailable')::boolean then insert into app_private.worship_days_off(member_id,day) values(v_actor,v_day_off) on conflict do nothing;
   else delete from app_private.worship_days_off where member_id=v_actor and day=v_day_off;end if;
   update app_private.worship_availability_versions set version=version+1 where member_id=v_actor;
   v_after:=jsonb_build_object('day',v_day_off,'unavailable',p_command->'unavailable','version',v_availability_version+1);
  elsif v_op='withdraw' then
   select * into v_request from app_private.worship_requests where id=(p_command->>'requestId')::uuid for update;
   if not found or v_request.requested_by<>v_actor or v_request.status<>'pending' then raise exception 'Not authorized' using errcode='42501';end if;
   v_service_id:=v_request.service_id;v_before:=to_jsonb(v_request);
   update app_private.worship_requests set status='withdrawn',resolved_at=clock_timestamp(),resolved_by=v_actor where id=v_request.id;
   v_after:=jsonb_build_object('requestId',v_request.id,'status','withdrawn');
  else
   if v_op='resolve' then
    select * into v_request from app_private.worship_requests where id=(p_command->>'requestId')::uuid for update;
    if not found or not app_private.worship_can_manage(v_actor,v_request.duty_id) then raise exception 'Not authorized' using errcode='42501';end if;
    if v_request.status<>'pending' then raise exception 'Request already answered' using errcode='40001';end if;
    v_service_id:=v_request.service_id;v_duty_id:=v_request.duty_id;v_decision:=p_command->>'decision';
    if v_decision is null or v_decision not in ('replace','open','decline','close') then raise exception 'Invalid decision' using errcode='22023';end if;
   else v_service_id:=(p_command->>'serviceId')::uuid;v_duty_id:=p_command->>'dutyId';end if;
   select * into v_service from app_private.worship_services where id=v_service_id for update;
   if not found then raise exception 'Service unavailable' using errcode='42501';end if;
   if v_op='assign' and not app_private.worship_can_manage(v_actor,v_duty_id) then raise exception 'Not authorized' using errcode='42501';end if;
   if v_op='program' and not app_private.worship_can_plan(v_actor,v_service_id) then raise exception 'Not authorized' using errcode='42501';end if;
   select * into v_assignment from app_private.worship_assignments a where a.service_id=v_service_id and a.duty_id=v_duty_id;
   if v_op='request' and (v_assignment.member_id is distinct from v_actor or v_service.status<>'published') then raise exception 'Only your published assignment can be requested' using errcode='42501';end if;
   if not(v_op='resolve' and v_decision='close') and (v_service.status='cancelled' or v_service.begins_at<=clock_timestamp()) then raise exception 'Service closed to changes' using errcode='23514';end if;
   if v_service.version<>v_expected then raise exception 'Service changed' using errcode='40001';end if;
   v_before:=case when v_op='resolve' then to_jsonb(v_request) else to_jsonb(v_assignment) end;
   if v_op='assign' then
    if not(p_command?'memberId') then raise exception 'Explicit member or null required' using errcode='22023';end if;
    v_target:=(p_command->>'memberId')::uuid;
    perform app_private.worship_set_assignment(v_actor,v_service_id,v_duty_id,v_target);
    update app_private.worship_services set version=version+1 where id=v_service_id;
    v_after:=jsonb_build_object('serviceId',v_service_id,'dutyId',v_duty_id,'memberId',v_target,'version',v_service.version+1);
   elsif v_op='request' then
    insert into app_private.worship_requests(service_id,duty_id,requested_by,assignment_version) values(v_service_id,v_duty_id,v_actor,v_assignment.version) returning id into v_result_id;
    v_after:=jsonb_build_object('requestId',v_result_id,'status','pending');
   elsif v_op='resolve' then
    if v_decision<>'close' and (v_assignment.member_id is distinct from v_request.requested_by or v_assignment.version is distinct from v_request.assignment_version) then raise exception 'Stale request: close without changing assignment' using errcode='40001';end if;
    if v_decision in ('replace','open') then
     v_target:=case when v_decision='replace' then (p_command->>'memberId')::uuid else null end;
     if v_decision='replace' and (v_target is null or v_target=v_request.requested_by) then raise exception 'Different replacement required' using errcode='22023';end if;
     perform app_private.worship_set_assignment(v_actor,v_service_id,v_duty_id,v_target);
     update app_private.worship_services set version=version+1 where id=v_service_id;
    end if;
    update app_private.worship_requests set status=case v_decision when 'decline' then 'declined' when 'close' then 'closed' else 'approved' end,resolved_at=clock_timestamp(),resolved_by=v_actor where id=v_request.id;
    v_after:=jsonb_build_object('requestId',v_request.id,'decision',v_decision,'memberId',v_target);
   elsif v_op='program' then
    if jsonb_typeof(p_command->'items') is distinct from 'array' or jsonb_array_length(p_command->'items')>23 or (p_command->>'status') not in ('draft','confirmed') or p_command->>'status' is null
     or coalesce(p_command->>'expectedProgramVersion','')!~'^[0-9]{1,9}$' or jsonb_typeof(p_command->'expectedProgramVersion') is distinct from 'number' then raise exception 'Invalid program' using errcode='22023';end if;
    select version,status into v_program_version,v_program_status from app_private.worship_programs where service_id=v_service_id for update;
    if v_program_status='sung' then raise exception 'Song history is immutable here' using errcode='23514';end if;
    if coalesce(v_program_version,0)<>(p_command->>'expectedProgramVersion')::integer then raise exception 'Program changed' using errcode='40001';end if;
    v_before:=jsonb_build_object('version',coalesce(v_program_version,0),'status',v_program_status,'items',coalesce((select jsonb_agg(to_jsonb(i)) from app_private.worship_program_items i where i.service_id=v_service_id),'[]'::jsonb));
    insert into app_private.worship_programs(service_id,status,version,updated_by) values(v_service_id,p_command->>'status',1,v_actor)
    on conflict(service_id) do update set status=excluded.status,version=app_private.worship_programs.version+1,updated_by=v_actor,updated_at=clock_timestamp();
    delete from app_private.worship_program_items i where i.service_id=v_service_id;
    for v_item in select value from jsonb_array_elements(p_command->'items') loop
     if jsonb_typeof(v_item)<>'object' or not(v_item?&array['section','position','songId']) or exists(select 1 from jsonb_object_keys(v_item) k where k not in ('section','position','songId')) then raise exception 'Invalid program item' using errcode='22023';end if;
     if jsonb_typeof(v_item->'position') is distinct from 'number' or coalesce(v_item->>'position','')!~'^[0-9]{1,2}$' then raise exception 'Invalid song position' using errcode='22023';end if;
     if (v_item->>'section'='thanks' and not app_private.worship_has_thanks(v_service.worship_type,v_service.period)) or (v_item->>'section'='choir' and not app_private.worship_has_choir(v_service.worship_type)) then raise exception 'Song section not applicable' using errcode='23514';end if;
     if not exists(select 1 from app_private.worship_songs where id=(v_item->>'songId')::uuid and active) then raise exception 'Approved song required' using errcode='23514';end if;
     insert into app_private.worship_program_items(service_id,section,position,song_id) values(v_service_id,v_item->>'section',(v_item->>'position')::smallint,(v_item->>'songId')::uuid);
    end loop;
    v_after:=jsonb_build_object('serviceId',v_service_id,'status',p_command->>'status','version',coalesce(v_program_version,0)+1,'items',p_command->'items');
   end if;
  end if;
  insert into app_private.worship_audit(actor_id,operation,service_id,before_data,after_data) values(v_actor,v_op,v_service_id,v_before,v_after);
  return v_after;
 end
$$;

-- Bounded, whitelisted projection. Name visibility is decided in PostgreSQL, never by client roles.
create function app_private.worship_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare v_actor uuid:=app_private.current_member_id();
 begin
  if v_actor is null or not app_private.module_allowed(v_actor,app_private.worship_module_id()) then raise exception 'Not authorized' using errcode='42501';end if;
  return jsonb_build_object('memberId',v_actor,'timezone','America/Los_Angeles',
   'manageDepartments',coalesce((select jsonb_agg(distinct d.department_key) from app_private.worship_duties d where app_private.worship_can_manage(v_actor,d.id)),'[]'::jsonb),
   'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'worship',s.worship_type,'period',s.period,'startsAt',s.begins_at,'endsAt',s.ends_at,'status',s.status,'version',s.version,'canPlan',app_private.worship_can_plan(v_actor,s.id),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object('dutyId',a.duty_id,'filled',a.member_id is not null,'isMine',a.member_id=v_actor,
     'memberId',case when a.member_id=v_actor or app_private.worship_can_manage(v_actor,a.duty_id) or exists(select 1 from public.member_placements p join public.members m on m.id=p.member_id where p.member_id=a.member_id and m.status='active' and p.ended_at is null and p.started_at<=now() and p.group_id=app_private.own_group_id()) then a.member_id end,
     'name',case when a.member_id is null then 'Not filled' when a.member_id=v_actor then 'You' when app_private.worship_can_manage(v_actor,a.duty_id) or exists(select 1 from public.member_placements p join public.members m on m.id=p.member_id where p.member_id=a.member_id and m.status='active' and p.ended_at is null and p.started_at<=now() and p.group_id=app_private.own_group_id()) then (select display_name from public.members where id=a.member_id) else 'Assigned member' end,
     'availabilityConflict',case when a.member_id=v_actor or app_private.worship_can_manage(v_actor,a.duty_id) then a.member_id is not null and not app_private.worship_available(a.member_id,s.id) else null end) order by d.sort_order)
     from app_private.worship_assignments a join app_private.worship_duties d on d.id=a.duty_id where a.service_id=s.id),'[]'::jsonb)) order by s.begins_at,s.id)
    from (select * from app_private.worship_services ws where ws.begins_at>=now()-interval '7 days' and ws.begins_at<now()+interval '90 days' and (ws.status='published' or exists(select 1 from app_private.worship_duties d where app_private.worship_can_manage(v_actor,d.id))) order by ws.begins_at,ws.id limit 80) s),'[]'::jsonb),
   'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'serviceId',r.service_id,'dutyId',r.duty_id,'isMine',r.requested_by=v_actor,'status',r.status,'stale',a.member_id is distinct from r.requested_by or a.version<>r.assignment_version or s.status='cancelled' or s.begins_at<=now()) order by r.created_at desc) from (select * from app_private.worship_requests where requested_by=v_actor or app_private.worship_can_manage(v_actor,duty_id) order by created_at desc limit 100) r join app_private.worship_assignments a on a.service_id=r.service_id and a.duty_id=r.duty_id join app_private.worship_services s on s.id=r.service_id),'[]'::jsonb),
   'daysOff',coalesce((select jsonb_agg(day order by day) from app_private.worship_days_off where member_id=v_actor and day>=(now() at time zone 'America/Los_Angeles')::date and day<=(now() at time zone 'America/Los_Angeles')::date+366),'[]'::jsonb),
   'availabilityVersion',coalesce((select version from app_private.worship_availability_versions where member_id=v_actor),0),
   'programs',coalesce((select jsonb_agg(jsonb_build_object('serviceId',p.service_id,'status',p.status,'version',p.version,'items',coalesce((select jsonb_agg(jsonb_build_object('section',i.section,'position',i.position,'songId',i.song_id) order by i.section,i.position) from app_private.worship_program_items i where i.service_id=p.service_id),'[]'::jsonb))) from app_private.worship_programs p join app_private.worship_services s on s.id=p.service_id where s.begins_at>=now()-interval '7 days' and s.begins_at<now()+interval '90 days' and app_private.worship_can_plan(v_actor,s.id)),'[]'::jsonb)
  );
 end
$$;
create function public.worship_workspace() returns jsonb language sql stable security invoker set search_path='' as $$select app_private.worship_workspace()$$;
create function public.worship_command(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.worship_command(p_command)$$;
do $$declare t record;f record;begin
 for t in select tablename from pg_tables where schemaname='app_private' and tablename like 'worship_%' loop
  execute format('alter table app_private.%I enable row level security',t.tablename);
  execute format('revoke all on app_private.%I from public,anon,authenticated',t.tablename);
 end loop;
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname like 'worship_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;
end$$;
revoke all on function public.worship_workspace(),public.worship_command(jsonb) from public,anon,authenticated;
grant execute on function app_private.worship_workspace(),app_private.worship_command(jsonb) to authenticated;
grant execute on function public.worship_workspace(),public.worship_command(jsonb) to authenticated;
-- No registry/grant, override, import, service-lifecycle or song-history administrator API.
-- No triggers/jobs deliver messages; module_notices are generic in-app records only.
commit;
