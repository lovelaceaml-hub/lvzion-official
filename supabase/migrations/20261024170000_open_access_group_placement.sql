-- Open app access, owner-everywhere and group-only placement (Anthony's decisions, 2026-10-24).
-- 1. Every approved app is open to every signed-in member (a confirmed account with an enabled
--    account link, including Unassigned/intake members). They get ordinary use ("viewer") access.
--    Managing still needs an explicit manager grant. Each module keeps its own privacy rules.
-- 2. The bootstrap owner is manager on every approved app, including future ones, with no grant rows.
-- 3. A member can be placed in a group without a unit: Age category -> Group -> (optional) Unit.
-- Additive: no data is deleted; existing grants, placements, appointments, history and audits stay.
-- Re-running is safe: every statement is create-or-replace, idempotent DDL or guarded.
begin;

-- ---------------------------------------------------------------------------------------------
-- Identity. current_member_id() now means "the signed-in member" (active or intake). The previous
-- meaning (active members, plus the intake bootstrap owner) is kept as organization_member_id() for
-- the member-administration commands. Organizational authority also still requires an effective
-- appointment through actor_has(), which checks member status independently.
create or replace function app_private.organization_member_id() returns uuid language sql stable security definer set search_path='' as $$
 select m.id from public.members m where m.id=app_private.own_account_member_id()
 and (m.status='active' or (m.status='intake' and exists(select 1 from app_private.bootstrap_receipts b where b.auth_user_id=auth.uid())))
$$;
create or replace function app_private.current_member_id() returns uuid language sql stable security definer set search_path='' as $$
 select app_private.own_account_member_id()
$$;

-- A member who can sign in: confirmed Auth user, enabled account link, active or intake status.
create or replace function app_private.has_member_account(p_member uuid) returns boolean language sql stable set search_path='' as $$
 select p_member is not null and exists(
  select 1 from app_private.account_links l
  join public.members m on m.id=l.member_id
  join auth.users u on u.id=l.auth_user_id
  where l.member_id=p_member and l.enabled and l.technical_enabled
    and m.status in ('active','intake') and u.email_confirmed_at is not null)
$$;

-- The application owner: the bootstrap identity, still signed-in capable, still holding one of the
-- bootstrap administrator appointments. Ending those appointments ends owner-everywhere access.
create or replace function app_private.is_owner(p_member uuid) returns boolean language sql stable set search_path='' as $$
 select p_member is not null and app_private.has_member_account(p_member) and exists(
  select 1 from app_private.bootstrap_receipts b
  join app_private.account_links l on l.auth_user_id=b.auth_user_id
  where l.member_id=p_member)
 and exists(select 1 from app_private.role_assignments r
  where r.member_id=p_member and r.ended_at is null and r.appointed_at<=now()
    and r.role_key in ('member_administrator','technical_admin','department_administrator'))
$$;

-- Use access: every approved module, for every member who can sign in. Explicit grants and the
-- Study Rooms leader rule still count (they matter only for people without a usable account).
create or replace function app_private.module_allowed(p_member uuid,p_module uuid)
returns boolean language sql stable set search_path='' as $$
 select p_member is not null and exists(
  select 1 from app_private.app_modules m
  where m.id=p_module and m.status='approved' and m.approved_at is not null
    and (
     app_private.has_member_account(p_member)
     or exists(select 1 from app_private.module_access_grants g
            where g.module_id=m.id and g.member_id=p_member and g.ended_at is null and g.granted_at<=now())
     or (m.id='91000000-0000-4000-8000-000000000001' and app_private.study_leader_access(p_member))
    )
 )
$$;

-- Manage access: an explicit current manager grant, or the owner. Every module manager check uses this.
create or replace function app_private.module_manager(p_member uuid,p_module uuid)
returns boolean language sql stable set search_path='' as $$
 select p_member is not null and exists(
  select 1 from app_private.app_modules m
  where m.id=p_module and m.status='approved' and m.approved_at is not null
    and (
     app_private.is_owner(p_member)
     or exists(select 1 from app_private.module_access_grants g
            where g.module_id=m.id and g.member_id=p_member and g.permission='manager'
              and g.ended_at is null and g.granted_at<=now())
    )
 )
$$;

-- The Apps list: every approved module for every signed-in member; canManage from module_manager().
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
   'accent',m.accent,'route',m.route_path,'status','approved','canManage',app_private.module_manager(actor,m.id)
  ) order by m.display_name,m.id)
  from app_private.app_modules m
  where m.status='approved' and m.approved_at is not null and app_private.module_allowed(actor,m.id)
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

-- ---------------------------------------------------------------------------------------------
-- Leadership is independent of the leader's own placement (owner decision, 2026-10-24). A member
-- has one primary placement (where they belong) and may also lead other groups or units. A
-- group_leader or unit_leader appointment gives authority over the group or unit it names; it no
-- longer requires the leader to be placed there. Member status rules are unchanged.
create or replace function app_private.actor_has(p_actor uuid,p_role text,p_scope uuid default null) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from app_private.role_assignments r join public.members m on m.id=r.member_id
 where r.member_id=p_actor and (m.status='active' or (m.status='intake' and r.role_key in ('member_administrator','technical_admin','department_administrator') and exists(select 1 from app_private.bootstrap_receipts b join app_private.account_links l on l.auth_user_id=b.auth_user_id where l.member_id=m.id and l.enabled and l.technical_enabled)))
 and r.role_key=p_role and r.ended_at is null and r.appointed_at<=now()
 and (p_scope is null or p_scope=coalesce(r.unit_id,r.group_id,r.department_id)))
$$;

-- ---------------------------------------------------------------------------------------------
-- Group-only placement. The unit is optional; when a unit is given, the existing composite
-- foreign key (unit_id,group_id) -> church_units(id,group_id) still enforces consistency.
alter table public.member_placements alter column unit_id drop not null;
alter table app_private.transfer_requests alter column destination_unit_id drop not null;

-- Group authority: organizational authority or an effective group leader appointment for that group.
-- Unit leaders never manage a group-only member.
create or replace function app_private.manages_group(p_actor uuid,p_group uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.church_groups g join public.age_categories a on a.id=g.age_category_id
 where g.id=p_group and g.is_active and a.is_active
 and (app_private.org_authority(p_actor) or app_private.actor_has(p_actor,'group_leader',g.id)))
$$;
-- A placement destination: a unit (existing rule) or, without a unit, its group.
create or replace function app_private.manages_placement(p_actor uuid,p_group uuid,p_unit uuid) returns boolean language sql stable set search_path='' as $$
 select case when p_unit is null then app_private.manages_group(p_actor,p_group)
  else app_private.manages_unit(p_actor,p_unit) and exists(select 1 from public.church_units u where u.id=p_unit and u.group_id=p_group) end
$$;
create or replace function app_private.manages_member(p_actor uuid,p_target uuid) returns boolean language sql stable set search_path='' as $$
 select p_actor is not null and exists(select 1 from public.members where id=p_target)
 and (app_private.org_authority(p_actor) or exists(select 1 from public.member_placements p where p.member_id=p_target and p.ended_at is null and p.started_at<=now()
  and app_private.manages_placement(p_actor,p.group_id,p.unit_id)))
