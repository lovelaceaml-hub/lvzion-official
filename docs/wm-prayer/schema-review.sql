-- UNAPPLIED REVIEW CANDIDATE. Not a Supabase migration and never part of deployment.
-- Requires the reviewed member + module foundations. No real registry entry, grant or schedule is seeded.
-- Exercise ONLY in a disposable database with fictional records before an independently approved migration.
begin;
create schema wm_private;
revoke all on schema wm_private from public, anon, authenticated;

create table wm_private.series (
 id uuid primary key default gen_random_uuid(), module_id uuid not null references app_private.app_modules on delete restrict,
 name text not null check(length(name) between 2 and 120), enabled boolean not null default false,
 timezone text, recurrence_rule text, schedule_verified_by uuid references public.members on delete restrict,
 schedule_verified_at timestamptz, created_at timestamptz not null default now()
);
create table wm_private.occurrences (
 id uuid primary key default gen_random_uuid(), series_id uuid not null references wm_private.series on delete restrict,
 provider_namespace text, occurrence_identity text, original_starts_at timestamptz, starts_at timestamptz, ends_at timestamptz,
 timezone text, status text not null default 'upcoming' check(status in ('upcoming','completed','cancelled','rescheduled')),
 schedule_verified_at timestamptz, schedule_verified_by uuid references public.members on delete restrict,
 version integer not null default 1 check(version>0), join_window_minutes integer check(join_window_minutes between 0 and 30),
 unique(provider_namespace,occurrence_identity), check(ends_at is null or starts_at is null or ends_at>starts_at),
 check(schedule_verified_at is null or (starts_at is not null and ends_at is not null and timezone is not null and schedule_verified_by is not null))
);
create table wm_private.grants (
 id uuid primary key default gen_random_uuid(), series_id uuid not null references wm_private.series on delete restrict,
 occurrence_id uuid references wm_private.occurrences on delete restrict, member_id uuid not null references public.members on delete restrict,
 capability text not null check(capability in ('participate','view_recap','view_source','draft','approve','publish','share_external','manage_schedule')),
 granted_at timestamptz not null default now(), granted_by uuid references public.members on delete restrict, ended_at timestamptz,
 reason text not null check(length(btrim(reason)) between 5 and 500), check(ended_at is null or ended_at>granted_at)
);
create unique index wm_current_grant on wm_private.grants(member_id,series_id,capability,occurrence_id) nulls not distinct where ended_at is null;
create index wm_grant_lookup on wm_private.grants(member_id,series_id) where ended_at is null;
create table wm_private.source_versions (
 id uuid primary key default gen_random_uuid(), occurrence_id uuid not null references wm_private.occurrences on delete restrict,
 revision integer not null check(revision>0), fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 kind text not null check(kind in ('summary','transcript')), state text not null check(state in ('missing','failed','partial','ready')),
 permitted_sections jsonb not null default '{}' check(jsonb_typeof(permitted_sections)='object'),
 received_at timestamptz not null default now(), unique(occurrence_id,revision), unique(occurrence_id,fingerprint), unique(id,occurrence_id)
);
create table wm_private.source_references (
 id uuid primary key default gen_random_uuid(), source_id uuid not null references wm_private.source_versions on delete restrict,
 source_namespace text not null, message_reference text not null, encrypted_reference bytea,
 retention_until timestamptz, access_state text not null default 'unverified' check(access_state in ('unverified','permitted','revoked')),
 created_at timestamptz not null default now()
);
create table wm_private.import_receipts (
 source_namespace text not null, message_reference text not null, part_identity text not null default '0',
 source_id uuid references wm_private.source_versions on delete restrict,
 state text not null check(state in ('identity_review','source_review','duplicate','accepted','failed')),
 failure_code text check(failure_code in ('INVALID_ENVELOPE','IDENTITY_MISSING','SOURCE_INCOMPLETE','PROVIDER_UNAVAILABLE')),
 received_at timestamptz not null default now(), primary key(source_namespace,message_reference,part_identity)
);
create table wm_private.recap_versions (
 id uuid primary key default gen_random_uuid(), occurrence_id uuid not null references wm_private.occurrences on delete restrict,
 source_id uuid not null, revision integer not null check(revision>0), content jsonb not null,
 status text not null default 'draft' check(status in ('draft','review','approved')),
 author_id uuid not null references public.members on delete restrict, reviewer_id uuid references public.members on delete restrict,
 generated_at timestamptz not null default now(), reviewed_at timestamptz, privacy_checked boolean not null default false,
 summary_limit_accepted boolean not null default false,
 unique(occurrence_id,revision),unique(id,occurrence_id), foreign key(source_id,occurrence_id) references wm_private.source_versions(id,occurrence_id) on delete restrict,
 check(status<>'approved' or (reviewer_id is not null and reviewer_id<>author_id and reviewed_at is not null and privacy_checked))
);
create table wm_private.assets (
 id uuid primary key default gen_random_uuid(), recap_id uuid references wm_private.recap_versions on delete restrict,
 source_id uuid references wm_private.source_versions on delete restrict,
 kind text not null check(kind in ('graphic','transcript','recording')), private_object_key text not null,
 content_digest text not null check(content_digest ~ '^[a-f0-9]{64}$'), permitted boolean not null default false,
 created_at timestamptz not null default now(), check(num_nonnulls(recap_id,source_id)=1),
 check((kind='graphic' and recap_id is not null) or (kind in ('transcript','recording') and source_id is not null))
);
create table wm_private.approval_history (
 id uuid primary key default gen_random_uuid(), recap_id uuid not null references wm_private.recap_versions on delete restrict,
 actor_id uuid not null references public.members on delete restrict, action text not null check(action in ('draft','submit','approve','publish')),
 occurrence_version integer not null, at timestamptz not null default clock_timestamp()
);
create table wm_private.publications (
 occurrence_id uuid primary key references wm_private.occurrences on delete restrict,
 recap_id uuid not null, published_by uuid not null references public.members on delete restrict, published_at timestamptz not null default now(),
 foreign key(recap_id,occurrence_id) references wm_private.recap_versions(id,occurrence_id) on delete restrict
);
create table wm_private.publication_history (
 id uuid primary key default gen_random_uuid(), occurrence_id uuid not null references wm_private.occurrences on delete restrict,
 recap_id uuid not null references wm_private.recap_versions on delete restrict, previous_recap_id uuid references wm_private.recap_versions on delete restrict,
 actor_id uuid not null references public.members on delete restrict, at timestamptz not null default clock_timestamp()
);
create table wm_private.meeting_access (
 occurrence_id uuid primary key references wm_private.occurrences on delete restrict,
 encrypted_access_reference bytea not null, verified_at timestamptz, verified_by uuid references public.members on delete restrict,
 schedule_version integer not null, expires_at timestamptz
);
create table wm_private.schedule_history (
 id uuid primary key default gen_random_uuid(), occurrence_id uuid not null references wm_private.occurrences on delete restrict,
 previous_start timestamptz, previous_end timestamptz, new_start timestamptz,new_end timestamptz,
 action text not null check(action in ('cancel','reschedule')), actor_id uuid not null references public.members on delete restrict,
 occurrence_version integer not null, at timestamptz not null default clock_timestamp()
);

