-- UNAPPLIED. Created with `supabase migration new worship_duty_authenticated_queries`.
-- Extends Worship R1 only. No identities, roles, departments or production activation seeded.
begin;

create function app_private.worship_workspace_v2()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=app_private.current_member_id();v_data jsonb;
begin
 if v_actor is null or not app_private.module_allowed(v_actor,app_private.worship_module_id()) then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 v_data:=app_private.worship_workspace();
 -- An empty assignment is not self-owned. R1 used nullable SQL equality.
 v_data:=jsonb_set(v_data,'{services}',coalesce((
  select jsonb_agg(jsonb_set(s.value,'{assignments}',coalesce((
   select jsonb_agg(a.value||jsonb_build_object('isMine',coalesce((a.value->>'isMine')::boolean,false)) order by a.ordinality)
   from jsonb_array_elements(s.value->'assignments') with ordinality a(value,ordinality)
  ),'[]'::jsonb)) order by s.ordinality)
  from jsonb_array_elements(v_data->'services') with ordinality s(value,ordinality)
 ),'[]'::jsonb));
 return v_data||jsonb_build_object('now',now());
end $$;

-- Queries are specific to a service and duty; they cannot enumerate the member directory.
create function app_private.worship_lookup(p_query jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_actor uuid:=app_private.current_member_id();v_kind text;v_service app_private.worship_services;
 v_service_id uuid;v_duty text;v_search text;v_result jsonb;v_count integer;
begin
 if v_actor is null or not app_private.module_allowed(v_actor,app_private.worship_module_id()) then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 if jsonb_typeof(p_query) is distinct from 'object' or octet_length(p_query::text)>1024 then
  raise exception 'Invalid query' using errcode='22023';
 end if;
 v_kind:=p_query->>'kind';
 if v_kind='candidates' then
  if not(p_query?&array['kind','serviceId','dutyId']) or exists(select 1 from jsonb_object_keys(p_query) k where k not in ('kind','serviceId','dutyId')) then raise exception 'Invalid candidate query' using errcode='22023';end if;
  v_duty:=p_query->>'dutyId';
  -- Authorize the duty before testing service existence to avoid an enumeration oracle.
  if not app_private.worship_can_manage(v_actor,v_duty) then raise exception 'Not authorized' using errcode='42501';end if;
 elsif v_kind='songs' then
  if not(p_query?&array['kind','serviceId']) or exists(select 1 from jsonb_object_keys(p_query) k where k not in ('kind','serviceId','search')) or (p_query?'search' and jsonb_typeof(p_query->'search') is distinct from 'string') or length(coalesce(p_query->>'search',''))>80 then raise exception 'Invalid song query' using errcode='22023';end if;
 else raise exception 'Invalid query kind' using errcode='22023';end if;
 v_service_id:=(p_query->>'serviceId')::uuid;
 if v_kind='songs' and not app_private.worship_can_plan(v_actor,v_service_id) then raise exception 'Not authorized' using errcode='42501';end if;
 select * into v_service from app_private.worship_services where id=v_service_id;
 if not found or v_service.status='cancelled' or v_service.begins_at<now()-interval '7 days' or v_service.begins_at>=now()+interval '90 days' then raise exception 'Service unavailable' using errcode='42501';end if;
 if v_kind='candidates' then
  if v_service.begins_at<=now() or not app_private.worship_has_duty(v_service.worship_type,v_service.period,v_duty) then raise exception 'Duty not editable' using errcode='23514';end if;
  -- Only eligible department membership/qualification identities are considered. Availability and
  -- conflict explanations reveal no names or duty labels from an unrelated department.
  with candidates as (
   select m.id,m.display_name,
    app_private.worship_available(m.id,v_service_id) as is_available,
    app_private.worship_allowed_together(coalesce((select array_agg(a.duty_id) from app_private.worship_assignments a where a.service_id=v_service_id and a.member_id=m.id and a.duty_id<>v_duty),'{}'::text[])||array[v_duty]) as can_pair,
    coalesce((select r.manual_only from app_private.worship_roster_preferences r join app_private.worship_duties d on d.department_key=r.department_key where r.member_id=m.id and d.id=v_duty),false) as manual_only,
    exists(select 1 from app_private.worship_assignments a join app_private.worship_duties held on held.id=a.duty_id join app_private.worship_duties requested on requested.id=v_duty where a.service_id=v_service_id and a.member_id=m.id and held.kind='prayer' and requested.kind='usher') as paired
   from public.members m where app_private.worship_eligible(m.id,v_duty)
  ),bounded as (select * from candidates order by manual_only,paired desc,display_name,id limit 500)
  select jsonb_build_object('kind','candidates','serviceId',v_service_id,'dutyId',v_duty,'version',v_service.version,
   'hasMore',(select count(*)>500 from candidates),'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',display_name,'eligible',is_available and can_pair,'reason',case when not is_available then 'unavailable' when not can_pair then 'conflict' else 'available' end,'manualOnly',manual_only,'paired',paired) order by manual_only,paired desc,display_name,id) from bounded),'[]'::jsonb)) into v_result;
 else
  v_search:=btrim(coalesce(p_query->>'search',''));
  with matching as (
   select id,code,title,duration_seconds from app_private.worship_songs where active and (v_search='' or strpos(lower(title),lower(v_search))>0 or strpos(lower(code),lower(v_search))>0)
  ),bounded as(select * from matching order by code,id limit 500)
  select jsonb_build_object('kind','songs','serviceId',v_service_id,'hasMore',(select count(*)>500 from matching),
   'songs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',code,'title',title,'seconds',duration_seconds) order by code,id) from bounded),'[]'::jsonb)) into v_result;
 end if;
 return v_result;
end $$;

create function public.worship_workspace_v2() returns jsonb language sql stable security invoker set search_path='' as $$select app_private.worship_workspace_v2()$$;
create function public.worship_lookup(p_query jsonb) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.worship_lookup(p_query)$$;
revoke all on function app_private.worship_workspace_v2(),app_private.worship_lookup(jsonb),public.worship_workspace_v2(),public.worship_lookup(jsonb) from public,anon,authenticated;
grant execute on function app_private.worship_workspace_v2(),app_private.worship_lookup(jsonb),public.worship_workspace_v2(),public.worship_lookup(jsonb) to authenticated;
commit;