$$;
create or replace function app_private.can_read_placement(p_member uuid,p_group uuid,p_unit uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.current_member_id() is not null and (p_member=app_private.current_member_id()
  or app_private.manages_placement(app_private.current_member_id(),p_group,p_unit))
$$;
-- The two-argument form stays for compatibility; it resolves the group from the unit.
create or replace function app_private.can_read_placement(p_member uuid,p_unit uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.current_member_id() is not null and (p_member=app_private.current_member_id() or app_private.manages_unit(app_private.current_member_id(),p_unit))
$$;
drop policy if exists placements_scoped on public.member_placements;
create policy placements_scoped on public.member_placements for select to authenticated using(app_private.can_read_placement(member_id,group_id,unit_id));

-- Command field whitelist: placements accept an optional groupId (required when no unit is given).
create or replace function app_private.member_command(p_action text,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare allowed text[]; k text; v jsonb; normalized jsonb:=p_payload;
begin
 if app_private.organization_member_id() is null then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then raise exception 'Invalid command payload' using errcode='22023'; end if;
 allowed:=case p_action
  when 'member.create' then array['name','unitId','groupId']
  when 'member.rename' then array['memberId','name']
  when 'member.status' then array['memberId','status']
  when 'member.move' then array['memberId','unitId','groupId']
  when 'transfer.request' then array['memberId','unitId','groupId']
  when 'transfer.decide' then array['id','decision']
  when 'department.membership' then array['memberId','departmentId','operation']
  when 'role.appoint' then array['memberId','role','unitId','groupId','departmentId']
  when 'role.end' then array['id']
  when 'organization.create' then array['kind','name','parentId']
  when 'profile.contacts' then array['memberId','email','phone']
  when 'invitation.create' then array['memberId','email','tokenDigest'] end;
 if allowed is null then raise exception 'Unknown command' using errcode='22023'; end if;
 allowed:=allowed||array['reason'];
 for k,v in select * from jsonb_each(p_payload) loop
  if not(k=any(allowed)) or jsonb_typeof(v)<>'string' or length(v#>>'{}')>500 then raise exception 'Unexpected command field' using errcode='22023'; end if;
 end loop;
 if p_action='role.appoint' then
  if (p_payload->>'role') is distinct from 'department_manager' then normalized:=normalized-'departmentId'; end if;
  if (p_payload->>'role') is distinct from 'unit_leader' then normalized:=normalized-'unitId'; end if;
  if (p_payload->>'role') is distinct from 'group_leader' then normalized:=normalized-'groupId'; end if;
 end if;
 return app_private.apply_member_command(p_action,normalized,p_request_id);
end $$;

-- Same command boundary as before; only placement destinations change (optional unit).
create or replace function app_private.apply_member_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare a uuid; t uuid; u uuid; d uuid; rid uuid; g uuid; r text; n text; v_status text; now_at timestamptz; unit_group uuid;
 p public.member_placements%rowtype; tr app_private.transfer_requests%rowtype; role_row app_private.role_assignments%rowtype;
 receipt app_private.command_receipts%rowtype; before_data jsonb; after_data jsonb; result_data jsonb:='{}';
 begin
 perform pg_advisory_xact_lock(741085);
 a:=app_private.organization_member_id();
 if a is null then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid command' using errcode='22023'; end if;
 select * into receipt from app_private.command_receipts where actor_member_id=a and request_id=p_request_id;
 if found then
  if receipt.action<>p_action or receipt.payload_hash<>md5(p_payload::text) then raise exception 'Request identifier already used' using errcode='22023'; end if;
  return receipt.result;
 end if;
 r:=btrim(p_payload->>'reason');
 if r is null or length(r) not between 5 and 500 then raise exception 'Provide a reason (5-500 characters)' using errcode='22023'; end if;
 t:=nullif(p_payload->>'memberId','')::uuid; u:=nullif(p_payload->>'unitId','')::uuid;
 d:=nullif(p_payload->>'departmentId','')::uuid; rid:=nullif(p_payload->>'id','')::uuid;
 now_at:=clock_timestamp();
 if t is not null then perform 1 from public.members where id=t for update; end if;
 if p_action in ('member.create','member.move','transfer.request') then
  -- Destination: a unit (its group is derived and must match any groupId), or a group with no unit.
  g:=nullif(p_payload->>'groupId','')::uuid;
  if u is not null then
   select cu.group_id into unit_group from public.church_units cu join public.church_groups cg on cg.id=cu.group_id join public.age_categories ac on ac.id=cg.age_category_id
   where cu.id=u and cu.is_active and cg.is_active and ac.is_active;
   if unit_group is null or (g is not null and g<>unit_group) then raise exception 'Invalid or unchanged placement' using errcode='22023'; end if;
   g:=unit_group;
  elsif g is null or not exists(select 1 from public.church_groups cg join public.age_categories ac on ac.id=cg.age_category_id where cg.id=g and cg.is_active and ac.is_active) then
   raise exception 'Invalid or unchanged placement' using errcode='22023';
  end if;
 end if;
 if p_action='member.create' then
  if not app_private.manages_placement(a,g,u) then raise exception 'Not authorized' using errcode='42501'; end if;
  insert into public.members(display_name,status) values(btrim(p_payload->>'name'),'active') returning id into t;
  insert into public.member_placements(member_id,group_id,unit_id,reason) values(t,g,u,r);
  after_data:=jsonb_build_object('name',btrim(p_payload->>'name'),'groupId',g,'unitId',u);
 elsif p_action='member.rename' then
  if not app_private.manages_member(a,t) then raise exception 'Not authorized' using errcode='42501'; end if;
  select jsonb_build_object('name',display_name) into before_data from public.members where id=t;
  update public.members set display_name=btrim(p_payload->>'name'),updated_at=now_at where id=t;
  after_data:=jsonb_build_object('name',btrim(p_payload->>'name'));
 elsif p_action='member.status' then
  if not app_private.org_authority(a) or t=a then raise exception 'Not authorized' using errcode='42501'; end if;
  v_status:=p_payload->>'status';
  if v_status not in ('active','inactive') or v_status is null then raise exception 'Invalid status' using errcode='22023'; end if;
  select jsonb_build_object('status',status) into before_data from public.members where id=t;
  if before_data is null then raise exception 'Member unavailable' using errcode='22023'; end if;
  update public.members set status=v_status,updated_at=now_at where id=t;
  update app_private.account_links set enabled=(v_status='active'),session_valid_after=now_at where member_id=t;
  after_data:=jsonb_build_object('status',v_status);
 elsif p_action in ('member.move','transfer.request') then
  if not app_private.manages_member(a,t) then raise exception 'Not authorized' using errcode='42501'; end if;
  select * into p from public.member_placements where member_id=t and ended_at is null for update;
  if p.id is null or (p.group_id=g and p.unit_id is not distinct from u) then raise exception 'Invalid or unchanged placement' using errcode='22023'; end if;
  if p_action='transfer.request' then
   if p.group_id=g then raise exception 'Use a same-group move' using errcode='22023'; end if;
   insert into app_private.transfer_requests(member_id,source_placement_id,destination_group_id,destination_unit_id,requested_by,reason)
    values(t,p.id,g,u,a,r) returning id into rid;
   result_data:=jsonb_build_object('id',rid); after_data:=jsonb_build_object('destinationGroupId',g,'destinationUnitId',u,'status','pending');
  else
   if not app_private.manages_placement(a,g,u) or (p.group_id<>g and not app_private.org_authority(a)) then raise exception 'Receiving-group acceptance required' using errcode='42501'; end if;
   update public.member_placements set ended_at=now_at where id=p.id;
   insert into public.member_placements(member_id,group_id,unit_id,started_at,reason) values(t,g,u,now_at,r);
   update app_private.transfer_requests set status='cancelled',decided_at=now_at where member_id=t and status='pending';
   before_data:=jsonb_build_object('groupId',p.group_id,'unitId',p.unit_id); after_data:=jsonb_build_object('groupId',g,'unitId',u);
  end if;
 elsif p_action='transfer.decide' then
  select * into tr from app_private.transfer_requests where id=rid for update;
  if tr.id is null or tr.status<>'pending' then raise exception 'Request unavailable' using errcode='22023'; end if;
  t:=tr.member_id; select * into p from public.member_placements where id=tr.source_placement_id for update;
  v_status:=p_payload->>'decision';
  if v_status='cancelled' then
   if tr.requested_by<>a and not app_private.org_authority(a) then raise exception 'Not authorized' using errcode='42501'; end if;
  else
   if not app_private.org_authority(a) and (tr.requested_by=a or not app_private.actor_has(a,'group_leader',tr.destination_group_id)) then raise exception 'Receiving-group acceptance required' using errcode='42501'; end if;
   if v_status not in ('accepted','rejected') or v_status is null then raise exception 'Invalid decision' using errcode='22023'; end if;
  end if;
  if v_status='accepted' then
   if p.ended_at is not null or p.member_id<>tr.member_id or not app_private.manages_member(tr.requested_by,t)
    or not app_private.manages_placement(a,tr.destination_group_id,tr.destination_unit_id) then raise exception 'Stale transfer; request again' using errcode='22023'; end if;
   update public.member_placements set ended_at=now_at where id=p.id;
   insert into public.member_placements(member_id,group_id,unit_id,started_at,reason) values(t,tr.destination_group_id,tr.destination_unit_id,now_at,r);
  end if;
  update app_private.transfer_requests set status=v_status,accepted_by=a,decided_at=now_at where id=rid;
  after_data:=jsonb_build_object('id',rid,'status',v_status);
 elsif p_action='department.membership' then
  if not app_private.manages_department(a,d) or not app_private.can_see_name(t) then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_payload->>'operation'='add' then
   if not exists(select 1 from public.members where id=t and status='active') then raise exception 'Active member required' using errcode='22023'; end if;
   insert into public.department_memberships(member_id,department_id) values(t,d) on conflict(member_id,department_id) where ended_at is null do nothing;
  elsif p_payload->>'operation'='end' then
   update public.department_memberships set ended_at=now_at where member_id=t and department_id=d and ended_at is null;
  else raise exception 'Invalid operation' using errcode='22023'; end if;
  after_data:=jsonb_build_object('departmentId',d,'operation',p_payload->>'operation');
 elsif p_action in ('role.appoint','role.end') then
  if p_action='role.end' then
   select * into role_row from app_private.role_assignments where id=rid and ended_at is null for update;
   if role_row.id is null then raise exception 'Appointment unavailable' using errcode='22023'; end if;
   t:=role_row.member_id; n:=role_row.role_key; d:=role_row.department_id;
  else n:=p_payload->>'role'; end if;
  if t=a then raise exception 'Self-appointment changes are not allowed' using errcode='42501'; end if;
  if n in ('department_manager','department_administrator') then
   if not app_private.actor_has(a,'department_administrator') then raise exception 'Separate department authority required' using errcode='42501'; end if;
  elsif n='technical_admin' then
   if not app_private.actor_has(a,'technical_admin') then raise exception 'Separate technical authority required' using errcode='42501'; end if;
  elsif not app_private.org_authority(a) then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_action='role.appoint' then
   if not exists(select 1 from public.members where id=t and status='active') then raise exception 'Active member required' using errcode='22023'; end if;
   -- The appointment names its own scope, which may be outside the member's placement.
   if n='unit_leader' and (u is null or not exists(select 1 from public.church_units cu join public.church_groups cg on cg.id=cu.group_id join public.age_categories ac on ac.id=cg.age_category_id
     where cu.id=u and cu.is_active and cg.is_active and ac.is_active)) then raise exception 'Choose an active unit' using errcode='22023'; end if;
   g:=nullif(p_payload->>'groupId','')::uuid;
   if n='group_leader' and (g is null or not exists(select 1 from public.church_groups cg join public.age_categories ac on ac.id=cg.age_category_id
     where cg.id=g and cg.is_active and ac.is_active)) then raise exception 'Choose an active group' using errcode='22023'; end if;
   insert into app_private.role_assignments(member_id,role_key,unit_id,group_id,department_id,appointed_by)
    values(t,n,case when n='unit_leader' then u end,case when n='group_leader' then g end,case when n='department_manager' then d end,a) returning id into rid;
  else update app_private.role_assignments set ended_at=now_at,ended_by=a where id=rid; end if;
  after_data:=jsonb_build_object('id',rid,'role',n,'action',p_action);
 elsif p_action='organization.create' then
  n:=p_payload->>'kind';
  if n='department' then
   if not app_private.actor_has(a,'department_administrator') then raise exception 'Separate department authority required' using errcode='42501'; end if;
   insert into public.departments(name) values(btrim(p_payload->>'name')) returning id into rid;
  else
   if not app_private.org_authority(a) then raise exception 'Not authorized' using errcode='42501'; end if;
   if n='category' then insert into public.age_categories(name) values(btrim(p_payload->>'name')) returning id into rid;
   elsif n='group' then insert into public.church_groups(age_category_id,name) values((p_payload->>'parentId')::uuid,btrim(p_payload->>'name')) returning id into rid;
   elsif n='unit' then insert into public.church_units(group_id,name) values((p_payload->>'parentId')::uuid,btrim(p_payload->>'name')) returning id into rid;
   else raise exception 'Invalid hierarchy level' using errcode='22023'; end if;
  end if;
  result_data:=jsonb_build_object('id',rid); after_data:=jsonb_build_object('kind',n,'id',rid);
 elsif p_action='profile.contacts' then
  if t is distinct from a then raise exception 'Only your own contact details' using errcode='42501'; end if;
  insert into app_private.member_private_contacts(member_id,email,phone) values(a,nullif(btrim(p_payload->>'email'),''),nullif(btrim(p_payload->>'phone'),''))
  on conflict(member_id) do update set email=excluded.email,phone=excluded.phone,updated_at=now_at;
  after_data:=jsonb_build_object('contact_details_changed',true); -- Never put contact values in shared audit.
 elsif p_action='invitation.create' then
  if not app_private.manages_member(a,t) or exists(select 1 from app_private.account_links where member_id=t) then raise exception 'Not authorized or already linked' using errcode='42501'; end if;
  update app_private.invitations set revoked_at=now_at where member_id=t and consumed_at is null and revoked_at is null;
  insert into app_private.invitations(member_id,expected_email,token_digest,expires_at,created_by)
  values(t,lower(btrim(p_payload->>'email')),p_payload->>'tokenDigest',now_at+interval '24 hours',a) returning id into rid;
  result_data:=jsonb_build_object('id',rid); after_data:=jsonb_build_object('invitationId',rid);
 else raise exception 'Unknown command' using errcode='22023'; end if;
 result_data:=result_data||jsonb_build_object('memberId',t,'ok',true);
 insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,before_state,after_state,department_id)
 values(a,auth.uid(),p_action,t,r,before_data,after_data,d);
 insert into app_private.command_receipts(actor_member_id,request_id,action,payload_hash,result) values(a,p_request_id,p_action,md5(p_payload::text),result_data);
 return result_data;
 end $$;

-- Workspace projection: groups say whether the viewer can place a member there without a unit;
-- transfers carry their destination group so a group-only destination can be shown.
create or replace function app_private.member_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare a uuid:=app_private.organization_member_id(); own_g uuid; own_u uuid; org boolean; any_manager boolean; result_data jsonb;
 begin
 if a is null then raise exception 'Not authorized' using errcode='42501'; end if;
 select group_id,unit_id into own_g,own_u from public.member_placements where member_id=a and ended_at is null;
 org:=app_private.org_authority(a);
 any_manager:=org or app_private.actor_has(a,'group_leader') or app_private.actor_has(a,'unit_leader');
 select jsonb_build_object('self',jsonb_build_object('id',m.id,'name',m.display_name,'groupId',own_g,'unitId',own_u),
 'permissions',jsonb_build_object('organization',org,'memberManagement',any_manager,'departmentAdmin',app_private.actor_has(a,'department_administrator'),'technical',app_private.actor_has(a,'technical_admin')),
 'contacts',coalesce((select jsonb_build_object('email',email,'phone',phone) from app_private.member_private_contacts where member_id=a),'{}'::jsonb),
 'directory',coalesce((select jsonb_agg(jsonb_build_object('id',mm.id,'name',mm.display_name) order by mm.display_name) from public.members mm join public.member_placements p on p.member_id=mm.id and p.ended_at is null where p.group_id=own_g and mm.status='active'),'[]'::jsonb),
 'managedMembers',coalesce((select jsonb_agg(jsonb_build_object('id',mm.id,'name',mm.display_name,'status',mm.status,'unitId',p.unit_id,'groupId',p.group_id) order by mm.display_name) from public.members mm left join public.member_placements p on p.member_id=mm.id and p.ended_at is null where app_private.manages_member(a,mm.id)),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name) order by c.sort_order,c.name) from public.age_categories c where c.is_active and (any_manager or exists(select 1 from public.church_groups g where g.id=own_g and g.age_category_id=c.id))),'[]'::jsonb),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'parentId',g.age_category_id,'canManage',app_private.manages_group(a,g.id)) order by g.name) from public.church_groups g where g.is_active and (any_manager or g.id=own_g)),'[]'::jsonb),
 'units',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'parentId',u.group_id,'canManage',app_private.manages_unit(a,u.id)) order by u.name) from public.church_units u where u.is_active and (any_manager or u.group_id=own_g)),'[]'::jsonb),
 'departments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'canManage',app_private.manages_department(a,d.id),
 'members',case when app_private.manages_department(a,d.id) then coalesce((select jsonb_agg(jsonb_build_object('id',dm.member_id,'name',mm.display_name)) from public.department_memberships dm join public.members mm on mm.id=dm.member_id where dm.department_id=d.id and dm.ended_at is null),'[]'::jsonb) else '[]'::jsonb end)) from public.departments d where d.is_active and app_private.can_see_department(d.id)),'[]'::jsonb),
 'appointments',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'memberId',r.member_id,'role',r.role_key,'unitId',r.unit_id,'groupId',r.group_id,'departmentId',r.department_id,'endedAt',r.ended_at,'effective',r.ended_at is null and app_private.actor_has(r.member_id,r.role_key,coalesce(r.unit_id,r.group_id,r.department_id)))) from app_private.role_assignments r where r.member_id=a or (org and r.role_key in ('unit_leader','group_leader','pastoral_staff','member_administrator')) or (app_private.actor_has(a,'department_administrator') and r.role_key in ('department_manager','department_administrator'))),'[]'::jsonb),
 'transfers',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'memberId',t.member_id,'name',mm.display_name,'status',t.status,'groupId',t.destination_group_id,'unitId',t.destination_unit_id,'requestedBy',t.requested_by,'canDecide',(org or (t.requested_by<>a and app_private.actor_has(a,'group_leader',t.destination_group_id))))) from app_private.transfer_requests t join public.members mm on mm.id=t.member_id where t.status='pending' and (app_private.manages_member(a,t.member_id) or app_private.actor_has(a,'group_leader',t.destination_group_id))),'[]'::jsonb),
 'audit',coalesce((select jsonb_agg(row_to_json(e)) from (select id,occurred_at as "at",operation as action,target_member_id as "memberId",reason from app_private.audit_events where actor_member_id=a or (department_id is null and app_private.manages_member(a,target_member_id)) or app_private.manages_department(a,department_id) order by id desc limit 30) e),'[]'::jsonb)) into result_data from public.members m where m.id=a;
 return result_data;
 end $$;

