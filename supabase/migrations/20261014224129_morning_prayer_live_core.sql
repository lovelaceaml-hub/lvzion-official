-- UNAPPLIED REVIEW CANDIDATE. Intentionally outside supabase/migrations.
-- Run only against disposable fictional databases. Requires reviewed member + module foundations.
-- No live series, module approval, membership grant, source, schedule, or credential is seeded.
begin;
create schema mpg_private;
revoke all on schema mpg_private from public, anon, authenticated;
create table mpg_private.series (
 id uuid primary key default gen_random_uuid(), module_id uuid not null references app_private.app_modules on delete restrict,
 name text not null check(length(name) between 2 and 100), enabled boolean not null default false,
 version bigint not null default 1 check(version>0), timezone text, recurrence text,
 schedule_verified_by uuid references public.members on delete restrict, schedule_verified_at timestamptz,
 join_window_minutes integer check(join_window_minutes between 0 and 30), created_at timestamptz not null default now()
);
create table mpg_private.grants (
 id uuid primary key default gen_random_uuid(),series_id uuid not null references mpg_private.series on delete restrict,
 member_id uuid not null references public.members on delete restrict,
 capability text not null check(capability in ('view_schedule','join_gathering','volunteer_host','review_requests','manage_schedule','view_materials','edit_materials','publish_materials')),
 granted_at timestamptz not null default now(),ended_at timestamptz,granted_by uuid references public.members on delete restrict,
 reason text not null check(length(btrim(reason)) between 5 and 500),check(ended_at is null or ended_at>granted_at)
);
create unique index mpg_current_grant on mpg_private.grants(series_id,member_id,capability) where ended_at is null;
create table mpg_private.host_eligibility (
 series_id uuid not null references mpg_private.series on delete restrict,member_id uuid not null references public.members on delete restrict,
 valid_from timestamptz not null default now(),valid_until timestamptz,enabled boolean not null default false,
 reviewed_by uuid references public.members on delete restrict,primary key(series_id,member_id),check(valid_until is null or valid_until>valid_from)
);
create table mpg_private.occurrences (
 id uuid primary key default gen_random_uuid(),series_id uuid not null references mpg_private.series on delete restrict,
 original_date date not null,local_date date not null,starts_at timestamptz not null,ends_at timestamptz not null,timezone text not null,
 kind text not null default 'gathering' check(kind in ('gathering','app_day','cancelled')),
 host_id uuid references public.members on delete restrict,host_confirmed boolean not null default false,
 schedule_verified boolean not null default false,revision integer not null default 1 check(revision>0),access_epoch integer not null default 1,
 origin text not null default 'reference' check(origin in ('reference','app')),source_host_id uuid references public.members on delete restrict,
 reading_key text,unique(series_id,local_date),unique(id,series_id),check(ends_at>starts_at),check(kind='gathering' or host_id is null)
);
create table mpg_private.host_requests (
 id uuid primary key default gen_random_uuid(),series_id uuid not null references mpg_private.series on delete restrict,occurrence_id uuid not null,
 member_id uuid not null references public.members on delete restrict,kind text not null check(kind in ('volunteer','change')),
 status text not null default 'pending' check(status in ('pending','approved','declined','withdrawn','superseded')),
 occurrence_revision integer not null,revision integer not null default 1,created_at timestamptz not null default clock_timestamp(),
 resolved_by uuid references public.members on delete restrict,resolved_at timestamptz,
 foreign key(occurrence_id,series_id) references mpg_private.occurrences(id,series_id) on delete restrict,
 check((status='pending' and resolved_at is null and resolved_by is null) or (status<>'pending' and resolved_at is not null and resolved_by is not null))
);
create unique index mpg_one_pending_request on mpg_private.host_requests(occurrence_id,member_id) where status='pending';
create table mpg_private.request_notes (
 request_id uuid primary key references mpg_private.host_requests on delete restrict,note text not null check(length(note)<=200)
);
create table mpg_private.assignment_history (
 id uuid primary key default gen_random_uuid(),series_id uuid not null references mpg_private.series on delete restrict,occurrence_id uuid not null references mpg_private.occurrences on delete restrict,
 previous_host uuid references public.members on delete restrict,new_host uuid references public.members on delete restrict,
 action text not null,actor_id uuid not null references public.members on delete restrict,at timestamptz not null default clock_timestamp(),version bigint not null
);
create table mpg_private.audit_events (
 id uuid primary key default gen_random_uuid(),series_id uuid not null references mpg_private.series on delete restrict,
 actor_id uuid not null references public.members on delete restrict,action text not null,version bigint not null,at timestamptz not null default clock_timestamp()
 -- Deliberately no arbitrary payload, note, meeting URL, member contact or prayer content.
);
create table mpg_private.command_receipts (
 series_id uuid not null references mpg_private.series on delete restrict,actor_id uuid not null references public.members on delete restrict,
 command_key uuid not null,fingerprint text not null,result jsonb not null,at timestamptz not null default now(),primary key(series_id,actor_id,command_key)
);
create table mpg_private.source_candidates (
 id uuid primary key default gen_random_uuid(),series_id uuid not null references mpg_private.series on delete restrict,
 source_namespace text not null,source_row_id text not null,source_revision integer not null,
 state text not null default 'needs_review' check(state in ('needs_review','conflict','reconciled','ignored','failed')),
 protected_reference bytea,created_at timestamptz not null default now(),unique(series_id,source_namespace,source_row_id,source_revision)
);
create table mpg_private.materials (
 id uuid primary key default gen_random_uuid(),series_id uuid not null references mpg_private.series on delete restrict,
 material_key text not null check(material_key~'^[a-z0-9-]{1,100}$'),kind text not null check(kind in ('reading','pwp')),
 unique(series_id,material_key),unique(id,series_id)
);
create table mpg_private.material_versions (
 id uuid primary key default gen_random_uuid(),material_id uuid not null references mpg_private.materials on delete restrict,
 revision integer not null,body jsonb not null,source_state text not null check(source_state in ('checked','incomplete')),
 created_by uuid not null references public.members on delete restrict,created_at timestamptz not null default now(),
 unique(material_id,revision),unique(id,material_id)
);
create table mpg_private.material_publications (
 material_id uuid primary key references mpg_private.materials on delete restrict,version_id uuid not null,
 published_by uuid not null references public.members on delete restrict,published_at timestamptz not null default clock_timestamp(),
 foreign key(version_id,material_id) references mpg_private.material_versions(id,material_id) on delete restrict
);
alter table mpg_private.audit_events add column material_version_id uuid references mpg_private.material_versions on delete restrict, add column previous_material_version_id uuid references mpg_private.material_versions on delete restrict;
create table mpg_private.access_references (
 occurrence_id uuid primary key references mpg_private.occurrences on delete restrict,protected_reference bytea not null,
 verified_epoch integer,verified_at timestamptz,expires_at timestamptz
 -- No raw access reference is returned by any RPC in this candidate.
);

