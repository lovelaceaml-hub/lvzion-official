-- Study Rooms leader access (owner decision, 2026-10-16).
-- 1. Active unit leaders, group leaders and pastoral staff may use Study Rooms automatically.
-- 2. A group leader may turn Study Rooms on or off for current members of a group they lead.
-- Explicit grants (including the owner's manager grant) are unchanged. No member is granted here.
begin;

-- Internal helper: call only with a verified current member.
create function app_private.study_leader_access(p_member uuid)
returns boolean language sql stable set search_path='' as $$
 select p_member is not null and exists(
  select 1 from app_private.role_assignments r
  join public.members m on m.id=r.member_id and m.status='active'
  where r.member_id=p_member and r.ended_at is null and r.appointed_at<=now()
    and r.role_key in ('unit_leader','group_leader','pastoral_staff')
 )
$$;

-- Same rule as before, plus automatic Study Rooms access for active leaders.
create or replace function app_private.module_allowed(p_member uuid,p_module uuid)
returns boolean language sql stable set search_path='' as $$
 select p_member is not null and exists(
  select 1 from app_private.app_modules m
  where m.id=p_module and m.status='approved' and m.approved_at is not null
    and (
     exists(select 1 from app_private.module_access_grants g
            where g.module_id=m.id and g.member_id=p_member and g.ended_at is null and g.granted_at<=now())
     or (m.id='91000000-0000-4000-8000-000000000001' and app_private.study_leader_access(p_member))
    )
 )
$$;

-- The Apps list now includes Study Rooms for active leaders. Everything else is unchanged.
create or replace function app_private.member_module_home()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 actor uuid:=app_private.current_member_id();
 result_data jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 select jsonb_build_object(
 'modules',coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',m.id,'name',m.display_name,'shortName',m.short_name,'description',m.description,
   'accent',m.accent,'route',m.route_path,'status','approved','canManage',coalesce(g.permission='manager',false)
  ) order by m.display_name,m.id)
  from app_private.app_modules m
  left join app_private.module_access_grants g
   on g.module_id=m.id and g.member_id=actor and g.ended_at is null and g.granted_at<=now()
  where m.status='approved' and m.approved_at is not null
    and (g.id is not null or (m.id='91000000-0000-4000-8000-000000000001' and app_private.study_leader_access(actor)))
 ),'[]'::jsonb),
 'activities',coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',a.id,'moduleId',a.module_id,'title',a.title,
   'date',to_char(a.begins_at at time zone 'America/Los_Angeles','YYYY-MM-DD'),
   'startTime',to_char(a.begins_at at time zone 'America/Los_Angeles','HH24:MI'),
   'endTime',to_char(a.ends_at at time zone 'America/Los_Angeles','HH24:MI'),
   'context',a.context,'location',a.location_label,'source','approved-module'
  ) order by a.begins_at,a.id)
  from (
    select * from app_private.module_activities a
    where a.recipient_member_id=actor and a.status='scheduled'
      and a.begins_at>=now()-interval '7 days'
      and a.begins_at<now()+interval '90 days'
      and app_private.module_allowed(actor,a.module_id)
    order by a.begins_at,a.id limit 80
  ) a
 ),'[]'::jsonb),
 'notifications',coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',n.id,'moduleId',n.module_id,'title','Update available in '||m.display_name,
   'description',case when n.requires_action then 'An action is available in your authorized application.'
                      else 'A new update is available in your authorized application.' end,
   'createdAt',n.created_at,'readAt',n.read_at,'requiresAction',n.requires_action,
   'route',m.route_path
  ) order by n.created_at desc,n.id)
  from (
    select * from app_private.module_notices n
    where n.recipient_member_id=actor and n.created_at>=now()-interval '30 days'
      and app_private.module_allowed(actor,n.module_id)
    order by n.created_at desc,n.id limit 40
  ) n join app_private.app_modules m on m.id=n.module_id
 ),'[]'::jsonb),
 'favorites',coalesce((
  select jsonb_agg(f.module_id order by f.sort_order)
  from app_private.member_module_favorites p,
       unnest(p.module_ids) with ordinality as f(module_id,sort_order)
  where p.member_id=actor and app_private.module_allowed(actor,f.module_id)
 ),'[]'::jsonb),
 'favoriteVersion',coalesce((select version from app_private.member_module_favorites where member_id=actor),0)
 ) into result_data;
 return result_data;