-- Intake members keep the minimized own-record workspace; the full workspace keeps its old audience.
create or replace function public.member_workspace() returns jsonb language plpgsql stable security invoker set search_path='' as $$
 declare mid uuid:=app_private.own_account_member_id(); base_data jsonb;
 begin
 if mid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if app_private.organization_member_id() is not null then
  base_data:=app_private.member_workspace()||jsonb_build_object('onboarding',app_private.onboarding_workspace());
 else
  base_data:=jsonb_build_object('permissions',jsonb_build_object('organization',false,'memberManagement',false,'departmentAdmin',false,'technical',false),
  'contacts',app_private.own_enrollment_contacts(),'directory','[]'::jsonb,'managedMembers','[]'::jsonb,'categories','[]'::jsonb,'groups','[]'::jsonb,'units','[]'::jsonb,'departments','[]'::jsonb,'appointments','[]'::jsonb,'transfers','[]'::jsonb,
  'audit',app_private.own_enrollment_audit(),'onboarding',jsonb_build_object('requests','[]'::jsonb,'invitations','[]'::jsonb,'accounts','[]'::jsonb,'linkedMemberIds','[]'::jsonb));
 end if;
 return base_data||app_private.enrollment_projection();
 end $$;

-- Initial placement from the Unassigned queue: a unit, or a group with no unit.
create or replace function app_private.enrollment_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare actor uuid; target uuid; dest uuid; grp uuid; unit_group uuid; why text; key text; val jsonb; out_data jsonb; receipt app_private.command_receipts%rowtype; now_at timestamptz:=clock_timestamp();
 begin
 perform pg_advisory_xact_lock(741085);actor:=app_private.organization_member_id();
 if actor is null or not app_private.org_authority(actor) then raise exception 'Organizational membership authority required' using errcode='42501'; end if;
 if p_action not in ('enrollment.assign','enrollment.reject') or p_action is null or p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then raise exception 'Invalid command' using errcode='22023'; end if;
 for key,val in select * from jsonb_each(p_payload) loop
  if not(key=any(case when p_action='enrollment.assign' then array['memberId','unitId','groupId','verified','reason'] else array['memberId','reason'] end)) or jsonb_typeof(val)<>'string' or length(val#>>'{}')>500 then raise exception 'Invalid command fields' using errcode='22023'; end if;
 end loop;
 select * into receipt from app_private.command_receipts where actor_member_id=actor and request_id=p_request_id;
 if found then
  if receipt.action<>p_action or receipt.payload_hash<>md5(p_payload::text) then raise exception 'Request ID reused' using errcode='22023'; end if;
  return receipt.result;
 end if;
 why:=btrim(p_payload->>'reason');target:=(p_payload->>'memberId')::uuid;
 if why is null or length(why) not between 5 and 500 then raise exception 'Document verification or rejection' using errcode='22023'; end if;
 perform 1 from public.members m join app_private.self_service_enrollments e on e.member_id=m.id
 where m.id=target and m.status='intake' and e.decision='pending' for update;
 if not found then raise exception 'Enrollment already reviewed or unavailable' using errcode='22023'; end if;
 if exists(select 1 from public.member_placements where member_id=target and ended_at is null) then raise exception 'Enrollment already placed' using errcode='23514'; end if;
 if p_action='enrollment.assign' then
  if (p_payload->>'verified') is distinct from 'yes' then raise exception 'Independent identity verification required' using errcode='22023'; end if;
  dest:=nullif(p_payload->>'unitId','')::uuid;grp:=nullif(p_payload->>'groupId','')::uuid;
  if dest is not null then
   select u.group_id into unit_group from public.church_units u join public.church_groups g on g.id=u.group_id join public.age_categories c on c.id=g.age_category_id where u.id=dest and u.is_active and g.is_active and c.is_active;
   if unit_group is null or (grp is not null and grp<>unit_group) then raise exception 'Active authorized placement required' using errcode='42501'; end if;
   grp:=unit_group;
  elsif grp is null then raise exception 'Active authorized placement required' using errcode='42501';
  end if;
  if not app_private.manages_placement(actor,grp,dest) then raise exception 'Active authorized placement required' using errcode='42501'; end if;
  insert into public.member_placements(member_id,group_id,unit_id,started_at,reason) values(target,grp,dest,now_at,why);
  update public.members set status='active',updated_at=now_at where id=target;
  update app_private.self_service_enrollments set decision='assigned',reviewed_at=now_at,reviewed_by=actor where member_id=target;
  out_data:=jsonb_build_object('ok',true,'memberId',target,'status','active','groupId',grp,'unitId',dest);
 else
  update public.members set status='inactive',updated_at=now_at where id=target;
  update app_private.account_links set enabled=false,session_valid_after=now_at where member_id=target;
  update app_private.self_service_enrollments set decision='rejected',reviewed_at=now_at,reviewed_by=actor where member_id=target;
  out_data:=jsonb_build_object('ok',true,'memberId',target,'status','inactive');
 end if;
 insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,before_state,after_state)
 values(actor,auth.uid(),p_action,target,why,jsonb_build_object('status','intake','placement',null),out_data);
 insert into app_private.command_receipts(actor_member_id,request_id,action,payload_hash,result) values(actor,p_request_id,p_action,md5(p_payload::text),out_data);
 return out_data;
 end $$;

