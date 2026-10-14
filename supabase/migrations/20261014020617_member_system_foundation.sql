-- LV Zion Official member foundation. Independent, unapplied production candidate.
-- PostgreSQL 17. Apply ONLY to a reviewed, empty isolated database.
-- Canonical schema: supersedes docs/sql/member-schema-proposal.sql, not additive.
begin;
create schema app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated, service_role;
alter default privileges in schema app_private revoke execute on functions from public;

create table public.age_categories (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(btrim(name)) between 1 and 80),
 sort_order integer not null default 0, is_active boolean not null default true
);
create table public.church_groups (
 id uuid primary key default gen_random_uuid(), age_category_id uuid not null references public.age_categories on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 80), is_active boolean not null default true, unique(age_category_id,name)
);
create table public.church_units (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.church_groups on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 80), is_active boolean not null default true, unique(group_id,name), unique(id,group_id)
);
create table public.members (
 id uuid primary key default gen_random_uuid(), display_name text not null check(length(btrim(display_name)) between 2 and 120),
 status text not null default 'intake' check(status in ('intake','active','inactive')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.member_placements (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members on delete restrict,
 group_id uuid not null references public.church_groups on delete restrict, unit_id uuid not null,
 started_at timestamptz not null default clock_timestamp(), ended_at timestamptz, reason text,
 foreign key(unit_id,group_id) references public.church_units(id,group_id) on delete restrict,
 check(ended_at is null or ended_at>started_at)
);
create unique index member_one_current_placement on public.member_placements(member_id) where ended_at is null;
create index placements_group_current on public.member_placements(group_id,member_id) where ended_at is null;
create index placements_unit_current on public.member_placements(unit_id,member_id) where ended_at is null;
create table public.departments (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(btrim(name)) between 1 and 80), is_active boolean not null default true
);
create table public.department_memberships (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members on delete restrict,
 department_id uuid not null references public.departments on delete restrict,
 started_at timestamptz not null default clock_timestamp(), ended_at timestamptz, check(ended_at is null or ended_at>started_at)
);
create unique index department_one_current_membership on public.department_memberships(member_id,department_id) where ended_at is null;
create index department_current_roster on public.department_memberships(department_id,member_id) where ended_at is null;
create table app_private.account_links (
 member_id uuid primary key references public.members on delete restrict, auth_user_id uuid not null unique references auth.users on delete restrict,
 username text not null unique check(username=lower(username) and username ~ '^[a-z][a-z0-9._-]{2,31}$'),
 enabled boolean not null default true, session_valid_after timestamptz not null default '-infinity', linked_at timestamptz not null default now()
);
create table app_private.member_private_contacts (
 member_id uuid primary key references public.members on delete restrict,
 email text check(email is null or length(email)<=254), phone text check(phone is null or length(phone)<=30), updated_at timestamptz not null default now()
);
create table app_private.role_assignments (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members on delete restrict,
 role_key text not null check(role_key in ('unit_leader','group_leader','pastoral_staff','member_administrator','department_manager','department_administrator','technical_admin')),
 unit_id uuid references public.church_units on delete restrict, group_id uuid references public.church_groups on delete restrict,
 department_id uuid references public.departments on delete restrict, appointed_at timestamptz not null default clock_timestamp(), ended_at timestamptz,
 appointed_by uuid references public.members on delete restrict, ended_by uuid references public.members on delete restrict,
 check(ended_at is null or ended_at>appointed_at),
 check((role_key='unit_leader' and unit_id is not null and group_id is null and department_id is null)
 or (role_key='group_leader' and group_id is not null and unit_id is null and department_id is null)
 or (role_key='department_manager' and department_id is not null and unit_id is null and group_id is null)
 or (role_key in ('pastoral_staff','member_administrator','department_administrator','technical_admin') and unit_id is null and group_id is null and department_id is null))
);
create unique index role_one_active_appointment on app_private.role_assignments(member_id,role_key,unit_id,group_id,department_id) nulls not distinct where ended_at is null;
create index role_active_actor on app_private.role_assignments(member_id,role_key) where ended_at is null;
create table app_private.transfer_requests (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members on delete restrict,
 source_placement_id uuid not null references public.member_placements on delete restrict,
 destination_group_id uuid not null references public.church_groups on delete restrict, destination_unit_id uuid not null,
 requested_by uuid not null references public.members on delete restrict, accepted_by uuid references public.members on delete restrict,
 status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled')),
 reason text not null check(length(btrim(reason)) between 5 and 500), created_at timestamptz not null default now(), decided_at timestamptz,
 foreign key(destination_unit_id,destination_group_id) references public.church_units(id,group_id) on delete restrict
);
create unique index transfer_one_pending_per_member on app_private.transfer_requests(member_id) where status='pending';
create table app_private.invitations (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members on delete restrict,
 expected_email text not null check(length(expected_email) between 3 and 254), token_digest text not null unique check(token_digest ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz not null, consumed_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(),
 created_by uuid not null references public.members on delete restrict, check(expires_at>created_at)
);
create table app_private.access_requests (
 id uuid primary key default gen_random_uuid(), requested_email text not null check(length(requested_email) between 3 and 254),
 claimed_name text not null check(length(btrim(claimed_name)) between 2 and 120), status text not null default 'pending' check(status in ('pending','approved','rejected')),
 matched_member_id uuid references public.members on delete restrict, created_at timestamptz not null default now(), reviewed_by uuid references public.members on delete restrict
);
create table app_private.audit_events (
 id bigint generated always as identity primary key, occurred_at timestamptz not null default clock_timestamp(),
 actor_member_id uuid references public.members on delete restrict, actor_auth_user_id uuid,
 operation text not null, target_member_id uuid references public.members on delete restrict,
 reason text not null, before_state jsonb, after_state jsonb, department_id uuid references public.departments on delete restrict
);
create index audit_target_time on app_private.audit_events(target_member_id,occurred_at desc);
create table app_private.command_receipts (
 actor_member_id uuid not null references public.members on delete restrict, request_id uuid not null,
 action text not null, payload_hash text not null, result jsonb not null, created_at timestamptz not null default now(), primary key(actor_member_id,request_id)
);
create table app_private.auth_attempt_buckets (
 key_hash text not null check(key_hash ~ '^[0-9a-f]{64}$'), window_start bigint not null, attempts integer not null check(attempts>0), primary key(key_hash,window_start)
);

-- RLS on every application table; no direct client writes, no private table grants.
do $$ declare t record; begin
 for t in select schemaname,tablename from pg_tables where schemaname in ('public','app_private') loop
  execute format('alter table %I.%I enable row level security',t.schemaname,t.tablename);
  execute format('revoke all on %I.%I from public,anon,authenticated',t.schemaname,t.tablename);
 end loop;
end $$;

-- Active membership and a still-valid Auth session are BOTH required.
create function app_private.current_member_id() returns uuid language sql stable security definer set search_path='' as $$
 select l.member_id from app_private.account_links l join public.members m on m.id=l.member_id
 join auth.sessions s on s.user_id=l.auth_user_id and s.id::text=(auth.jwt()->>'session_id')
 where l.auth_user_id=(select auth.uid()) and l.enabled and m.status='active' and s.created_at>=l.session_valid_after limit 1
$$;
-- Internal helper: never granted directly. Effective scope is independent of appointment history.
create function app_private.actor_has(p_actor uuid,p_role text,p_scope uuid default null) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from app_private.role_assignments r join public.members m on m.id=r.member_id
 where r.member_id=p_actor and m.status='active' and r.role_key=p_role and r.ended_at is null and r.appointed_at<=now()
 and (p_scope is null or p_scope=coalesce(r.unit_id,r.group_id,r.department_id))
 and (r.role_key not in ('unit_leader','group_leader') or exists(select 1 from public.member_placements p
 where p.member_id=p_actor and p.ended_at is null and p.started_at<=now()
 and ((r.role_key='unit_leader' and p.unit_id=r.unit_id) or (r.role_key='group_leader' and p.group_id=r.group_id)))))
$$;
create function app_private.org_authority(p_actor uuid) returns boolean language sql stable set search_path='' as $$
 select app_private.actor_has(p_actor,'pastoral_staff') or app_private.actor_has(p_actor,'member_administrator')
$$;
create function app_private.manages_unit(p_actor uuid,p_unit uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.church_units u join public.church_groups g on g.id=u.group_id join public.age_categories a on a.id=g.age_category_id
 where u.id=p_unit and u.is_active and g.is_active and a.is_active
 and (app_private.org_authority(p_actor) or app_private.actor_has(p_actor,'unit_leader',u.id) or app_private.actor_has(p_actor,'group_leader',u.group_id)))
$$;
create function app_private.manages_member(p_actor uuid,p_target uuid) returns boolean language sql stable set search_path='' as $$
 select p_actor is not null and exists(select 1 from public.members where id=p_target)
 and (app_private.org_authority(p_actor) or exists(select 1 from public.member_placements p where p.member_id=p_target and p.ended_at is null and p.started_at<=now() and app_private.manages_unit(p_actor,p.unit_id)))
$$;
create function app_private.manages_department(p_actor uuid,p_dept uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.departments where id=p_dept and is_active)
 and (app_private.actor_has(p_actor,'department_administrator') or app_private.actor_has(p_actor,'department_manager',p_dept))
$$;
create function app_private.own_group_id() returns uuid language sql stable security definer set search_path='' as $$
 select group_id from public.member_placements where member_id=app_private.current_member_id() and ended_at is null and started_at<=now()
$$;
create function app_private.can_manage_member(p_target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.manages_member(app_private.current_member_id(),p_target)
$$;
create function app_private.can_see_name(p_target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.current_member_id() is not null and (p_target=app_private.current_member_id() or app_private.can_manage_member(p_target)
 or exists(select 1 from public.member_placements p join public.members m on m.id=p.member_id
 where p.member_id=p_target and m.status='active' and p.ended_at is null and p.started_at<=now() and p.group_id=app_private.own_group_id())
 or exists(select 1 from public.department_memberships d join public.members m on m.id=d.member_id where d.member_id=p_target and m.status='active' and d.ended_at is null and d.started_at<=now()
 and app_private.manages_department(app_private.current_member_id(),d.department_id)))
$$;
create function app_private.can_see_department(p_dept uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.current_member_id() is not null and (app_private.manages_department(app_private.current_member_id(),p_dept)
 or exists(select 1 from public.department_memberships where member_id=app_private.current_member_id() and department_id=p_dept and ended_at is null and started_at<=now()))
$$;
create function app_private.can_read_department_membership(p_member uuid,p_dept uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.current_member_id() is not null and (p_member=app_private.current_member_id() or app_private.manages_department(app_private.current_member_id(),p_dept))
$$;
create function app_private.can_read_placement(p_member uuid,p_unit uuid) returns boolean language sql stable security definer set search_path='' as $$
 select app_private.current_member_id() is not null and (p_member=app_private.current_member_id() or app_private.manages_unit(app_private.current_member_id(),p_unit))
$$;
create policy names_scoped on public.members for select to authenticated using(app_private.can_see_name(id));
create policy placements_scoped on public.member_placements for select to authenticated using(app_private.can_read_placement(member_id,unit_id));
create policy groups_scoped on public.church_groups for select to authenticated using(id=(select app_private.own_group_id()));
create policy units_scoped on public.church_units for select to authenticated using(group_id=(select app_private.own_group_id()));
create policy categories_scoped on public.age_categories for select to authenticated using(exists(select 1 from public.church_groups where age_category_id=age_categories.id));
create policy departments_scoped on public.departments for select to authenticated using(app_private.can_see_department(id));
create policy dept_members_scoped on public.department_memberships for select to authenticated using(app_private.can_read_department_membership(member_id,department_id));
grant select(id,display_name) on public.members to authenticated;
grant select on public.member_placements,public.church_groups,public.church_units,public.age_categories,public.departments,public.department_memberships to authenticated;

-- Deferred invariant: active people require exactly one placement; intake may have none.
create function app_private.check_primary_placement() returns trigger language plpgsql security definer set search_path='' as $$
 declare v_member uuid; begin
 if TG_TABLE_NAME='members' then v_member:=new.id; else v_member:=coalesce(new.member_id,old.member_id); end if;
 if exists(select 1 from public.members where id=v_member and status='active') and
 (select count(*) from public.member_placements where member_id=v_member and ended_at is null)<>1 then
  raise exception 'Active members require one primary placement' using errcode='23514';
 end if; return null;
end $$;
create constraint trigger member_placement_required after insert or update on public.members deferrable initially deferred for each row execute function app_private.check_primary_placement();
create constraint trigger placement_required after insert or update or delete on public.member_placements deferrable initially deferred for each row execute function app_private.check_primary_placement();

-- All client mutations enter this audited command boundary. The advisory lock serializes
-- the small organization's consequential writes, including scope/role/status changes.
create function app_private.member_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare a uuid; t uuid; u uuid; d uuid; rid uuid; g uuid; r text; n text; v_status text; now_at timestamptz;
 p public.member_placements%rowtype; tr app_private.transfer_requests%rowtype; role_row app_private.role_assignments%rowtype;
 receipt app_private.command_receipts%rowtype; before_data jsonb; after_data jsonb; result_data jsonb:='{}';
 begin
 perform pg_advisory_xact_lock(741085);
 a:=app_private.current_member_id();
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
 if p_action='member.create' then
  if not app_private.manages_unit(a,u) then raise exception 'Not authorized' using errcode='42501'; end if;
  select group_id into g from public.church_units where id=u;
  insert into public.members(display_name,status) values(btrim(p_payload->>'name'),'active') returning id into t;
  insert into public.member_placements(member_id,group_id,unit_id,reason) values(t,g,u,r);
  after_data:=jsonb_build_object('name',btrim(p_payload->>'name'),'unitId',u);
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
  -- A later reactivation never revives pre-suspension sessions.
  update app_private.account_links set enabled=(v_status='active'),session_valid_after=now_at where member_id=t;
  after_data:=jsonb_build_object('status',v_status);
 elsif p_action in ('member.move','transfer.request') then
  if not app_private.manages_member(a,t) then raise exception 'Not authorized' using errcode='42501'; end if;
  select * into p from public.member_placements where member_id=t and ended_at is null for update;
  select cu.group_id into g from public.church_units cu join public.church_groups cg on cg.id=cu.group_id join public.age_categories ac on ac.id=cg.age_category_id
  where cu.id=u and cu.is_active and cg.is_active and ac.is_active;
  if p.id is null or g is null or p.unit_id=u then raise exception 'Invalid or unchanged placement' using errcode='22023'; end if;
  if p_action='transfer.request' then
   if p.group_id=g then raise exception 'Use a same-group move' using errcode='22023'; end if;
   insert into app_private.transfer_requests(member_id,source_placement_id,destination_group_id,destination_unit_id,requested_by,reason)
    values(t,p.id,g,u,a,r) returning id into rid;
   result_data:=jsonb_build_object('id',rid); after_data:=jsonb_build_object('destinationGroupId',g,'destinationUnitId',u,'status','pending');
  else
   if not app_private.manages_unit(a,u) or (p.group_id<>g and not app_private.org_authority(a)) then raise exception 'Receiving-group acceptance required' using errcode='42501'; end if;
   update public.member_placements set ended_at=now_at where id=p.id;
   insert into public.member_placements(member_id,group_id,unit_id,started_at,reason) values(t,g,u,now_at,r);
   update app_private.transfer_requests set status='cancelled',decided_at=now_at where member_id=t and status='pending';
   before_data:=jsonb_build_object('unitId',p.unit_id); after_data:=jsonb_build_object('unitId',u);
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
    or not app_private.manages_unit(a,tr.destination_unit_id) then raise exception 'Stale transfer; request again' using errcode='22023'; end if;
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
   if n='unit_leader' and not exists(select 1 from public.member_placements where member_id=t and unit_id=u and ended_at is null) then raise exception 'Unit appointment must match placement' using errcode='22023'; end if;
   g:=nullif(p_payload->>'groupId','')::uuid;
   if n='group_leader' and not exists(select 1 from public.member_placements where member_id=t and group_id=g and ended_at is null) then raise exception 'Group appointment must match placement' using errcode='22023'; end if;
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

-- The workspace is a deliberately minimized projection, not a table dump.
create function app_private.member_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare a uuid:=app_private.current_member_id(); own_g uuid; own_u uuid; org boolean; any_manager boolean; result_data jsonb;
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
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'parentId',g.age_category_id) order by g.name) from public.church_groups g where g.is_active and (any_manager or g.id=own_g)),'[]'::jsonb),
 'units',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'name',u.name,'parentId',u.group_id,'canManage',app_private.manages_unit(a,u.id)) order by u.name) from public.church_units u where u.is_active and (any_manager or u.group_id=own_g)),'[]'::jsonb),
 'departments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'canManage',app_private.manages_department(a,d.id),
 'members',case when app_private.manages_department(a,d.id) then coalesce((select jsonb_agg(jsonb_build_object('id',dm.member_id,'name',mm.display_name)) from public.department_memberships dm join public.members mm on mm.id=dm.member_id where dm.department_id=d.id and dm.ended_at is null),'[]'::jsonb) else '[]'::jsonb end)) from public.departments d where d.is_active and app_private.can_see_department(d.id)),'[]'::jsonb),
 'appointments',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'memberId',r.member_id,'role',r.role_key,'unitId',r.unit_id,'groupId',r.group_id,'departmentId',r.department_id,'endedAt',r.ended_at,'effective',r.ended_at is null and app_private.actor_has(r.member_id,r.role_key,coalesce(r.unit_id,r.group_id,r.department_id)))) from app_private.role_assignments r where r.member_id=a or (org and r.role_key in ('unit_leader','group_leader','pastoral_staff','member_administrator')) or (app_private.actor_has(a,'department_administrator') and r.role_key in ('department_manager','department_administrator'))),'[]'::jsonb),
 'transfers',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'memberId',t.member_id,'name',mm.display_name,'status',t.status,'unitId',t.destination_unit_id,'requestedBy',t.requested_by,'canDecide',(org or (t.requested_by<>a and app_private.actor_has(a,'group_leader',t.destination_group_id))))) from app_private.transfer_requests t join public.members mm on mm.id=t.member_id where t.status='pending' and (app_private.manages_member(a,t.member_id) or app_private.actor_has(a,'group_leader',t.destination_group_id))),'[]'::jsonb),
 'audit',coalesce((select jsonb_agg(row_to_json(e)) from (select id,occurred_at as "at",operation as action,target_member_id as "memberId",reason from app_private.audit_events where actor_member_id=a or (department_id is null and app_private.manages_member(a,target_member_id)) or app_private.manages_department(a,department_id) order by id desc limit 30) e),'[]'::jsonb)) into result_data from public.members m where m.id=a;
 return result_data;
 end $$;

