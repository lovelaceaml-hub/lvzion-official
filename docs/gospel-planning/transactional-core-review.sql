-- Groups & Gospel Planning R2: UNAPPLIED transactional-core review artifact.
-- NOT a migration, activation instruction, or complete runtime. Apply only in the
-- disposable test harness after the four pinned member-foundation migrations.
-- No identities, module registrations, capabilities, or locations are seeded here.
-- Restricted Member Updates and Overseer Requests are deliberately NOT accepted
-- by this core; their confidentiality/history contract remains a separate gate.
begin;
create extension if not exists btree_gist;
create schema gp_private;
revoke all on schema gp_private from public, anon, authenticated, service_role;
alter default privileges in schema gp_private revoke execute on functions from public;

create table gp_private.capability_grants (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.members,
 placement_id uuid not null references public.member_placements,
 group_id uuid not null references public.church_groups,
 unit_id uuid references public.church_units,
 capability text not null check(capability in ('plan_edit','schedule','publish')),
 appointment_id uuid references app_private.role_assignments,
 granted_at timestamptz not null default clock_timestamp(), ended_at timestamptz,
 check(ended_at is null or ended_at>granted_at),
 check(capability='schedule' or unit_id is null),
 check(capability<>'plan_edit' or appointment_id is not null)
);
create index gp_capability_lookup on gp_private.capability_grants(member_id,group_id,capability) where ended_at is null;
create table gp_private.locations (
 id uuid primary key default gen_random_uuid(),
 label text not null check(length(btrim(label)) between 1 and 120),
 active boolean not null default true
);
create table gp_private.availability (
 member_id uuid primary key references public.members,
 placement_id uuid not null references public.member_placements,
 version integer not null check(version>0),
 windows tstzmultirange not null,
 confirmed_at timestamptz not null default clock_timestamp()
);
create table gp_private.sessions (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.church_groups,
 creator_id uuid not null references public.members,
 creator_placement_id uuid not null references public.member_placements,
 version integer not null default 1 check(version>0),
 starts_at timestamptz not null, ends_at timestamptz not null,
 location_id uuid not null references gp_private.locations,
 phase text not null default 'proposal' check(phase in ('proposal','published','cancelled')),
 report_version integer not null default 0 check(report_version>=0),
 created_at timestamptz not null default clock_timestamp(),
 check(isfinite(starts_at) and isfinite(ends_at) and ends_at>starts_at and ends_at-starts_at<=interval '24 hours')
);
create index gp_session_group_time on gp_private.sessions(group_id,starts_at,id);
create table gp_private.session_revisions (
 session_id uuid not null references gp_private.sessions,
 version integer not null check(version>0),
 starts_at timestamptz not null, ends_at timestamptz not null,
 location_id uuid not null references gp_private.locations,
 author_id uuid not null references public.members,
 created_at timestamptz not null default clock_timestamp(),
 primary key(session_id,version),
 check(isfinite(starts_at) and isfinite(ends_at) and ends_at>starts_at)
);
create table gp_private.participants (
 session_id uuid not null, session_version integer not null,
 member_id uuid not null references public.members,
 placement_id uuid not null references public.member_placements,
 availability_version integer not null check(availability_version>=0),
 primary key(session_id,session_version,member_id),
 foreign key(session_id,session_version) references gp_private.session_revisions
);
create index gp_participant_member on gp_private.participants(member_id,session_id,session_version);
create table gp_private.responses (
 session_id uuid not null, session_version integer not null, member_id uuid not null,
 response text not null check(response in ('accepted','declined')),
 version integer not null check(version>0),
 primary key(session_id,session_version,member_id),
 foreign key(session_id,session_version,member_id) references gp_private.participants
);
create table gp_private.response_history (
 session_id uuid not null, session_version integer not null, member_id uuid not null,
 response text not null check(response in ('accepted','declined')),
 response_version integer not null check(response_version>0),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(session_id,session_version,member_id,response_version),
 foreign key(session_id,session_version,member_id) references gp_private.participants
);
create table gp_private.commitments (
 session_id uuid not null, session_version integer not null, member_id uuid not null,
 during tstzrange not null,
 primary key(session_id,member_id),
 foreign key(session_id,session_version,member_id) references gp_private.participants,
 check(not isempty(during) and not lower_inf(during) and not upper_inf(during)
   and isfinite(lower(during)) and isfinite(upper(during)) and lower_inc(during) and not upper_inc(during)),
 exclude using gist(member_id with =, during with &&)
);
-- The exclusion constraint must protect the actual immutable revision interval.
create function gp_private.commitment_window_match() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from gp_private.session_revisions r where r.session_id=new.session_id and r.version=new.session_version
   and new.during=tstzrange(r.starts_at,r.ends_at,'[)')) then
  raise exception 'GP_COMMITMENT_WINDOW' using errcode='23514';end if;
 return new;
