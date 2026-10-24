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

## Hosted state: applied (verified October 24)

The October 24 read-only check found all five Worship migrations **already applied on October 15** by a Codex session, as hosted versions `20261015020427`, `20261015020453`, `20261015020458`, `20261015020506` and `20261015020511`. Their stored statements match the October 14 source (commit `e1d522e`) byte for byte. The renumbered repository files differ only in comments and, in the activation file, the Apps tile accent (`#3184ff` in the file, `#3d7464` live; cosmetic, left unchanged).

Live readback: the module is approved, the verified owner holds the only grant (manager) and the song-editor appointment, all 8 Worship departments are mapped, and there are no services yet. **Do not reapply these files.** The mapping is recorded in `docs/HOSTED-MIGRATION-LEDGER.json`.

## Applying

Nothing remains to apply. Any future Worship schema change needs a new migration that sorts after the latest hosted version, a read-only check first, and a ledger entry.

## Required flag

The page and API also require the existing production settings (`VERCEL=1`, `VERCEL_ENV=production`, `LVZ_PRODUCTION_ACTIVATED=true`, `LVZ_DATABASE_ENV=production`, `LVZ_APP_ORIGIN=https://lvz.app`, `LVZ_SUPABASE_EXPECTED_REF=otecqlkqirncotytbfns`) plus **`LVZ_WORSHIP_DUTY_ENABLED=true`**, turned on for Production on October 24, 2026. It is a Worship-only switch and does not change other modules.

## Rollback

The Worship schema is additive. If a release goes wrong, turn `LVZ_WORSHIP_DUTY_ENABLED` off and restore the previous production deployment. Keep the Worship tables and audit history; never drop member tables or roll back another module's migration.