-- Token digest is bound to the verified mailbox of the signed-in Auth identity.
create function app_private.activate_invitation(p_digest text,p_username text) returns uuid language plpgsql security definer set search_path='' as $$
 declare inv app_private.invitations%rowtype; verified_email text; uid uuid:=auth.uid();
 begin
 if uid is null then raise exception 'Not authorized' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(741085);
 select lower(email) into verified_email from auth.users where id=uid and email_confirmed_at is not null;
 select * into inv from app_private.invitations where token_digest=p_digest for update;
 if verified_email is null or inv.id is null or inv.expected_email<>verified_email or inv.expires_at<=now() or inv.consumed_at is not null or inv.revoked_at is not null
 or not exists(select 1 from public.members where id=inv.member_id and status='active') then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 insert into app_private.account_links(member_id,auth_user_id,username) values(inv.member_id,uid,lower(btrim(p_username)));
 update app_private.invitations set consumed_at=clock_timestamp() where id=inv.id;
 insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason) values(inv.member_id,uid,'account.activated',inv.member_id,'Verified invitation activation');
 return inv.member_id;
 end $$;

-- Trusted server endpoints: security INVOKER, inaccessible to browser roles.
grant usage on schema auth to service_role;
grant select(id,email) on auth.users to service_role;
grant select on app_private.account_links,public.members to service_role;
grant select,insert,update,delete on app_private.auth_attempt_buckets to service_role;
grant insert on app_private.access_requests to service_role;
create function public.resolve_login_identifier(p_identifier text) returns text language sql stable security invoker set search_path='' as $$
 select u.email from app_private.account_links l join public.members m on m.id=l.member_id join auth.users u on u.id=l.auth_user_id
 where l.enabled and m.status='active' and (l.username=lower(btrim(p_identifier)) or lower(u.email)=lower(btrim(p_identifier))) limit 1
