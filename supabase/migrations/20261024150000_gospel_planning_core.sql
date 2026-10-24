-- Groups & Gospel Planning (My Group and My Preaching). Draft module, no grants, no seeded records.
-- Reuses members, dated placements, leadership appointments and module grants. No second roster or login.
-- Every request derives the member from the verified session and rechecks current authority.
-- Restricted Member Updates and Overseer Requests are stored apart from the group-safe publication.
begin;

insert into app_private.app_modules(id,module_key,display_name,short_name,description,accent,route_path,status)
 values('a7000000-0000-4000-8000-000000000001','gospel-planning','Groups & Gospel Planning','Gospel',
  'Plan your group''s week and your preaching sessions.','#1863a3','/modules/gospel-planning','draft');
-- Registration does not approve the module or grant anyone access.

create schema gp_private;
revoke all on schema gp_private from public,anon,authenticated;
grant usage on schema gp_private to authenticated;
alter default privileges in schema gp_private revoke execute on functions from public;

-- Gospel-specific authority. Leadership itself comes from the member foundation appointments.
-- publish: group leader may publish the group plan. schedule: plan sessions for a group or one unit.
-- oversee: answer Requests for Overseer assigned from a group.
create table gp_private.capability_grants(
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.members on delete restrict,
 capability text not null check(capability in ('publish','schedule','oversee')),
 group_id uuid not null references public.church_groups on delete restrict,
 unit_id uuid references public.church_units on delete restrict,
 placement_id uuid references public.member_placements on delete restrict,
 granted_at timestamptz not null default clock_timestamp(),
 granted_by uuid not null references public.members on delete restrict,
 ended_at timestamptz, ended_by uuid references public.members on delete restrict,
 check(ended_at is null or ended_at>=granted_at),
 check(capability='schedule' or unit_id is null),
 check((capability='oversee')=(placement_id is null))
);
create unique index gp_one_current_capability on gp_private.capability_grants(member_id,capability,group_id,unit_id) nulls not distinct where ended_at is null;
create table gp_private.locations(
 id uuid primary key default gen_random_uuid(),
 label text not null check(length(btrim(label)) between 2 and 120),
 active boolean not null default true,
 created_by uuid not null references public.members on delete restrict,
 created_at timestamptz not null default clock_timestamp()
);
create unique index gp_location_active_label on gp_private.locations(lower(btrim(label))) where active;
-- Own availability: the few ranges the member entered, plus their expanded instants.
create table gp_private.availability(
 member_id uuid primary key references public.members on delete restrict,
 placement_id uuid not null references public.member_placements on delete restrict,
 version integer not null check(version>0),
 ranges jsonb not null check(jsonb_typeof(ranges)='array'),
 windows tstzmultirange not null,
 saved_at timestamptz not null default clock_timestamp()
);
create table gp_private.sessions(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.church_groups on delete restrict,
 creator_id uuid not null references public.members on delete restrict,
 creator_placement_id uuid not null references public.member_placements on delete restrict,
 version integer not null check(version>0),
 starts_at timestamptz not null, ends_at timestamptz not null,
 location_id uuid not null references gp_private.locations on delete restrict,
 phase text not null default 'proposal' check(phase in ('proposal','published','cancelled')),
 report_version integer not null default 0 check(report_version>=0),
 created_at timestamptz not null default clock_timestamp(),
 check(isfinite(starts_at) and isfinite(ends_at) and ends_at>starts_at and ends_at-starts_at<=interval '12 hours')
);
create index gp_session_group_time on gp_private.sessions(group_id,starts_at,id);
create table gp_private.session_revisions(
 session_id uuid not null references gp_private.sessions on delete restrict,
 version integer not null check(version>0),
 starts_at timestamptz not null, ends_at timestamptz not null,
 location_id uuid not null references gp_private.locations on delete restrict,
 author_id uuid not null references public.members on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 primary key(session_id,version)
);
create table gp_private.participants(
 session_id uuid not null, session_version integer not null,
 member_id uuid not null references public.members on delete restrict,
 placement_id uuid not null references public.member_placements on delete restrict,
 availability_version integer not null check(availability_version>=0),
 primary key(session_id,session_version,member_id),
 foreign key(session_id,session_version) references gp_private.session_revisions on delete restrict
);
create index gp_participant_member on gp_private.participants(member_id,session_id,session_version);
create table gp_private.responses(
 session_id uuid not null, session_version integer not null, member_id uuid not null,
 response text not null check(response in ('accepted','declined')),
 version integer not null check(version>0),
 primary key(session_id,session_version,member_id),
 foreign key(session_id,session_version,member_id) references gp_private.participants on delete restrict
);
create table gp_private.response_history(
 session_id uuid not null, session_version integer not null, member_id uuid not null,
 response text not null check(response in ('accepted','declined')),
 response_version integer not null check(response_version>0),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(session_id,session_version,member_id,response_version),
 foreign key(session_id,session_version,member_id) references gp_private.participants on delete restrict
);
-- Accepted commitments. A member never holds two overlapping commitments; see commitment_guard.
create table gp_private.commitments(
 session_id uuid not null, session_version integer not null, member_id uuid not null,
 during tstzrange not null,
 primary key(session_id,member_id),
 foreign key(session_id,session_version,member_id) references gp_private.participants on delete restrict,
 check(not isempty(during) and not lower_inf(during) and not upper_inf(during) and lower_inc(during) and not upper_inc(during))
);
create index gp_commitment_member on gp_private.commitments(member_id,during);
-- One shared result per session. Corrections append a new version with a reason.
create table gp_private.reports(
 session_id uuid not null references gp_private.sessions on delete restrict,
 version integer not null check(version>0),
 session_version integer not null,
 author_id uuid not null references public.members on delete restrict,
 author_placement_id uuid not null references public.member_placements on delete restrict,
 historical_group_id uuid not null references public.church_groups on delete restrict,
 outcome text not null check(outcome in ('completed','not-held')),
 note text not null check(length(note)<=1200),
 correction_reason text not null check(length(correction_reason)<=600),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(session_id,version),
 foreign key(session_id,session_version) references gp_private.session_revisions on delete restrict,
 check(version=1 or length(btrim(correction_reason))>0)
);
-- Group week: private draft, separately retained group-safe publications.
create table gp_private.plans(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.church_groups on delete restrict,
 week date not null,
 version integer not null check(version>0),
 review text not null check(length(review)<=1200),
 plan text not null check(length(plan)<=1200),
 next_action text not null check(length(next_action)<=300),
 responsible_id uuid references public.members on delete restrict,
 updated_by uuid not null references public.members on delete restrict,
 updated_at timestamptz not null default clock_timestamp(),
 unique(group_id,week), check(extract(isodow from week)=1)
);
create table gp_private.publications(
 plan_id uuid not null references gp_private.plans on delete restrict,
 version integer not null check(version>0),
 review text not null, plan text not null, next_action text not null,
 responsible_id uuid references public.members on delete restrict,
 author_id uuid not null references public.members on delete restrict,
 published_at timestamptz not null default clock_timestamp(),
 primary key(plan_id,version)
);
-- Restricted: readable only by the current leaders of that unit or group.
create table gp_private.member_updates(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.church_groups on delete restrict,
 unit_id uuid not null,
 week date not null check(extract(isodow from week)=1),
 about_member_id uuid references public.members on delete restrict,
 author_id uuid not null references public.members on delete restrict,
 author_placement_id uuid not null references public.member_placements on delete restrict,
 body text not null check(length(btrim(body)) between 1 and 1200),
 support text not null check(length(support)<=600),
 next_action text not null check(length(next_action)<=300),
 assignee_id uuid references public.members on delete restrict,
 status text not null default 'open' check(status in ('open','done')),
 version integer not null check(version>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null references public.members on delete restrict,
 updated_at timestamptz not null default clock_timestamp(),
 foreign key(unit_id,group_id) references public.church_units(id,group_id) on delete restrict
);
create index gp_update_scope on gp_private.member_updates(group_id,unit_id,week);
-- Restricted: readable only by the requester and the assigned overseer.
create table gp_private.overseer_requests(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.church_groups on delete restrict,
 week date not null check(extract(isodow from week)=1),
 author_id uuid not null references public.members on delete restrict,
 author_placement_id uuid not null references public.member_placements on delete restrict,
 reviewer_id uuid not null references public.members on delete restrict,
 status text not null default 'open' check(status in ('open','clarification','answered','withdrawn')),
 version integer not null check(version>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check(author_id<>reviewer_id)
);
create index gp_request_author on gp_private.overseer_requests(author_id,week);
create index gp_request_reviewer on gp_private.overseer_requests(reviewer_id,status);
create table gp_private.overseer_request_events(
 request_id uuid not null references gp_private.overseer_requests on delete restrict,
 seq integer not null check(seq>0),
 actor_id uuid not null references public.members on delete restrict,
 kind text not null check(kind in ('submitted','clarification','reply','answer','withdrawn')),
 body text not null check(length(body)<=1200),
 status_after text not null,
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(request_id,seq)
);
create table gp_private.receipts(
 actor_id uuid not null references public.members on delete restrict,
 request_id uuid not null,
 placement_id uuid references public.member_placements on delete restrict,
 action text not null, payload_digest text not null check(length(payload_digest)=64),
 resource_id uuid not null, result jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 primary key(actor_id,request_id)
);
-- Metadata only: no note bodies, contact details, or inferred outcomes.
create table gp_private.audit(
 id bigint generated always as identity primary key,
 actor_id uuid not null references public.members on delete restrict,
 action text not null, resource_id uuid not null, version integer not null,
 recorded_at timestamptz not null default clock_timestamp()
);

do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='gp_private' loop
  execute format('alter table gp_private.%I enable row level security',t.tablename);
  execute format('revoke all on gp_private.%I from public,anon,authenticated,service_role',t.tablename);
 end loop;
end $$;

create function gp_private.immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'GP_IMMUTABLE' using errcode='55000'; end $$;
do $$ declare n text; begin
 foreach n in array array['session_revisions','participants','response_history','publications','reports','overseer_request_events','receipts','audit'] loop
  execute format('create trigger gp_immutable before update or delete on gp_private.%I for each row execute function gp_private.immutable()',n);
 end loop;
end $$;

-- Commitments match their immutable revision window and never overlap for one member.
-- Every writer holds transaction lock 741085, so this check is serialized.
create function gp_private.commitment_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_catalog.pg_locks l where l.locktype='advisory' and l.pid=pg_catalog.pg_backend_pid()
   and l.classid=0 and l.objid=741085 and l.objsubid=1 and l.granted) then
  raise exception 'GP_LOCK_REQUIRED' using errcode='55000';end if;
 if not exists(select 1 from gp_private.session_revisions r where r.session_id=new.session_id and r.version=new.session_version
   and new.during=tstzrange(r.starts_at,r.ends_at,'[)')) then
  raise exception 'GP_COMMITMENT_WINDOW' using errcode='23514';end if;
 if exists(select 1 from gp_private.commitments c where c.member_id=new.member_id and c.session_id<>new.session_id and c.during && new.during) then
  raise exception 'GP_OVERLAP' using errcode='23P01';end if;
 return new;
end $$;
create trigger gp_commitment_guard before insert or update on gp_private.commitments for each row execute function gp_private.commitment_guard();

-- ---------------------------------------------------------------------------------------------
-- Current authority. Internal helpers: never granted; called only after identity is verified.
create function gp_private.module_id() returns uuid language sql immutable set search_path='' as $$
 select 'a7000000-0000-4000-8000-000000000001'::uuid $$;
create function gp_private.vegas_today() returns date language sql stable set search_path='' as $$
 select (now() at time zone 'America/Los_Angeles')::date $$;
create function gp_private.has_access(p_member uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.members m where m.id=p_member and m.status='active')
  and app_private.module_allowed(p_member,gp_private.module_id()) $$;
-- Current primary placement, only for active members with Gospel Planning access.
create function gp_private.placement(p_member uuid) returns public.member_placements language sql stable set search_path='' as $$
 select p.* from public.member_placements p
 join public.church_units u on u.id=p.unit_id and u.group_id=p.group_id and u.is_active
 join public.church_groups g on g.id=p.group_id and g.is_active
 join public.age_categories c on c.id=g.age_category_id and c.is_active
 where p.member_id=p_member and p.ended_at is null and p.started_at<=now() and gp_private.has_access(p_member)
 limit 1 $$;
create function gp_private.manager(p_member uuid) returns boolean language sql stable set search_path='' as $$
 select gp_private.has_access(p_member) and exists(select 1 from app_private.module_access_grants g
  where g.member_id=p_member and g.module_id=gp_private.module_id() and g.permission='manager' and g.ended_at is null and g.granted_at<=now()) $$;
create function gp_private.group_leader(p_member uuid,p_group uuid) returns boolean language sql stable set search_path='' as $$
 select (gp_private.placement(p_member)).group_id=p_group and app_private.actor_has(p_member,'group_leader',p_group) $$;
create function gp_private.unit_leader(p_member uuid,p_unit uuid) returns boolean language sql stable set search_path='' as $$
 select (gp_private.placement(p_member)).unit_id=p_unit and app_private.actor_has(p_member,'unit_leader',p_unit) $$;
create function gp_private.leads_in_group(p_member uuid,p_group uuid) returns boolean language sql stable set search_path='' as $$
 select gp_private.group_leader(p_member,p_group)
  or ((gp_private.placement(p_member)).group_id=p_group and gp_private.unit_leader(p_member,(gp_private.placement(p_member)).unit_id)) $$;
-- A unit-scoped schedule grant applies to that unit only; p_unit null asks for group-wide authority.
create function gp_private.capable(p_member uuid,p_cap text,p_group uuid,p_unit uuid default null) returns boolean language sql stable set search_path='' as $$
 select gp_private.has_access(p_member) and exists(select 1 from gp_private.capability_grants c
  where c.member_id=p_member and c.capability=p_cap and c.group_id=p_group and c.ended_at is null
   and (c.unit_id is null or c.unit_id=p_unit)
   and (p_cap='oversee' or c.placement_id=(gp_private.placement(p_member)).id)
   and (p_cap<>'publish' or gp_private.group_leader(p_member,p_group))) $$;
-- The actor may plan for every listed member: group leader, group-wide scheduler, or unit scope covering all.
create function gp_private.scopes_members(p_actor uuid,p_group uuid,p_ids uuid[]) returns boolean language sql stable set search_path='' as $$
 select (gp_private.placement(p_actor)).group_id=p_group and (
  gp_private.group_leader(p_actor,p_group) or gp_private.capable(p_actor,'schedule',p_group)
  or (cardinality(p_ids)>0 and not exists(select 1 from unnest(p_ids) x(id) where not exists(
   select 1 from public.member_placements mp where mp.id=(gp_private.placement(x.id)).id and mp.group_id=p_group
    and (gp_private.unit_leader(p_actor,mp.unit_id) or gp_private.capable(p_actor,'schedule',p_group,mp.unit_id)))))) $$;
create function gp_private.current_ids(p_session uuid) returns uuid[] language sql stable set search_path='' as $$
 select coalesce(array_agg(p.member_id order by p.member_id),'{}') from gp_private.sessions s
 join gp_private.participants p on p.session_id=s.id and p.session_version=s.version where s.id=p_session $$;
create function gp_private.own_session(p_member uuid,p_session uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from gp_private.sessions s join gp_private.participants p on p.session_id=s.id and p.session_version=s.version
  where s.id=p_session and p.member_id=p_member and p.placement_id=(gp_private.placement(p_member)).id
   and s.group_id=(gp_private.placement(p_member)).group_id) $$;
create function gp_private.manages_session(p_member uuid,p_session uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from gp_private.sessions s where s.id=p_session
  and gp_private.scopes_members(p_member,s.group_id,gp_private.current_ids(s.id))) $$;
create function gp_private.readable_session(p_member uuid,p_session uuid) returns boolean language sql stable set search_path='' as $$
 select gp_private.own_session(p_member,p_session) or gp_private.manages_session(p_member,p_session) $$;
create function gp_private.reads_update(p_member uuid,p_group uuid,p_unit uuid) returns boolean language sql stable set search_path='' as $$
 select gp_private.group_leader(p_member,p_group)
  or ((gp_private.placement(p_member)).group_id=p_group and gp_private.unit_leader(p_member,p_unit)) $$;
create function gp_private.reads_request(p_member uuid,r gp_private.overseer_requests) returns boolean language sql stable set search_path='' as $$
 select (r.author_id=p_member and gp_private.leads_in_group(p_member,r.group_id))
  or (r.reviewer_id=p_member and gp_private.capable(p_member,'oversee',r.group_id)) $$;
-- A name is shown only while the person is currently placed in the viewer's group.
create function gp_private.visible_name(p_group uuid,p_member uuid) returns text language sql stable set search_path='' as $$
 select coalesce((select m.display_name from public.members m join public.member_placements p on p.member_id=m.id
  where m.id=p_member and m.status='active' and p.ended_at is null and p.started_at<=now() and p.group_id=p_group),'Participant unavailable') $$;

-- ---------------------------------------------------------------------------------------------
-- Strict input parsing. The server parser checks the same shapes before calling the database.
create function gp_private.strict_keys(p jsonb,required text[],optional text[] default '{}') returns void language plpgsql set search_path='' as $$
begin
 if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>16384
 or exists(select 1 from jsonb_object_keys(p) k where not(k=any(required) or k=any(optional)))
 or exists(select 1 from unnest(required) k where not(p ? k)) then
  raise exception 'GP_INVALID' using errcode='22023';
 end if;
end $$;
create function gp_private.natural(p jsonb) returns integer language plpgsql set search_path='' as $$
begin
 if p is null or jsonb_typeof(p)<>'number' or p::text !~ '^(0|[1-9][0-9]{0,8})$' then raise exception 'GP_INVALID' using errcode='22023';end if;
 return p::text::integer;
end $$;
create function gp_private.words(p jsonb,max_length integer,required boolean) returns text language plpgsql set search_path='' as $$
begin
 if p is null or jsonb_typeof(p)<>'string' or length(p#>>'{}')>max_length or (required and length(btrim(p#>>'{}'))=0) then
  raise exception 'GP_INVALID' using errcode='22023';end if;
 return btrim(p#>>'{}');
end $$;
create function gp_private.uuid_of(p jsonb) returns uuid language plpgsql set search_path='' as $$
begin
 if p is null or jsonb_typeof(p)<>'string' or (p#>>'{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  raise exception 'GP_INVALID' using errcode='22023';end if;
 return (p#>>'{}')::uuid;
end $$;
create function gp_private.optional_uuid(p jsonb) returns uuid language plpgsql set search_path='' as $$
begin if p is null or p='null'::jsonb then return null;end if;return gp_private.uuid_of(p);end $$;
create function gp_private.day_of(p jsonb) returns date language plpgsql set search_path='' as $$
declare d date;begin
 if p is null or jsonb_typeof(p)<>'string' or (p#>>'{}') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
 begin d:=(p#>>'{}')::date;exception when others then raise exception 'GP_INVALID_TIME' using errcode='22007';end;
 if to_char(d,'YYYY-MM-DD')<>(p#>>'{}') or d<gp_private.vegas_today()-400 or d>gp_private.vegas_today()+400 then
  raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
 return d;
end $$;
create function gp_private.week_of(p jsonb) returns date language plpgsql set search_path='' as $$
declare d date:=gp_private.day_of(p);begin
 if extract(isodow from d)<>1 then raise exception 'GP_INVALID' using errcode='22023';end if;return d;
end $$;
-- Las Vegas wall time to an instant. Times skipped or repeated by a clock change are rejected.
create function gp_private.local_instant(p_day date,p_time jsonb) returns timestamptz language plpgsql set search_path='' as $$
declare wall timestamp;v timestamptz;begin
 if p_time is null or jsonb_typeof(p_time)<>'string' or (p_time#>>'{}') !~ '^([01]\d|2[0-3]):[0-5][05]$' then
  raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
 wall:=p_day+(p_time#>>'{}')::time;
 v:=wall at time zone 'America/Los_Angeles';
 if (v at time zone 'America/Los_Angeles')<>wall
  or ((v+interval '1 hour') at time zone 'America/Los_Angeles')=wall
  or ((v-interval '1 hour') at time zone 'America/Los_Angeles')=wall then
  raise exception 'GP_CLOCK_CHANGE' using errcode='22007';end if;
 return v;
end $$;
create function gp_private.local_range(p_day date,p_from jsonb,p_to jsonb) returns tstzrange language plpgsql set search_path='' as $$
declare a timestamptz:=gp_private.local_instant(p_day,p_from);b timestamptz:=gp_private.local_instant(p_day,p_to);begin
 if b<=a then raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
 return tstzrange(a,b,'[)');
end $$;
-- Two or three distinct participants from the actor's own group, all with current access.
create function gp_private.session_members(p_actor uuid,p_ids jsonb) returns uuid[] language plpgsql set search_path='' as $$
declare ids uuid[]:='{}';v uuid;own public.member_placements:=gp_private.placement(p_actor);e jsonb;begin
 if p_ids is null or jsonb_typeof(p_ids)<>'array' or jsonb_array_length(p_ids) not between 2 and 3 then raise exception 'GP_INVALID' using errcode='22023';end if;
 for e in select value from jsonb_array_elements(p_ids) loop
  v:=gp_private.uuid_of(e);
  if v=any(ids) then raise exception 'GP_INVALID' using errcode='22023';end if;
  if (gp_private.placement(v)).group_id is distinct from own.group_id then raise exception 'GP_DENIED' using errcode='42501';end if;
  ids:=ids||v;
 end loop;
 select array_agg(x order by x) into ids from unnest(ids) x;
 if not(p_actor=any(ids)) and not gp_private.scopes_members(p_actor,own.group_id,ids) then raise exception 'GP_DENIED' using errcode='42501';end if;
 return ids;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Authorization for each action. Runs before a retry receipt is served and before any write.
create function gp_private.authorize(a uuid,p_action text,p jsonb) returns uuid language plpgsql set search_path='' as $$
declare ap public.member_placements:=gp_private.placement(a);s gp_private.sessions;u gp_private.member_updates;r gp_private.overseer_requests;g uuid;unit uuid;begin
 if p_action like 'location.%' or p_action like 'capability.%' then
  if not gp_private.manager(a) then raise exception 'GP_DENIED' using errcode='42501';end if;
  case p_action
   when 'location.add' then perform gp_private.strict_keys(p,array['label']);
   when 'location.retire','capability.end' then perform gp_private.strict_keys(p,array['id']);
   when 'capability.grant' then perform gp_private.strict_keys(p,array['memberId','capability'],array['groupId','unitId']);
   else raise exception 'GP_INVALID' using errcode='22023';
  end case;
  return null;
 end if;
 if ap.id is null then raise exception 'GP_DENIED' using errcode='42501';end if;
 case p_action
 when 'availability.save' then perform gp_private.strict_keys(p,array['expected','ranges']);return a;
 when 'session.create' then
  perform gp_private.strict_keys(p,array['date','from','to','locationId','participants']);
  perform gp_private.session_members(a,p->'participants');return null;
 when 'session.revise','session.publish','session.respond','session.cancel','report.save' then
  case p_action
   when 'session.revise' then perform gp_private.strict_keys(p,array['id','expected','date','from','to','locationId','participants']);
   when 'session.respond' then perform gp_private.strict_keys(p,array['id','expected','expectedResponse','response']);
   when 'report.save' then perform gp_private.strict_keys(p,array['id','expected','expectedReport','outcome','note'],array['reason']);
   else perform gp_private.strict_keys(p,array['id','expected']);
  end case;
  select * into s from gp_private.sessions where id=gp_private.uuid_of(p->'id');
  if s.id is null or not gp_private.readable_session(a,s.id) then raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action='session.publish' and not gp_private.manages_session(a,s.id) then raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action in ('session.respond','report.save') and not gp_private.own_session(a,s.id) then raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action in ('session.revise','session.cancel') and not(gp_private.manages_session(a,s.id) or (s.creator_id=a and s.creator_placement_id=ap.id)) then
   raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action='session.revise' then perform gp_private.session_members(a,p->'participants');end if;
  return s.id;
 when 'plan.save' then
  perform gp_private.strict_keys(p,array['week','expected','review','plan','nextAction'],array['responsibleId']);
  if not gp_private.group_leader(a,ap.group_id) then raise exception 'GP_DENIED' using errcode='42501';end if;return null;
 when 'plan.publish' then
  perform gp_private.strict_keys(p,array['week','expected']);
  if not gp_private.capable(a,'publish',ap.group_id) then raise exception 'GP_DENIED' using errcode='42501';end if;return null;
 when 'update.create' then
  perform gp_private.strict_keys(p,array['week','unitId','body','support','nextAction'],array['aboutMemberId','assigneeId']);
  unit:=gp_private.uuid_of(p->'unitId');
  if not exists(select 1 from public.church_units x where x.id=unit and x.group_id=ap.group_id and x.is_active)
   or not gp_private.reads_update(a,ap.group_id,unit) then raise exception 'GP_DENIED' using errcode='42501';end if;return null;
 when 'update.edit' then
  perform gp_private.strict_keys(p,array['id','expected','body','support','nextAction','status'],array['aboutMemberId','assigneeId']);
  select * into u from gp_private.member_updates where id=gp_private.uuid_of(p->'id');
  if u.id is null or not gp_private.reads_update(a,u.group_id,u.unit_id) then raise exception 'GP_DENIED' using errcode='42501';end if;return u.id;
 when 'request.create' then
  perform gp_private.strict_keys(p,array['week','reviewerId','body']);
  if not gp_private.leads_in_group(a,ap.group_id) then raise exception 'GP_DENIED' using errcode='42501';end if;return null;
 when 'request.respond','request.reply','request.withdraw' then
  if p_action='request.withdraw' then perform gp_private.strict_keys(p,array['id','expected']);
  elsif p_action='request.respond' then perform gp_private.strict_keys(p,array['id','expected','decision','body']);
  else perform gp_private.strict_keys(p,array['id','expected','body']);end if;
  select * into r from gp_private.overseer_requests where id=gp_private.uuid_of(p->'id');
  if r.id is null or not gp_private.reads_request(a,r) then raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action='request.respond' and r.reviewer_id<>a then raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action in ('request.reply','request.withdraw') and r.author_id<>a then raise exception 'GP_DENIED' using errcode='42501';end if;
  return r.id;
 else raise exception 'GP_INVALID' using errcode='22023';
 end case;
end $$;

-- ---------------------------------------------------------------------------------------------
-- The single trusted write path. Identity is derived here, never from the payload.
-- The member foundation's lock 741085 orders every write after any grant, role or placement change.
create function gp_private.command(p_action text,p jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
<<gp>>
declare
 a uuid;ap public.member_placements;s gp_private.sessions;pl gp_private.plans;rc gp_private.receipts;av gp_private.availability;
 u gp_private.member_updates;r gp_private.overseer_requests;cg gp_private.capability_grants;
 ids uuid[];member uuid;id uuid;v integer;expected integer;response_version integer;result jsonb;digest text;
 during tstzrange;windows tstzmultirange:='{}';w jsonb;skip jsonb;d date;i integer;loc uuid;week_date date;
 about uuid;assignee uuid;reviewer uuid;target public.member_placements;cap text;g uuid;unit uuid;body text;decision text;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'GP_ISOLATION_REQUIRED' using errcode='25001';end if;
 perform pg_advisory_xact_lock(741085);
 a:=app_private.current_member_id();
 if a is null or not gp_private.has_access(a) then raise exception 'GP_DENIED' using errcode='42501';end if;
 if p_action is null or p_request_id is null then raise exception 'GP_INVALID' using errcode='22023';end if;
 ap:=gp_private.placement(a);
 id:=gp_private.authorize(a,p_action,p);
 -- Authority above is current even for a retry; the receipt is served only to an authorized actor.
 digest:=encode(sha256(convert_to(p_action||':'||p::text,'UTF8')),'hex');
 select * into rc from gp_private.receipts where actor_id=a and request_id=p_request_id;
 if rc.actor_id is not null then
  if rc.placement_id is distinct from ap.id then raise exception 'GP_DENIED' using errcode='42501';end if;
  if rc.action<>p_action or rc.payload_digest<>digest then raise exception 'GP_RETRY_CONFLICT' using errcode='22023';end if;
  if p_action='session.create' and not gp_private.readable_session(a,rc.resource_id) then raise exception 'GP_DENIED' using errcode='42501';end if;
  return rc.result||jsonb_build_object('replayed',true);
 end if;
 if p ? 'expected' then expected:=gp_private.natural(p->'expected');end if;
 if p_action like 'session.%' or p_action='report.save' then
  if id is not null then
   select * into s from gp_private.sessions where sessions.id=gp.id for update;
   if s.version<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
  end if;
 end if;

 case p_action
 when 'availability.save' then
  select * into av from gp_private.availability where member_id=a for update;
  if (case when av.placement_id=ap.id then av.version else 0 end)<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
  if jsonb_typeof(p->'ranges')<>'array' or jsonb_array_length(p->'ranges')>14 then raise exception 'GP_INVALID' using errcode='22023';end if;
  for w in select value from jsonb_array_elements(p->'ranges') loop
   perform gp_private.strict_keys(w,array['date','from','to','repeatWeeks','skip']);
   d:=gp_private.day_of(w->'date');
   if d<gp_private.vegas_today()-7 or d>gp_private.vegas_today()+120 then raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
   i:=gp_private.natural(w->'repeatWeeks');
   if i not between 1 and 4 or jsonb_typeof(w->'skip')<>'array' or jsonb_array_length(w->'skip')>=i then raise exception 'GP_INVALID' using errcode='22023';end if;
   for skip in select value from jsonb_array_elements(w->'skip') loop
    if mod(gp_private.day_of(skip)-d,7)<>0 or gp_private.day_of(skip)<d or gp_private.day_of(skip)>=d+7*i then raise exception 'GP_INVALID' using errcode='22023';end if;
   end loop;
   for n in 0..i-1 loop
    if not((w->'skip') @> to_jsonb(array[to_char(d+7*n,'YYYY-MM-DD')])) then
     during:=gp_private.local_range(d+7*n,w->'from',w->'to');
     if windows && during then raise exception 'GP_AVAILABILITY_OVERLAP' using errcode='22023';end if;
     windows:=windows+tstzmultirange(during);
    end if;
   end loop;
  end loop;
  v:=expected+1;id:=a;
  insert into gp_private.availability values(a,ap.id,v,p->'ranges',windows,clock_timestamp())
   on conflict(member_id) do update set placement_id=excluded.placement_id,version=excluded.version,ranges=excluded.ranges,windows=excluded.windows,saved_at=excluded.saved_at;

 when 'session.create','session.revise' then
  ids:=gp_private.session_members(a,p->'participants');
  d:=gp_private.day_of(p->'date');during:=gp_private.local_range(d,p->'from',p->'to');loc:=gp_private.uuid_of(p->'locationId');
  if lower(during)<=clock_timestamp() then raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
  if not exists(select 1 from gp_private.locations where locations.id=loc and active) then raise exception 'GP_UNAVAILABLE' using errcode='22023';end if;
  if s.id is not null and (s.phase='cancelled' or s.report_version>0 or s.starts_at<=clock_timestamp()) then raise exception 'GP_CLOSED' using errcode='55000';end if;
  if exists(select 1 from gp_private.commitments c where c.member_id=any(ids) and c.session_id is distinct from s.id and c.during && gp.during) then
   raise exception 'GP_OVERLAP' using errcode='23P01';end if;
  id:=coalesce(s.id,gen_random_uuid());v:=coalesce(s.version,0)+1;
  if s.id is null then
   insert into gp_private.sessions(id,group_id,creator_id,creator_placement_id,version,starts_at,ends_at,location_id)
    values(id,ap.group_id,a,ap.id,v,lower(during),upper(during),loc);
  else
   update gp_private.sessions set version=v,starts_at=lower(during),ends_at=upper(during),location_id=loc,phase='proposal' where sessions.id=gp.id;
   -- Remaining participants keep their old commitment as a hold until they respond to the new version.
   delete from gp_private.commitments where session_id=gp.id and not(member_id=any(ids));
  end if;
  insert into gp_private.session_revisions values(id,v,lower(during),upper(during),loc,a,clock_timestamp());
  foreach member in array ids loop
   target:=gp_private.placement(member);
   insert into gp_private.participants values(id,v,member,target.id,
    coalesce((select x.version from gp_private.availability x where x.member_id=member and x.placement_id=target.id),0));
  end loop;

 when 'session.publish' then
  if s.phase<>'proposal' or s.starts_at<=clock_timestamp() then raise exception 'GP_CLOSED' using errcode='55000';end if;
  if not exists(select 1 from gp_private.locations where locations.id=s.location_id and active) then raise exception 'GP_UNAVAILABLE' using errcode='22023';end if;
  if exists(select 1 from gp_private.participants x where x.session_id=s.id and x.session_version=s.version
    and x.placement_id is distinct from (gp_private.placement(x.member_id)).id) then raise exception 'GP_DENIED' using errcode='42501';end if;
  update gp_private.sessions set phase='published' where sessions.id=gp.id;v:=s.version;

 when 'session.respond' then
  if s.phase<>'published' or s.ends_at<=clock_timestamp() then raise exception 'GP_CLOSED' using errcode='55000';end if;
  if jsonb_typeof(p->'response')<>'string' or p->>'response' not in ('accepted','declined') then raise exception 'GP_INVALID' using errcode='22023';end if;
  select x.version into response_version from gp_private.responses x where x.session_id=s.id and x.session_version=s.version and x.member_id=a;
  if coalesce(response_version,0)<>gp_private.natural(p->'expectedResponse') then raise exception 'GP_STALE_RESPONSE' using errcode='40001';end if;
  response_version:=coalesce(response_version,0)+1;
  delete from gp_private.commitments where session_id=s.id and member_id=a;
  if p->>'response'='accepted' then
   insert into gp_private.commitments values(s.id,s.version,a,tstzrange(s.starts_at,s.ends_at,'[)'));
  end if;
  insert into gp_private.responses values(s.id,s.version,a,p->>'response',response_version)
   on conflict(session_id,session_version,member_id) do update set response=excluded.response,version=excluded.version;
  insert into gp_private.response_history values(s.id,s.version,a,p->>'response',response_version,clock_timestamp());
  v:=s.version;

 when 'session.cancel' then
  if s.phase='cancelled' or s.report_version>0 or s.starts_at<=clock_timestamp() then raise exception 'GP_CLOSED' using errcode='55000';end if;
  update gp_private.sessions set phase='cancelled' where sessions.id=gp.id;
  delete from gp_private.commitments where session_id=gp.id;v:=s.version;

 when 'report.save' then
  if s.phase<>'published' or s.ends_at>clock_timestamp() then raise exception 'GP_CLOSED' using errcode='55000';end if;
  if not exists(select 1 from gp_private.responses x where x.session_id=s.id and x.session_version=s.version and x.member_id=a and x.response='accepted') then
   raise exception 'GP_DENIED' using errcode='42501';end if;
  if s.report_version<>gp_private.natural(p->'expectedReport') then raise exception 'GP_STALE_REPORT' using errcode='40001';end if;
  if jsonb_typeof(p->'outcome')<>'string' or p->>'outcome' not in ('completed','not-held') then raise exception 'GP_INVALID' using errcode='22023';end if;
  v:=s.report_version+1;
  insert into gp_private.reports values(s.id,v,s.version,a,ap.id,s.group_id,p->>'outcome',gp_private.words(p->'note',1200,false),
   case when v=1 then (case when p ? 'reason' then gp_private.words(p->'reason',600,false) else '' end) else gp_private.words(p->'reason',600,true) end,clock_timestamp());
  update gp_private.sessions set report_version=v where sessions.id=gp.id;id:=s.id;

 when 'plan.save' then
  week_date:=gp_private.week_of(p->'week');about:=gp_private.optional_uuid(p->'responsibleId');
  if about is not null and (gp_private.placement(about)).group_id is distinct from ap.group_id then raise exception 'GP_DENIED' using errcode='42501';end if;
  select * into pl from gp_private.plans where group_id=ap.group_id and week=week_date for update;
  if coalesce(pl.version,0)<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
  id:=coalesce(pl.id,gen_random_uuid());v:=expected+1;
  insert into gp_private.plans values(id,ap.group_id,week_date,v,gp_private.words(p->'review',1200,false),gp_private.words(p->'plan',1200,false),
   gp_private.words(p->'nextAction',300,false),about,a,clock_timestamp())
   on conflict(group_id,week) do update set version=excluded.version,review=excluded.review,plan=excluded.plan,next_action=excluded.next_action,
    responsible_id=excluded.responsible_id,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  if exists(select 1 from gp_private.plans x where x.id=gp.id and length(btrim(x.review||x.plan))=0) then raise exception 'GP_INVALID' using errcode='22023';end if;

 when 'plan.publish' then
  week_date:=gp_private.week_of(p->'week');
  select * into pl from gp_private.plans where group_id=ap.group_id and week=week_date for update;
  if pl.id is null or pl.version<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
  if exists(select 1 from gp_private.publications x where x.plan_id=pl.id and x.version=pl.version) then raise exception 'GP_STALE' using errcode='40001';end if;
  insert into gp_private.publications values(pl.id,pl.version,pl.review,pl.plan,pl.next_action,pl.responsible_id,a,clock_timestamp());
  id:=pl.id;v:=pl.version;

 when 'update.create','update.edit' then
  if p_action='update.create' then
   week_date:=gp_private.week_of(p->'week');g:=ap.group_id;unit:=gp_private.uuid_of(p->'unitId');
  else
   select * into u from gp_private.member_updates where member_updates.id=gp.id for update;
   if u.version<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
   g:=u.group_id;unit:=u.unit_id;
   if jsonb_typeof(p->'status')<>'string' or p->>'status' not in ('open','done') then raise exception 'GP_INVALID' using errcode='22023';end if;
  end if;
  about:=gp_private.optional_uuid(p->'aboutMemberId');assignee:=gp_private.optional_uuid(p->'assigneeId');
  if about is not null and not exists(select 1 from public.member_placements x join public.members m on m.id=x.member_id and m.status='active'
    where x.member_id=about and x.unit_id=unit and x.ended_at is null and x.started_at<=now()) then raise exception 'GP_DENIED' using errcode='42501';end if;
  if assignee is not null and not gp_private.reads_update(assignee,g,unit) then raise exception 'GP_DENIED' using errcode='42501';end if;
  if p_action='update.create' then
   id:=gen_random_uuid();v:=1;
   insert into gp_private.member_updates(id,group_id,unit_id,week,about_member_id,author_id,author_placement_id,body,support,next_action,assignee_id,version,updated_by)
    values(id,g,unit,week_date,about,a,ap.id,gp_private.words(p->'body',1200,true),gp_private.words(p->'support',600,false),gp_private.words(p->'nextAction',300,false),assignee,v,a);
  else
   v:=u.version+1;
   update gp_private.member_updates set about_member_id=about,body=gp_private.words(p->'body',1200,true),support=gp_private.words(p->'support',600,false),
    next_action=gp_private.words(p->'nextAction',300,false),assignee_id=assignee,status=p->>'status',version=v,updated_by=a,updated_at=clock_timestamp()
    where member_updates.id=gp.id;
  end if;

 when 'request.create' then
  week_date:=gp_private.week_of(p->'week');reviewer:=gp_private.uuid_of(p->'reviewerId');body:=gp_private.words(p->'body',1200,true);
  if reviewer=a or not gp_private.capable(reviewer,'oversee',ap.group_id) then raise exception 'GP_DENIED' using errcode='42501';end if;
  id:=gen_random_uuid();v:=1;
  insert into gp_private.overseer_requests(id,group_id,week,author_id,author_placement_id,reviewer_id,version) values(id,ap.group_id,week_date,a,ap.id,reviewer,v);
  insert into gp_private.overseer_request_events values(id,1,a,'submitted',body,'open',clock_timestamp());

 when 'request.respond','request.reply','request.withdraw' then
  select * into r from gp_private.overseer_requests where overseer_requests.id=gp.id for update;
  if r.version<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
  if p_action='request.respond' then
   if r.status<>'open' then raise exception 'GP_CLOSED' using errcode='55000';end if;
   if jsonb_typeof(p->'decision')<>'string' or p->>'decision' not in ('answer','clarification') then raise exception 'GP_INVALID' using errcode='22023';end if;
   decision:=p->>'decision';body:=gp_private.words(p->'body',1200,true);
   r.status:=case decision when 'answer' then 'answered' else 'clarification' end;
  elsif p_action='request.reply' then
   if r.status<>'clarification' then raise exception 'GP_CLOSED' using errcode='55000';end if;
   decision:='reply';body:=gp_private.words(p->'body',1200,true);r.status:='open';
  else
   if r.status not in ('open','clarification') then raise exception 'GP_CLOSED' using errcode='55000';end if;
   decision:='withdrawn';body:='';r.status:='withdrawn';
  end if;
  v:=r.version+1;
  update gp_private.overseer_requests set status=r.status,version=v,updated_at=clock_timestamp() where overseer_requests.id=gp.id;
  insert into gp_private.overseer_request_events values(gp.id,(select coalesce(max(seq),0)+1 from gp_private.overseer_request_events e where e.request_id=gp.id),
   a,decision,body,r.status,clock_timestamp());

 when 'location.add' then
  id:=gen_random_uuid();v:=1;
  insert into gp_private.locations(id,label,created_by) values(id,gp_private.words(p->'label',120,true),a);
 when 'location.retire' then
  update gp_private.locations set active=false where locations.id=gp_private.uuid_of(p->'id') and active returning locations.id into id;
  if id is null then raise exception 'GP_STALE' using errcode='40001';end if;v:=1;
 when 'capability.grant' then
  member:=gp_private.uuid_of(p->'memberId');cap:=p->>'capability';
  if jsonb_typeof(p->'capability')<>'string' or cap not in ('publish','schedule','oversee') or not gp_private.has_access(member) then raise exception 'GP_DENIED' using errcode='42501';end if;
  target:=gp_private.placement(member);unit:=gp_private.optional_uuid(p->'unitId');
  if cap='oversee' then
   g:=gp_private.uuid_of(p->'groupId');
   if unit is not null or not exists(select 1 from public.church_groups x where x.id=g and x.is_active) then raise exception 'GP_INVALID' using errcode='22023';end if;
  else
   if target.id is null or (p ? 'groupId' and gp_private.optional_uuid(p->'groupId') is distinct from target.group_id) then raise exception 'GP_DENIED' using errcode='42501';end if;
   g:=target.group_id;
   if cap='publish' and (unit is not null or not gp_private.group_leader(member,g)) then raise exception 'GP_DENIED' using errcode='42501';end if;
   if unit is not null and not exists(select 1 from public.church_units x where x.id=unit and x.group_id=g and x.is_active) then raise exception 'GP_INVALID' using errcode='22023';end if;
  end if;
  if exists(select 1 from gp_private.capability_grants x where x.member_id=member and x.capability=cap and x.group_id=g and x.unit_id is not distinct from unit and x.ended_at is null) then
   raise exception 'GP_STALE' using errcode='40001';end if;
  id:=gen_random_uuid();v:=1;
  insert into gp_private.capability_grants(id,member_id,capability,group_id,unit_id,placement_id,granted_by)
   values(id,member,cap,g,unit,case when cap='oversee' then null else target.id end,a);
 when 'capability.end' then
  update gp_private.capability_grants set ended_at=clock_timestamp(),ended_by=a where capability_grants.id=gp_private.uuid_of(p->'id') and ended_at is null returning capability_grants.id into id;
  if id is null then raise exception 'GP_STALE' using errcode='40001';end if;v:=1;
 end case;

 result:=jsonb_build_object('id',id,'version',v,'replayed',false);
 insert into gp_private.receipts values(a,p_request_id,ap.id,p_action,digest,id,result,clock_timestamp());
 insert into gp_private.audit(actor_id,action,resource_id,version) values(a,p_action,id,v);
 return result;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Purpose-specific workspace. Each section is filtered by current authority; restricted sections are null when not permitted.
create function gp_private.session_json(a uuid,s gp_private.sessions) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object(
  'id',s.id,'version',s.version,'start',s.starts_at,'end',s.ends_at,'phase',s.phase,
  'location',jsonb_build_object('id',l.id,'label',l.label,'active',l.active),
  'mine',gp_private.own_session(a,s.id),'canManage',gp_private.manages_session(a,s.id),
  'canEdit',gp_private.manages_session(a,s.id) or (s.creator_id=a and s.creator_placement_id=(gp_private.placement(a)).id),
  'createdBySelf',s.creator_id=a,
  'participants',(select jsonb_agg(jsonb_build_object(
    'id',case when gp_private.visible_name(s.group_id,p.member_id)='Participant unavailable' then null else p.member_id end,
    'name',gp_private.visible_name(s.group_id,p.member_id),'self',p.member_id=a,
    'response',coalesce(r.response,'pending'),'responseVersion',coalesce(r.version,0),
    'reconfirm',r.response is null and exists(select 1 from gp_private.responses o where o.session_id=s.id and o.member_id=p.member_id and o.session_version<s.version),
    'covered',case when gp_private.manages_session(a,s.id) or p.member_id=a then exists(select 1 from gp_private.availability x
      where x.member_id=p.member_id and x.placement_id=p.placement_id and x.windows @> tstzrange(s.starts_at,s.ends_at,'[)')) end
   ) order by p.member_id<>a,gp_private.visible_name(s.group_id,p.member_id),p.member_id)
   from gp_private.participants p
   left join gp_private.responses r on r.session_id=p.session_id and r.session_version=p.session_version and r.member_id=p.member_id
   where p.session_id=s.id and p.session_version=s.version),
  'report',(select jsonb_build_object('version',rp.version,'outcome',rp.outcome,'note',rp.note,'recordedAt',rp.recorded_at,
    'author',gp_private.visible_name(s.group_id,rp.author_id),'authorSelf',rp.author_id=a,'corrected',rp.version>1)
   from gp_private.reports rp where rp.session_id=s.id and rp.version=s.report_version))
 from gp_private.locations l where l.id=s.location_id $$;

create function gp_private.workspace(p_week date) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;ap public.member_placements;leader boolean;group_lead boolean;mgr boolean;result jsonb;begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'GP_ISOLATION_REQUIRED' using errcode='25001';end if;
 perform pg_advisory_xact_lock(741085);
 a:=app_private.current_member_id();
 if a is null or not gp_private.has_access(a) then raise exception 'GP_DENIED' using errcode='42501';end if;
 if p_week is null or extract(isodow from p_week)<>1 or p_week<gp_private.vegas_today()-400 or p_week>gp_private.vegas_today()+400 then
  raise exception 'GP_INVALID' using errcode='22023';end if;
 ap:=gp_private.placement(a);mgr:=gp_private.manager(a);
 if ap.id is null and not mgr then raise exception 'GP_DENIED' using errcode='42501';end if;
 group_lead:=ap.id is not null and gp_private.group_leader(a,ap.group_id);
 leader:=ap.id is not null and gp_private.leads_in_group(a,ap.group_id);
 select jsonb_build_object(
  'week',p_week,'today',gp_private.vegas_today(),'now',clock_timestamp(),
  'me',jsonb_build_object('id',a,'name',(select display_name from public.members where id=a),'placed',ap.id is not null,
   'groupId',ap.group_id,'groupName',(select name from public.church_groups where id=ap.group_id),
   'unitId',ap.unit_id,'unitName',(select name from public.church_units where id=ap.unit_id),
   'groupLeader',coalesce(group_lead,false),'unitLeader',ap.id is not null and gp_private.unit_leader(a,ap.unit_id),
   'publisher',ap.id is not null and gp_private.capable(a,'publish',ap.group_id),
   'scheduler',exists(select 1 from gp_private.capability_grants c where c.member_id=a and c.capability='schedule' and c.ended_at is null and gp_private.capable(a,'schedule',c.group_id,c.unit_id)),
   'overseer',exists(select 1 from gp_private.capability_grants c where c.member_id=a and c.capability='oversee' and c.ended_at is null and gp_private.capable(a,'oversee',c.group_id)),
   'manager',mgr),
  'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name,'unitId',p.unit_id,'self',m.id=a) order by m.display_name,m.id)
   from public.members m join public.member_placements p on p.member_id=m.id and p.ended_at is null
   where ap.id is not null and p.group_id=ap.group_id and p.id=(gp_private.placement(m.id)).id),'[]'::jsonb),
  'units',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'canWrite',gp_private.reads_update(a,ap.group_id,u.id)) order by u.name,u.id)
   from public.church_units u where leader and u.group_id=ap.group_id and u.is_active),'[]'::jsonb),
  'locations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'label',l.label) order by l.label,l.id) from gp_private.locations l where l.active),'[]'::jsonb),
  'availability',coalesce((select jsonb_build_object('version',x.version,'ranges',x.ranges,'savedAt',x.saved_at,
    'windows',coalesce((select jsonb_agg(jsonb_build_object('start',lower(w),'end',upper(w)) order by lower(w)) from unnest(x.windows) w),'[]'::jsonb))
   from gp_private.availability x where x.member_id=a and x.placement_id=ap.id),jsonb_build_object('version',0,'ranges','[]'::jsonb,'windows','[]'::jsonb)),
  'sessions',coalesce((select jsonb_agg(gp_private.session_json(a,s) order by s.starts_at,s.id) from (
    select * from gp_private.sessions s where ap.id is not null and s.group_id=ap.group_id and gp_private.readable_session(a,s.id) and (
     ((s.starts_at at time zone 'America/Los_Angeles')::date>=p_week and (s.starts_at at time zone 'America/Los_Angeles')::date<p_week+7)
     or (gp_private.own_session(a,s.id) and s.ends_at>=now()-interval '14 days' and s.starts_at<now()+interval '42 days'))
    order by s.starts_at,s.id limit 200) s),'[]'::jsonb),
  'plan',case when ap.id is null then null else (select jsonb_build_object(
    'canEdit',coalesce(group_lead,false),'canPublish',gp_private.capable(a,'publish',ap.group_id),
    'published',(select jsonb_build_object('version',pu.version,'review',pu.review,'plan',pu.plan,'nextAction',pu.next_action,
      'responsible',case when pu.responsible_id is null then null else gp_private.visible_name(ap.group_id,pu.responsible_id) end,'publishedAt',pu.published_at)
     from gp_private.plans pl join gp_private.publications pu on pu.plan_id=pl.id where pl.group_id=ap.group_id and pl.week=p_week order by pu.version desc limit 1),
    'draft',case when leader then (select jsonb_build_object('version',pl.version,'review',pl.review,'plan',pl.plan,'nextAction',pl.next_action,'responsibleId',pl.responsible_id,
      'updatedAt',pl.updated_at,'publishedVersion',(select max(x.version) from gp_private.publications x where x.plan_id=pl.id))
     from gp_private.plans pl where pl.group_id=ap.group_id and pl.week=p_week) end)) end,
  'updates',case when leader then coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'version',u.version,'week',u.week,'unitId',u.unit_id,
     'unitName',(select name from public.church_units where id=u.unit_id),
     'aboutMemberId',u.about_member_id,'about',case when u.about_member_id is null then null else gp_private.visible_name(u.group_id,u.about_member_id) end,
     'body',u.body,'support',u.support,'nextAction',u.next_action,'assigneeId',u.assignee_id,
     'assignee',case when u.assignee_id is null then null else gp_private.visible_name(u.group_id,u.assignee_id) end,
     'status',u.status,'author',gp_private.visible_name(u.group_id,u.author_id),'updatedAt',u.updated_at) order by u.status,u.week desc,u.created_at,u.id)
    from gp_private.member_updates u where u.group_id=ap.group_id and gp_private.reads_update(a,u.group_id,u.unit_id)
     and (u.week=p_week or (u.status='open' and u.week<p_week and u.week>=p_week-56))),'[]'::jsonb) end,
  'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'version',r.version,'week',r.week,'status',r.status,
     'asAuthor',r.author_id=a,'asReviewer',r.reviewer_id=a,
     'groupName',(select name from public.church_groups where id=r.group_id),
     'author',(select display_name from public.members where id=r.author_id),
     'reviewer',(select display_name from public.members where id=r.reviewer_id),
     'nextActor',case r.status when 'open' then 'reviewer' when 'clarification' then 'requester' else null end,
     'events',(select jsonb_agg(jsonb_build_object('kind',e.kind,'body',e.body,'statusAfter',e.status_after,'recordedAt',e.recorded_at,
       'actor',(select display_name from public.members where id=e.actor_id),'self',e.actor_id=a) order by e.seq)
      from gp_private.overseer_request_events e where e.request_id=r.id)) order by r.updated_at desc,r.id)
   from gp_private.overseer_requests r where gp_private.reads_request(a,r)
    and (r.week=p_week or r.status in ('open','clarification'))),'[]'::jsonb),
  'reviewers',case when leader then coalesce((select jsonb_agg(distinct jsonb_build_object('id',m.id,'name',m.display_name))
   from gp_private.capability_grants c join public.members m on m.id=c.member_id
   where c.capability='oversee' and c.group_id=ap.group_id and c.ended_at is null and c.member_id<>a and gp_private.capable(c.member_id,'oversee',ap.group_id)),'[]'::jsonb) end,
  'weekSummary',case when leader then (select jsonb_build_object(
    'sessions',count(*) filter(where s.phase<>'cancelled'),
    'proposed',count(*) filter(where s.phase='proposal'),
    'awaiting',count(*) filter(where s.phase='published' and s.ends_at>now() and exists(select 1 from gp_private.participants p
      left join gp_private.responses r on r.session_id=p.session_id and r.session_version=p.session_version and r.member_id=p.member_id
      where p.session_id=s.id and p.session_version=s.version and r.response is distinct from 'accepted')),
    'confirmed',count(*) filter(where s.phase='published' and not exists(select 1 from gp_private.participants p
      left join gp_private.responses r on r.session_id=p.session_id and r.session_version=p.session_version and r.member_id=p.member_id
      where p.session_id=s.id and p.session_version=s.version and r.response is distinct from 'accepted')),
    'resultsRecorded',count(*) filter(where s.report_version>0),
    'completed',count(*) filter(where exists(select 1 from gp_private.reports rp where rp.session_id=s.id and rp.version=s.report_version and rp.outcome='completed')),
    'resultsNeeded',count(*) filter(where s.phase='published' and s.ends_at<=now() and s.report_version=0))
   from gp_private.sessions s where s.group_id=ap.group_id and gp_private.readable_session(a,s.id)
    and (s.starts_at at time zone 'America/Los_Angeles')::date>=p_week and (s.starts_at at time zone 'America/Los_Angeles')::date<p_week+7) end,
  'manage',case when mgr then jsonb_build_object(
   'locations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'label',l.label) order by l.label,l.id) from gp_private.locations l where l.active),'[]'::jsonb),
   'grants',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'capability',c.capability,'memberId',c.member_id,
      'member',(select display_name from public.members where id=c.member_id),
      'group',(select name from public.church_groups where id=c.group_id),'unit',(select name from public.church_units where id=c.unit_id),
      'effective',gp_private.capable(c.member_id,c.capability,c.group_id,c.unit_id),'grantedAt',c.granted_at) order by c.capability,c.granted_at,c.id)
    from gp_private.capability_grants c where c.ended_at is null),'[]'::jsonb),
   'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name,'groupId',p.group_id,
      'group',(select name from public.church_groups where id=p.group_id),'unit',(select name from public.church_units where id=p.unit_id),
      'groupLeader',gp_private.group_leader(m.id,p.group_id)) order by m.display_name,m.id)
    from public.members m left join public.member_placements p on p.id=(gp_private.placement(m.id)).id
    where gp_private.has_access(m.id)),'[]'::jsonb),
   'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'category',c.name,'units',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',u.name) order by u.name)
      from public.church_units u where u.group_id=g.id and u.is_active),'[]'::jsonb)) order by c.sort_order,c.name,g.name)
    from public.church_groups g join public.age_categories c on c.id=g.age_category_id where g.is_active and c.is_active),'[]'::jsonb)) end
 ) into result;
 return result;
end $$;

create function public.gospel_planning_workspace(p_week date) returns jsonb language sql security invoker set search_path='' as $$
 select gp_private.workspace(p_week) $$;
create function public.gospel_planning_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$
 select gp_private.command(p_action,p_payload,p_request_id) $$;
revoke all on all functions in schema gp_private from public,anon,authenticated,service_role;
revoke all on function public.gospel_planning_workspace(date),public.gospel_planning_command(text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function gp_private.workspace(date),gp_private.command(text,jsonb,uuid),
 public.gospel_planning_workspace(date),public.gospel_planning_command(text,jsonb,uuid) to authenticated;
commit;