create function mpg_private.allowed(p_series uuid,p_cap text,p_member uuid) returns boolean language sql stable set search_path='' as $$
 select p_member is not null and exists(select 1 from mpg_private.series s join mpg_private.grants g on g.series_id=s.id
 where s.id=p_series and s.enabled and g.member_id=p_member and g.capability=p_cap and g.ended_at is null and g.granted_at<=now()
 and app_private.module_allowed(p_member,s.module_id))
$$;
create function mpg_private.eligible(p_series uuid,p_member uuid) returns boolean language sql stable set search_path='' as $$
 select mpg_private.allowed(p_series,'volunteer_host',p_member) and exists(select 1 from mpg_private.host_eligibility h
 join public.members m on m.id=h.member_id join app_private.account_links a on a.member_id=m.id
 where h.series_id=p_series and h.member_id=p_member and h.enabled and m.status='active' and a.enabled and a.technical_enabled
 and h.valid_from<=now() and (h.valid_until is null or h.valid_until>now()))
$$;
create function mpg_private.check_fields(p_value jsonb,p_allowed text[]) returns void language plpgsql set search_path='' as $$
declare k text;
begin
 if jsonb_typeof(p_value) is distinct from 'object' or octet_length(p_value::text)>16000 then raise exception 'INVALID_COMMAND' using errcode='22023';end if;
 for k in select jsonb_object_keys(p_value) loop if not(k=any(p_allowed))then raise exception 'INVALID_COMMAND' using errcode='22023';end if;end loop;
