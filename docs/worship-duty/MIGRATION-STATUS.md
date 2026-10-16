# Worship Duty: migration and production flag status

**Inspected on October 14, 2026, and rechecked against the repository ledger on October 16, 2026. None of the five Worship migrations are applied to project `otecqlkqirncotytbfns` at this snapshot.** This file records *pending work*, not authorization to execute SQL.

## Repository migrations in intended dependency order

| Repository SQL | Current state | Requires / supplies |
| --- | --- | --- |
| `20261014103007_worship_duty_review.sql` | **Unapplied**; R1 development schema | Live member foundation + generic module-runtime tables; defines private department/duty/service/qualification/availability/assignment/request/program/audit tables and R1 RPC |
| `20261014112521_worship_duty_authenticated_queries.sql` | **Unapplied**; R2 development query layer | Previous migration; `worship_workspace_v2` and `worship_lookup` |
| `20261014224325_worship_duty_live_activation.sql` | **Unapplied**; pending integration review | Previous migrations, existing singular verified bootstrap owner, public department mapping; registers approved module + owner manager/song-editor grant |
| `20261014224327_worship_duty_live_setup.sql` | **Unapplied**; owner setup backend | Previous three; independent owner service editor and setup projection/commands |
| `20261014230756_worship_duty_operations.sql` | **Unapplied**; additive operations | Previous four; setup versions, personnel, availability, batch scheduling and song operations; no records imported |

Do **not** apply just to make the module appear in My Week. Those backend operations must first pass the current production-branch tests. Explicit production module activation is a subsequent action.

## Hosted ledger and reconciliation

`docs/HOSTED-MIGRATION-LEDGER.json` has no Worship entries as of October 16, 2026. The project has historical migration IDs that do **not** match repository filenames for the foundation and several other modules. Follow the current root [HOSTED-MIGRATION-LEDGER.json](../HOSTED-MIGRATION-LEDGER.json); never run `supabase db push` or replay existing `CREATE` statements from the filesystem.

On the point-in-time read-only check, hosted `list_migrations` returned **16 migration entries across existing workstreams** and **no Worship entries**. Concurrent developments can add more; re-query before any DDL. Other modules must remain untouched.

Procedure for a future verified release:
1. Fetch the latest `main` + PR #25 migrations. Compare hosted migration names, statement lineage and source identifiers, not just file timestamp.
2. Review the SQL against **current** foundation definitions, constraints, owner-intake behavior, service lifecycle, program history, RLS and function `EXECUTE` grants.
3. Run and verify in a disposable isolated database using **the full actual current main migration order**. Test negative authorization, SQL trigger invariants, atomic rollback, service changes, and a two-session stale write. A historical PGlite success is insufficient.
4. Run Supabase security advisors. Private `SECURITY DEFINER` functions require explicit actor checks and empty `search_path`; public wrappers should be `SECURITY INVOKER`, with revoked anonymous/default access.
5. Only after code review and a tested setup UI/API, apply the five reviewed additive migrations to the specific hosted project, **one at a time**, using supported migration handling. Capture returned hosted versions, verify table RLS, RPC grants, registry status and owner-only access. Update both the central ledger and this document with **actual** resulting versions.
6. Keep the production environment's `LVZ_WORSHIP_DUTY_ENABLED` disabled until real owner login, scoped RPC denials and approved minimal workflow pass.

## Required flag

The integration code checks all of these for the real hosted path:

`VERCEL=1`, `VERCEL_ENV=production`, `LVZ_PRODUCTION_ACTIVATED=true`, `LVZ_DATABASE_ENV=production`, `LVZ_APP_ORIGIN=https://lvz.app`, `LVZ_SUPABASE_EXPECTED_REF=otecqlkqirncotytbfns`, **`LVZ_WORSHIP_DUTY_ENABLED=true`**.

The last flag is a **separate module-specific release switch**, not an invitation to broaden existing member privileges. Do not store credentials or test identity tokens in Git. Keep the existing signup, Study Rooms, Contacts, Continuous Display and Morning Prayer flags unchanged.

## Safe abort/rollback

Before applying any DDL, check live backup/restore capability and current migration baseline. Once applied, additive Worship schema should remain for history; disable only the Worship runtime switch/module access if a rollback is needed, then revert/promote only a previously known-good **production** deployment. Never drop member tables, erase audit logs or roll back another module's migration.