end $$;
create trigger gp_commitment_window before insert or update on gp_private.commitments
 for each row execute function gp_private.commitment_window_match();
create table gp_private.plans (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.church_groups, week date not null,
 version integer not null check(version>0),
 summary text not null check(length(btrim(summary)) between 1 and 1200),
 activity text not null check(length(btrim(activity)) between 1 and 1200),
 next_action text not null check(length(btrim(next_action)) between 1 and 1200),
 unique(group_id,week), check(extract(isodow from week)=1)
);
create table gp_private.publications (
 plan_id uuid not null references gp_private.plans, version integer not null check(version>0),
 summary text not null, activity text not null, next_action text not null,
 author_id uuid not null references public.members,
 published_at timestamptz not null default clock_timestamp(), primary key(plan_id,version)
);
create table gp_private.reports (
 session_id uuid not null references gp_private.sessions, version integer not null check(version>0),
 session_version integer not null, author_id uuid not null references public.members,
 author_placement_id uuid not null references public.member_placements,
 historical_group_id uuid not null references public.church_groups,
 outcome text not null check(outcome in ('completed','not-held')),
 summary text not null check(length(btrim(summary)) between 1 and 1200),
 correction_reason text not null check(length(correction_reason)<=1200),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(session_id,version), foreign key(session_id,session_version) references gp_private.session_revisions,
 check(version=1 or length(btrim(correction_reason))>0)
);
create table gp_private.receipts (
 actor_id uuid not null references public.members, request_id uuid not null,
 placement_id uuid not null references public.member_placements,
 action text not null, payload_digest text not null check(length(payload_digest)=64),
 resource_id uuid not null, result jsonb not null,
 created_at timestamptz not null default clock_timestamp(), primary key(actor_id,request_id)
);
create table gp_private.audit (
 id bigint generated always as identity primary key,
 actor_id uuid not null references public.members, action text not null,
 resource_id uuid not null, version integer not null,
 recorded_at timestamptz not null default clock_timestamp()
);
-- No note bodies, contact identifiers, meeting credentials, or inferred outcomes
-- enter this audit table. No notices, feeds, calendar writes or broadcasts are sent.

do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='gp_private' loop
  execute format('alter table gp_private.%I enable row level security',t.tablename);
  execute format('revoke all on gp_private.%I from public,anon,authenticated,service_role',t.tablename);
 end loop;
end $$;

create function gp_private.immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'GP_IMMUTABLE' using errcode='55000'; end $$;
do $$ declare n text; begin
 foreach n in array array['session_revisions','participants','response_history','publications','reports','receipts','audit'] loop
  execute format('create trigger gp_immutable before update or delete on gp_private.%I for each row execute function gp_private.immutable()',n);
 end loop;
end $$;

create function gp_private.placement(p_member uuid) returns public.member_placements
language sql stable set search_path='' as $$
 select p from public.member_placements p
 join public.members m on m.id=p.member_id
 join public.church_units u on u.id=p.unit_id and u.group_id=p.group_id
 join public.church_groups g on g.id=p.group_id
 join public.age_categories c on c.id=g.age_category_id
 where p.member_id=p_member and m.status='active' and p.ended_at is null and p.started_at<=now()
 and u.is_active and g.is_active and c.is_active
 and exists(select 1 from app_private.app_modules x where x.module_key='gospel-planning' and app_private.module_allowed(p_member,x.id))
 limit 1
$$;
create function gp_private.capable(p_member uuid,p_cap text,p_group uuid,p_unit uuid default null) returns boolean
language sql stable set search_path='' as $$
 select exists(
  select 1 from gp_private.capability_grants c
  join public.member_placements p on p.id=c.placement_id and p.member_id=c.member_id
  where c.member_id=p_member and c.capability=p_cap and c.group_id=p_group
   and c.ended_at is null and c.granted_at<=now()
   and p.id=(gp_private.placement(p_member)).id and p.group_id=p_group
   and (c.unit_id is null or c.unit_id=p_unit)
   and (c.appointment_id is null or exists(
    select 1 from app_private.role_assignments r where r.id=c.appointment_id and r.member_id=p_member
     and r.ended_at is null and r.appointed_at<=now()
     and ((r.role_key='group_leader' and r.group_id=p_group)
       or (c.capability='schedule' and r.role_key='unit_leader' and r.unit_id=c.unit_id))
   ))
 )