end $$;
create function mpg_private.check_material(p_body jsonb) returns void language plpgsql set search_path='' as $$
declare item jsonb;
begin
 perform mpg_private.check_fields(p_body,array['title','summary','items','sourceLabel']);
 if jsonb_typeof(p_body->'title') is distinct from 'string' or coalesce(length(btrim(p_body->>'title')),0) not between 1 and 100
 or jsonb_typeof(p_body->'summary') is distinct from 'string' or coalesce(length(btrim(p_body->>'summary')),0) not between 1 and 400
 or jsonb_typeof(p_body->'sourceLabel') is distinct from 'string' or coalesce(length(btrim(p_body->>'sourceLabel')),0) not between 1 and 100
 or jsonb_typeof(p_body->'items') is distinct from 'array' then raise exception 'INVALID_MATERIAL' using errcode='22023';end if;
 if jsonb_array_length(p_body->'items') not between 1 and 5 then raise exception 'INVALID_MATERIAL' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_body->'items')loop
 if jsonb_typeof(item) is distinct from 'string' or length(btrim(item#>>'{}')) not between 1 and 240 then raise exception 'INVALID_MATERIAL' using errcode='22023';end if;end loop;
 if p_body::text ~* '(https?://|www[.]|[[:alnum:]._%+-]+@[[:alnum:].-]+[.][[:alpha:]]{2,}|passcode|password|access_token|<[[:alpha:]!/])' then raise exception 'PRIVATE_OR_UNSAFE_CONTENT' using errcode='22023';end if;
end $$;
create function mpg_private.check_occurrence() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) or (new.starts_at at time zone new.timezone)::date<>new.local_date then raise exception 'INVALID_TIMEZONE_OR_DATE' using errcode='22023';end if;
 if tg_op='UPDATE' and (new.original_date<>old.original_date or new.series_id<>old.series_id or new.id<>old.id) then raise exception 'OCCURRENCE_IDENTITY_IMMUTABLE' using errcode='22023';end if;
 return new;
end $$;
create trigger mpg_occurrence_guard before insert or update on mpg_private.occurrences for each row execute function mpg_private.check_occurrence();
create function mpg_private.no_mutation() returns trigger language plpgsql set search_path='' as $$begin raise exception 'APPEND_ONLY_HISTORY' using errcode='42501';end $$;
create trigger mpg_assignment_append_only before update or delete on mpg_private.assignment_history for each row execute function mpg_private.no_mutation();
create trigger mpg_audit_append_only before update or delete on mpg_private.audit_events for each row execute function mpg_private.no_mutation();
create trigger mpg_receipts_append_only before update or delete on mpg_private.command_receipts for each row execute function mpg_private.no_mutation();
create trigger mpg_material_immutable before update or delete on mpg_private.material_versions for each row execute function mpg_private.no_mutation();

create function mpg_private.command(p_series uuid,p_expected bigint,p_key uuid,p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid;cap text;act text;s mpg_private.series;o mpg_private.occurrences;r mpg_private.host_requests;previous_host uuid;
 receipt mpg_private.command_receipts;fingerprint text;result jsonb;ids uuid[];oid uuid;rid uuid;target uuid;changed boolean:=false;new_start timestamptz;new_end timestamptz;mode text;
 material mpg_private.materials;mv mpg_private.material_versions;rev integer;request_ids jsonb:='[]';previous_material uuid;
begin
 actor=app_private.current_member_id();act=p_action->>'type';
 cap=case act when 'volunteer' then 'volunteer_host' when 'request_change' then 'view_schedule' when 'withdraw' then 'view_schedule' when 'review' then 'review_requests' when 'assign' then 'manage_schedule' when 'confirm_host' then 'view_schedule' when 'schedule' then 'manage_schedule' when 'material_draft' then 'edit_materials' when 'material_publish' then 'publish_materials' end;
 if actor is null or cap is null or not mpg_private.allowed(p_series,'view_schedule',actor) or not mpg_private.allowed(p_series,cap,actor) then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 if p_expected is null or p_expected<1 or p_key is null then raise exception 'INVALID_COMMAND' using errcode='22023';end if;
 -- Coarse series lock deliberately serializes all hosting decisions, batches and schedule edits.
 select * into s from mpg_private.series where id=p_series for update;
 if app_private.current_member_id() is distinct from actor or not mpg_private.allowed(p_series,'view_schedule',actor) or not mpg_private.allowed(p_series,cap,actor) then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 fingerprint=md5(jsonb_build_object('expected',p_expected,'action',p_action)::text);
 select * into receipt from mpg_private.command_receipts where series_id=p_series and actor_id=actor and command_key=p_key;
 if receipt.command_key is not null then
  if receipt.fingerprint<>fingerprint then raise exception 'IDEMPOTENCY_MISMATCH' using errcode='22023';end if;return receipt.result;
 end if;
 if s.version<>p_expected then raise exception 'REVISION_CONFLICT' using errcode='40001';end if;
 if act='volunteer' then
  perform mpg_private.check_fields(p_action,array['type','occurrenceIds']);
  if jsonb_typeof(p_action->'occurrenceIds') is distinct from 'array' then raise exception 'INVALID_DATES' using errcode='22023';end if;
  select array_agg(value::uuid order by value) into ids from jsonb_array_elements_text(p_action->'occurrenceIds');
  if coalesce(cardinality(ids),0) not between 1 and 12 or array_position(ids,null) is not null or cardinality(ids)<>(select count(distinct x) from unnest(ids)x) then raise exception 'INVALID_DATES' using errcode='22023';end if;
  if not mpg_private.eligible(p_series,actor) then raise exception 'HOST_INELIGIBLE' using errcode='42501';end if;
  foreach oid in array ids loop
   select * into o from mpg_private.occurrences where id=oid and series_id=p_series;
   if o.id is null then raise exception 'NOT_FOUND' using errcode='42501';end if;
   if o.kind<>'gathering' or not o.schedule_verified or o.starts_at<=clock_timestamp() then raise exception 'DATE_UNAVAILABLE' using errcode='22023';end if;
   if o.host_id is not null then raise exception 'HOST_ALREADY_ASSIGNED' using errcode='40001';end if;
   if exists(select 1 from mpg_private.host_requests where occurrence_id=o.id and member_id=actor and status='pending') then raise exception 'REQUEST_EXISTS' using errcode='23505';end if;
   insert into mpg_private.host_requests(series_id,occurrence_id,member_id,kind,occurrence_revision) values(p_series,o.id,actor,'volunteer',o.revision) returning id into rid;
   request_ids=request_ids||jsonb_build_array(rid);
  end loop;
 elsif act='withdraw' then
  perform mpg_private.check_fields(p_action,array['type','requestId']);
  select * into r from mpg_private.host_requests where id=(p_action->>'requestId')::uuid and series_id=p_series;
  if r.id is null or r.member_id<>actor then raise exception 'NOT_YOUR_REQUEST' using errcode='42501';end if;
  if r.status<>'pending' then raise exception 'REQUEST_RESOLVED' using errcode='40001';end if;
  update mpg_private.host_requests set status='withdrawn',revision=revision+1,resolved_by=actor,resolved_at=clock_timestamp() where id=r.id;
 elsif act='review' then
  perform mpg_private.check_fields(p_action,array['type','requestId','decision']);
  if coalesce(p_action->>'decision','') not in ('approve','decline')then raise exception 'INVALID_DECISION' using errcode='22023';end if;
  select * into r from mpg_private.host_requests where id=(p_action->>'requestId')::uuid and series_id=p_series;
  if r.id is null then raise exception 'NOT_FOUND' using errcode='42501';end if;
  if r.status<>'pending' then raise exception 'REQUEST_RESOLVED' using errcode='40001';end if;
  select * into o from mpg_private.occurrences where id=r.occurrence_id;
  if o.kind<>'gathering' or o.starts_at<=clock_timestamp() then raise exception 'DATE_UNAVAILABLE' using errcode='22023';end if;
  if p_action->>'decision'='approve' then
   if not o.schedule_verified then raise exception 'SCHEDULE_UNVERIFIED' using errcode='22023';end if;
   if r.occurrence_revision<>o.revision then raise exception 'STALE_REQUEST' using errcode='40001';end if;
   previous_host=o.host_id;
   if r.kind='volunteer' then
    if o.host_id is not null then raise exception 'HOST_ALREADY_ASSIGNED' using errcode='40001';end if;
    if not mpg_private.eligible(p_series,r.member_id) then raise exception 'HOST_INELIGIBLE' using errcode='42501';end if;
    update mpg_private.occurrences set host_id=r.member_id,host_confirmed=true,origin='app',revision=revision+1 where id=o.id;
   else
    if o.host_id is distinct from r.member_id then raise exception 'STALE_REQUEST' using errcode='40001';end if;
    update mpg_private.occurrences set host_id=null,host_confirmed=false,origin='app',revision=revision+1 where id=o.id;
   end if;
   changed=true;
   update mpg_private.host_requests set status='approved',revision=revision+1,resolved_by=actor,resolved_at=clock_timestamp() where id=r.id;
  else
   update mpg_private.host_requests set status='declined',revision=revision+1,resolved_by=actor,resolved_at=clock_timestamp() where id=r.id;
  end if;
 elsif act in ('request_change','assign','confirm_host','schedule') then
  select * into o from mpg_private.occurrences where id=(p_action->>'occurrenceId')::uuid and series_id=p_series;
  if o.id is null then raise exception 'NOT_FOUND' using errcode='42501';end if;
  if o.starts_at<=clock_timestamp()then raise exception 'DATE_PASSED' using errcode='22023';end if;
  previous_host=o.host_id;
  if act='request_change' then
   perform mpg_private.check_fields(p_action,array['type','occurrenceId','note']);
   if o.kind<>'gathering' or o.host_id is distinct from actor then raise exception 'NOT_YOUR_HOSTING_DATE' using errcode='42501';end if;
   if p_action?'note' and (jsonb_typeof(p_action->'note') is distinct from 'string' or length(p_action->>'note')>200)then raise exception 'INVALID_NOTE' using errcode='22023';end if;
   insert into mpg_private.host_requests(series_id,occurrence_id,member_id,kind,occurrence_revision) values(p_series,o.id,actor,'change',o.revision) returning id into rid;
   if coalesce(p_action->>'note','')<>'' then insert into mpg_private.request_notes values(rid,p_action->>'note');end if;request_ids=jsonb_build_array(rid);
  elsif act='assign' then
   perform mpg_private.check_fields(p_action,array['type','occurrenceId','memberId']);target=(p_action->>'memberId')::uuid;
   if o.kind<>'gathering' or not o.schedule_verified then raise exception 'DATE_UNAVAILABLE' using errcode='22023';end if;
   if not mpg_private.eligible(p_series,target) then raise exception 'HOST_INELIGIBLE' using errcode='42501';end if;
   if o.host_id=target then raise exception 'ALREADY_ASSIGNED' using errcode='22023';end if;
   update mpg_private.occurrences set host_id=target,host_confirmed=false,origin='app',revision=revision+1 where id=o.id;changed=true;
  elsif act='confirm_host' then
   perform mpg_private.check_fields(p_action,array['type','occurrenceId']);
   if o.kind<>'gathering' or o.host_id is distinct from actor then raise exception 'NOT_YOUR_HOSTING_DATE' using errcode='42501';end if;
   if not o.schedule_verified or o.host_confirmed then raise exception 'CONFIRMATION_UNAVAILABLE' using errcode='22023';end if;
   if not mpg_private.eligible(p_series,actor) then raise exception 'HOST_INELIGIBLE' using errcode='42501';end if;
   update mpg_private.occurrences set host_confirmed=true,revision=revision+1 where id=o.id;changed=true;
  else
   perform mpg_private.check_fields(p_action,array['type','occurrenceId','mode','startsAt','endsAt']);mode=p_action->>'mode';
   if coalesce(mode,'') not in ('move','verify','cancel','app_day')then raise exception 'INVALID_SCHEDULE_ACTION' using errcode='22023';end if;
   if mode<>'move' and (p_action?'startsAt' or p_action?'endsAt') then raise exception 'INVALID_COMMAND' using errcode='22023';end if;
   if mode='move' then
    if coalesce(p_action->>'startsAt','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' or coalesce(p_action->>'endsAt','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then raise exception 'INVALID_TIME' using errcode='22023';end if;
    new_start=(p_action->>'startsAt')::timestamptz;new_end=(p_action->>'endsAt')::timestamptz;
    if new_start<=clock_timestamp() or new_end<=new_start then raise exception 'INVALID_TIME' using errcode='22023';end if;
    update mpg_private.occurrences set local_date=(new_start at time zone timezone)::date,starts_at=new_start,ends_at=new_end,host_confirmed=false,schedule_verified=false,access_epoch=access_epoch+1,origin='app',revision=revision+1 where id=o.id;
   elsif mode='verify' then
    if o.kind<>'gathering' then raise exception 'NO_LIVE_GATHERING' using errcode='22023';end if;
    update mpg_private.occurrences set schedule_verified=true,access_epoch=access_epoch+1,origin='app',revision=revision+1 where id=o.id;
   else
    update mpg_private.occurrences set kind=case mode when 'cancel' then 'cancelled' else 'app_day' end,host_id=null,host_confirmed=false,schedule_verified=false,access_epoch=access_epoch+1,origin='app',revision=revision+1 where id=o.id;
   end if;
   update mpg_private.access_references set verified_at=null,verified_epoch=null where occurrence_id=o.id;changed=true;
  end if;
 elsif act='material_draft' then
  perform mpg_private.check_fields(p_action,array['type','key','body','sourceChecked']);
  select * into material from mpg_private.materials where series_id=p_series and material_key=p_action->>'key';
  if material.id is null then raise exception 'NOT_FOUND' using errcode='42501';end if;
  if jsonb_typeof(p_action->'sourceChecked') is distinct from 'boolean' then raise exception 'INVALID_SOURCE_STATE' using errcode='22023';end if;
  perform mpg_private.check_material(p_action->'body');select coalesce(max(revision)+1,1) into rev from mpg_private.material_versions where material_id=material.id;
  insert into mpg_private.material_versions(material_id,revision,body,source_state,created_by) values(material.id,rev,p_action->'body',case when (p_action->>'sourceChecked')::boolean then 'checked' else 'incomplete' end,actor) returning id into rid;
 elsif act='material_publish' then
  perform mpg_private.check_fields(p_action,array['type','materialId']);
  select v.* into mv from mpg_private.material_versions v join mpg_private.materials m on m.id=v.material_id where v.id=(p_action->>'materialId')::uuid and m.series_id=p_series;
  if mv.id is null then raise exception 'NOT_FOUND' using errcode='42501';end if;
  if mv.source_state<>'checked' then raise exception 'SOURCE_INCOMPLETE' using errcode='22023';end if;
  if exists(select 1 from mpg_private.material_publications where material_id=mv.material_id and version_id=mv.id)then raise exception 'ALREADY_PUBLISHED' using errcode='22023';end if;
  select version_id into previous_material from mpg_private.material_publications where material_id=mv.material_id;
  if exists(select 1 from mpg_private.material_versions where id=previous_material and revision>=mv.revision) then raise exception 'MATERIAL_REVISION_CONFLICT' using errcode='40001';end if;
  perform mpg_private.check_material(mv.body);
  insert into mpg_private.material_publications(material_id,version_id,published_by) values(mv.material_id,mv.id,actor)
  on conflict(material_id)do update set version_id=excluded.version_id,published_by=excluded.published_by,published_at=clock_timestamp();rid=mv.id;
 end if;
 if changed then
  update mpg_private.host_requests set status='superseded',revision=revision+1,resolved_by=actor,resolved_at=clock_timestamp() where occurrence_id=o.id and status='pending';
  insert into mpg_private.assignment_history(series_id,occurrence_id,previous_host,new_host,action,actor_id,version) select p_series,o.id,previous_host,host_id,case when act='schedule' then 'schedule_'||mode else act end,actor,s.version+1 from mpg_private.occurrences where id=o.id;
 end if;
 update mpg_private.series set version=version+1 where id=p_series;
 insert into mpg_private.audit_events(series_id,actor_id,action,version,material_version_id,previous_material_version_id)values(p_series,actor,act,s.version+1,case when act in ('material_draft','material_publish') then rid else null end,previous_material);
 result=jsonb_build_object('version',s.version+1,'action',act,'requestIds',request_ids,'materialId',case when act in ('material_draft','material_publish') then rid else null end);
 insert into mpg_private.command_receipts(series_id,actor_id,command_key,fingerprint,result)values(p_series,actor,p_key,fingerprint,result);
 return result;
end $$;

create function mpg_private.workspace(p_series uuid,p_from date,p_to date)returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid;manager boolean;reviewer boolean;result jsonb;
begin
 actor=app_private.current_member_id();
 if not mpg_private.allowed(p_series,'view_schedule',actor)then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>62 then raise exception 'INVALID_RANGE' using errcode='22023';end if;
 reviewer=mpg_private.allowed(p_series,'review_requests',actor);manager=reviewer or mpg_private.allowed(p_series,'manage_schedule',actor);
 result=jsonb_build_object('version',(select version from mpg_private.series where id=p_series),'occurrences',coalesce((select jsonb_agg(jsonb_build_object(
 'id',o.id,'date',o.local_date,'originalDate',o.original_date,'startsAt',o.starts_at,'endsAt',o.ends_at,'timezone',o.timezone,'kind',o.kind,'revision',o.revision,'verified',o.schedule_verified,'isMine',o.host_id=actor,'hostConfirmed',o.host_confirmed,
 'host',case when o.kind='app_day' then 'No live gathering' when o.kind='cancelled' then 'Cancelled' when o.host_id is null then 'Host needed' when o.host_id=actor then 'You'
 when manager or exists(select 1 from public.member_placements own join public.member_placements host on host.group_id=own.group_id where own.member_id=actor and host.member_id=o.host_id and own.ended_at is null and host.ended_at is null and own.started_at<=now() and host.started_at<=now())then m.display_name else 'Assigned host' end
 )order by o.starts_at)from mpg_private.occurrences o left join public.members m on m.id=o.host_id where o.series_id=p_series and o.local_date between p_from and p_to),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'occurrenceId',r.occurrence_id,'kind',r.kind,'status',r.status,'revision',r.revision,'isMine',r.member_id=actor,'requester',case when reviewer then m.display_name else 'You' end,'note',coalesce(n.note,''))order by r.created_at desc)
 from mpg_private.host_requests r join mpg_private.occurrences o on o.id=r.occurrence_id join public.members m on m.id=r.member_id left join mpg_private.request_notes n on n.request_id=r.id
 where r.series_id=p_series and o.local_date between p_from and p_to and (r.member_id=actor or reviewer)),'[]'::jsonb));
 if mpg_private.allowed(p_series,'view_materials',actor) then
  result=result||jsonb_build_object('materials',coalesce((select jsonb_agg(jsonb_build_object('key',m.material_key,'kind',m.kind,'revision',v.revision,'body',v.body))from mpg_private.materials m join mpg_private.material_publications p on p.material_id=m.id join mpg_private.material_versions v on v.id=p.version_id where m.series_id=p_series),'[]'::jsonb));
 end if;
 return result;
end $$;
create function mpg_private.join_ready(p_occurrence uuid)returns boolean language plpgsql stable security definer set search_path='' as $$
declare actor uuid;o mpg_private.occurrences;
begin
 actor=app_private.current_member_id();select * into o from mpg_private.occurrences where id=p_occurrence;
 if o.id is null or not mpg_private.allowed(o.series_id,'view_schedule',actor) or not mpg_private.allowed(o.series_id,'join_gathering',actor)then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 return o.kind='gathering' and o.schedule_verified and exists(select 1 from mpg_private.series s join mpg_private.access_references a on a.occurrence_id=o.id
 where s.id=o.series_id and s.join_window_minutes is not null and a.verified_at is not null and a.verified_epoch=o.access_epoch and (a.expires_at is null or a.expires_at>now())
 and now()>=o.starts_at-s.join_window_minutes*interval '1 minute' and now()<o.ends_at);
end $$;

do $$declare t record;begin for t in select tablename from pg_tables where schemaname='mpg_private'loop execute format('alter table mpg_private.%I enable row level security',t.tablename);execute format('revoke all on mpg_private.%I from public,anon,authenticated',t.tablename);end loop;end $$;
revoke all on all functions in schema mpg_private from public,anon,authenticated;
alter default privileges in schema mpg_private revoke all on tables from public,anon,authenticated;
alter default privileges in schema mpg_private revoke execute on functions from public,anon,authenticated;
grant usage on schema mpg_private to authenticated;
grant execute on function mpg_private.command(uuid,bigint,uuid,jsonb),mpg_private.workspace(uuid,date,date),mpg_private.join_ready(uuid) to authenticated;
create function public.mpg_command(p_series uuid,p_expected bigint,p_key uuid,p_action jsonb)returns jsonb language sql security invoker set search_path='' as $$select mpg_private.command(p_series,p_expected,p_key,p_action)$$;
create function public.mpg_workspace(p_series uuid,p_from date,p_to date)returns jsonb language sql stable security invoker set search_path='' as $$select mpg_private.workspace(p_series,p_from,p_to)$$;
create function public.mpg_join_ready(p_occurrence uuid)returns boolean language sql stable security invoker set search_path='' as $$select mpg_private.join_ready(p_occurrence)$$;
revoke all on function public.mpg_command(uuid,bigint,uuid,jsonb),public.mpg_workspace(uuid,date,date),public.mpg_join_ready(uuid) from public,anon;
grant execute on function public.mpg_command(uuid,bigint,uuid,jsonb),public.mpg_workspace(uuid,date,date),public.mpg_join_ready(uuid) to authenticated;

-- LV Zion Official production installation: owner-only Morning Prayer setup.
-- No real schedule, reading, PWP content, host roster or meeting credentials are imported.
insert into app_private.app_modules(module_key,display_name,short_name,description,accent,route_path,status)
values('work-mission-prayer','Work Mission · Morning Prayer','Morning',
 'Gathering schedule, daily readings, PWP activities and approved hosting requests',
 '#315DDD','/modules/work-mission-prayer','draft')
on conflict(module_key) do nothing;

insert into mpg_private.series(module_id,name,enabled,timezone,join_window_minutes)
select id,'Las Vegas Work Mission · Morning Prayer',false,'America/Los_Angeles',null
from app_private.app_modules where module_key='work-mission-prayer'
and not exists(select 1 from mpg_private.series s where s.module_id=app_private.app_modules.id);

-- Reuse exactly the already-confirmed owner bootstrap; no new user or Auth account.
do $owner$
declare v_owner_id uuid; v_owner_count integer; v_module_id uuid; v_series_id uuid;
begin
 select count(*),(array_agg(a.member_id order by a.member_id))[1]
 into v_owner_count,v_owner_id
 from app_private.bootstrap_receipts b
 join app_private.account_links a on a.auth_user_id=b.auth_user_id
 join public.members m on m.id=a.member_id and m.status in ('active','intake')
 where a.enabled and a.technical_enabled;
 -- Empty disposable/local databases must remain unactivated for regression tests.
 if v_owner_count=0 then return;end if;
 if v_owner_count<>1 then raise exception 'Exactly one verified owner required for Morning Prayer';end if;
 select id into v_module_id from app_private.app_modules where module_key='work-mission-prayer';
 select s.id into v_series_id from mpg_private.series s where s.module_id=v_module_id limit 1;
 if v_series_id is null or v_module_id is null then raise exception 'Morning Prayer module registration failed';end if;
 update app_private.app_modules set status='approved',approved_at=clock_timestamp(),
   approved_by=v_owner_id,updated_at=clock_timestamp()
 where id=v_module_id and status='draft';
 insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by)
 select v_owner_id,v_module_id,'manager','Named owner-only Morning Prayer setup; no automatic member access',v_owner_id
 where not exists(select 1 from app_private.module_access_grants g
  where g.member_id=v_owner_id and g.module_id=v_module_id and g.ended_at is null);
 insert into mpg_private.grants(series_id,member_id,capability,reason,granted_by)
 select v_series_id,v_owner_id,c.capability,'Named owner-only Morning Prayer management capability',v_owner_id
 from (values('view_schedule'),('join_gathering'),('review_requests'),('manage_schedule'),
 ('view_materials'),('edit_materials'),('publish_materials')) c(capability)
 where not exists(select 1 from mpg_private.grants g
  where g.series_id=v_series_id and g.member_id=v_owner_id and g.capability=c.capability and g.ended_at is null);
 update mpg_private.series set enabled=true where id=v_series_id;