-- No caller-supplied identity or organization/department/technical-role inheritance.
create function wm_private.allowed(p_occurrence uuid,p_capability text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from wm_private.occurrences o join wm_private.series s on s.id=o.series_id
 join wm_private.grants g on g.series_id=s.id
 where o.id=p_occurrence and s.enabled and g.member_id=app_private.current_member_id()
 and g.capability=p_capability and g.granted_at<=now() and g.ended_at is null
 and (g.occurrence_id is null or g.occurrence_id=o.id)
 and app_private.module_allowed(g.member_id,s.module_id))
$$;
create function wm_private.check_content(p_content jsonb,p_sections jsonb) returns void
language plpgsql set search_path='' as $$
declare p jsonb; k text; txt text;
begin
 if jsonb_typeof(p_content) is distinct from 'object' then raise exception 'INVALID_CONTENT' using errcode='22023'; end if;
 for k in select jsonb_object_keys(p_content) loop
  if k not in ('title','centralMessage','centralSourceSection','points','explanation') then raise exception 'UNEXPECTED_CONTENT_FIELD' using errcode='22023';end if;
 end loop;
 if coalesce(length(btrim(p_content->>'title')),0) not between 1 and 96 or coalesce(length(btrim(p_content->>'centralMessage')),0) not between 1 and 220
 or jsonb_typeof(p_content->'points') is distinct from 'array' or jsonb_typeof(p_content->'explanation') is distinct from 'array' then raise exception 'INVALID_CONTENT' using errcode='22023';end if;
 if jsonb_array_length(p_content->'points') not between 1 and 3 or jsonb_array_length(p_content->'explanation') not between 1 and 8
 or not coalesce(p_sections ? (p_content->>'centralSourceSection'),false) then raise exception 'UNSUPPORTED_CONTENT' using errcode='22023';end if;
 for p in select value from jsonb_array_elements(p_content->'points') loop
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'INVALID_CONTENT' using errcode='22023';end if;
  for k in select jsonb_object_keys(p) loop if k not in ('label','text','sourceSection') then raise exception 'UNEXPECTED_CONTENT_FIELD' using errcode='22023';end if;end loop;
  if coalesce(length(btrim(p->>'label')),0) not between 1 and 30 or coalesce(length(btrim(p->>'text')),0) not between 1 and 180 or not coalesce(p_sections ? (p->>'sourceSection'),false) then raise exception 'UNSUPPORTED_CONTENT' using errcode='22023';end if;
 end loop;
 for p in select value from jsonb_array_elements(p_content->'explanation') loop
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'INVALID_CONTENT' using errcode='22023';end if;
  for k in select jsonb_object_keys(p) loop if k not in ('heading','text','sourceSection') then raise exception 'UNEXPECTED_CONTENT_FIELD' using errcode='22023';end if;end loop;
  if coalesce(length(btrim(p->>'heading')),0) not between 1 and 80 or coalesce(length(btrim(p->>'text')),0) not between 1 and 1600 or not coalesce(p_sections ? (p->>'sourceSection'),false) then raise exception 'UNSUPPORTED_CONTENT' using errcode='22023';end if;
 end loop;
 txt=p_content::text;
 if txt ~* '(https?://|www[.]|[[:alnum:]._%+-]+@[[:alnum:].-]+[.][[:alpha:]]{2,}|passcode|password|access_token|refresh_token|attendees|private prayer request|<[[:alpha:]!/])' then raise exception 'PRIVACY_REVIEW_REQUIRED' using errcode='22023';end if;
 -- This warning gate cannot prove anonymity or teaching accuracy. Independent human review is mandatory.