$$;
create function gp_private.own_session(p_member uuid,p_session uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from gp_private.sessions s join gp_private.participants p
 on p.session_id=s.id and p.session_version=s.version
 where s.id=p_session and p.member_id=p_member and p.placement_id=(gp_private.placement(p_member)).id
 and s.group_id=(gp_private.placement(p_member)).group_id)
$$;
create function gp_private.manages_session(p_member uuid,p_session uuid) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from gp_private.sessions s where s.id=p_session and (
 gp_private.capable(p_member,'plan_edit',s.group_id) or gp_private.capable(p_member,'schedule',s.group_id)
 or (exists(select 1 from gp_private.participants p where p.session_id=s.id and p.session_version=s.version)
  and not exists(select 1 from gp_private.participants p join public.member_placements mp on mp.id=p.placement_id
   where p.session_id=s.id and p.session_version=s.version and (mp.id is distinct from (gp_private.placement(p.member_id)).id or not gp_private.capable(p_member,'schedule',s.group_id,mp.unit_id))))
 ))
$$;
create function gp_private.readable_session(p_member uuid,p_session uuid) returns boolean
language sql stable set search_path='' as $$
 select gp_private.own_session(p_member,p_session) or gp_private.manages_session(p_member,p_session)
 or exists(select 1 from gp_private.sessions s where s.id=p_session and gp_private.capable(p_member,'publish',s.group_id))
$$;
create function gp_private.strict_keys(p jsonb,keys text[]) returns void language plpgsql set search_path='' as $$
begin
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>32768
 or exists(select 1 from jsonb_object_keys(p) k where not(k=any(keys)))
 or exists(select 1 from unnest(keys) k where not(p ? k) or p->k='null'::jsonb) then
  raise exception 'GP_INVALID' using errcode='22023';
 end if;
end $$;
create function gp_private.natural(p jsonb) returns integer language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(p)<>'number' or p::text !~ '^(0|[1-9][0-9]{0,8})$' then raise exception 'GP_INVALID' using errcode='22023';end if;
 return p::text::integer;