-- ---------------------------------------------------------------------------------------------
-- Study Rooms. Use: module_allowed (everyone signed in). Manage: module_manager (grant or owner).
create or replace function app_private.study_is_manager(p_actor uuid) returns boolean language sql stable set search_path='' as $$
 select app_private.module_manager(p_actor,'91000000-0000-4000-8000-000000000001')
$$;
-- Who can book: group-only members are listed; everyone with a usable account books automatically.
create or replace function app_private.study_group_access(p_command jsonb)
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
    'id',m.id,'name',m.display_name,'unit',coalesce(u.name,'No unit'),
    'automatic',app_private.study_leader_access(m.id) or app_private.has_member_account(m.id),
    'enabled',ag.id is not null,
    'locked',coalesce(ag.permission='manager',false),
    'self',m.id=actor
   ) order by m.display_name,m.id)
   from public.member_placements p
   join public.members m on m.id=p.member_id and m.status='active'
   left join public.church_units u on u.id=p.unit_id
   left join app_private.module_access_grants ag on ag.member_id=m.id and ag.module_id=study and ag.ended_at is null and ag.granted_at<=now()
   where p.group_id=g.id and p.ended_at is null
  ),'[]'::jsonb)) order by g.name,g.id)
  from public.church_groups g
  where exists(select 1 from app_private.role_assignments r where r.group_id=g.id and r.member_id=actor
               and r.role_key='group_leader' and r.ended_at is null and r.appointed_at<=now())
 ),'[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------------------------
