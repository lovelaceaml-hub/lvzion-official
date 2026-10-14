-- CONTACTS R1: UNAPPLIED, DENY-ALL SCHEMA REVIEW. NOT A RELEASE MIGRATION.
-- Apply only inside a disposable local test database after the member foundation.
-- No hosted write, policy activation, application registration, data import, or real user grant.
-- A reviewed migration must be generated with the Supabase CLI after permission approval.
begin;
create schema contacts_private;
revoke all on schema contacts_private from public,anon,authenticated,service_role;
alter default privileges in schema contacts_private revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema contacts_private revoke execute on functions from public,anon,authenticated,service_role;
create table contacts_private.release_gate (
 singleton boolean primary key default true check(singleton),
 state text not null default 'draft' check(state='draft'),
 decision_revision text not null default 'R1-unapproved'
);
insert into contacts_private.release_gate default values;
create table contacts_private.capabilities (
 id uuid primary key default gen_random_uuid(),member_id uuid not null references public.members on delete restrict,
 placement_id uuid not null references public.member_placements on delete restrict,
 capability text not null check(capability in ('create','aggregate_oversight','handoff_steward')),
 group_id uuid not null references public.church_groups on delete restrict,
 starts_at timestamptz not null default now(), ends_at timestamptz,
 approved_by uuid not null references public.members on delete restrict,
 check(ends_at is null or ends_at>=starts_at)
);
create unique index contacts_one_capability on contacts_private.capabilities(member_id,capability,group_id) where ends_at is null;
create table contacts_private.records (
 id uuid primary key default gen_random_uuid(),
 owner_member_id uuid not null references public.members on delete restrict,
 owner_placement_id uuid not null references public.member_placements on delete restrict,
 origin_group_id uuid not null references public.church_groups on delete restrict,
 lifecycle text not null default 'new' check(lifecycle in ('new','active','paused','closed')),
 preferred_method text not null default 'unknown' check(preferred_method in ('unknown','text','phone','email')),
 do_not_contact boolean not null default false, dnc_recorded_at timestamptz,
 archived_at timestamptz, version bigint not null default 1 check(version>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((do_not_contact and dnc_recorded_at is not null and lifecycle='closed') or (not do_not_contact and dnc_recorded_at is null)),
 check(archived_at is null or lifecycle='closed')
);
create index contacts_owner on contacts_private.records(owner_member_id,id);
create table contacts_private.identities (
 contact_id uuid primary key references contacts_private.records on delete restrict,
 display_name text not null check(length(btrim(display_name)) between 1 and 120)
);
create table contacts_private.methods (
 id uuid primary key default gen_random_uuid(),contact_id uuid not null references contacts_private.records on delete restrict,
 kind text not null check(kind in ('phone','email')), value text not null check(length(btrim(value)) between 3 and 254),
 confirmed_at timestamptz,
 -- Deliberately NOT unique across contacts: a household can share a method.
 unique(contact_id,kind,value)
);
create table contacts_private.shares (
 id uuid primary key default gen_random_uuid(),contact_id uuid not null references contacts_private.records on delete restrict,
 member_id uuid not null references public.members on delete restrict,
 placement_id uuid not null references public.member_placements on delete restrict,
 read_methods boolean not null default false,
 granted_by uuid not null references public.members on delete restrict,
 starts_at timestamptz not null default now(),revoked_at timestamptz,
 check(revoked_at is null or revoked_at>=starts_at)
);
create unique index contacts_one_live_share on contacts_private.shares(contact_id,member_id) where revoked_at is null;
create index contacts_share_recipient on contacts_private.shares(member_id,contact_id) where revoked_at is null;
create table contacts_private.interactions (
 id uuid primary key default gen_random_uuid(),contact_id uuid not null references contacts_private.records on delete restrict,
 author_member_id uuid not null references public.members on delete restrict,
 occurred_at timestamptz not null,recorded_at timestamptz not null default now(),
 body text not null check(length(btrim(body)) between 1 and 500),
 visibility text not null default 'author' check(visibility in ('author','collaborators')),
 supersedes_id uuid,unique(id,contact_id),
 foreign key(supersedes_id,contact_id) references contacts_private.interactions(id,contact_id) on delete restrict
);
create index contacts_interaction_history on contacts_private.interactions(contact_id,occurred_at,id);
create table contacts_private.follow_ups (
 id uuid primary key default gen_random_uuid(),contact_id uuid not null references contacts_private.records on delete restrict,
 assigned_member_id uuid not null references public.members on delete restrict,
 due_at timestamptz not null, action text not null check(length(btrim(action)) between 1 and 160),
 state text not null default 'scheduled' check(state in ('scheduled','completed','cancelled')),
 completed_at timestamptz, completed_by uuid references public.members on delete restrict,
 cancel_reason text check(cancel_reason in ('sharing_revoked','handoff_review','do_not_contact','paused','closed','archived')),
 check((state='completed' and completed_at is not null and completed_by is not null and cancel_reason is null)
 or (state='scheduled' and completed_at is null and completed_by is null and cancel_reason is null)
 or (state='cancelled' and completed_at is null and completed_by is null and cancel_reason is not null))
);
create unique index contacts_one_next_action on contacts_private.follow_ups(contact_id) where state='scheduled';
create index contacts_personal_due on contacts_private.follow_ups(assigned_member_id,due_at) where state='scheduled';
create table contacts_private.ownership_events (
 id uuid primary key default gen_random_uuid(),contact_id uuid not null references contacts_private.records on delete restrict,
 previous_member_id uuid references public.members on delete restrict,
 next_member_id uuid not null references public.members on delete restrict,
 actor_member_id uuid not null references public.members on delete restrict,
 occurred_at timestamptz not null default now(),reason_code text not null check(reason_code in ('created','voluntary_handoff','inactivity_review','placement_review')),
 check(previous_member_id is null or previous_member_id<>next_member_id)
);
create table contacts_private.duplicate_reviews (
 id uuid primary key default gen_random_uuid(),first_contact_id uuid not null references contacts_private.records on delete restrict,
 second_contact_id uuid not null references contacts_private.records on delete restrict,
 reviewer_member_id uuid not null references public.members on delete restrict,
 outcome text not null check(outcome in ('keep_separate','needs_authorized_review')),
 reviewed_at timestamptz not null default now(),check(first_contact_id<second_contact_id)
);
create table contacts_private.audit_events (
 id bigint generated always as identity primary key,request_id uuid not null,
 actor_member_id uuid not null references public.members on delete restrict,
 contact_id uuid not null references contacts_private.records on delete restrict,
 action text not null check(action in ('create','share','revoke','interact','schedule','complete','reassign','status','dnc','archive','duplicate-distinct')),
 before_version bigint not null,after_version bigint not null,occurred_at timestamptz not null default clock_timestamp(),
 check(after_version=before_version+1), unique(actor_member_id,request_id)
 -- Audit intentionally contains no names, communication values, note bodies or generic JSON payload.
);
create table contacts_private.command_receipts (
 actor_member_id uuid not null references public.members on delete restrict,request_id uuid not null,
 payload_digest text not null check(payload_digest ~ '^[a-f0-9]{64}$'),contact_id uuid not null references contacts_private.records on delete restrict,
 resulting_version bigint not null check(resulting_version>0),created_at timestamptz not null default now(),primary key(actor_member_id,request_id)
);
-- Defensive structural checks, not operational authorization. No public callable functions.
create function contacts_private.validate_owner() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.member_placements p where p.id=new.owner_placement_id and p.member_id=new.owner_member_id and p.group_id=new.origin_group_id) then
  raise exception using errcode='23514',message='Invalid responsibility placement';
 end if;
 return new;
