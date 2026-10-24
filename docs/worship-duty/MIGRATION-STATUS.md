# Worship Duty: migration and production flag status

**Audited October 24, 2026 on draft [PR #48](https://github.com/lovelaceaml-hub/lvzion-official/pull/48). None of the five Worship migrations is applied to project `otecqlkqirncotytbfns` according to the repository ledger.** This file records pending work, not authorization to execute SQL.

## Repository migrations, in the order they must be applied

On October 24 the five files were renamed so they sort after main's latest applied migration, `20261016200000_study_rooms_leader_access`. The SQL bodies are unchanged except header comments and the module tile accent (`#3184ff`, Midnight Sapphire).

| Order | Repository SQL (current name) | Former name | Supplies |
| --- | --- | --- | --- |
| 1 | `20261024160000_worship_duty_review.sql` | `20261014103007_…` | Private department, duty, service, qualification, availability, assignment, request, program and audit tables; `worship_workspace`, `worship_command` |
| 2 | `20261024160100_worship_duty_authenticated_queries.sql` | `20261014112521_…` | `worship_workspace_v2`, `worship_lookup` |
| 3 | `20261024160200_worship_duty_live_activation.sql` | `20261014224325_…` | Registers the `worship-duty` module and grants manager + song-editor access to the single verified owner only. Adds any of the eight Worship departments that do not already exist to `public.departments` and maps them |
| 4 | `20261024160300_worship_duty_live_setup.sql` | `20261014224327_…` | Owner service-editor grant, `worship_setup_workspace`, `worship_setup_command` |
| 5 | `20261024160400_worship_duty_operations.sql` | `20261014230756_…` | Setup versions, personnel, service availability, `worship_batch` and song operations. No records imported |

Migration 3 stops with an error if there is not exactly one verified owner, if a `worship-duty` module already exists, or if a department name is duplicated. It never creates people, services or assignments.

## Audit against current main (October 24, 2026)

- **Foundation compatibility:** the owner setup database test now applies every current migration in sorted (hosted) order, through `20261016200000`, then enrolls a fictional owner and applies migrations 3 to 5. All 13 cases pass, and the 22 cases of the R1/R2 database suite pass.
- **No overwrite of shared objects:** the five files create or replace only `worship_*` objects. They read foundation helpers (`current_member_id`, `module_allowed`, `manages_department`, `own_group_id`, `actor_has`) and write only through generic module tables (`module_activities`, `module_notices`, `module_access_grants`, `app_modules`), department memberships and department-manager role rows. None of those helpers changed signature in later main migrations. `module_allowed` was redefined by `20261016200000_study_rooms_leader_access`; the only addition is a group-leader path for the Study Rooms module ID, so Worship access still requires an explicit, active grant.
- **Real local stack:** the native harness (real local Auth, PostgREST and PostgreSQL 16) applies all current migrations, then the Worship ones. 9 integration checks and 44 browser checks pass. See [LAUNCH.md](LAUNCH.md).
- **Fresh-start boundary:** comments that named another application were removed. No migration references an outside system, imports records or seeds a schedule.

## Hosted read-only check: not performed on October 24

The `supabase-lvz` connector in this session needs authorization and was unavailable, so no hosted query ran. The last hosted evidence is the October 14 read-only check (zero Worship modules, tables, RPCs and grants) and the repository ledger, which lists no Worship entries. A Codex session on October 14 ended while applying the first Worship migration with an expired-request error; whether anything reached the hosted database is **unverified**.

Before applying anything, run these read-only queries on `otecqlkqirncotytbfns` and expect all zeros:

```sql
select count(*) from supabase_migrations.schema_migrations where name like '%worship%';
select count(*) from information_schema.tables where table_schema in ('app_private','public') and table_name like 'worship%';
select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('app_private','public') and p.proname like 'worship%';
select count(*) from app_private.app_modules where module_key='worship-duty';
```

If any count is not zero, stop: a partial application needs its own review before migration 1 is retried.

## Applying (only after Anthony approves)

1. Rerun the read-only queries above and re-read hosted migration metadata, including any work merged after October 24.
2. Apply the five files one at a time in the order above with the supported migration tool, never `supabase db push` across the mismatched historical ledger.
3. After each one, read back the hosted version, then check table RLS, `EXECUTE` grants on the `worship_*` public functions, the module row and the owner grants.
4. Record each hosted version in `docs/HOSTED-MIGRATION-LEDGER.json` and in this file.

## Required flag

The page and API also require the existing production settings (`VERCEL=1`, `VERCEL_ENV=production`, `LVZ_PRODUCTION_ACTIVATED=true`, `LVZ_DATABASE_ENV=production`, `LVZ_APP_ORIGIN=https://lvz.app`, `LVZ_SUPABASE_EXPECTED_REF=otecqlkqirncotytbfns`) plus **`LVZ_WORSHIP_DUTY_ENABLED=true`**, which is off today. It is a Worship-only switch and does not change other modules.

## Rollback

The Worship schema is additive. If a release goes wrong, turn `LVZ_WORSHIP_DUTY_ENABLED` off and restore the previous production deployment. Keep the Worship tables and audit history; never drop member tables or roll back another module's migration.