-- Continuous Display. Members may open the app but have no display data; only managers (explicit
-- manager grant, or the owner) reach any management function. Per-screen permissions still apply.
create or replace function display_private.require_manager() returns uuid
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid := app_private.current_member_id();
begin
 if actor is null or not exists(
  select 1 from app_private.app_modules m
  where m.module_key='continuous-display' and app_private.module_manager(actor,m.id)
 ) then raise exception 'Not authorized' using errcode='42501';end if;
 return actor;
end $$;
-- The owner can create a screen without first holding a per-screen permission row.
do $display$ begin
 if to_regprocedure('public.display_create_screen(text)') is not null then
  execute $fn$
create or replace function public.display_create_screen(p_label text)
returns uuid language plpgsql security definer set search_path='' as $body$
declare actor uuid:=display_private.require_manager(); result uuid; original_count integer;
begin
 if p_label is null or length(btrim(p_label)) not between 3 and 80 or p_label ~ '[[:cntrl:]]' then
  raise exception 'Invalid screen name' using errcode='22023'; end if;
 if not app_private.is_owner(actor) then raise exception 'Not authorized' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext('lvz-display-create-screen')::bigint);
 select count(*) into original_count from display_private.screens;
 if original_count>=8 then raise exception 'Screen limit reached' using errcode='54000'; end if;
 insert into display_private.screens(label,enabled) values(btrim(p_label),false) returning id into result;
 insert into display_private.permissions(screen_id,member_id,permission)
 select result,actor,p.perm from (values('edit'),('approve'),('publish'),('device')) p(perm);
 insert into display_private.audit_events(screen_id,actor_id,action,subject_id)
 values(result,actor,'screen_created',result);
 return result;
end $body$;
$fn$;
 end if;
end $display$;

-- ---------------------------------------------------------------------------------------------
-- Work Mission Prayer. Member view (schedule, materials, joining a gathering) is automatic for every
-- member with use access. Hosting, reviewing and every management capability still need an explicit
-- per-series grant. The owner holds every capability.
create or replace function mpg_private.allowed(p_series uuid,p_cap text,p_member uuid) returns boolean language sql stable set search_path='' as $$
 select p_member is not null and exists(select 1 from mpg_private.series s
 where s.id=p_series and s.enabled and app_private.module_allowed(p_member,s.module_id)
 and (app_private.is_owner(p_member)
  or p_cap in ('view_schedule','join_gathering','view_materials')
  or exists(select 1 from mpg_private.grants g where g.series_id=s.id and g.member_id=p_member and g.capability=p_cap and g.ended_at is null and g.granted_at<=now())))
$$;

-- ---------------------------------------------------------------------------------------------
-- Worship Duty. My Duties for members; Manage, Presider/song planning and Setup stay role-gated.
create or replace function app_private.worship_can_manage(p_actor uuid,p_duty text) returns boolean language sql stable set search_path='' as $$
 select p_actor is not null and app_private.module_allowed(p_actor,app_private.worship_module_id()) and exists(select 1 from app_private.worship_duties d where d.id=p_duty)
 and (app_private.is_owner(p_actor) or (exists(
  select 1 from app_private.worship_duties d join app_private.worship_departments wd on wd.department_key=d.department_key
  where d.id=p_duty and app_private.manages_department(p_actor,wd.department_id)
 ) and exists(select 1 from app_private.module_access_grants g where g.member_id=p_actor and g.module_id=app_private.worship_module_id() and g.permission='manager' and g.ended_at is null and g.granted_at<=now())))
$$;
create or replace function app_private.worship_can_plan(p_actor uuid,p_service uuid) returns boolean language sql stable set search_path='' as $$
 select p_actor is not null and app_private.module_allowed(p_actor,app_private.worship_module_id()) and (
 app_private.is_owner(p_actor)
 or exists(select 1 from app_private.worship_assignments a where a.service_id=p_service and a.duty_id='presider' and a.member_id=p_actor)
 or exists(select 1 from app_private.worship_song_editor_grants g where g.member_id=p_actor and g.ended_at is null and g.granted_at<=now()))
$$;
do $worship$ begin
 -- Setup is the owner's. No per-module grant or service-editor row is required for the owner.
 if to_regprocedure('app_private.worship_setup_authorized()') is not null then
  execute $fn$
create or replace function app_private.worship_setup_authorized() returns boolean
 language sql stable security definer set search_path='' as $body$
 select app_private.is_owner(app_private.current_member_id()) and exists(
  select 1 from app_private.app_modules m where m.module_key='worship-duty' and m.status='approved' and m.approved_at is not null)
$body$;
$fn$;
 end if;
 -- Setup's "module access" switch now reports the explicit Worship participation grant (still required
 -- before department scheduling), because every signed-in member can already open Worship Duty.
 if to_regprocedure('app_private.worship_setup_workspace_base()') is not null then
  execute $fn$
create or replace function app_private.worship_setup_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $body$
declare v_data jsonb;
begin
 v_data:=app_private.worship_setup_workspace_base();
 return v_data||jsonb_build_object(
  'version',(select version from app_private.worship_setup_versions where singleton),
  'members',coalesce((select jsonb_agg(x.value||jsonb_build_object(
   'hasAccess',exists(select 1 from app_private.module_access_grants g where g.member_id=(x.value->>'id')::uuid and g.module_id=app_private.worship_module_id() and g.ended_at is null and g.granted_at<=now()),
   'managerDepartments',coalesce((select jsonb_agg(w.department_key order by w.department_key)
    from app_private.role_assignments r join app_private.worship_departments w on w.department_id=r.department_id
    where r.member_id=(x.value->>'id')::uuid and r.role_key='department_manager' and r.ended_at is null and r.appointed_at<=now()),'[]'::jsonb),
   'songEditor',exists(select 1 from app_private.worship_song_editor_grants g where g.member_id=(x.value->>'id')::uuid and g.ended_at is null and g.granted_at<=now()),
   'manualDepartments',coalesce((select jsonb_agg(p.department_key order by p.department_key) from app_private.worship_roster_preferences p
     where p.member_id=(x.value->>'id')::uuid and p.manual_only),'[]'::jsonb),
   'availabilityVersion',coalesce((select version from app_private.worship_availability_versions where member_id=(x.value->>'id')::uuid),0),
   'serviceAvailability',coalesce((select jsonb_agg(jsonb_build_object('serviceId',a.service_id,'available',a.available))
    from app_private.worship_service_availability a join app_private.worship_services s on s.id=a.service_id
    where a.member_id=(x.value->>'id')::uuid and s.begins_at>now()),'[]'::jsonb)
   ) order by x.ordinality) from jsonb_array_elements(v_data->'members') with ordinality x(value,ordinality)),'[]'::jsonb),
  'songs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',code,'title',title,'seconds',duration_seconds,'active',active) order by code,id)
   from (select * from app_private.worship_songs order by code,id limit 500) songs),'[]'::jsonb),
  'membersHasMore',(select count(*)>200 from public.members where status='active'),
  'songsHasMore',(select count(*)>500 from app_private.worship_songs),
  'servicesHasMore',(select count(*)>120 from app_private.worship_services where begins_at>=now()-interval '7 days' and begins_at<now()+interval '365 days')
 );
end $body$;
$fn$;
 end if;
end $worship$;

-- ---------------------------------------------------------------------------------------------
-- Contacts. Every member with use access has a private workspace of their own records and can
-- create in it. Nothing reads another member's records: every query is still owner_member_id=actor.
do $contacts$ begin
 if to_regnamespace('contacts_private') is not null then
  execute $fn$
create or replace function contacts_private.actor() returns uuid language plpgsql stable
security definer set search_path='' as $body$
declare a uuid;begin
 a:=app_private.current_member_id();
 if a is null or not exists(
  select 1 from app_private.app_modules m
  where m.module_key='contacts' and app_private.module_allowed(a,m.id)
 ) then raise exception using errcode='42501',message='Contacts unavailable';end if;
 return a;
