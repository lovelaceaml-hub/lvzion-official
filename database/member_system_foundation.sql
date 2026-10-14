-- LV Zion Official: isolated member-system foundation.
-- Review only. Apply to a disposable Supabase development branch after cost approval.
-- Requires Supabase PostgreSQL 15+; uses gen_random_uuid() and NULLS NOT DISTINCT.
-- No production migration, contacts, invitations or real people are included.

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create table public.age_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique (name)
);

create table public.church_groups (
  id uuid primary key default gen_random_uuid(),
  age_category_id uuid not null references public.age_categories(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  is_active boolean not null default true,
  unique (age_category_id, name)
);

create table public.church_units (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.church_groups(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  is_active boolean not null default true,
  unique (group_id, name),
  unique (id, group_id)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_placements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  group_id uuid not null references public.church_groups(id) on delete restrict,
  unit_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  reason text,
  constraint placement_unit_in_group foreign key (unit_id, group_id)
    references public.church_units(id, group_id) on delete restrict,
  constraint placement_time_order check (ended_at is null or ended_at > started_at)
);
create unique index member_one_current_placement
  on public.member_placements(member_id) where ended_at is null;
create index member_placements_group_current
  on public.member_placements(group_id, member_id) where ended_at is null;
create index member_placements_unit_current
  on public.member_placements(unit_id, member_id) where ended_at is null;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 80),
  is_active boolean not null default true
);

create table public.department_memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  department_id uuid not null references public.departments(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint department_time_order check (ended_at is null or ended_at > started_at)
);
create unique index department_one_current_membership
  on public.department_memberships(member_id, department_id) where ended_at is null;
create index department_memberships_department_current
  on public.department_memberships(department_id, member_id) where ended_at is null;

-- User identity never constitutes a member record, and a member exists before activation.
-- Username lookup MUST happen only on a throttled, trusted server, never in the client.
create table app_private.account_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete restrict,
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  username text not null unique
    check (username = lower(username) and username ~ '^[a-z][a-z0-9._-]{2,31}$'),
  enabled boolean not null default true,
  linked_at timestamptz not null default now()
);

create table app_private.member_private_contacts (
  member_id uuid primary key references public.members(id) on delete restrict,
  email text,
  phone text,
  updated_at timestamptz not null default now()
);

-- App administrators never inherit church-organizational authority.
-- Every appointment is indefinite until an authorized action records ended_at.
create table app_private.role_assignments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  role_key text not null check (role_key in (
    'unit_leader', 'group_leader', 'pastoral_staff',
    'member_administrator', 'department_manager', 'technical_admin'
  )),
  unit_id uuid references public.church_units(id) on delete restrict,
  group_id uuid references public.church_groups(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  appointed_at timestamptz not null default now(),
  ended_at timestamptz,
  appointed_by uuid references public.members(id) on delete restrict,
  ended_by uuid references public.members(id) on delete restrict,
  constraint role_scope_matches_key check (
    (role_key = 'unit_leader' and unit_id is not null and group_id is null and department_id is null)
    or (role_key = 'group_leader' and group_id is not null and unit_id is null and department_id is null)
    or (role_key = 'department_manager' and department_id is not null and unit_id is null and group_id is null)
    or (role_key in ('pastoral_staff', 'member_administrator', 'technical_admin')
      and unit_id is null and group_id is null and department_id is null)
  ),
  constraint role_time_order check (ended_at is null or ended_at > appointed_at)
);
create unique index role_one_active_appointment
  on app_private.role_assignments(member_id, role_key, unit_id, group_id, department_id)
  nulls not distinct where ended_at is null;
create index role_active_actor on app_private.role_assignments(member_id, role_key)
  where ended_at is null;

create table app_private.invitations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  token_digest bytea not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.members(id) on delete restrict,
  check (expires_at > created_at)
);

create table app_private.access_requests (
  id uuid primary key default gen_random_uuid(),
  requested_email text not null,
  claimed_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  matched_member_id uuid references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.members(id) on delete restrict
);

create table app_private.transfer_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  source_placement_id uuid not null references public.member_placements(id) on delete restrict,
  destination_group_id uuid not null references public.church_groups(id) on delete restrict,
  destination_unit_id uuid not null,
  requested_by uuid not null references public.members(id) on delete restrict,
  accepted_by uuid references public.members(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  reason text not null check (char_length(btrim(reason)) between 5 and 500),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint transfer_unit_in_group foreign key (destination_unit_id, destination_group_id)
    references public.church_units(id, group_id) on delete restrict
);
create unique index transfer_one_pending_per_member
  on app_private.transfer_requests(member_id) where status = 'pending';

create table app_private.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_member_id uuid references public.members(id) on delete restrict,
  actor_auth_user_id uuid,
  operation text not null,
  target_member_id uuid references public.members(id) on delete restrict,
  reason text not null,
  before_state jsonb,
  after_state jsonb
);
create index audit_events_target_time on app_private.audit_events(target_member_id, occurred_at desc);

