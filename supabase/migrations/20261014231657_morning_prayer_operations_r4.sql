-- Morning Prayer Operations R4: additive authenticated management, batch schedule,
-- controlled member grants and Vault-backed per-occurrence Zoom access.
-- All live schedules, grants and meeting credentials remain unseeded.
begin;

alter table mpg_private.access_references alter column protected_reference drop not null;
alter table mpg_private.access_references add column if not exists vault_secret_id uuid;
create table mpg_private.access_events(
 id uuid primary key default gen_random_uuid(),
 series_id uuid not null references mpg_private.series on delete restrict,
 member_id uuid not null references public.members on delete restrict,
 actor_id uuid not null references public.members on delete restrict,
 action text not null check(action in ('grant','revoke','eligibility')),
 capabilities text[] not null default '{}',
 enabled boolean,
 version bigint not null,
 occurred_at timestamptz not null default clock_timestamp()
);
alter table mpg_private.access_events enable row level security;
revoke all on mpg_private.access_events from public,anon,authenticated,service_role;
create trigger mpg_access_event_immutable before update or delete on mpg_private.access_events
 for each row execute function mpg_private.no_mutation();

-- Only the real confirmed bootstrap owner may assign this module's authorities.
-- Ordinary technical, group, or department roles are NOT inherited.
create function mpg_private.is_bootstrap_owner(p_actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_actor is not null and exists(
  select 1 from app_private.bootstrap_receipts b
   join app_private.account_links a on a.auth_user_id=b.auth_user_id
   join public.members m on m.id=a.member_id
  where a.member_id=p_actor and a.enabled and a.technical_enabled
   and m.status in ('intake','active') and auth.uid()=b.auth_user_id
 )
$$;

create function mpg_private.owner_roster()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid; sid uuid; result jsonb;
begin
 actor:=app_private.current_member_id();sid:=mpg_private.live_series();
 if sid is null or not mpg_private.is_bootstrap_owner(actor)
    or not mpg_private.allowed(sid,'view_schedule',actor) then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;
 select jsonb_build_object(
  'ownerId',actor,
  'version',(select version from mpg_private.series where id=sid),
  'members',coalesce((
   select jsonb_agg(jsonb_build_object(
    'id',m.id,'name',m.display_name,'status',m.status,
    'placement',coalesce(g.name,'Unassigned'),
    'enabled',a.enabled and a.technical_enabled,
    'capabilities',coalesce((select jsonb_agg(c.capability order by c.capability)
      from mpg_private.grants c where c.series_id=sid
      and c.member_id=m.id and c.ended_at is null and c.granted_at<=now()),'[]'::jsonb),
    'hostEligible',coalesce((select h.enabled and h.valid_from<=now() and
      (h.valid_until is null or h.valid_until>now())
      from mpg_private.host_eligibility h where h.series_id=sid and h.member_id=m.id),false),
    'moduleAccess',exists(select 1 from app_private.module_access_grants ag
     join app_private.app_modules mod on mod.id=ag.module_id
     where ag.member_id=m.id and ag.ended_at is null
     and ag.granted_at<=now() and mod.module_key='work-mission-prayer')
    ) order by m.display_name)
   from public.members m
   join app_private.account_links a on a.member_id=m.id
   left join lateral (
     select cg.name from public.member_placements p
      join public.church_groups cg on cg.id=p.group_id
      where p.member_id=m.id and p.ended_at is null
      order by p.started_at desc limit 1
   ) g on true
   where m.status in ('intake','active','inactive')
  ),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create function mpg_private.owner_access_command(
 p_expected bigint,p_key uuid,p_action jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; sid uuid; s mpg_private.series; target uuid;
 act text; caps text[]; raw text; rec mpg_private.command_receipts;
 fingerprint text; response jsonb; mid uuid; managing boolean;
begin
 actor:=app_private.current_member_id();sid:=mpg_private.live_series();
 if sid is null or not mpg_private.is_bootstrap_owner(actor) or
    not mpg_private.allowed(sid,'view_schedule',actor) then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';
 end if;
 if p_expected is null or p_expected<1 or p_key is null then
   raise exception 'INVALID_COMMAND' using errcode='22023';end if;
 perform mpg_private.check_fields(p_action,array['type','memberId','capabilities','enabled']);
 act:=p_action->>'type';
 if act not in ('grant','revoke','eligibility') then
  raise exception 'INVALID_ACTION' using errcode='22023';end if;
 target:=(p_action->>'memberId')::uuid;
 if target=actor or exists(
  select 1 from app_private.bootstrap_receipts b
   join app_private.account_links a on a.auth_user_id=b.auth_user_id
  where a.member_id=target
 ) then raise exception 'OWNER_CANNOT_BE_CHANGED' using errcode='42501';end if;
 if not exists(select 1 from public.members m
  join app_private.account_links a on a.member_id=m.id
  where m.id=target and m.status='active' and a.enabled and a.technical_enabled)
 then raise exception 'ACTIVE_MEMBER_REQUIRED' using errcode='42501';end if;
 select * into s from mpg_private.series where id=sid for update;
 select m.id into mid from app_private.app_modules m
 where m.module_key='work-mission-prayer' and m.status='approved';
 if mid is null then raise exception 'MODULE_NOT_READY' using errcode='42501';end if;
 fingerprint:=md5(jsonb_build_object('version',p_expected,'action',p_action)::text);
 select * into rec from mpg_private.command_receipts r
 where r.series_id=sid and r.actor_id=actor and r.command_key=p_key;
 if rec.command_key is not null then
  if rec.fingerprint<>fingerprint then raise exception 'IDEMPOTENCY_MISMATCH' using errcode='22023';end if;
  return rec.result;
 end if;
 if s.version<>p_expected then raise exception 'REVISION_CONFLICT' using errcode='40001';end if;
 if act='grant' then
  if jsonb_typeof(p_action->'capabilities') is distinct from 'array'
    then raise exception 'INVALID_CAPABILITIES' using errcode='22023';end if;
  select array_agg(cap order by cap) into caps
    from jsonb_array_elements_text(p_action->'capabilities') cap;
  if coalesce(cardinality(caps),0) not between 1 and 8
    or cardinality(caps)<>(select count(distinct v) from unnest(caps) v)
    or not ('view_schedule'=any(caps))
    or exists(select 1 from unnest(caps) v
      where v not in ('view_schedule','join_gathering','volunteer_host',
       'review_requests','manage_schedule','view_materials','edit_materials','publish_materials'))
  then raise exception 'INVALID_CAPABILITIES' using errcode='22023';end if;
  managing:=caps && array['review_requests','manage_schedule','edit_materials','publish_materials'];
  update app_private.module_access_grants
    set ended_at=clock_timestamp(),ended_by=actor
  where member_id=target and module_id=mid and ended_at is null;
  insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by)
  values(target,mid,case when managing then 'manager' else 'viewer' end,
    'Explicit Morning Prayer member permission selection',actor);
  update mpg_private.grants set ended_at=clock_timestamp()
   where series_id=sid and member_id=target and ended_at is null;
  insert into mpg_private.grants(series_id,member_id,capability,reason,granted_by)
  select sid,target,c,'Explicit Morning Prayer capability grant',actor from unnest(caps)c;
  if not ('volunteer_host'=any(caps)) then
   update mpg_private.host_eligibility set enabled=false,reviewed_by=actor
    where series_id=sid and member_id=target;
  end if;
 elsif act='revoke' then
  if p_action ? 'capabilities' or p_action ? 'enabled' then
    raise exception 'INVALID_COMMAND' using errcode='22023';end if;
  update mpg_private.grants set ended_at=clock_timestamp()
   where series_id=sid and member_id=target and ended_at is null;
  update app_private.module_access_grants set ended_at=clock_timestamp(),ended_by=actor
   where module_id=mid and member_id=target and ended_at is null;
  update mpg_private.host_eligibility set enabled=false,reviewed_by=actor
   where series_id=sid and member_id=target;
 else
  if p_action ? 'capabilities' or jsonb_typeof(p_action->'enabled') is distinct from 'boolean'
  then raise exception 'INVALID_COMMAND' using errcode='22023';end if;
  if (p_action->>'enabled')::boolean and not mpg_private.allowed(sid,'volunteer_host',target)
   then raise exception 'VOLUNTEER_GRANT_REQUIRED' using errcode='42501';end if;
  insert into mpg_private.host_eligibility(series_id,member_id,enabled,reviewed_by)
    values(sid,target,(p_action->>'enabled')::boolean,actor)
   on conflict(series_id,member_id) do update
     set enabled=excluded.enabled,valid_from=clock_timestamp(),
     valid_until=null,reviewed_by=actor;
 end if;
 update mpg_private.series set version=version+1 where id=sid;
 insert into mpg_private.access_events(series_id,member_id,actor_id,action,capabilities,enabled,version)
 values(sid,target,actor,act,coalesce(caps,'{}'),
    case when act='eligibility' then (p_action->>'enabled')::boolean else null end,s.version+1);
 insert into mpg_private.audit_events(series_id,actor_id,action,version)
 values(sid,actor,'access_'||act,s.version+1);
 response:=jsonb_build_object('action',act,'version',s.version+1);
 insert into mpg_private.command_receipts(series_id,actor_id,command_key,fingerprint,result)
 values(sid,actor,p_key,fingerprint,response);
 return response;
end $$;

-- Correct and atomic setup for one or many explicit occurrences, all UNVERIFIED.
-- No recurrence daemon or automatic schedule import.
create function mpg_private.bulk_schedule(
 p_expected bigint,p_key uuid,p_occurrences jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; sid uuid;s mpg_private.series; rec mpg_private.command_receipts;
 fp text; row jsonb; starts timestamptz; ends timestamptz;
 local_date date; kind text; dates date[]:='{}'; count_items integer;
 ids jsonb:='[]'; inserted_id uuid; response jsonb;
begin
 actor:=app_private.current_member_id();sid:=mpg_private.live_series();
 if sid is null or not mpg_private.allowed(sid,'view_schedule',actor)
  or not mpg_private.allowed(sid,'manage_schedule',actor)
  then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 if p_expected is null or p_expected<1 or p_key is null
  or jsonb_typeof(p_occurrences) is distinct from 'array'
  then raise exception 'INVALID_COMMAND' using errcode='22023';end if;
 count_items:=jsonb_array_length(p_occurrences);
 if count_items not between 1 and 62 then raise exception 'INVALID_BATCH_SIZE' using errcode='22023';end if;
 select * into s from mpg_private.series where id=sid for update;
 fp:=md5(jsonb_build_object('expected',p_expected,'occurrences',p_occurrences)::text);
 select * into rec from mpg_private.command_receipts
  where series_id=sid and actor_id=actor and command_key=p_key;
 if rec.command_key is not null then
  if rec.fingerprint<>fp then raise exception 'IDEMPOTENCY_MISMATCH' using errcode='22023';end if;
  return rec.result;
 end if;
 if s.version<>p_expected then raise exception 'REVISION_CONFLICT' using errcode='40001';end if;
 for row in select value from jsonb_array_elements(p_occurrences) loop
  perform mpg_private.check_fields(row,array['date','startsAt','endsAt','timezone','kind']);
  if jsonb_typeof(row->'date') is distinct from 'string'
   or coalesce(row->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   or coalesce(row->>'startsAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
   or coalesce(row->>'endsAt','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
   or row->>'timezone'<>'America/Los_Angeles'
   or row->>'kind' not in ('gathering','app_day','cancelled')
   then raise exception 'INVALID_OCCURRENCE' using errcode='22023';end if;
  local_date:=(row->>'date')::date;starts:=(row->>'startsAt')::timestamptz;
  ends:=(row->>'endsAt')::timestamptz;kind:=row->>'kind';
  if ends<=starts or starts<=clock_timestamp()
   or local_date>(((clock_timestamp() at time zone 'America/Los_Angeles')::date)+180)
   or (starts at time zone 'America/Los_Angeles')::date<>local_date
   or local_date=any(dates)
  then raise exception 'DATE_UNAVAILABLE_OR_DUPLICATE' using errcode='22023';end if;
  dates:=array_append(dates,local_date);
  if exists(select 1 from mpg_private.occurrences
    where series_id=sid and local_date=local_date) then
    raise exception 'DATE_ALREADY_EXISTS' using errcode='23505';end if;
  insert into mpg_private.occurrences(series_id,original_date,local_date,
    starts_at,ends_at,timezone,kind,host_id,host_confirmed,schedule_verified,origin)
   values(sid,local_date,local_date,starts,ends,'America/Los_Angeles',
     kind,null,false,false,'app') returning id into inserted_id;
  ids:=ids||jsonb_build_array(inserted_id);
 end loop;
 update mpg_private.series set version=version+1 where id=sid;
 insert into mpg_private.audit_events(series_id,actor_id,action,version)
  values(sid,actor,'schedule_bulk',s.version+1);
 response:=jsonb_build_object('action','schedule_bulk','count',count_items,'ids',ids,'version',s.version+1);
 insert into mpg_private.command_receipts(series_id,actor_id,command_key,fingerprint,result)
  values(sid,actor,p_key,fp,response);
 return response;
end $$;

-- Vault keeps the actual Zoom link encrypted at rest. No schedule/owner listing
-- or audit event contains the URL, passcode, or Vault secret bytes.
create function mpg_private.meeting_settings(
 p_expected bigint,p_key uuid,p_action jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;sid uuid;s mpg_private.series;o mpg_private.occurrences;
 rec mpg_private.command_receipts;fp text;response jsonb;
 act text;url text;secret_id uuid;occ_id uuid;window_mins integer;
begin
 actor:=app_private.current_member_id();sid:=mpg_private.live_series();
 if sid is null or not mpg_private.allowed(sid,'view_schedule',actor)
  or not mpg_private.allowed(sid,'manage_schedule',actor)
  then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 if p_key is null or p_expected is null or p_expected<1 then
  raise exception 'INVALID_COMMAND' using errcode='22023';end if;
 perform mpg_private.check_fields(p_action,array['type','occurrenceId','url','windowMinutes']);
 act:=p_action->>'type';
 if act not in ('set_window','configure_meeting','revoke_meeting') then
   raise exception 'INVALID_ACTION' using errcode='22023';end if;
 select * into s from mpg_private.series where id=sid for update;
 fp:=md5(jsonb_build_object('expected',p_expected,'action',p_action)::text);
 select * into rec from mpg_private.command_receipts
  where series_id=sid and actor_id=actor and command_key=p_key;
 if rec.command_key is not null then
  if rec.fingerprint<>fp then raise exception 'IDEMPOTENCY_MISMATCH' using errcode='22023';end if;
  return rec.result;end if;
 if s.version<>p_expected then raise exception 'REVISION_CONFLICT' using errcode='40001';end if;
 if act='set_window' then
  if p_action ? 'url' or p_action ? 'occurrenceId'
     or jsonb_typeof(p_action->'windowMinutes') is distinct from 'number'
     then raise exception 'INVALID_COMMAND' using errcode='22023';end if;
  window_mins:=(p_action->>'windowMinutes')::integer;
  if window_mins not between 0 and 30
    then raise exception 'INVALID_WINDOW' using errcode='22023';end if;
  update mpg_private.series set join_window_minutes=window_mins where id=sid;
 else
  if p_action ? 'windowMinutes' then raise exception 'INVALID_COMMAND' using errcode='22023';end if;
  occ_id:=(p_action->>'occurrenceId')::uuid;
  select * into o from mpg_private.occurrences where id=occ_id and series_id=sid for update;
  if o.id is null then raise exception 'NOT_FOUND' using errcode='42501';end if;
  if act='configure_meeting' then
    url:=p_action->>'url';
    if o.kind<>'gathering' or not o.schedule_verified or o.starts_at<=clock_timestamp()
     or s.join_window_minutes is null
     then raise exception 'SCHEDULE_OR_WINDOW_UNVERIFIED' using errcode='22023';end if;
    -- Only official Zoom HTTPS join paths; no shorteners or arbitrary redirects.
    if url is null or length(url)>400 or url !~
      '^https://([a-z0-9-]+[.])?zoom[.]us/j/[0-9]{8,12}([?]pwd=[A-Za-z0-9_-]{1,128})?$'
     then raise exception 'INVALID_ZOOM_URL' using errcode='22023';end if;
    select a.vault_secret_id into secret_id from mpg_private.access_references a
      where a.occurrence_id=o.id;
    if secret_id is null then
      secret_id:=vault.create_secret(url);
    else
      perform vault.update_secret(secret_id,url);
    end if;
    insert into mpg_private.access_references(occurrence_id,protected_reference,
      vault_secret_id,verified_epoch,verified_at,expires_at)
    values(o.id,null,secret_id,o.access_epoch,clock_timestamp(),o.ends_at)
    on conflict(occurrence_id) do update set
      vault_secret_id=excluded.vault_secret_id,protected_reference=null,
      verified_epoch=excluded.verified_epoch,verified_at=excluded.verified_at,
      expires_at=excluded.expires_at;
  else
    if p_action ? 'url' then raise exception 'INVALID_COMMAND' using errcode='22023';end if;
    update mpg_private.access_references set verified_at=null,verified_epoch=null
      where occurrence_id=o.id;
  end if;
 end if;
 update mpg_private.series set version=version+1 where id=sid;
 insert into mpg_private.audit_events(series_id,actor_id,action,version)
  values(sid,actor,'meeting_'||act,s.version+1);
 response:=jsonb_build_object('action',act,'version',s.version+1);
 insert into mpg_private.command_receipts(series_id,actor_id,command_key,fingerprint,result)
  values(sid,actor,p_key,fp,response);
 return response;
end $$;

-- Strict per-request member/session check and time-gated secret release.
create function mpg_private.live_join(p_occurrence uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;sid uuid;o mpg_private.occurrences; join_url text;
begin
 actor:=app_private.current_member_id();sid:=mpg_private.live_series();
 if sid is null or not mpg_private.allowed(sid,'view_schedule',actor)
  or not mpg_private.allowed(sid,'join_gathering',actor)
  then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 select * into o from mpg_private.occurrences where id=p_occurrence and series_id=sid;
 if o.id is null then raise exception 'NOT_FOUND' using errcode='42501';end if;
 if not mpg_private.join_ready(o.id) then
  raise exception 'MEETING_NOT_AVAILABLE' using errcode='42501';end if;
 select v.decrypted_secret into join_url
 from mpg_private.access_references a join vault.decrypted_secrets v on v.id=a.vault_secret_id
 where a.occurrence_id=o.id and a.verified_at is not null and a.verified_epoch=o.access_epoch
   and a.expires_at>clock_timestamp();
 if join_url is null or join_url !~
      '^https://([a-z0-9-]+[.])?zoom[.]us/j/[0-9]{8,12}([?]pwd=[A-Za-z0-9_-]{1,128})?$'
   then raise exception 'MEETING_NOT_AVAILABLE' using errcode='42501';end if;
 return jsonb_build_object('joinUrl',join_url,'date',o.local_date);
end $$;

-- Extend the member feed with honest state flags; never disclose link/secret.
create or replace function mpg_private.live_home(p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sid uuid;actor uuid;result jsonb;caps jsonb;drafts jsonb;candidates jsonb;
meeting_states jsonb;next_rows jsonb;
begin
 sid:=mpg_private.live_series();actor:=app_private.current_member_id();
 if sid is null or not mpg_private.allowed(sid,'view_schedule',actor)
  then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 result:=mpg_private.workspace(sid,p_from,p_to);
 select coalesce(jsonb_agg(capability order by capability),'[]'::jsonb) into caps
 from mpg_private.grants where series_id=sid and member_id=actor and ended_at is null and granted_at<=now();
 if mpg_private.allowed(sid,'edit_materials',actor) or mpg_private.allowed(sid,'publish_materials',actor) then
  select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'key',m.material_key,'kind',m.kind,
    'revision',v.revision,'sourceState',v.source_state,'body',v.body)
      order by v.created_at desc),'[]'::jsonb) into drafts
  from mpg_private.material_versions v join mpg_private.materials m on m.id=v.material_id
  left join mpg_private.material_publications p on p.material_id=m.id and p.version_id=v.id
  where m.series_id=sid and p.version_id is null;
 else drafts:='[]'::jsonb;end if;
 if mpg_private.allowed(sid,'manage_schedule',actor) then
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name)
     order by m.display_name),'[]'::jsonb) into candidates
   from public.members m join mpg_private.host_eligibility h on h.member_id=m.id
    where h.series_id=sid and mpg_private.eligible(sid,m.id);
 else candidates:='[]'::jsonb;end if;
 select coalesce(jsonb_agg(jsonb_build_object('occurrenceId',o.id,
   'ready',case when mpg_private.allowed(sid,'join_gathering',actor)
    then mpg_private.join_ready(o.id) else false end,
   'configured',case when mpg_private.allowed(sid,'manage_schedule',actor)
    then exists(select 1 from mpg_private.access_references a where a.occurrence_id=o.id
      and a.verified_at is not null and a.verified_epoch=o.access_epoch
      and a.expires_at>now()) else false end
   )),'[]'::jsonb) into meeting_states
   from mpg_private.occurrences o where o.series_id=sid
    and o.local_date between p_from and p_to;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'date',o.local_date,
  'startsAt',o.starts_at,'endsAt',o.ends_at,'kind',o.kind,
  'host',case when o.host_id=actor then 'You' when o.host_id is null then 'Host needed'
    when mpg_private.allowed(sid,'manage_schedule',actor)
      or mpg_private.allowed(sid,'review_requests',actor)
      or exists(select 1 from public.member_placements a
        join public.member_placements b on b.group_id=a.group_id
        where a.member_id=actor and b.member_id=o.host_id
          and a.ended_at is null and b.ended_at is null)
      then (select m.display_name from public.members m where m.id=o.host_id)
    else 'Assigned host' end,
  'isMine',(o.host_id=actor),'verified',o.schedule_verified)
  order by o.starts_at),'[]'::jsonb) into next_rows
  from (select * from mpg_private.occurrences o where o.series_id=sid and
     o.kind='gathering' and o.ends_at>clock_timestamp()
     and o.starts_at<clock_timestamp()+interval '62 days'
     order by o.starts_at limit 12) o;
 return result||jsonb_build_object(
   'capabilities',caps,'drafts',drafts,'eligibleHosts',candidates,
   'meetingStates',meeting_states,'upcoming',next_rows,
   'joinWindowMinutes',(select join_window_minutes from mpg_private.series where id=sid),
   'timezone','America/Los_Angeles','setupComplete',true);
end $$;

-- Prevent a reviewer's self-approval in every public command path, not only in UI.
alter function mpg_private.command(uuid,bigint,uuid,jsonb) rename to command_legacy_impl;
revoke all on function mpg_private.command_legacy_impl(uuid,bigint,uuid,jsonb) from public,anon,authenticated;
create function mpg_private.command(p_series uuid,p_expected bigint,p_key uuid,p_action jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; r_member uuid;
begin
 actor:=app_private.current_member_id();
 if p_action->>'type'='review' and p_action->>'decision'='approve' then
  select r.member_id into r_member from mpg_private.host_requests r
  where r.id=(p_action->>'requestId')::uuid and r.series_id=p_series;
  if r_member=actor then raise exception 'INDEPENDENT_REVIEW_REQUIRED' using errcode='42501';end if;
 end if;
 return mpg_private.command_legacy_impl(p_series,p_expected,p_key,p_action);
end $$;
revoke all on function mpg_private.command(uuid,bigint,uuid,jsonb) from public,anon,authenticated;
grant execute on function mpg_private.command(uuid,bigint,uuid,jsonb) to authenticated;

-- Public Data API functions are strictly invoker wrappers.
revoke all on function mpg_private.is_bootstrap_owner(uuid),
  mpg_private.owner_roster(),mpg_private.owner_access_command(bigint,uuid,jsonb),
  mpg_private.bulk_schedule(bigint,uuid,jsonb),mpg_private.meeting_settings(bigint,uuid,jsonb),
  mpg_private.live_join(uuid) from public,anon,authenticated;
grant execute on function mpg_private.owner_roster(),
  mpg_private.owner_access_command(bigint,uuid,jsonb),
  mpg_private.bulk_schedule(bigint,uuid,jsonb),
  mpg_private.meeting_settings(bigint,uuid,jsonb),
  mpg_private.live_join(uuid) to authenticated;

create function public.mpg_owner_roster()
returns jsonb language sql stable security invoker set search_path='' as
$$select mpg_private.owner_roster()$$;
create function public.mpg_owner_access(p_expected bigint,p_key uuid,p_action jsonb)
returns jsonb language sql security invoker set search_path='' as
$$select mpg_private.owner_access_command(p_expected,p_key,p_action)$$;
create function public.mpg_bulk_schedule(p_expected bigint,p_key uuid,p_occurrences jsonb)
returns jsonb language sql security invoker set search_path='' as
$$select mpg_private.bulk_schedule(p_expected,p_key,p_occurrences)$$;
create function public.mpg_meeting_settings(p_expected bigint,p_key uuid,p_action jsonb)
returns jsonb language sql security invoker set search_path='' as
$$select mpg_private.meeting_settings(p_expected,p_key,p_action)$$;
create function public.mpg_live_join(p_occurrence uuid)
returns jsonb language sql security invoker set search_path='' as
$$select mpg_private.live_join(p_occurrence)$$;

revoke all on function public.mpg_owner_roster(),
  public.mpg_owner_access(bigint,uuid,jsonb),
  public.mpg_bulk_schedule(bigint,uuid,jsonb),
  public.mpg_meeting_settings(bigint,uuid,jsonb),
  public.mpg_live_join(uuid) from public,anon;
grant execute on function public.mpg_owner_roster(),
  public.mpg_owner_access(bigint,uuid,jsonb),
  public.mpg_bulk_schedule(bigint,uuid,jsonb),
  public.mpg_meeting_settings(bigint,uuid,jsonb),
  public.mpg_live_join(uuid) to authenticated;
commit;