end$body$;
$fn$;
  execute $fn$
create or replace function contacts_private.can_create(a uuid) returns boolean language sql stable
security definer set search_path='' as $body$
 select exists(select 1 from app_private.app_modules m
 where m.module_key='contacts' and app_private.module_allowed(a,m.id))
$body$;
$fn$;
  revoke execute on function contacts_private.actor(),contacts_private.can_create(uuid) from public,anon,authenticated,service_role;
 end if;
end $contacts$;

-- ---------------------------------------------------------------------------------------------
-- Groups & Gospel Planning. Use: module_allowed. Active members (and the owner) take part; a
-- group-only member is in their group and unit-scoped features simply do not apply to them.
create or replace function gp_private.has_access(p_member uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.members m where m.id=p_member and (m.status='active' or app_private.is_owner(m.id)))
  and app_private.module_allowed(p_member,gp_private.module_id()) $$;
create or replace function gp_private.placement(p_member uuid) returns public.member_placements language sql stable set search_path='' as $$
 select p.* from public.member_placements p
 join public.church_groups g on g.id=p.group_id and g.is_active
 join public.age_categories c on c.id=g.age_category_id and c.is_active
 left join public.church_units u on u.id=p.unit_id
 where p.member_id=p_member and p.ended_at is null and p.started_at<=now() and gp_private.has_access(p_member)
   and (p.unit_id is null or (u.group_id=p.group_id and u.is_active))
 limit 1 $$;
create or replace function gp_private.manager(p_member uuid) returns boolean language sql stable set search_path='' as $$
 select gp_private.has_access(p_member) and app_private.module_manager(p_member,gp_private.module_id()) $$;
-- Leadership in Gospel Planning comes from the appointment's scope, not the leader's placement.
-- A leader of group X sees and manages X while placed in group Y; in Y they act per their own roles.
create or replace function gp_private.group_leader(p_member uuid,p_group uuid) returns boolean language sql stable set search_path='' as $$
 select p_group is not null and gp_private.has_access(p_member) and app_private.actor_has(p_member,'group_leader',p_group) $$;
create or replace function gp_private.unit_leader(p_member uuid,p_unit uuid) returns boolean language sql stable set search_path='' as $$
 select p_unit is not null and gp_private.has_access(p_member) and app_private.actor_has(p_member,'unit_leader',p_unit) $$;
create or replace function gp_private.leads_in_group(p_member uuid,p_group uuid) returns boolean language sql stable set search_path='' as $$
 select gp_private.group_leader(p_member,p_group) or exists(select 1 from app_private.role_assignments r
  join public.church_units u on u.id=r.unit_id and u.group_id=p_group and u.is_active
  where r.member_id=p_member and r.role_key='unit_leader' and r.ended_at is null and gp_private.unit_leader(p_member,u.id)) $$;
create or replace function gp_private.reads_update(p_member uuid,p_group uuid,p_unit uuid) returns boolean language sql stable set search_path='' as $$
 select gp_private.group_leader(p_member,p_group)
  or (exists(select 1 from public.church_units u where u.id=p_unit and u.group_id=p_group) and gp_private.unit_leader(p_member,p_unit)) $$;
create or replace function gp_private.scopes_members(p_actor uuid,p_group uuid,p_ids uuid[]) returns boolean language sql stable set search_path='' as $$
 select gp_private.group_leader(p_actor,p_group) or gp_private.capable(p_actor,'schedule',p_group)
  or (cardinality(p_ids)>0 and not exists(select 1 from unnest(p_ids) x(id) where not exists(
   select 1 from public.member_placements mp where mp.id=(gp_private.placement(x.id)).id and mp.group_id=p_group
    and (gp_private.unit_leader(p_actor,mp.unit_id) or (mp.unit_id is not null and gp_private.capable(p_actor,'schedule',p_group,mp.unit_id)))))) $$;
-- The group of a group-scoped action: an explicit groupId (a group the actor leads), else the actor's own group.
create or replace function gp_private.context_group(p_own uuid,p jsonb) returns uuid language plpgsql set search_path='' as $$
begin
 if p ? 'groupId' and p->'groupId'<>'null'::jsonb then return gp_private.uuid_of(p->'groupId');end if;
 return p_own;
end $$;
-- Two or three distinct participants from one group, all with current access. The actor takes part
-- (and so is placed in that group) or holds scheduling authority over every participant.
create or replace function gp_private.session_members(p_actor uuid,p_ids jsonb,p_group uuid) returns uuid[] language plpgsql set search_path='' as $$
declare ids uuid[]:='{}';v uuid;e jsonb;begin
 if p_ids is null or jsonb_typeof(p_ids)<>'array' or jsonb_array_length(p_ids) not between 2 and 3 then raise exception 'GP_INVALID' using errcode='22023';end if;
 if p_group is null then raise exception 'GP_DENIED' using errcode='42501';end if;
 for e in select value from jsonb_array_elements(p_ids) loop
  v:=gp_private.uuid_of(e);
  if v=any(ids) then raise exception 'GP_INVALID' using errcode='22023';end if;
  if (gp_private.placement(v)).group_id is distinct from p_group then raise exception 'GP_DENIED' using errcode='42501';end if;
  ids:=ids||v;
 end loop;
 select array_agg(x order by x) into ids from unnest(ids) x;
 if not(p_actor=any(ids)) and not gp_private.scopes_members(p_actor,p_group,ids) then raise exception 'GP_DENIED' using errcode='42501';end if;
 return ids;
end $$;
create or replace function gp_private.session_members(p_actor uuid,p_ids jsonb) returns uuid[] language plpgsql set search_path='' as $$
begin return gp_private.session_members(p_actor,p_ids,(gp_private.placement(p_actor)).group_id);end $$;

