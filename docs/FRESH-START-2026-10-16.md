# Fresh-start correction — October 16, 2026

## Result

LV Zion Official now operates with a self-contained Study Room calendar. The deployed interface and booking functions no longer refer to or depend on a separate scheduler. Production weekly restrictions and special dates are empty, and booking is enabled for the existing authorized audience.

The owner explicitly required a fresh start. The correction removes unapproved schedule defaults and operational assumptions, not the accounts, grants, inventory, organization or intentionally entered data in this application.

## Verified production release

- Runtime source: `dfad3817911f2ba195a21762986f54cceed46d78`.
- Vercel deployment: `dpl_HxTFTX6mRCn4JAUH3Mv4mSsuj7ZC`.
- State: READY; aliases `lvz.app` and `www.lvz.app` verified.
- Repository correction: `supabase/migrations/20261016180000_study_rooms_fresh_calendar.sql`.
- Applied hosted migration: `20261016173939_study_rooms_fresh_calendar`.

Documentation commits following the runtime source do not change the deployed executable. The exact source above passed the complete production build.

## Implementation

Removed the scheduler-authority and transition messages from the reservation and manager screens. A maintenance pause now has neutral application-local wording. Removed implicit weekday restrictions from the shared domain helper. The weekly editor and request parser accept an explicitly empty list and permit removing the last restriction.

The database correction preserves existing function permissions, manager checks, request receipts, optimistic versions, locking and overlap rollback. Missing/malformed arrays are still rejected. No module grants were added or widened.

The cleanup is guarded: it removes only the exact four installation restrictions when the calendar has never been edited and there are no special dates, reservations or occupied slots. A customized calendar is preserved. The previous state and resulting empty calendar are retained in one system audit event. Booking is opened only for the untouched initial activation state and existing authorized audience.

Development instructions, product decisions, the current handoff, release controls, member instructions and Study Room operations were updated. Superseded Study Room milestone/runbook pages now point to current guidance instead of repeating contradictory prerequisites. Existing schema migration files remain immutable; the correction is incremental. Production defaults cannot be supplied from fictional test fixtures.

## Read-only hosted verification

The following counts and state were read after the migration:

| Check | Result |
|---|---|
| Weekly restrictions | 0 |
| Special-date overrides | 0 |
| Calendar version | 2 |
| Booking enabled | true |
| Reservations | 0 |
| Study Room active grants | 1, existing manager audience |
| Correction audit events | 1 |
| Anonymous command/operations function execution | denied |
| Work Mission occurrences and materials | 0 and 0 |
| Worship services and assignments | 0 and 0 |

No real booking, invitation, member, email, material or host record was created for testing. Account/grant/organization data was not deleted or reset.

## Tests executed

The production `npm run build` passed TypeScript, all **382 application/database tests**, **198 additional PostgreSQL permission assertions**, and Next.js compilation. There were zero failed or skipped Node tests.

Fresh-start regression tests cover runtime-reference scanning, explicitly empty weekly arrays, rejection of malformed arrays, empty migrated calendars, continued anonymous denials and preservation of a deliberately customized calendar/pause. Existing permission/conflict tests use explicit fictional calendar scenarios in their disposable seed, not production defaults; the seed refuses hosted Auth schemas.

A separate deployed Chromium check against `lvz.app` passed nine checks: reservation availability with an empty schedule; neutral page text; empty-array save payload with version; removal of the final interval; no document overflow at 360/390/768/1024 pixels; opening the reservation dialog; local pause enforcement; manager controls hidden from a regular-member fixture; and real anonymous schedule/admin/history/operations requests returning 401 with no-store headers.

The interactive browser cases intercepted private API data and writes with synthetic fixtures. They verify the real deployed client, not a genuine authenticated hosted booking. The first anonymous schedule probe omitted its required date and returned 400; the corrected valid-date probe returned 401. The full separate local Playwright suite and physical Safari were not rerun. The temporary browser sandbox was stopped after verification.

## Security-advisor scope

Post-change Supabase inspection reported informational RLS-without-policy notices for private tables, warnings for authenticated SECURITY DEFINER RPC entry points, and disabled leaked-password protection. These are recorded findings, not a clean whole-system security attestation. This correction changed no Auth security setting and introduced no new public RPC.

References: [private-table policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [authenticated function warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Do not remove authorization checks or enable client table access merely to silence an advisor.

## Ongoing rule

Only explicitly approved requirements and deliberately created application records govern LV Zion Official. Keep empty calendars valid, preserve existing records and grants, and retain the compact module header and center Apps launcher. Historical installation evidence does not create current product requirements.
