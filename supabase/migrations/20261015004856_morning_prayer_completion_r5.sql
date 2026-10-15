-- Work Mission completion: additive replacement of private functions only.
-- No schedules, member grants, lesson content or meeting links are seeded.
begin;
create or replace function mpg_private.owner_access_command(
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
 select * into s from mpg_private.series where id=sid for update;
 if app_private.current_member_id() is distinct from actor
   or not mpg_private.is_bootstrap_owner(actor)
   or not mpg_private.allowed(sid,'view_schedule',actor) then
  raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 if not exists(select 1 from public.members where id=target) then
  raise exception 'NOT_FOUND' using errcode='42501';end if;
 -- Revocation and pausing eligibility must work after a member is disabled.
 if (act='grant' or (act='eligibility' and p_action->'enabled'='true'::jsonb))
  and not exists(select 1 from public.members m
   join app_private.account_links a on a.member_id=m.id
   where m.id=target and m.status='active' and a.enabled and a.technical_enabled)
 then raise exception 'ACTIVE_MEMBER_REQUIRED' using errcode='42501';end if;
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

create or replace function mpg_private.bulk_schedule(
 p_expected bigint,p_key uuid,p_occurrences jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; sid uuid;s mpg_private.series; rec mpg_private.command_receipts;
 fp text; row jsonb; starts timestamptz; ends timestamptz;
 v_date date; kind text; dates date[]:='{}'; count_items integer;
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
 if app_private.current_member_id() is distinct from actor
  or not mpg_private.allowed(sid,'view_schedule',actor)
  or not mpg_private.allowed(sid,'manage_schedule',actor)
 then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
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
   or jsonb_typeof(row->'timezone') is distinct from 'string'
   or row->>'timezone'<>'America/Los_Angeles'
   or jsonb_typeof(row->'kind') is distinct from 'string'
   or row->>'kind' not in ('gathering','app_day','cancelled')
   then raise exception 'INVALID_OCCURRENCE' using errcode='22023';end if;
  v_date:=(row->>'date')::date;starts:=(row->>'startsAt')::timestamptz;
  ends:=(row->>'endsAt')::timestamptz;kind:=row->>'kind';
  if ends<=starts or starts<=clock_timestamp()
   or v_date>(((clock_timestamp() at time zone 'America/Los_Angeles')::date)+180)
   or (starts at time zone 'America/Los_Angeles')::date<>v_date
   or v_date=any(dates)
  then raise exception 'DATE_UNAVAILABLE_OR_DUPLICATE' using errcode='22023';end if;
  dates:=array_append(dates,v_date);
  if exists(select 1 from mpg_private.occurrences o
    where o.series_id=sid and o.local_date=v_date) then
    raise exception 'DATE_ALREADY_EXISTS' using errcode='23505';end if;
  insert into mpg_private.occurrences(series_id,original_date,local_date,
    starts_at,ends_at,timezone,kind,host_id,host_confirmed,schedule_verified,origin)
   values(sid,v_date,v_date,starts,ends,'America/Los_Angeles',
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

create or replace function mpg_private.meeting_settings(
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
 if app_private.current_member_id() is distinct from actor
  or not mpg_private.allowed(sid,'view_schedule',actor)
  or not mpg_private.allowed(sid,'manage_schedule',actor)
 then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
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
  if (p_action->>'windowMinutes')::numeric<>trunc((p_action->>'windowMinutes')::numeric)
  then raise exception 'INVALID_WINDOW' using errcode='22023';end if;
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

create or replace function mpg_private.live_join(p_occurrence uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;sid uuid;o mpg_private.occurrences; join_url text;
begin
 actor:=app_private.current_member_id();sid:=mpg_private.live_series();
 if sid is null or not mpg_private.allowed(sid,'view_schedule',actor)
  or not mpg_private.allowed(sid,'join_gathering',actor)
  then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 -- Share the series lock with grant/revoke and meeting writes. Recheck after waiting.
 perform 1 from mpg_private.series where id=sid for share;
 if app_private.current_member_id() is distinct from actor
  or not mpg_private.allowed(sid,'view_schedule',actor)
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

create or replace function mpg_private.workspace(p_series uuid,p_from date,p_to date)returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid;manager boolean;reviewer boolean;result jsonb;
begin
 actor=app_private.current_member_id();
 if not mpg_private.allowed(p_series,'view_schedule',actor)then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>62 then raise exception 'INVALID_RANGE' using errcode='22023';end if;
 reviewer=mpg_private.allowed(p_series,'review_requests',actor);manager=reviewer or mpg_private.allowed(p_series,'manage_schedule',actor);
 result=jsonb_build_object('version',(select version from mpg_private.series where id=p_series),'occurrences',coalesce((select jsonb_agg(jsonb_build_object(
 'id',o.id,'date',o.local_date,'originalDate',o.original_date,'startsAt',o.starts_at,'endsAt',o.ends_at,'timezone',o.timezone,'kind',o.kind,'revision',o.revision,'verified',o.schedule_verified,'isMine',o.host_id=actor,'hostConfirmed',o.host_confirmed,
 'readingKey',o.reading_key,'host',case when o.kind='app_day' then 'No live gathering' when o.kind='cancelled' then 'Cancelled' when o.host_id is null then 'Host needed' when o.host_id=actor then 'You'
 when manager or exists(select 1 from public.member_placements own join public.member_placements host on host.group_id=own.group_id where own.member_id=actor and host.member_id=o.host_id and own.ended_at is null and host.ended_at is null and own.started_at<=now() and host.started_at<=now())then m.display_name else 'Assigned host' end
 )order by o.starts_at)from mpg_private.occurrences o left join public.members m on m.id=o.host_id where o.series_id=p_series and o.local_date between p_from and p_to),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'occurrenceId',r.occurrence_id,'date',o.local_date,'kind',r.kind,'status',r.status,'revision',r.revision,'isMine',r.member_id=actor,'requester',case when reviewer then m.display_name else 'You' end,'note',coalesce(n.note,''))order by r.created_at desc)
 from mpg_private.host_requests r join mpg_private.occurrences o on o.id=r.occurrence_id join public.members m on m.id=r.member_id left join mpg_private.request_notes n on n.request_id=r.id
 where r.series_id=p_series and o.local_date between p_from and p_to and (r.member_id=actor or reviewer)),'[]'::jsonb));
 if mpg_private.allowed(p_series,'view_materials',actor) then
  result=result||jsonb_build_object('materials',coalesce((select jsonb_agg(jsonb_build_object('key',m.material_key,'kind',m.kind,'revision',v.revision,'body',v.body))from mpg_private.materials m join mpg_private.material_publications p on p.material_id=m.id join mpg_private.material_versions v on v.id=p.version_id where m.series_id=p_series),'[]'::jsonb));
 end if;
 return result;
end $$;

create or replace function mpg_private.join_ready(p_occurrence uuid)returns boolean language plpgsql stable security definer set search_path='' as $$
declare actor uuid;o mpg_private.occurrences;
begin
 actor=app_private.current_member_id();select * into o from mpg_private.occurrences where id=p_occurrence;
 if o.id is null or not mpg_private.allowed(o.series_id,'view_schedule',actor) or not mpg_private.allowed(o.series_id,'join_gathering',actor)then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 return o.kind='gathering' and o.schedule_verified and exists(select 1 from mpg_private.series s join mpg_private.access_references a on a.occurrence_id=o.id
 where s.id=o.series_id and s.join_window_minutes is not null and a.vault_secret_id is not null and a.verified_at is not null and a.verified_epoch=o.access_epoch and (a.expires_at is null or a.expires_at>now())
 and now()>=o.starts_at-s.join_window_minutes*interval '1 minute' and now()<o.ends_at);
end $$;

create or replace function mpg_private.live_home(p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare sid uuid;actor uuid;result jsonb;caps jsonb;drafts jsonb;candidates jsonb;
meeting_states jsonb;next_rows jsonb;forward jsonb;catalog jsonb;own_hosting jsonb;
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
  left join mpg_private.material_publications p on p.material_id=m.id
  left join mpg_private.material_versions published on published.id=p.version_id
  where m.series_id=sid and (published.id is null or v.revision>published.revision);
 else drafts:='[]'::jsonb;end if;
 if mpg_private.allowed(sid,'manage_schedule',actor) then
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name)
     order by m.display_name),'[]'::jsonb) into candidates
   from public.members m join mpg_private.host_eligibility h on h.member_id=m.id
    where h.series_id=sid and mpg_private.eligible(sid,m.id);
 else candidates:='[]'::jsonb;end if;
 -- Reuse the same safe host-name and placement projection across calendar/Home/Me.
 forward:=mpg_private.workspace(sid,(clock_timestamp() at time zone 'America/Los_Angeles')::date,
  (clock_timestamp() at time zone 'America/Los_Angeles')::date+62);
 select coalesce(jsonb_agg(row order by row->>'startsAt'),'[]'::jsonb) into next_rows
 from (select row from jsonb_array_elements(forward->'occurrences') row
  where row->>'kind'='gathering' and (row->>'endsAt')::timestamptz>clock_timestamp()
  order by row->>'startsAt' limit 12) future;
 select coalesce(jsonb_agg(row order by row->>'startsAt'),'[]'::jsonb) into own_hosting
 from jsonb_array_elements(forward->'occurrences') row
 where row->>'kind'='gathering' and row->'isMine'='true'::jsonb
  and (row->>'endsAt')::timestamptz>clock_timestamp();
 select coalesce(jsonb_agg(jsonb_build_object('occurrenceId',o.id,
   'ready',case when mpg_private.allowed(sid,'join_gathering',actor)
    then mpg_private.join_ready(o.id) else false end,
   'configured',case when mpg_private.allowed(sid,'manage_schedule',actor)
    then exists(select 1 from mpg_private.access_references a where a.occurrence_id=o.id
      and a.vault_secret_id is not null and a.verified_at is not null
      and a.verified_epoch=o.access_epoch and a.expires_at>clock_timestamp()) else false end
   )),'[]'::jsonb) into meeting_states
 from mpg_private.occurrences o where o.series_id=sid and
  (o.local_date between p_from and p_to or o.id in
   (select (row->>'id')::uuid from jsonb_array_elements(next_rows) row));
 if mpg_private.allowed(sid,'edit_materials',actor) or mpg_private.allowed(sid,'publish_materials',actor) then
  select coalesce(jsonb_agg(jsonb_build_object('key',m.material_key,'kind',m.kind,
   'revision',latest.revision,'body',latest.body,'sourceState',latest.source_state,
   'publishedRevision',published.revision) order by m.material_key),'[]'::jsonb) into catalog
  from mpg_private.materials m
  join lateral (select * from mpg_private.material_versions v where v.material_id=m.id
   order by v.revision desc limit 1) latest on true
  left join mpg_private.material_publications p on p.material_id=m.id
  left join mpg_private.material_versions published on published.id=p.version_id
  where m.series_id=sid;
 else catalog:='[]'::jsonb;end if;
 return result||jsonb_build_object(
   'capabilities',caps,'drafts',drafts,'eligibleHosts',candidates,
   'meetingStates',meeting_states,'upcoming',next_rows,'ownHosting',own_hosting,'materialCatalog',catalog,
   'joinWindowMinutes',(select join_window_minutes from mpg_private.series where id=sid),
   'timezone','America/Los_Angeles','setupComplete',true);