end $$;
create trigger contacts_owner_placement before insert or update of owner_member_id,owner_placement_id,origin_group_id on contacts_private.records for each row execute function contacts_private.validate_owner();
create function contacts_private.immutable_history() returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception using errcode='42501',message='History is append-only';end $$;
create trigger contacts_audit_immutable before update or delete on contacts_private.audit_events for each row execute function contacts_private.immutable_history();
create trigger contacts_owner_history_immutable before update or delete on contacts_private.ownership_events for each row execute function contacts_private.immutable_history();
create trigger contacts_interaction_history_immutable before update or delete on contacts_private.interactions for each row execute function contacts_private.immutable_history();
-- No permissive policies. FORCE RLS is a defense for future non-BYPASSRLS execution roles.
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='contacts_private' loop
  execute format('alter table contacts_private.%I enable row level security',t.tablename);
  execute format('alter table contacts_private.%I force row level security',t.tablename);
  execute format('revoke all on contacts_private.%I from public,anon,authenticated,service_role',t.tablename);
  execute format('create policy deny_unapproved on contacts_private.%I as restrictive for all using(false) with check(false)',t.tablename);
 end loop;
end $$;
revoke all on all sequences in schema contacts_private from public,anon,authenticated,service_role;
revoke execute on all functions in schema contacts_private from public,anon,authenticated,service_role;
commit;