-- ---------------------------------------------------------------------------------------------
-- Authorization for each action. Runs before a retry receipt is served and before any write.
create or replace function gp_private.authorize(a uuid,p_action text,p jsonb) returns uuid language plpgsql set search_path='' as $$
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
  perform gp_private.strict_keys(p,array['date','from','to','locationId','participants'],array['groupId']);
  perform gp_private.session_members(a,p->'participants',gp_private.context_group(ap.group_id,p));return null;
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
  if p_action='session.revise' then perform gp_private.session_members(a,p->'participants',s.group_id);end if;
  return s.id;
 when 'plan.save' then
  perform gp_private.strict_keys(p,array['week','expected','review','plan','nextAction'],array['responsibleId','groupId']);
  if not gp_private.group_leader(a,gp_private.context_group(ap.group_id,p)) then raise exception 'GP_DENIED' using errcode='42501';end if;return null;
 when 'plan.publish' then
  perform gp_private.strict_keys(p,array['week','expected'],array['groupId']);
  if not gp_private.capable(a,'publish',gp_private.context_group(ap.group_id,p)) then raise exception 'GP_DENIED' using errcode='42501';end if;return null;
 when 'update.create' then
  perform gp_private.strict_keys(p,array['week','unitId','body','support','nextAction'],array['aboutMemberId','assigneeId','groupId']);
  unit:=gp_private.uuid_of(p->'unitId');g:=gp_private.context_group(ap.group_id,p);
  if not exists(select 1 from public.church_units x where x.id=unit and x.group_id=g and x.is_active)
   or not gp_private.reads_update(a,g,unit) then raise exception 'GP_DENIED' using errcode='42501';end if;return null;
 when 'update.edit' then
  perform gp_private.strict_keys(p,array['id','expected','body','support','nextAction','status'],array['aboutMemberId','assigneeId']);
  select * into u from gp_private.member_updates where id=gp_private.uuid_of(p->'id');
  if u.id is null or not gp_private.reads_update(a,u.group_id,u.unit_id) then raise exception 'GP_DENIED' using errcode='42501';end if;return u.id;
 when 'request.create' then
  perform gp_private.strict_keys(p,array['week','reviewerId','body'],array['groupId']);
  if not gp_private.leads_in_group(a,gp_private.context_group(ap.group_id,p)) then raise exception 'GP_DENIED' using errcode='42501';end if;return null;
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
create or replace function gp_private.command(p_action text,p jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
<<gp>>
declare
 a uuid;ap public.member_placements;s gp_private.sessions;pl gp_private.plans;rc gp_private.receipts;av gp_private.availability;
 u gp_private.member_updates;r gp_private.overseer_requests;cg gp_private.capability_grants;
 ids uuid[];member uuid;id uuid;v integer;expected integer;response_version integer;result jsonb;digest text;
 during tstzrange;windows tstzmultirange:='{}';w jsonb;skip jsonb;d date;i integer;loc uuid;week_date date;
 about uuid;assignee uuid;reviewer uuid;target public.member_placements;cap text;g uuid;unit uuid;body text;decision text;ctx uuid;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'GP_ISOLATION_REQUIRED' using errcode='25001';end if;
 perform pg_advisory_xact_lock(741085);
 a:=app_private.current_member_id();
 if a is null or not gp_private.has_access(a) then raise exception 'GP_DENIED' using errcode='42501';end if;
 if p_action is null or p_request_id is null then raise exception 'GP_INVALID' using errcode='22023';end if;
 ap:=gp_private.placement(a);
 id:=gp_private.authorize(a,p_action,p);
 ctx:=gp_private.context_group(ap.group_id,p);
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
  if s.id is not null then ctx:=s.group_id;end if;
  ids:=gp_private.session_members(a,p->'participants',ctx);
  d:=gp_private.day_of(p->'date');during:=gp_private.local_range(d,p->'from',p->'to');loc:=gp_private.uuid_of(p->'locationId');
  if lower(during)<=clock_timestamp() then raise exception 'GP_INVALID_TIME' using errcode='22007';end if;
  if not exists(select 1 from gp_private.locations where locations.id=loc and active) then raise exception 'GP_UNAVAILABLE' using errcode='22023';end if;
  if s.id is not null and (s.phase='cancelled' or s.report_version>0 or s.starts_at<=clock_timestamp()) then raise exception 'GP_CLOSED' using errcode='55000';end if;
  if exists(select 1 from gp_private.commitments c where c.member_id=any(ids) and c.session_id is distinct from s.id and c.during && gp.during) then
   raise exception 'GP_OVERLAP' using errcode='23P01';end if;
  id:=coalesce(s.id,gen_random_uuid());v:=coalesce(s.version,0)+1;
  if s.id is null then
   insert into gp_private.sessions(id,group_id,creator_id,creator_placement_id,version,starts_at,ends_at,location_id)
    values(id,ctx,a,ap.id,v,lower(during),upper(during),loc);
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
  if about is not null and (gp_private.placement(about)).group_id is distinct from ctx then raise exception 'GP_DENIED' using errcode='42501';end if;
  select * into pl from gp_private.plans where group_id=ctx and week=week_date for update;
  if coalesce(pl.version,0)<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
  id:=coalesce(pl.id,gen_random_uuid());v:=expected+1;
  insert into gp_private.plans values(id,ctx,week_date,v,gp_private.words(p->'review',1200,false),gp_private.words(p->'plan',1200,false),
   gp_private.words(p->'nextAction',300,false),about,a,clock_timestamp())
   on conflict(group_id,week) do update set version=excluded.version,review=excluded.review,plan=excluded.plan,next_action=excluded.next_action,
    responsible_id=excluded.responsible_id,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  if exists(select 1 from gp_private.plans x where x.id=gp.id and length(btrim(x.review||x.plan))=0) then raise exception 'GP_INVALID' using errcode='22023';end if;

 when 'plan.publish' then
  week_date:=gp_private.week_of(p->'week');
  select * into pl from gp_private.plans where group_id=ctx and week=week_date for update;
  if pl.id is null or pl.version<>expected then raise exception 'GP_STALE' using errcode='40001';end if;
  if exists(select 1 from gp_private.publications x where x.plan_id=pl.id and x.version=pl.version) then raise exception 'GP_STALE' using errcode='40001';end if;
  insert into gp_private.publications values(pl.id,pl.version,pl.review,pl.plan,pl.next_action,pl.responsible_id,a,clock_timestamp());
  id:=pl.id;v:=pl.version;

 when 'update.create','update.edit' then
  if p_action='update.create' then
   week_date:=gp_private.week_of(p->'week');g:=ctx;unit:=gp_private.uuid_of(p->'unitId');
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
  if reviewer=a or not gp_private.capable(reviewer,'oversee',ctx) then raise exception 'GP_DENIED' using errcode='42501';end if;
  id:=gen_random_uuid();v:=1;
  insert into gp_private.overseer_requests(id,group_id,week,author_id,author_placement_id,reviewer_id,version) values(id,ctx,week_date,a,ap.id,reviewer,v);
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
   -- Own group, or a group the member leads by appointment (leadership is independent of placement).
   g:=coalesce(gp_private.optional_uuid(p->'groupId'),target.group_id);
   if target.id is null or (g is distinct from target.group_id and not gp_private.leads_in_group(member,g)) then raise exception 'GP_DENIED' using errcode='42501';end if;
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

-- Workspace: any member with use access opens it. An unplaced member sees the neutral unplaced view.
-- p_group chooses which group to view: the member's own group (the default) or a group they lead by
-- appointment. Group sections are computed for that group only.
create or replace function gp_private.workspace(p_week date,p_group uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;ap public.member_placements;leader boolean;group_lead boolean;mgr boolean;result jsonb;cg uuid;own boolean;led uuid[];begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'GP_ISOLATION_REQUIRED' using errcode='25001';end if;
 perform pg_advisory_xact_lock(741085);
 a:=app_private.current_member_id();
 if a is null or not app_private.module_allowed(a,gp_private.module_id()) then raise exception 'GP_DENIED' using errcode='42501';end if;
 if p_week is null or extract(isodow from p_week)<>1 or p_week<gp_private.vegas_today()-400 or p_week>gp_private.vegas_today()+400 then
  raise exception 'GP_INVALID' using errcode='22023';end if;
 ap:=gp_private.placement(a);mgr:=gp_private.manager(a);
 -- Groups led by appointment: group leader of the group, or unit leader of one of its units.
 select coalesce(array_agg(g.id order by c.sort_order,c.name,g.name,g.id),'{}') into led
  from public.church_groups g join public.age_categories c on c.id=g.age_category_id
  where g.is_active and c.is_active and gp_private.leads_in_group(a,g.id);
 if p_group is not null and p_group is distinct from ap.group_id and not(p_group=any(led)) then raise exception 'GP_DENIED' using errcode='42501';end if;
 cg:=coalesce(p_group,ap.group_id,led[1]);
 own:=coalesce(ap.id is not null and ap.group_id=cg,false);
 group_lead:=cg is not null and gp_private.group_leader(a,cg);
 leader:=cg is not null and gp_private.leads_in_group(a,cg);
 select jsonb_build_object(
  'week',p_week,'today',gp_private.vegas_today(),'now',clock_timestamp(),
  'me',jsonb_build_object('id',a,'name',(select display_name from public.members where id=a),'placed',ap.id is not null,
   'groupId',cg,'groupName',(select name from public.church_groups where id=cg),
   'ownGroupId',ap.group_id,'inGroup',coalesce(own,false),
   'unitId',case when own then ap.unit_id end,'unitName',case when own then (select name from public.church_units where id=ap.unit_id) end,
   'groupLeader',coalesce(group_lead,false),'unitLeader',coalesce(leader and not group_lead,false),
   'publisher',cg is not null and gp_private.capable(a,'publish',cg),
   'scheduler',exists(select 1 from gp_private.capability_grants c where c.member_id=a and c.capability='schedule' and c.ended_at is null and gp_private.capable(a,'schedule',c.group_id,c.unit_id)),
   'overseer',exists(select 1 from gp_private.capability_grants c where c.member_id=a and c.capability='oversee' and c.ended_at is null and gp_private.capable(a,'oversee',c.group_id)),
   'manager',mgr),
  'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'own',coalesce(g.id=ap.group_id,false),'leader',g.id=any(led)) order by coalesce(g.id<>ap.group_id,true),c.sort_order,c.name,g.name,g.id)
   from public.church_groups g join public.age_categories c on c.id=g.age_category_id where g.id=ap.group_id or g.id=any(led)),'[]'::jsonb),
  'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name,'unitId',p.unit_id,'self',m.id=a) order by m.display_name,m.id)
   from public.members m join public.member_placements p on p.member_id=m.id and p.ended_at is null
   where cg is not null and p.group_id=cg and p.id=(gp_private.placement(m.id)).id),'[]'::jsonb),
  'units',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'canWrite',gp_private.reads_update(a,cg,u.id)) order by u.name,u.id)
   from public.church_units u where leader and u.group_id=cg and u.is_active),'[]'::jsonb),
  'locations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'label',l.label) order by l.label,l.id) from gp_private.locations l where l.active),'[]'::jsonb),
  'availability',coalesce((select jsonb_build_object('version',x.version,'ranges',x.ranges,'savedAt',x.saved_at,
    'windows',coalesce((select jsonb_agg(jsonb_build_object('start',lower(w),'end',upper(w)) order by lower(w)) from unnest(x.windows) w),'[]'::jsonb))
   from gp_private.availability x where x.member_id=a and x.placement_id=ap.id),jsonb_build_object('version',0,'ranges','[]'::jsonb,'windows','[]'::jsonb)),
  'sessions',coalesce((select jsonb_agg(gp_private.session_json(a,s) order by s.starts_at,s.id) from (
    select * from gp_private.sessions s where cg is not null and s.group_id=cg and gp_private.readable_session(a,s.id) and (
     ((s.starts_at at time zone 'America/Los_Angeles')::date>=p_week and (s.starts_at at time zone 'America/Los_Angeles')::date<p_week+7)
     or (gp_private.own_session(a,s.id) and s.ends_at>=now()-interval '14 days' and s.starts_at<now()+interval '42 days'))
    order by s.starts_at,s.id limit 200) s),'[]'::jsonb),
  'plan',case when not(own or leader) then null else (select jsonb_build_object(
    'canEdit',coalesce(group_lead,false),'canPublish',gp_private.capable(a,'publish',cg),
    'published',(select jsonb_build_object('version',pu.version,'review',pu.review,'plan',pu.plan,'nextAction',pu.next_action,
      'responsible',case when pu.responsible_id is null then null else gp_private.visible_name(cg,pu.responsible_id) end,'publishedAt',pu.published_at)
     from gp_private.plans pl join gp_private.publications pu on pu.plan_id=pl.id where pl.group_id=cg and pl.week=p_week order by pu.version desc limit 1),
    'draft',case when leader then (select jsonb_build_object('version',pl.version,'review',pl.review,'plan',pl.plan,'nextAction',pl.next_action,'responsibleId',pl.responsible_id,
      'updatedAt',pl.updated_at,'publishedVersion',(select max(x.version) from gp_private.publications x where x.plan_id=pl.id))
     from gp_private.plans pl where pl.group_id=cg and pl.week=p_week) end)) end,
  'updates',case when leader then coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'version',u.version,'week',u.week,'unitId',u.unit_id,
     'unitName',(select name from public.church_units where id=u.unit_id),
     'aboutMemberId',u.about_member_id,'about',case when u.about_member_id is null then null else gp_private.visible_name(u.group_id,u.about_member_id) end,
     'body',u.body,'support',u.support,'nextAction',u.next_action,'assigneeId',u.assignee_id,
     'assignee',case when u.assignee_id is null then null else gp_private.visible_name(u.group_id,u.assignee_id) end,
     'status',u.status,'author',gp_private.visible_name(u.group_id,u.author_id),'updatedAt',u.updated_at) order by u.status,u.week desc,u.created_at,u.id)
    from gp_private.member_updates u where u.group_id=cg and gp_private.reads_update(a,u.group_id,u.unit_id)
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
   where c.capability='oversee' and c.group_id=cg and c.ended_at is null and c.member_id<>a and gp_private.capable(c.member_id,'oversee',cg)),'[]'::jsonb) end,
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
   from gp_private.sessions s where s.group_id=cg and gp_private.readable_session(a,s.id)
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
create or replace function gp_private.workspace(p_week date) returns jsonb language sql security definer set search_path='' as $$
 select gp_private.workspace(p_week,null::uuid) $$;