end $$;
create or replace function mpg_private.command_legacy_impl(p_series uuid,p_expected bigint,p_key uuid,p_action jsonb) returns jsonb
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
   if coalesce(mode,'') not in ('move','verify','cancel','app_day','restore')then raise exception 'INVALID_SCHEDULE_ACTION' using errcode='22023';end if;
   if mode<>'move' and (p_action?'startsAt' or p_action?'endsAt') then raise exception 'INVALID_COMMAND' using errcode='22023';end if;
   if mode='move' then
    if coalesce(p_action->>'startsAt','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' or coalesce(p_action->>'endsAt','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then raise exception 'INVALID_TIME' using errcode='22023';end if;
    new_start=(p_action->>'startsAt')::timestamptz;new_end=(p_action->>'endsAt')::timestamptz;
    if new_start<=clock_timestamp() or new_end<=new_start then raise exception 'INVALID_TIME' using errcode='22023';end if;
    update mpg_private.occurrences set local_date=(new_start at time zone timezone)::date,starts_at=new_start,ends_at=new_end,host_confirmed=false,schedule_verified=false,access_epoch=access_epoch+1,origin='app',revision=revision+1 where id=o.id;
   elsif mode='restore' then
    if o.kind='gathering' then raise exception 'ALREADY_A_GATHERING' using errcode='22023';end if;
    update mpg_private.occurrences set kind='gathering',host_id=null,host_confirmed=false,
     schedule_verified=false,access_epoch=access_epoch+1,origin='app',revision=revision+1 where id=o.id;
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
commit;