end $$;

-- Group leaders: list and switch Study Rooms access for current members of groups they lead.
-- Only viewer grants they can see are changed; manager grants are never touched.
create function app_private.study_group_access(p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=app_private.current_member_id();
 study constant uuid:='91000000-0000-4000-8000-000000000001';
 act text:=coalesce(p_command->>'action','list');
 target uuid;
 current_grant app_private.module_access_grants%rowtype;
 before_value jsonb;
begin
 if actor is null or not app_private.module_allowed(actor,study)
    or not exists(select 1 from app_private.role_assignments r
                  where r.member_id=actor and r.role_key='group_leader' and r.ended_at is null and r.appointed_at<=now())
 then raise exception 'Not authorized' using errcode='42501';end if;

 if act in ('enable','disable') then
  begin target:=(p_command->>'memberId')::uuid;exception when others then raise exception 'Invalid member' using errcode='22023';end;
  if target is null then raise exception 'Invalid member' using errcode='22023';end if;
  -- The member must be active and currently placed in a group the actor leads.
  if not exists(
   select 1 from public.member_placements p
   join public.members m on m.id=p.member_id and m.status='active'
   join app_private.role_assignments r on r.group_id=p.group_id and r.member_id=actor
    and r.role_key='group_leader' and r.ended_at is null and r.appointed_at<=now()
   where p.member_id=target and p.ended_at is null
  ) then raise exception 'Not authorized' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('study_group_access:'||target::text,0));
  select * into current_grant from app_private.module_access_grants
   where member_id=target and module_id=study and ended_at is null for update;
  before_value:=case when current_grant.id is null then null
   else jsonb_build_object('permission',current_grant.permission,'grantedAt',current_grant.granted_at) end;
  if act='enable' and current_grant.id is null then
   insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by,granted_at)
    values(target,study,'viewer','Study Rooms turned on by group leader',actor,now());
   insert into app_private.audit_events(actor_member_id,operation,target_member_id,reason,before_state,after_state)
    values(actor,'study_rooms.group_access.enable',target,'Study Rooms turned on by group leader',null,jsonb_build_object('permission','viewer'));
  elsif act='disable' and current_grant.id is not null then
   if current_grant.permission<>'viewer' then raise exception 'Not authorized' using errcode='42501';end if;
   update app_private.module_access_grants set ended_at=clock_timestamp(),ended_by=actor where id=current_grant.id;
   insert into app_private.audit_events(actor_member_id,operation,target_member_id,reason,before_state,after_state)
    values(actor,'study_rooms.group_access.disable',target,'Study Rooms turned off by group leader',before_value,null);
  end if;
 elsif act<>'list' then
  raise exception 'Invalid action' using errcode='22023';
 end if;

 return jsonb_build_object('groups',coalesce((
  select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'members',coalesce((
   select jsonb_agg(jsonb_build_object(
    'id',m.id,'name',m.display_name,'unit',u.name,
    'automatic',app_private.study_leader_access(m.id),
    'enabled',ag.id is not null,
    'locked',coalesce(ag.permission='manager',false),
    'self',m.id=actor
   ) order by m.display_name,m.id)
   from public.member_placements p
   join public.members m on m.id=p.member_id and m.status='active'
   join public.church_units u on u.id=p.unit_id
   left join app_private.module_access_grants ag on ag.member_id=m.id and ag.module_id=study and ag.ended_at is null and ag.granted_at<=now()
   where p.group_id=g.id and p.ended_at is null
  ),'[]'::jsonb)) order by g.name,g.id)
  from public.church_groups g
  where exists(select 1 from app_private.role_assignments r where r.group_id=g.id and r.member_id=actor
               and r.role_key='group_leader' and r.ended_at is null and r.appointed_at<=now())
 ),'[]'::jsonb));
end $$;

create function public.study_group_access(p_command jsonb) returns jsonb
 language sql security invoker set search_path='' as $$select app_private.study_group_access(p_command)$$;

revoke execute on function app_private.study_leader_access(uuid),app_private.study_group_access(jsonb),public.study_group_access(jsonb) from public,anon,authenticated;
grant execute on function app_private.study_group_access(jsonb),public.study_group_access(jsonb) to authenticated;

commit;