$$;
create function public.consume_auth_limits(p_ip_hash text,p_identifier_hash text) returns boolean language plpgsql security invoker set search_path='' as $$
 declare bucket bigint:=floor(extract(epoch from now())/900); ip_count integer; identifier_count integer;
 begin
 insert into app_private.auth_attempt_buckets values(p_ip_hash,bucket,1) on conflict(key_hash,window_start) do update set attempts=auth_attempt_buckets.attempts+1 returning attempts into ip_count;
 insert into app_private.auth_attempt_buckets values(p_identifier_hash,bucket,1) on conflict(key_hash,window_start) do update set attempts=auth_attempt_buckets.attempts+1 returning attempts into identifier_count;
 delete from app_private.auth_attempt_buckets where window_start<bucket-192;
 return ip_count<=50 and identifier_count<=10;
 end $$;
create function public.submit_access_request(p_email text,p_name text) returns void language sql security invoker set search_path='' as $$
 insert into app_private.access_requests(requested_email,claimed_name) values(lower(btrim(p_email)),btrim(p_name))
$$;
create function public.member_workspace() returns jsonb language sql stable security invoker set search_path='' as $$ select app_private.member_workspace() $$;
create function public.member_command(p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select app_private.member_command(p_action,p_payload,p_request_id) $$;
create function public.my_membership_id() returns uuid language sql stable security invoker set search_path='' as $$ select app_private.current_member_id() $$;
create function public.activate_invitation(p_digest text,p_username text) returns uuid language sql security invoker set search_path='' as $$ select app_private.activate_invitation(p_digest,p_username) $$;

-- No accidental default public EXECUTE. Internal authority helpers remain uncallable.
revoke execute on all functions in schema app_private from public,anon,authenticated;
revoke execute on function public.resolve_login_identifier(text),public.consume_auth_limits(text,text),public.submit_access_request(text,text),public.member_workspace(),public.member_command(text,jsonb,uuid),public.my_membership_id(),public.activate_invitation(text,text) from public,anon,authenticated;
grant execute on function public.resolve_login_identifier(text),public.consume_auth_limits(text,text),public.submit_access_request(text,text) to service_role;
grant execute on function public.member_workspace(),public.member_command(text,jsonb,uuid),public.my_membership_id(),public.activate_invitation(text,text) to authenticated;
grant execute on function app_private.current_member_id(),app_private.own_group_id(),app_private.can_manage_member(uuid),app_private.can_see_name(uuid),app_private.can_see_department(uuid),app_private.can_read_department_membership(uuid,uuid),app_private.can_read_placement(uuid,uuid),app_private.member_workspace(),app_private.member_command(text,jsonb,uuid),app_private.activate_invitation(text,text) to authenticated;
commit;