end $$;
create function gp_private.words(p jsonb,required boolean default true) returns text language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(p)<>'string' or length(p#>>'{}')>1200 or (required and length(btrim(p#>>'{}'))=0) then
  raise exception 'GP_INVALID' using errcode='22023';end if;
 return btrim(p#>>'{}');
end $$;
create function gp_private.moment(p jsonb) returns timestamptz language plpgsql set search_path='' as $$
declare v timestamptz; begin
 if jsonb_typeof(p)<>'string' or (p#>>'{}') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$' then
  raise exception 'GP_INVALID_TIME' using errcode='22007'; end if;
 v:=(p#>>'{}')::timestamptz;
 if not isfinite(v) then raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
 return v;
end $$;
create function gp_private.session_members(p_actor uuid,p_ids jsonb) returns uuid[] language plpgsql set search_path='' as $$
declare ids uuid[]; p public.member_placements; own_p public.member_placements:=gp_private.placement(p_actor); v uuid; all_scoped boolean:=true; begin
 if jsonb_typeof(p_ids)<>'array' or jsonb_array_length(p_ids)<>2 then raise exception 'GP_INVALID' using errcode='22023';end if;
 select array_agg(x::uuid order by x) into ids from jsonb_array_elements_text(p_ids) x;
 if ids[1] is null or ids[2] is null or ids[1]=ids[2] then raise exception 'GP_INVALID' using errcode='22023';end if;
 foreach v in array ids loop
  p:=gp_private.placement(v);
  if p.id is null or p.group_id<>own_p.group_id then raise exception 'GP_DENIED' using errcode='42501';end if;
  all_scoped:=all_scoped and (gp_private.capable(p_actor,'plan_edit',p.group_id) or gp_private.capable(p_actor,'schedule',p.group_id,p.unit_id));
 end loop;
 if not(p_actor=any(ids)) and not all_scoped then raise exception 'GP_DENIED' using errcode='42501';end if;
 return ids;
end $$;
create function gp_private.validate_published(p_session uuid,check_snapshot boolean) returns void language plpgsql set search_path='' as $$
declare s gp_private.sessions; p record; av gp_private.availability; v_during tstzrange; current_p public.member_placements; begin
 select * into strict s from gp_private.sessions where id=p_session;
 v_during:=tstzrange(s.starts_at,s.ends_at,'[)');
 if not exists(select 1 from gp_private.locations where id=s.location_id and active) then raise exception 'GP_UNAVAILABLE' using errcode='22023';end if;
 for p in select * from gp_private.participants where session_id=s.id and session_version=s.version loop
  current_p:=gp_private.placement(p.member_id);
  if current_p.id is null or current_p.id<>p.placement_id or current_p.group_id<>s.group_id then raise exception 'GP_DENIED' using errcode='42501';end if;
  select * into av from gp_private.availability where member_id=p.member_id and placement_id=p.placement_id;
  if check_snapshot and coalesce(av.version,0)<>p.availability_version then raise exception 'GP_STALE_AVAILABILITY' using errcode='40001';end if;
  if av.member_id is null or not(av.windows @> v_during) then raise exception 'GP_AVAILABILITY' using errcode='23514';end if;
  if exists(select 1 from gp_private.commitments c where c.member_id=p.member_id and c.session_id<>s.id and c.during && v_during) then
   raise exception 'GP_OVERLAP' using errcode='23P01';end if;
 end loop;
end $$;

-- This internal command is NOT granted to browser/API roles. Identity is always
-- derived from the foundation's session validator, never a caller actor field.
-- Share the foundation's serialization lock so scope revocation and writes use
-- the same ordering. Coarse locking is intentional for the initial small pilot;
-- row-level optimization needs equivalent revocation/concurrency evidence first.
create function gp_private.command(p_action text,p jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
<<gp_command>>
declare
 a uuid; ap public.member_placements; cp public.member_placements; s gp_private.sessions; pl gp_private.plans;
 rc gp_private.receipts; av gp_private.availability; publication gp_private.publications;
 ids uuid[]; member uuid; id uuid; v integer; expected integer; response_version integer; result jsonb;
 digest text; start_at timestamptz; end_at timestamptz; loc uuid; during tstzrange; windows tstzmultirange:='{}'; w jsonb;
 g uuid; week_date date; outcome text; summary text; reason text;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'GP_ISOLATION_REQUIRED' using errcode='25001';end if;
 perform pg_advisory_xact_lock(741085);
 a:=app_private.current_member_id(); ap:=gp_private.placement(a);
 if a is null or ap.id is null then raise exception 'GP_DENIED' using errcode='42501';end if;
 if p_action is null or p_request_id is null then raise exception 'GP_INVALID' using errcode='22023';end if;
 case p_action
 when 'availability.save' then perform gp_private.strict_keys(p,array['expected','windows']); id:=a;
 when 'plan.save' then
  perform gp_private.strict_keys(p,array['groupId','week','expected','summary','activity','nextAction']);g:=(p->>'groupId')::uuid;
  if not gp_private.capable(a,'plan_edit',g) then raise exception 'GP_DENIED' using errcode='42501';end if;
 when 'plan.publish' then
  perform gp_private.strict_keys(p,array['id','expected']);select * into pl from gp_private.plans where plans.id=(p->>'id')::uuid;
  if pl.id is null or not gp_private.capable(a,'publish',pl.group_id) then raise exception 'GP_DENIED' using errcode='42501';end if; id:=pl.id;
 when 'session.create' then
  perform gp_private.strict_keys(p,array['start','end','locationId','participants']);ids:=gp_private.session_members(a,p->'participants');
 when 'session.revise','session.publish','session.respond','session.cancel','report.save' then
  case p_action
   when 'session.revise' then perform gp_private.strict_keys(p,array['id','expected','start','end','locationId','participants']);
   when 'session.respond' then perform gp_private.strict_keys(p,array['id','expected','expectedResponse','response']);
   when 'report.save' then perform gp_private.strict_keys(p,array['id','expected','expectedReport','outcome','summary','reason']);
   else perform gp_private.strict_keys(p,array['id','expected']);
  end case;
  select * into s from gp_private.sessions where sessions.id=(p->>'id')::uuid;
  if s.id is null or not gp_private.readable_session(a,s.id) then raise exception 'GP_DENIED' using errcode='42501';end if;id:=s.id;
  if p_action='session.publish' and not gp_private.capable(a,'publish',s.group_id) then raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action in ('session.respond','report.save') and not gp_private.own_session(a,s.id) then raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action in ('session.revise','session.cancel') and not(gp_private.manages_session(a,s.id) or (s.creator_id=a and s.creator_placement_id=ap.id)) then
   raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action='session.revise' then ids:=gp_private.session_members(a,p->'participants');end if;
 else raise exception 'GP_INVALID' using errcode='22023';
 end case;
 -- Current capability/resource authorization above is repeated even on retry.
 digest:=encode(sha256(convert_to(p_action||':'||p::text,'UTF8')),'hex');
 select * into rc from gp_private.receipts where actor_id=a and request_id=p_request_id;
 if rc.actor_id is not null then
  if rc.placement_id<>ap.id then raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action='session.create' and not gp_private.readable_session(a,rc.resource_id) then raise exception 'GP_DENIED' using errcode='42501';end if;
  if rc.action<>p_action or rc.payload_digest<>digest then raise exception 'GP_RETRY_CONFLICT' using errcode='22023';end if;
  return rc.result||jsonb_build_object('replayed',true);
 end if;
 if p ? 'expected' then expected:=gp_private.natural(p->'expected');end if;
 if s.id is not null and s.version<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
 case p_action
 when 'availability.save' then
  select * into av from gp_private.availability where member_id=a;
  if coalesce(av.version,0)<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
  if jsonb_typeof(p->'windows')<>'array' or jsonb_array_length(p->'windows')>56 then raise exception 'GP_INVALID' using errcode='22023';end if;
  for w in select value from jsonb_array_elements(p->'windows') loop
   perform gp_private.strict_keys(w,array['start','end']);start_at:=gp_private.moment(w->'start');end_at:=gp_private.moment(w->'end');
   if end_at<=start_at or end_at-start_at>interval '24 hours' then raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
   during:=tstzrange(start_at,end_at,'[)');
   if windows && during then raise exception 'GP_OVERLAP' using errcode='23P01';end if;
   windows:=windows+tstzmultirange(during);
  end loop;
  v:=expected+1;
  insert into gp_private.availability values(a,ap.id,v,windows,clock_timestamp())
   on conflict(member_id) do update set placement_id=excluded.placement_id,version=excluded.version,windows=excluded.windows,confirmed_at=excluded.confirmed_at;
 when 'plan.save' then
  if (p->>'week') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'GP_INVALID' using errcode='22023';end if;
  week_date:=(p->>'week')::date;
  if extract(isodow from week_date)<>1 then raise exception 'GP_INVALID' using errcode='22023';end if;
  select * into pl from gp_private.plans where group_id=g and week=week_date;
  if coalesce(pl.version,0)<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
  id:=coalesce(pl.id,gen_random_uuid());v:=expected+1;
  insert into gp_private.plans values(id,g,week_date,v,gp_private.words(p->'summary'),gp_private.words(p->'activity'),gp_private.words(p->'nextAction'))
   on conflict(group_id,week) do update set version=excluded.version,summary=excluded.summary,activity=excluded.activity,next_action=excluded.next_action;
 when 'plan.publish' then
  if pl.version<>expected then raise exception 'GP_STALE' using errcode='40001';end if;v:=pl.version;
  insert into gp_private.publications values(pl.id,pl.version,pl.summary,pl.activity,pl.next_action,a,clock_timestamp()) on conflict do nothing;
 when 'session.create','session.revise' then
  start_at:=gp_private.moment(p->'start');end_at:=gp_private.moment(p->'end');loc:=(p->>'locationId')::uuid;
  if start_at<=clock_timestamp() or end_at<=start_at or end_at-start_at>interval '24 hours' then raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
  if not exists(select 1 from gp_private.locations where locations.id=loc and active) then raise exception 'GP_UNAVAILABLE' using errcode='22023';end if;
  if s.id is not null and (s.phase='cancelled' or s.report_version>0 or s.starts_at<=clock_timestamp()) then raise exception 'GP_CLOSED' using errcode='55000';end if;
  id:=coalesce(s.id,gen_random_uuid());v:=coalesce(s.version,0)+1;during:=tstzrange(start_at,end_at,'[)');
  if exists(select 1 from gp_private.commitments c where c.member_id=any(ids) and c.session_id<>gp_command.id and c.during && gp_command.during) then raise exception 'GP_OVERLAP' using errcode='23P01';end if;
  if s.id is null then
   insert into gp_private.sessions(id,group_id,creator_id,creator_placement_id,version,starts_at,ends_at,location_id) values(id,ap.group_id,a,ap.id,v,start_at,end_at,loc);
  else
   update gp_private.sessions set version=v,starts_at=start_at,ends_at=end_at,location_id=loc,phase='proposal' where sessions.id=gp_command.id;
   -- Retain old commitments of remaining members until their explicit new response.
   -- Removed participants are retained in immutable revisions, never silently rewritten.
   delete from gp_private.commitments where session_id=gp_command.id and not(member_id=any(ids));
  end if;
  insert into gp_private.session_revisions values(id,v,start_at,end_at,loc,a,clock_timestamp());
  foreach member in array ids loop
   cp:=gp_private.placement(member);
   insert into gp_private.participants values(id,v,member,cp.id,coalesce((select version from gp_private.availability where member_id=member and placement_id=cp.id),0));
  end loop;
 when 'session.publish' then
  if s.phase='cancelled' or s.report_version>0 or s.starts_at<=clock_timestamp() then raise exception 'GP_CLOSED' using errcode='55000';end if;
  perform gp_private.validate_published(id,true);update gp_private.sessions set phase='published' where sessions.id=gp_command.id;v:=s.version;
 when 'session.respond' then
  if s.phase<>'published' or s.ends_at<=clock_timestamp() then raise exception 'GP_CLOSED' using errcode='55000';end if;
  if jsonb_typeof(p->'response')<>'string' or p->>'response' not in ('accepted','declined') then raise exception 'GP_INVALID' using errcode='22023';end if;
  select version into response_version from gp_private.responses where session_id=gp_command.id and session_version=s.version and member_id=a;
  if coalesce(response_version,0)<>gp_private.natural(p->'expectedResponse') then raise exception 'GP_STALE_RESPONSE' using errcode='40001';end if;
  response_version:=coalesce(response_version,0)+1;
  if p->>'response'='accepted' then perform gp_private.validate_published(id,false);end if;
  delete from gp_private.commitments where session_id=gp_command.id and member_id=a;
  if p->>'response'='accepted' then insert into gp_private.commitments values(id,s.version,a,tstzrange(s.starts_at,s.ends_at,'[)'));end if;
  insert into gp_private.responses values(id,s.version,a,p->>'response',response_version)
   on conflict(session_id,session_version,member_id) do update set response=excluded.response,version=excluded.version;
  insert into gp_private.response_history values(id,s.version,a,p->>'response',response_version,clock_timestamp());v:=s.version;
 when 'session.cancel' then
  if s.phase='cancelled' or s.report_version>0 or s.starts_at<=clock_timestamp() then raise exception 'GP_CLOSED' using errcode='55000';end if;
  -- Material version stays tied to immutable revision; cancellation is terminal.
  update gp_private.sessions set phase='cancelled' where sessions.id=gp_command.id;delete from gp_private.commitments where session_id=gp_command.id;v:=s.version;
 when 'report.save' then
  if s.phase<>'published' or s.ends_at>clock_timestamp() then raise exception 'GP_CLOSED' using errcode='55000';end if;
  if s.report_version<>gp_private.natural(p->'expectedReport') then raise exception 'GP_STALE_REPORT' using errcode='40001';end if;
  if jsonb_typeof(p->'outcome')<>'string' or p->>'outcome' not in ('completed','not-held') then raise exception 'GP_INVALID' using errcode='22023';end if;
  summary:=gp_private.words(p->'summary');reason:=gp_private.words(p->'reason',s.report_version>0);v:=s.report_version+1;
  insert into gp_private.reports values(id,v,s.version,a,ap.id,s.group_id,p->>'outcome',summary,reason,clock_timestamp());
  update gp_private.sessions set report_version=v where sessions.id=gp_command.id;
 end case;
 result:=jsonb_build_object('id',id,'version',v,'replayed',false);
 insert into gp_private.receipts values(a,p_request_id,ap.id,p_action,digest,id,result,clock_timestamp());
 insert into gp_private.audit(actor_id,action,resource_id,version) values(a,p_action,id,v);
 return result;
end $$;

-- Private, purpose-specific workspace projection. The absence of restricted note
-- tables/fields is intentional, not permission to put them in the safe plan.
create function gp_private.workspace(p_week date) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid; ap public.member_placements; result jsonb; begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'GP_ISOLATION_REQUIRED' using errcode='25001';end if;
 perform pg_advisory_xact_lock(741085);
 a:=app_private.current_member_id();ap:=gp_private.placement(a);
 if a is null or ap.id is null then raise exception 'GP_DENIED' using errcode='42501';end if;
 if p_week is null or extract(isodow from p_week)<>1 then raise exception 'GP_INVALID' using errcode='22023';end if;
 select jsonb_build_object(
  'week',p_week,'groupId',ap.group_id,
  'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name) order by m.display_name,m.id)
   from public.members m where (gp_private.placement(m.id)).group_id=ap.group_id),'[]'::jsonb),
  'availability',coalesce((select jsonb_build_object('version',av.version,'windows',coalesce((select jsonb_agg(jsonb_build_object('start',lower(w),'end',upper(w))) from unnest(av.windows) w),'[]'::jsonb))
   from gp_private.availability av where av.member_id=a and av.placement_id=ap.id),jsonb_build_object('version',0,'windows','[]'::jsonb)),
  'plan',(select jsonb_build_object('id',pl.id,'published',
    (select jsonb_build_object('version',pu.version,'summary',pu.summary,'activity',pu.activity,'nextAction',pu.next_action) from gp_private.publications pu where pu.plan_id=pl.id order by pu.version desc limit 1))
    ||case when gp_private.capable(a,'plan_edit',ap.group_id) or gp_private.capable(a,'publish',ap.group_id)
     then jsonb_build_object('draft',jsonb_build_object('version',pl.version,'summary',pl.summary,'activity',pl.activity,'nextAction',pl.next_action)) else '{}'::jsonb end
    from gp_private.plans pl where pl.group_id=ap.group_id and pl.week=p_week),
  'sessions',coalesce((select jsonb_agg(jsonb_build_object(
   'id',s.id,'version',s.version,'start',s.starts_at,'end',s.ends_at,'phase',s.phase,'location',l.label,
   'participants',(select jsonb_agg(jsonb_build_object('isSelf',p.member_id=a,
    'name',case when (gp_private.placement(p.member_id)).group_id=ap.group_id then m.display_name else 'Participant unavailable' end,
    'response',coalesce(r.response,'pending'),'responseVersion',coalesce(r.version,0)) order by p.member_id)
    from gp_private.participants p join public.members m on m.id=p.member_id
    left join gp_private.responses r on r.session_id=p.session_id and r.session_version=p.session_version and r.member_id=p.member_id
    where p.session_id=s.id and p.session_version=s.version),
   'report',(select jsonb_build_object('version',rp.version,'outcome',rp.outcome,'summary',rp.summary) from gp_private.reports rp where rp.session_id=s.id and rp.version=s.report_version)
  ) order by s.starts_at,s.id) from gp_private.sessions s join gp_private.locations l on l.id=s.location_id
   where gp_private.readable_session(a,s.id) and (s.starts_at at time zone 'America/Los_Angeles')::date>=p_week
    and (s.starts_at at time zone 'America/Los_Angeles')::date<p_week+7),'[]'::jsonb)
 ) into result;
 return result;
end $$;

-- Literal false, no configurable bypass and no browser EXECUTE grant. This is an
-- explicit deployment boundary, not a substitute for the internal authorization.
create function gp_private.live_enabled() returns boolean language sql immutable set search_path='' as $$ select false $$;
create function public.gospel_planning_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not gp_private.live_enabled() then raise exception 'GOSPEL_PLANNING_NOT_ACTIVATED' using errcode='42501';end if;
 return gp_private.command(p_action,p_payload,p_request_id);
end $$;
create function public.gospel_planning_workspace(p_week date) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not gp_private.live_enabled() then raise exception 'GOSPEL_PLANNING_NOT_ACTIVATED' using errcode='42501';end if;
 return gp_private.workspace(p_week);
end $$;
revoke all on all functions in schema gp_private from public,anon,authenticated,service_role;
revoke all on function public.gospel_planning_command(text,jsonb,uuid),public.gospel_planning_workspace(date) from public,anon,authenticated,service_role;
commit;