-- Command tables provide auditable, transactional writes, without a broad UPDATE grant.
create table public.member_name_changes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  new_display_name text not null check (char_length(btrim(new_display_name)) between 2 and 120),
  reason text not null check (char_length(btrim(reason)) between 5 and 500),
  actor_auth_user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Deny all access by default, including every private table, before writing grants.
alter table public.age_categories enable row level security;
alter table public.church_groups enable row level security;
alter table public.church_units enable row level security;
alter table public.members enable row level security;
alter table public.member_placements enable row level security;
alter table public.departments enable row level security;
alter table public.department_memberships enable row level security;
alter table public.member_name_changes enable row level security;
alter table app_private.account_links enable row level security;
alter table app_private.member_private_contacts enable row level security;
alter table app_private.role_assignments enable row level security;
alter table app_private.invitations enable row level security;
alter table app_private.access_requests enable row level security;
alter table app_private.transfer_requests enable row level security;
alter table app_private.audit_events enable row level security;

revoke all on public.age_categories, public.church_groups, public.church_units,
  public.members, public.member_placements, public.departments,
  public.department_memberships, public.member_name_changes
  from public, anon, authenticated;
revoke all on app_private.account_links, app_private.member_private_contacts,
  app_private.role_assignments, app_private.invitations, app_private.access_requests,
  app_private.transfer_requests, app_private.audit_events
  from public, anon, authenticated;

-- Every SECURITY DEFINER routine is in an unexposed schema, has a fixed search path,
-- and derives the acting identity from auth.uid(), never client metadata.
create function app_private.current_member_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select l.member_id
  from app_private.account_links l
  join public.members m on m.id = l.member_id
  where l.auth_user_id = (select auth.uid())
    and l.enabled and m.status = 'active'
  limit 1
$$;

create function app_private.actor_group_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select p.group_id
  from public.member_placements p
  where p.member_id = app_private.current_member_id() and p.ended_at is null
  limit 1
$$;

create function app_private.actor_age_category_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select g.age_category_id from public.church_groups g
  where g.id = app_private.actor_group_id()
  limit 1
$$;

create function app_private.has_org_member_authority()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from app_private.role_assignments r
    where r.member_id = app_private.current_member_id()
      and r.ended_at is null
      and r.role_key in ('pastoral_staff', 'member_administrator')
  )
$$;