end $owner$;

-- Setup and member projections may not return private source references or credentials.
create function mpg_private.live_series() returns uuid language sql stable set search_path='' as $$
 select s.id from mpg_private.series s join app_private.app_modules m on m.id=s.module_id
 where m.module_key='work-mission-prayer' and m.status='approved' and s.enabled limit 1
$$;

create function mpg_private.live_home(p_from date,p_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s uuid; actor uuid; caps jsonb; profile jsonb; drafts jsonb; candidates jsonb;
begin
 s:=mpg_private.live_series(); actor:=app_private.current_member_id();
 if s is null or not mpg_private.allowed(s,'view_schedule',actor) then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;
 profile:=mpg_private.workspace(s,p_from,p_to);
 select coalesce(jsonb_agg(g.capability order by g.capability),'[]'::jsonb) into caps
 from mpg_private.grants g
 where g.series_id=s and g.member_id=actor and g.ended_at is null and g.granted_at<=now();
 if mpg_private.allowed(s,'edit_materials',actor) or mpg_private.allowed(s,'publish_materials',actor) then
  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'key',m.material_key,'kind',m.kind,
  'revision',v.revision,'sourceState',v.source_state,'body',v.body) order by v.created_at desc),'[]'::jsonb)
  into drafts
  from mpg_private.material_versions v join mpg_private.materials m on m.id=v.material_id
  left join mpg_private.material_publications p on p.material_id=m.id and p.version_id=v.id
  where m.series_id=s and p.version_id is null;
 else drafts:='[]'::jsonb;end if;
 if mpg_private.allowed(s,'manage_schedule',actor) then
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name)
    order by m.display_name),'[]'::jsonb) into candidates
  from public.members m join mpg_private.host_eligibility h on h.member_id=m.id
  where h.series_id=s and mpg_private.eligible(s,m.id);
 else candidates:='[]'::jsonb;end if;
 return profile||jsonb_build_object('capabilities',caps,'drafts',drafts,'eligibleHosts',candidates,
 'setupComplete',false,'meetingAccessConfigured',false,'timezone','America/Los_Angeles');