create or replace function public.gospel_planning_workspace(p_week date,p_group uuid) returns jsonb language sql security invoker set search_path='' as $$
 select gp_private.workspace(p_week,p_group) $$;

-- ---------------------------------------------------------------------------------------------
-- Privileges: internal helpers are never callable by browser roles. Only the identity helpers that
-- security-invoker wrappers or row policies need are executable by authenticated.
revoke execute on function app_private.has_member_account(uuid),app_private.is_owner(uuid),app_private.module_allowed(uuid,uuid),
 app_private.module_manager(uuid,uuid),app_private.manages_group(uuid,uuid),app_private.manages_placement(uuid,uuid,uuid),
 app_private.manages_member(uuid,uuid),app_private.study_is_manager(uuid),app_private.apply_member_command(text,jsonb,uuid),
 app_private.worship_can_manage(uuid,text),app_private.worship_can_plan(uuid,uuid),
 mpg_private.allowed(uuid,text,uuid),gp_private.has_access(uuid),gp_private.placement(uuid),gp_private.manager(uuid),
 gp_private.group_leader(uuid,uuid),gp_private.unit_leader(uuid,uuid),gp_private.leads_in_group(uuid,uuid),gp_private.reads_update(uuid,uuid,uuid),
 gp_private.scopes_members(uuid,uuid,uuid[]),gp_private.context_group(uuid,jsonb),gp_private.session_members(uuid,jsonb,uuid),
 gp_private.session_members(uuid,jsonb),gp_private.authorize(uuid,text,jsonb),app_private.actor_has(uuid,text,uuid)
 from public,anon,authenticated,service_role;
revoke execute on function gp_private.workspace(date,uuid),public.gospel_planning_workspace(date,uuid) from public,anon,service_role;
revoke execute on function app_private.organization_member_id(),app_private.can_read_placement(uuid,uuid,uuid) from public,anon;
grant execute on function app_private.organization_member_id(),app_private.can_read_placement(uuid,uuid,uuid),app_private.current_member_id(),
 app_private.member_workspace(),app_private.member_command(text,jsonb,uuid),app_private.enrollment_command(text,jsonb,uuid),
 app_private.member_module_home(),app_private.study_group_access(jsonb),gp_private.workspace(date),gp_private.workspace(date,uuid),
 gp_private.command(text,jsonb,uuid),public.gospel_planning_workspace(date,uuid) to authenticated;
revoke execute on function public.member_workspace() from public,anon;
grant execute on function public.member_workspace() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Approve Groups & Gospel Planning (owner decision 2026-10-24), recorded against the bootstrap owner.
-- Skipped with a notice where no single owner exists (disposable test databases only).
do $approve$
declare v_owner uuid; v_owner_auth uuid; v_count integer; v_module uuid;
begin
 select count(*),min(l.member_id::text)::uuid,min(l.auth_user_id::text)::uuid into v_count,v_owner,v_owner_auth
 from app_private.bootstrap_receipts b join app_private.account_links l on l.auth_user_id=b.auth_user_id
 join public.members m on m.id=l.member_id where l.enabled and l.technical_enabled and m.status in ('active','intake');
 if v_count>1 then raise exception 'More than one bootstrap owner; resolve before approving Gospel Planning' using errcode='42501';end if;
 if v_count=0 then raise notice 'No bootstrap owner; Gospel Planning approval skipped';return;end if;
 update app_private.app_modules set status='approved',approved_at=coalesce(approved_at,clock_timestamp()),approved_by=coalesce(approved_by,v_owner),updated_at=clock_timestamp()
  where module_key='gospel-planning' and status='draft' returning id into v_module;
 if v_module is not null then
  insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,after_state)
  values(v_owner,v_owner_auth,'module.approved',v_owner,'Owner approved Groups & Gospel Planning (2026-10-24 decision)',
   jsonb_build_object('module','gospel-planning','status','approved'));
 end if;
 if not exists(select 1 from app_private.audit_events where operation='module.access_policy') then
  insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,after_state)
  values(v_owner,v_owner_auth,'module.access_policy',v_owner,'Owner decision 2026-10-24: approved apps open to signed-in members; owner manages every app; group-only placement',
   jsonb_build_object('use','every signed-in member','manage','explicit manager grant or owner','placement','category/group/optional unit'));
 end if;
end $approve$;

notify pgrst,'reload schema';
commit;