create function app_private.can_manage_member(p_target_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_member_id() is not null
    and exists (select 1 from public.members m where m.id = p_target_id)
    and (
      app_private.has_org_member_authority()
      or exists (
        select 1
        from app_private.role_assignments r
        join public.member_placements p on p.member_id = p_target_id
          and p.ended_at is null
        where r.member_id = app_private.current_member_id()
          and r.ended_at is null
          and (
            (r.role_key = 'unit_leader' and r.unit_id = p.unit_id
              and exists (select 1 from public.member_placements actor_p
                where actor_p.member_id = r.member_id
                  and actor_p.ended_at is null and actor_p.unit_id = r.unit_id))
            or (r.role_key = 'group_leader' and r.group_id = p.group_id
              and exists (select 1 from public.member_placements actor_p
                where actor_p.member_id = r.member_id
                  and actor_p.ended_at is null and actor_p.group_id = r.group_id))
          )
      )
    )
$$;

create function app_private.can_see_member_name(p_target_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_member_id() is not null
    and (
      p_target_id = app_private.current_member_id()
      or app_private.can_manage_member(p_target_id)
      or exists (
        select 1
        from public.member_placements mine
        join public.member_placements theirs on theirs.group_id = mine.group_id
        join public.members m on m.id = theirs.member_id
        where mine.member_id = app_private.current_member_id()
          and mine.ended_at is null and theirs.ended_at is null
          and m.status = 'active' and theirs.member_id = p_target_id
      )
      or exists (
        select 1
        from app_private.role_assignments r
        join public.department_memberships d on d.department_id = r.department_id
        join public.members m on m.id = d.member_id
        where r.member_id = app_private.current_member_id()
          and r.role_key = 'department_manager' and r.ended_at is null
          and d.ended_at is null and m.status = 'active' and d.member_id = p_target_id
      )
    )
$$;

create function app_private.can_read_placement(
  p_member_id uuid, p_group_id uuid, p_unit_id uuid
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_member_id() is not null
    and (
      p_member_id = app_private.current_member_id()
      or app_private.has_org_member_authority()
      or exists (
        select 1 from app_private.role_assignments r
        where r.member_id = app_private.current_member_id()
          and r.ended_at is null
          and ((r.role_key = 'group_leader' and r.group_id = p_group_id
              and exists (select 1 from public.member_placements actor_p
                where actor_p.member_id = r.member_id and actor_p.ended_at is null
                  and actor_p.group_id = r.group_id))
            or (r.role_key = 'unit_leader' and r.unit_id = p_unit_id
              and exists (select 1 from public.member_placements actor_p
                where actor_p.member_id = r.member_id and actor_p.ended_at is null
                  and actor_p.unit_id = r.unit_id)))
      )
    )
$$;

create function app_private.can_see_department(p_department_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select app_private.current_member_id() is not null and (
    app_private.has_org_member_authority()
    or exists (
      select 1 from public.department_memberships d
      where d.member_id = app_private.current_member_id()
        and d.department_id = p_department_id and d.ended_at is null
    )
    or exists (
      select 1 from app_private.role_assignments r
      where r.member_id = app_private.current_member_id()
        and r.department_id = p_department_id
        and r.role_key = 'department_manager' and r.ended_at is null
    )
  )
$$;

-- Safe Data API RPC: security INVOKER and yields only the caller's linked member id.
create function public.my_membership_id()
returns uuid language sql stable security invoker set search_path = ''
as $$
  select app_private.current_member_id()
$$;

create policy age_category_visible on public.age_categories for select to authenticated
  using (id = (select app_private.actor_age_category_id())
    or (select app_private.has_org_member_authority()));
create policy own_group_visible on public.church_groups for select to authenticated
  using (id = (select app_private.actor_group_id())
    or (select app_private.has_org_member_authority()));
create policy own_group_units_visible on public.church_units for select to authenticated
  using (group_id = (select app_private.actor_group_id())
    or (select app_private.has_org_member_authority()));
create policy scoped_member_names on public.members for select to authenticated
  using (app_private.can_see_member_name(id));
create policy scoped_placement_history on public.member_placements for select to authenticated
  using (app_private.can_read_placement(member_id, group_id, unit_id));
create policy scoped_departments on public.departments for select to authenticated
  using (app_private.can_see_department(id));
create policy scoped_department_memberships on public.department_memberships
  for select to authenticated
  using (
    member_id = (select app_private.current_member_id())
    or (select app_private.has_org_member_authority())
    or exists (
      select 1 from app_private.role_assignments r
      where r.member_id = (select app_private.current_member_id())
        and r.ended_at is null and r.role_key = 'department_manager'
        and r.department_id = department_memberships.department_id
    )
  );

-- A command is writable only by a currently authorized group/unit/global leader.
create policy scoped_member_name_command on public.member_name_changes
  for insert to authenticated
  with check (
    actor_auth_user_id = (select auth.uid())
    and app_private.can_manage_member(member_id)
  );

create function app_private.apply_member_name_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  old_name text;
  actor_id uuid;
begin
  actor_id := app_private.current_member_id();
  if actor_id is null or new.actor_auth_user_id is distinct from auth.uid() then
    raise exception 'Account is not authorized' using errcode = '42501';
  end if;

  -- Serializes with future transfer/suspension transactions on the same member.
  select m.display_name into old_name
  from public.members m where m.id = new.member_id for update;
  if not found or not app_private.can_manage_member(new.member_id) then
    raise exception 'Member is outside authorized scope' using errcode = '42501';
  end if;

  if old_name is distinct from btrim(new.new_display_name) then
    update public.members set display_name = btrim(new.new_display_name), updated_at = now()
    where id = new.member_id;
    insert into app_private.audit_events (
      actor_member_id, actor_auth_user_id, operation, target_member_id, reason,
      before_state, after_state
    ) values (
      actor_id, auth.uid(), 'member.display_name.changed', new.member_id, new.reason,
      jsonb_build_object('display_name', old_name),
      jsonb_build_object('display_name', btrim(new.new_display_name))
    );
  end if;
  return new;
end
$$;
create trigger apply_member_name_change
  after insert on public.member_name_changes
  for each row execute function app_private.apply_member_name_change();

-- Explicit grants are required for Supabase's 2026 Data API default.
grant select (id, display_name) on public.members to authenticated;
grant select on public.age_categories, public.church_groups, public.church_units,
  public.member_placements, public.departments, public.department_memberships
  to authenticated;
grant insert (member_id, new_display_name, reason)
  on public.member_name_changes to authenticated;
grant execute on function public.my_membership_id() to authenticated;

-- No default function EXECUTE for anonymous callers.
revoke execute on function public.my_membership_id() from public, anon;
revoke execute on function app_private.current_member_id() from public, anon;
revoke execute on function app_private.actor_group_id() from public, anon;
revoke execute on function app_private.actor_age_category_id() from public, anon;
revoke execute on function app_private.has_org_member_authority() from public, anon;
revoke execute on function app_private.can_manage_member(uuid) from public, anon;
revoke execute on function app_private.can_see_member_name(uuid) from public, anon;
revoke execute on function app_private.can_read_placement(uuid, uuid, uuid) from public, anon;
revoke execute on function app_private.can_see_department(uuid) from public, anon;
revoke execute on function app_private.apply_member_name_change() from public, anon;
grant execute on function app_private.current_member_id(),
  app_private.actor_group_id(), app_private.actor_age_category_id(),
  app_private.has_org_member_authority(), app_private.can_manage_member(uuid),
  app_private.can_see_member_name(uuid),
  app_private.can_read_placement(uuid, uuid, uuid),
  app_private.can_see_department(uuid) to authenticated;

-- Important: No member INSERT, direct UPDATE, DELETE, self-assignment,
-- account-link mutation, or role assignment is granted to authenticated.
-- Those future workflows must use audited reviewed transactions.