end $$;
create function wm_private.freeze_recap_content() returns trigger language plpgsql set search_path='' as $$
begin
 if new.content is distinct from old.content or new.source_id is distinct from old.source_id or new.author_id is distinct from old.author_id or new.generated_at is distinct from old.generated_at or new.occurrence_id is distinct from old.occurrence_id or new.revision is distinct from old.revision then raise exception 'CREATE_A_NEW_REVISION' using errcode='22023';end if;
 if old.status='approved' and new is distinct from old then raise exception 'APPROVED_VERSION_IMMUTABLE' using errcode='22023';end if;
 return new;
end $$;
create trigger wm_immutable_content before update on wm_private.recap_versions for each row execute function wm_private.freeze_recap_content();

create function wm_private.editorial(p_occurrence uuid,p_recap uuid,p_expected integer,p_action text,p_content jsonb default null,p_privacy boolean default false,p_summary_limit boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o wm_private.occurrences; r wm_private.recap_versions; s wm_private.source_versions; actor uuid; cap text; rid uuid; previous uuid;
begin
 actor=app_private.current_member_id();
 cap=case p_action when 'draft' then 'draft' when 'submit' then 'draft' when 'approve' then 'approve' when 'publish' then 'publish' end;
 if cap is null or not wm_private.allowed(p_occurrence,cap) then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 select * into o from wm_private.occurrences where id=p_occurrence for update;
 if o.version is distinct from p_expected then raise exception 'REVISION_CONFLICT' using errcode='40001';end if;
 select * into s from wm_private.source_versions where occurrence_id=o.id order by revision desc limit 1;
 if s.id is null or s.state<>'ready' then raise exception 'SOURCE_INCOMPLETE' using errcode='22023';end if;
 if p_action='draft' then
  perform wm_private.check_content(p_content,s.permitted_sections);
  insert into wm_private.recap_versions(occurrence_id,source_id,revision,content,author_id)
  values(o.id,s.id,coalesce((select max(revision)+1 from wm_private.recap_versions where occurrence_id=o.id),1),p_content,actor) returning id into rid;
 else
  select * into r from wm_private.recap_versions where id=p_recap and occurrence_id=o.id for update;
  if r.id is null then raise exception 'NOT_FOUND' using errcode='42501';end if;
  rid=r.id;
  if r.source_id<>s.id then raise exception 'SOURCE_CHANGED' using errcode='40001';end if;
  perform wm_private.check_content(r.content,s.permitted_sections);
  if p_action='submit' then
   if r.status<>'draft' then raise exception 'INVALID_TRANSITION' using errcode='22023';end if;
   update wm_private.recap_versions set status='review' where id=r.id;
  elsif p_action='approve' then
   if not wm_private.allowed(o.id,'view_source') then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
   if r.status<>'review' then raise exception 'INVALID_TRANSITION' using errcode='22023';end if;
   if actor=r.author_id then raise exception 'INDEPENDENT_REVIEW_REQUIRED' using errcode='42501';end if;
   if p_privacy is distinct from true or (s.kind='summary' and p_summary_limit is distinct from true) then raise exception 'REVIEW_ACKNOWLEDGEMENT_REQUIRED' using errcode='22023';end if;
   update wm_private.recap_versions set status='approved',reviewer_id=actor,reviewed_at=clock_timestamp(),privacy_checked=true,summary_limit_accepted=p_summary_limit where id=r.id;
  else
   if r.status<>'approved' or not r.privacy_checked or r.reviewer_id is null then raise exception 'APPROVAL_REQUIRED' using errcode='42501';end if;
   select recap_id into previous from wm_private.publications where occurrence_id=o.id;
   if previous=r.id then raise exception 'ALREADY_PUBLISHED' using errcode='22023';end if;
   insert into wm_private.publications(occurrence_id,recap_id,published_by) values(o.id,r.id,actor)
   on conflict(occurrence_id) do update set recap_id=excluded.recap_id,published_by=excluded.published_by,published_at=clock_timestamp();
   insert into wm_private.publication_history(occurrence_id,recap_id,previous_recap_id,actor_id) values(o.id,r.id,previous,actor);
  end if;
 end if;
 update wm_private.occurrences set version=version+1 where id=o.id;
 insert into wm_private.approval_history(recap_id,actor_id,action,occurrence_version) values(rid,actor,p_action,o.version+1);
 return jsonb_build_object('recapId',rid,'version',o.version+1,'action',p_action);
end $$;

create function wm_private.read_published(p_occurrence uuid,p_external boolean default false) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r wm_private.recap_versions; s wm_private.source_versions; o wm_private.occurrences;
begin
 if not wm_private.allowed(p_occurrence,'view_recap') or (p_external and not wm_private.allowed(p_occurrence,'share_external')) then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 select v.* into r from wm_private.publications p join wm_private.recap_versions v on v.id=p.recap_id where p.occurrence_id=p_occurrence and v.status='approved' and v.privacy_checked;
 if r.id is null then return null;end if;
 select * into s from wm_private.source_versions where id=r.source_id;
 select * into o from wm_private.occurrences where id=p_occurrence;
 if p_external and (s.state<>'ready' or exists(select 1 from wm_private.source_versions where occurrence_id=p_occurrence and revision>s.revision)) then raise exception 'SOURCE_CHANGED' using errcode='40001';end if;
 -- Deliberate allowlist. No mailbox ids, source URLs, object keys, credentials or attendee records.
 return jsonb_build_object('recapId',r.id,'revision',r.revision,'content',r.content,'gatheringDate',o.starts_at,'timezone',o.timezone,'sourceType',s.kind,'generatedAt',r.generated_at,'reviewedAt',r.reviewed_at,'sourceLimitation',case s.kind when 'summary' then 'Summary-derived paraphrase. Full recording and transcript not reviewed.' else 'Based only on permitted transcript sections reviewed.' end);
end $$;
create function wm_private.read_source(p_occurrence uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s wm_private.source_versions;
begin
 if not wm_private.allowed(p_occurrence,'view_source') then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 select * into s from wm_private.source_versions where occurrence_id=p_occurrence order by revision desc limit 1;
 if s.id is null then return jsonb_build_object('state','missing');end if;
 return jsonb_build_object('revision',s.revision,'kind',s.kind,'state',s.state,'sections',case when s.state='ready' then s.permitted_sections else '{}'::jsonb end);
 -- Raw links, recordings and transcripts require a future separately reviewed expiring broker; never returned by this RPC.
end $$;
create function wm_private.reschedule(p_occurrence uuid,p_expected integer,p_action text,p_start timestamptz default null,p_end timestamptz default null) returns integer
language plpgsql security definer set search_path='' as $$
declare o wm_private.occurrences;
begin
 if not wm_private.allowed(p_occurrence,'manage_schedule') then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 select * into o from wm_private.occurrences where id=p_occurrence for update;
 if o.version is distinct from p_expected then raise exception 'REVISION_CONFLICT' using errcode='40001';end if;
 if o.status='completed' or p_action not in ('cancel','reschedule') then raise exception 'INVALID_SCHEDULE_ACTION' using errcode='22023';end if;
 if p_action='reschedule' and (p_start is null or p_end is null or p_end<=p_start) then raise exception 'INVALID_TIME' using errcode='22023';end if;
 update wm_private.occurrences set status=case p_action when 'cancel' then 'cancelled' else 'rescheduled' end,
 starts_at=case p_action when 'cancel' then starts_at else p_start end,ends_at=case p_action when 'cancel' then ends_at else p_end end,
 schedule_verified_at=null,schedule_verified_by=null,version=version+1 where id=o.id;
 update wm_private.meeting_access set verified_at=null,verified_by=null where occurrence_id=o.id;
 insert into wm_private.schedule_history(occurrence_id,previous_start,previous_end,new_start,new_end,action,actor_id,occurrence_version)
 values(o.id,o.starts_at,o.ends_at,case p_action when 'cancel' then o.starts_at else p_start end,case p_action when 'cancel' then o.ends_at else p_end end,p_action,app_private.current_member_id(),o.version+1);
 return o.version+1;
end $$;

-- Even privileged source changes serialize on the occurrence and increment its revision.
-- Source content/state changes create new immutable source_versions; no approved recap is overwritten.
create function wm_private.source_insert_lock() returns trigger language plpgsql set search_path='' as $$
begin
 perform 1 from wm_private.occurrences where id=new.occurrence_id for update;
 if new.revision<>coalesce((select max(revision)+1 from wm_private.source_versions where occurrence_id=new.occurrence_id),1) then raise exception 'SOURCE_REVISION_CONFLICT' using errcode='40001';end if;
 update wm_private.occurrences set version=version+1 where id=new.occurrence_id;
 return new;
end $$;
create trigger wm_source_revision before insert on wm_private.source_versions for each row execute function wm_private.source_insert_lock();
create function wm_private.no_mutation() returns trigger language plpgsql set search_path='' as $$begin raise exception 'APPEND_ONLY_HISTORY' using errcode='42501';end $$;
create trigger wm_source_immutable before update or delete on wm_private.source_versions for each row execute function wm_private.no_mutation();
create trigger wm_approval_immutable before update or delete on wm_private.approval_history for each row execute function wm_private.no_mutation();
create trigger wm_publication_history_immutable before update or delete on wm_private.publication_history for each row execute function wm_private.no_mutation();
create trigger wm_schedule_history_immutable before update or delete on wm_private.schedule_history for each row execute function wm_private.no_mutation();

-- Deny all direct table operations, including callers with generic module-manager grants.
do $$declare t record;begin
 for t in select tablename from pg_tables where schemaname='wm_private' loop
  execute format('alter table wm_private.%I enable row level security',t.tablename);
  execute format('revoke all on wm_private.%I from public,anon,authenticated',t.tablename);
 end loop;
end $$;
revoke all on all functions in schema wm_private from public,anon,authenticated;
alter default privileges in schema wm_private revoke all on tables from public,anon,authenticated;
alter default privileges in schema wm_private revoke execute on functions from public,anon,authenticated;
-- Fixed invoker wrappers; definer functions derive the verified member and verify every operation.
grant usage on schema wm_private to authenticated;
grant execute on function wm_private.editorial(uuid,uuid,integer,text,jsonb,boolean,boolean),wm_private.read_published(uuid,boolean),wm_private.read_source(uuid),wm_private.reschedule(uuid,integer,text,timestamptz,timestamptz) to authenticated;
create function public.wm_editorial(p_occurrence uuid,p_recap uuid,p_expected integer,p_action text,p_content jsonb default null,p_privacy boolean default false,p_summary_limit boolean default false) returns jsonb
language sql security invoker set search_path='' as $$select wm_private.editorial(p_occurrence,p_recap,p_expected,p_action,p_content,p_privacy,p_summary_limit)$$;
create function public.wm_published(p_occurrence uuid,p_external boolean default false) returns jsonb
language sql stable security invoker set search_path='' as $$select wm_private.read_published(p_occurrence,p_external)$$;
create function public.wm_source(p_occurrence uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select wm_private.read_source(p_occurrence)$$;
create function public.wm_reschedule(p_occurrence uuid,p_expected integer,p_action text,p_start timestamptz default null,p_end timestamptz default null) returns integer
language sql security invoker set search_path='' as $$select wm_private.reschedule(p_occurrence,p_expected,p_action,p_start,p_end)$$;
revoke all on function public.wm_editorial(uuid,uuid,integer,text,jsonb,boolean,boolean),public.wm_published(uuid,boolean),public.wm_source(uuid),public.wm_reschedule(uuid,integer,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.wm_editorial(uuid,uuid,integer,text,jsonb,boolean,boolean),public.wm_published(uuid,boolean),public.wm_source(uuid),public.wm_reschedule(uuid,integer,text,timestamptz,timestamptz) to authenticated;
commit;