end $$;

create function mpg_private.live_command(p_expected bigint,p_key uuid,p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s uuid;
begin
 s:=mpg_private.live_series();
 if s is null then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 return mpg_private.command(s,p_expected,p_key,p_action);
end $$;

-- Authenticated manual installation commands. Serializes on the SAME series row
-- as hosting changes, so concurrent creation/decisions cannot lose updates.
create function mpg_private.live_setup(p_expected bigint,p_key uuid,p_action jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; sid uuid; s mpg_private.series; typ text; cap text;
 rec mpg_private.command_receipts; fp text; response jsonb; occurrence_id uuid;
 material_id uuid;version_id uuid; start_time timestamptz; end_time timestamptz;
 locdate date; tz text; reading text; matkey text; matkind text;
begin
 sid:=mpg_private.live_series();actor:=app_private.current_member_id();typ:=p_action->>'type';
 cap:=case typ when 'create_occurrence' then 'manage_schedule'
  when 'link_reading' then 'manage_schedule'
  when 'create_material' then 'edit_materials' end;
 if sid is null or cap is null or not mpg_private.allowed(sid,cap,actor)
    or not mpg_private.allowed(sid,'view_schedule',actor) then
   raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 if p_key is null or p_expected is null or p_expected<1 then
   raise exception 'INVALID_COMMAND' using errcode='22023';end if;
 select * into s from mpg_private.series where id=sid for update;
 fp:=md5(jsonb_build_object('expected',p_expected,'action',p_action)::text);
 select * into rec from mpg_private.command_receipts where series_id=sid and actor_id=actor and command_key=p_key;
 if rec.command_key is not null then
   if rec.fingerprint<>fp then raise exception 'IDEMPOTENCY_MISMATCH' using errcode='22023';end if;
   return rec.result;
 end if;
 if s.version<>p_expected then raise exception 'REVISION_CONFLICT' using errcode='40001';end if;
 if typ='create_occurrence' then
   perform mpg_private.check_fields(p_action,array['type','date','startsAt','endsAt','timezone','kind']);
   if (p_action->>'kind') not in ('gathering','app_day','cancelled')
      or coalesce(p_action->>'date','')!~'^\d{4}-\d{2}-\d{2}$'
      or coalesce(p_action->>'startsAt','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
      or coalesce(p_action->>'endsAt','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
      then raise exception 'INVALID_OCCURRENCE' using errcode='22023';end if;
   locdate:=(p_action->>'date')::date;start_time:=(p_action->>'startsAt')::timestamptz;
   end_time:=(p_action->>'endsAt')::timestamptz;tz:=p_action->>'timezone';
   if tz is null or tz<>'America/Los_Angeles' or end_time<=start_time
      or start_time<=clock_timestamp() or (start_time at time zone tz)::date<>locdate
      then raise exception 'UNVERIFIED_OR_INVALID_TIME' using errcode='22023';end if;
   insert into mpg_private.occurrences(series_id,original_date,local_date,starts_at,ends_at,
     timezone,kind,host_id,host_confirmed,schedule_verified,origin)
   values(sid,locdate,locdate,start_time,end_time,tz,p_action->>'kind',null,false,false,'app')
   returning id into occurrence_id;
   response:=jsonb_build_object('occurrenceId',occurrence_id);
 elsif typ='create_material' then
   perform mpg_private.check_fields(p_action,array['type','key','kind','body','sourceChecked']);
   matkey:=p_action->>'key';matkind:=p_action->>'kind';
   if matkey is null or matkey!~'^[a-z0-9-]{1,100}$'
      or matkind not in ('reading','pwp') or jsonb_typeof(p_action->'sourceChecked') is distinct from 'boolean'
      then raise exception 'INVALID_MATERIAL' using errcode='22023';end if;
   perform mpg_private.check_material(p_action->'body');
   if exists(select 1 from mpg_private.materials m where m.series_id=sid and m.material_key=matkey)
      then raise exception 'MATERIAL_EXISTS' using errcode='23505';end if;
   insert into mpg_private.materials(series_id,material_key,kind)values(sid,matkey,matkind) returning id into material_id;
   insert into mpg_private.material_versions(material_id,revision,body,source_state,created_by)
   values(material_id,1,p_action->'body',case when (p_action->>'sourceChecked')::boolean then 'checked' else 'incomplete' end,actor)
   returning id into version_id;
   response:=jsonb_build_object('materialId',version_id);
 else
   perform mpg_private.check_fields(p_action,array['type','occurrenceId','readingKey']);
   if coalesce(p_action->>'readingKey','')!~'^[a-z0-9-]{1,100}$'
      or not exists(select 1 from mpg_private.materials m where m.series_id=sid
         and m.kind='reading' and m.material_key=p_action->>'readingKey')
      then raise exception 'READING_NOT_FOUND' using errcode='22023';end if;
   update mpg_private.occurrences o set reading_key=p_action->>'readingKey',revision=o.revision+1
     where o.id=(p_action->>'occurrenceId')::uuid and o.series_id=sid;
   if not found then raise exception 'NOT_FOUND' using errcode='42501';end if;
   response:=jsonb_build_object('readingLinked',true);
 end if;
 update mpg_private.series set version=version+1 where id=sid;
 insert into mpg_private.audit_events(series_id,actor_id,action,version)values(sid,actor,typ,s.version+1);
 response:=response||jsonb_build_object('version',s.version+1,'action',typ);
 insert into mpg_private.command_receipts(series_id,actor_id,command_key,fingerprint,result)
 values(sid,actor,p_key,fp,response);
 return response;
end $$;

revoke all on function mpg_private.live_series(),mpg_private.live_home(date,date),
 mpg_private.live_command(bigint,uuid,jsonb),mpg_private.live_setup(bigint,uuid,jsonb) from public,anon,authenticated;
grant execute on function mpg_private.live_home(date,date),mpg_private.live_command(bigint,uuid,jsonb),
 mpg_private.live_setup(bigint,uuid,jsonb) to authenticated;

create function public.mpg_live_home(p_from date,p_to date) returns jsonb
language sql stable security invoker set search_path='' as $$select mpg_private.live_home(p_from,p_to)$$;
create function public.mpg_live_command(p_expected bigint,p_key uuid,p_action jsonb) returns jsonb
language sql security invoker set search_path='' as $$select mpg_private.live_command(p_expected,p_key,p_action)$$;
create function public.mpg_live_setup(p_expected bigint,p_key uuid,p_action jsonb) returns jsonb
language sql security invoker set search_path='' as $$select mpg_private.live_setup(p_expected,p_key,p_action)$$;
revoke all on function public.mpg_live_home(date,date),public.mpg_live_command(bigint,uuid,jsonb),
 public.mpg_live_setup(bigint,uuid,jsonb) from public,anon;
grant execute on function public.mpg_live_home(date,date),public.mpg_live_command(bigint,uuid,jsonb),
 public.mpg_live_setup(bigint,uuid,jsonb) to authenticated;
commit;
