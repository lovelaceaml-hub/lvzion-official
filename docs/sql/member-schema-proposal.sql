-- LV Zion Official: MEMBER SCHEMA PROPOSAL v0.1
-- REVIEW-ONLY DOCUMENT. DO NOT RUN AGAINST PRODUCTION OR DEPLOY AUTOMATICALLY.
-- No SQL has been applied to Supabase by writing this file.
-- This DDL has NO RLS policies: even if applied, app access is deny-by-default.
-- Real schema release requires migration review, auth/RLS policies and denial tests.
-- PostgreSQL 17 / Supabase project otecqlkqirncotytbfns.

begin;

create table public.age_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (length(trim(code)) > 0 and length(trim(label)) > 0)
);

create table public.church_groups (
  id uuid primary key default gen_random_uuid(),
  age_category_id uuid not null references public.age_categories(id) on delete restrict,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(age_category_id, code),
  check (length(trim(code)) > 0 and length(trim(name)) > 0)
);

create table public.church_units (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.church_groups(id) on delete restrict,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(group_id, code),
  check (length(trim(code)) > 0 and length(trim(name)) > 0)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(trim(display_name)) > 0),
  status text not null default 'intake'
    check (status in ('intake', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_private_contacts (
  member_id uuid primary key references public.members(id) on delete restrict,
  email text,
  phone_e164 text,
  contact_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.member_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete restrict,
  member_id uuid not null unique references public.members(id) on delete restrict,
  username text not null unique,
  account_status text not null default 'active'
    check (account_status in ('active','suspended')),
  created_at timestamptz not null default now(),
  check (username = lower(username) and length(trim(username)) >= 3)
);

create table public.member_placements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  unit_id uuid not null references public.church_units(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  recorded_by_member_id uuid references public.members(id) on delete restrict,
  note text,
  check (ended_at is null or ended_at > started_at)
);
-- At most one current unit per person; derive group and age category via parent FKs.
create unique index member_one_open_placement
  on public.member_placements(member_id) where ended_at is null;
create index member_placement_unit_open
  on public.member_placements(unit_id) where ended_at is null;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.department_memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  department_id uuid not null references public.departments(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  assigned_by_member_id uuid references public.members(id) on delete restrict,
  check (ended_at is null or ended_at > started_at)
);
create unique index department_one_open_association
  on public.department_memberships(member_id, department_id)
  where ended_at is null;

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  role_code text not null check(role_code in
    ('unit_leader', 'group_leader', 'pastoral_staff',
     'department_manager', 'app_admin')),
  unit_id uuid references public.church_units(id) on delete restrict,
  group_id uuid references public.church_groups(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  granted_by_member_id uuid references public.members(id) on delete restrict,
  check (ended_at is null or ended_at > started_at),
  check (
    (role_code = 'unit_leader' and unit_id is not null and group_id is null and department_id is null)
    or (role_code = 'group_leader' and group_id is not null and unit_id is null and department_id is null)
    or (role_code = 'department_manager' and department_id is not null and unit_id is null and group_id is null)
    or (role_code in ('pastoral_staff','app_admin') and
        unit_id is null and group_id is null and department_id is null)
  )
);
-- PostgreSQL 17: null scopes compare as equal for the uniqueness test.
create unique index roles_unique_open_scope
  on public.role_assignments(member_id, role_code, unit_id, group_id, department_id)
  nulls not distinct where ended_at is null;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  invited_by_member_id uuid references public.members(id) on delete restrict,
  delivery_channel text not null check (delivery_channel in ('email','sms','staff')),
  delivery_address text,
  state text not null default 'pending'
    check (state in ('pending','sent','accepted','expired','revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
-- No plaintext invitation or recovery token columns. Auth provider owns those tokens.

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  requested_name text not null,
  requested_contact text,
  claimed_member_id uuid references public.members(id) on delete restrict,
  state text not null default 'pending'
    check (state in ('pending','approved','rejected','withdrawn')),
  reviewed_by_member_id uuid references public.members(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.transfer_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  from_unit_id uuid not null references public.church_units(id) on delete restrict,
  to_unit_id uuid not null references public.church_units(id) on delete restrict,
  requested_by_member_id uuid references public.members(id) on delete restrict,
  accepted_by_member_id uuid references public.members(id) on delete restrict,
  override_by_member_id uuid references public.members(id) on delete restrict,
  state text not null default 'pending'
    check (state in ('pending','accepted','completed','rejected','cancelled')),
  rationale text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (from_unit_id <> to_unit_id)
);
create index transfer_member_state on public.transfer_requests(member_id, state);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_member_id uuid references public.members(id) on delete restrict,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  rationale text,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_by_actor_and_time
  on public.audit_events(actor_member_id, created_at desc);

-- All exposed application tables must have RLS. This does not grant any access.
alter table public.age_categories enable row level security;
alter table public.church_groups enable row level security;
alter table public.church_units enable row level security;
alter table public.members enable row level security;
alter table public.member_private_contacts enable row level security;
alter table public.member_accounts enable row level security;
alter table public.member_placements enable row level security;
alter table public.departments enable row level security;
alter table public.department_memberships enable row level security;
alter table public.role_assignments enable row level security;
alter table public.invitations enable row level security;
alter table public.access_requests enable row level security;
alter table public.transfer_requests enable row level security;
alter table public.audit_events enable row level security;

commit;

-- REMAINING WORK BEFORE USE: RLS policies, safe read interfaces,
-- trusted transfer/role/invitation operations, username rate limits,
-- suspension checks, audit append-only protections, realistic denial tests,
-- stage-only seed data, and reviewed database migration history.
