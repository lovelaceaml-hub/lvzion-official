-- Preserve R4 callers while rechecking setup authorization after a series lock wait.
begin;
create or replace function mpg_private.live_setup(p_expected bigint,p_key uuid,p_action jsonb) returns jsonb
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
 if app_private.current_member_id() is distinct from actor
   or not mpg_private.allowed(sid,cap,actor)
   or not mpg_private.allowed(sid,'view_schedule',actor)
 then raise exception 'NOT_AUTHORIZED' using errcode='42501';end if;
 fp:=md5(jsonb_build_object('expected',p_expected,'action',p_action)::text);
 select * into rec from mpg_private.command_receipts where series_id=sid and actor_id=actor and command_key=p_key;
 if rec.command_key is not null then
   if rec.fingerprint<>fp then raise exception 'IDEMPOTENCY_MISMATCH' using errcode='22023';end if;
   return rec.result;
 end if;
 if s.version<>p_expected then raise exception 'REVISION_CONFLICT' using errcode='40001';end if;
 if typ='create_occurrence' then
   perform mpg_private.check_fields(p_action,array['type','date','startsAt','endsAt','timezone','kind']);
   if jsonb_typeof(p_action->'kind') is distinct from 'string' or (p_action->>'kind') not in ('gathering','app_day','cancelled')
      or coalesce(p_action->>'date','')!~'^\d{4}-\d{2}-\d{2}$'
      or coalesce(p_action->>'startsAt','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
      or coalesce(p_action->>'endsAt','')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
      then raise exception 'INVALID_OCCURRENCE' using errcode='22023';end if;
   locdate:=(p_action->>'date')::date;start_time:=(p_action->>'startsAt')::timestamptz;
   end_time:=(p_action->>'endsAt')::timestamptz;tz:=p_action->>'timezone';
   if tz is null or tz<>'America/Los_Angeles' or end_time<=start_time
      or start_time<=clock_timestamp() or locdate>(clock_timestamp() at time zone tz)::date+180
      or (start_time at time zone tz)::date<>locdate
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
         and m.kind='reading' and m.material_key=p_action->>'readingKey' and exists(select 1 from mpg_private.material_publications p where p.material_id=m.id))
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
commit;
