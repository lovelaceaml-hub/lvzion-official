# Worship Duty production integration

Target: https://lvz.app/modules/worship-duty, within the existing official member application. Schedules start empty and come only from records configured in this app.

## Release status

Built and verified locally on October 24, 2026 (draft PR #48). Hosted Worship migrations and the production flag remain unapplied. The approval list is in [README.md](README.md#ready-for-release-what-anthony-must-approve). Do not describe this as a completed launch until production route, owner session and database access are checked.

## Acceptance and sequence

1. Reconcile the Worship branch (PR #48, which contains PR #25) with current main and the hosted migration ledger.
2. Finish owner-only service, personnel, qualification, availability, permission and song setup.
3. Persist reviewed monthly assignment batches with department scope, conflicts, stale protection and history.
4. Verify real Auth/PostgREST/PostgreSQL sessions, concurrent edits, phone layouts, signup and Study Rooms.
5. Apply only the five pending Worship migrations, register explicit owner access, enable the production flag and deliberately deploy the integrated source.
6. Read back hosted state and the actual domain, preserve rollback, update guides and push the final evidence.

## Implemented behavior

The existing authenticated My Duties, Presider and Manage remain the foundation. Setup requires the verified bootstrap owner plus explicit service-editor and module-manager grants. Technical status alone does not authorize setup or scheduling. Active placed members receive approved department participation, module access, individual qualifications and independent scheduling/song grants. The owner remains Unassigned without a fabricated placement or serving qualification.

Services begin as drafts. Editing and publication use exact service versions. Cancellation retains services, assignments, requests and audit history. Publication creates personal My Week activities; rescheduling updates activities and reopens the exact song plan for review. Availability changes share the member's optimistic version and never remove duties.

Monthly list/calendar planning stages at most 40 cells for explicit batch review. The database authorizes every cell before changing records, validates the final assignment combination and rolls the whole transaction back on a conflict. Legal swaps clear only changed cells before applying final candidates. Song details that have been used cannot be rewritten; archiving preserves the catalog entry and plans.

The interface uses the shared app frame and the Theme Atlas "Midnight Sapphire" style from the shared module style registry. No new design provider, member database or login is introduced. Las Vegas times are independent of the device timezone; skipped/repeated daylight-saving inputs are rejected.

## Verification commands

Use Node 24. Standard build: `npm run build`. Activation-disabled browser regressions on a separate loopback server: `LVZ_BROWSER_TEST_PORT=3100 LVZ_MEMBER_SYSTEM_ENABLED=false npm run test:browser`.

Native tests require new `/tmp/lvz-worship-integration` and free loopback ports. Never reuse an existing active stack or run the fixtures against a hosted backend.

```sh
LVZ_SIGNUP_INTEGRATION=true LVZ_WORSHIP_INTEGRATION=true node tests/integration/start-worship-stack.mjs
LVZ_WORSHIP_INTEGRATION=true node scripts/test-worship-integration.mjs
LVZ_WORSHIP_INTEGRATION=true node scripts/test-worship-browser.mjs
node tests/integration/stop-worship-stack.mjs
```

The stack serves the existing `.next` build, so compile first with `npx next build` (not `npm run build`, which also runs the checks). On macOS, set `LC_ALL=en_US.UTF-8` or PostgreSQL refuses to start. Optional: `LVZ_CHROMIUM_PATH` points the browser script at an already installed Chromium, and `LVZ_WORSHIP_SCREENSHOT_DIR` saves phone and desktop screenshots. The integration and browser scripts change fixture records, so start a fresh stack (new directory) for every full run.

The local harness creates the verified fictional owner through real Auth and enrollment before installing ordinary fixture administrators. Its mail sink accepts only example.invalid. Ephemeral credentials, session tokens, outbox and database files stay outside Git. Test-only migrations are not a hosted deployment.

## Verification observed so far

October 24, 2026, second pass after merging main through `8606dad` (Next 16.4.3, shared style registry), focused checks only:

- `npm run build` (typecheck + Next build): passed, no security advisory.
- Node tests: 76 of 76 (the eight files below plus `appearance`).
- Native stack: 9 of 9 integration checks and 47 of 47 browser checks, now including the registry style (`data-lvz-module="worship-duty"`, Sapphire ground, title) and Dark mode (device dark, `data-lvz-scheme="dark"`, same palette, duty card visible).

First pass (main through `9cf2531`):

October 24, 2026, on the merged branch (main through `9cf2531`), focused checks only; no full suite was run:

- `npm run typecheck`: passed. `npx next build`: compiled. The build printed a Next.js security advisory recommending an upgrade; recorded here, not acted on.
- Node tests: 69 of 69 (`worship-duty`, `worship-duty-setup`, `worship-duty-r2`, `worship-duty-database`, `worship-duty-setup-database`, `fresh-start`, `study-group-access-database`, `study-owner-service-times-database`). The setup database suite now applies every current migration first.
- Native stack (real local Auth, PostgREST, PostgreSQL 16): 9 of 9 integration checks and 44 of 44 browser checks, including the shared frame, Sapphire tokens, setup tabs at five widths, the month calendar planner, batch review and save, song order, confirm, persistence after reload, copy preview, and denials.

Earlier results (October 14, before the redesign and current main):

- Production build: passed; 386 Node tests and 198 foundation PostgreSQL assertions, plus dedicated Worship SQL tests.
- Existing phone Chromium regressions: 77 passed with activation disabled.
- Existing real local signup/Auth/PostgREST/SMTP regressions: 47 passed.
- Native Worship: nine passed, including a legal swap, full rollback, actual separate-session race with exactly one accepted writer, historical-song protection and service rescheduling.
- Authenticated browser: owner Apps navigation, setup at 320/390/430/768/1280 pixels and catalog save/reload passed.
- External Claude review was rejected before execution by automatic approval review because sending private source was not separately authorized. No source was sent. The existing release documentation waives external security review; local controller review and verification remain required.

## Scope limits

No records are imported. No invitations, outside messages, notifications or purchases are sent; "Copy song plan" only fills a local preview and the clipboard. Suggestions are explicitly reviewed eligible-member proposals, not an automatic fill feature. Workspace limits are visible (80 services over 90 days, 120 setup services over a year, 200 active personnel and 500 songs). Physical-device and real multi-member operating acceptance remain separate from emulated browser checks.

## Rollback

Retain the previous READY Vercel production deployment. Disable `LVZ_WORSHIP_DUTY_ENABLED` and restore that deployment if needed. Keep the additive private schema and history; do not drop records. Revoke module participation only through reviewed commands. Do not change other module flags or replay existing hosted migrations.

## Build log

- Reconciled initial Worship head c14ea76 with production main f4a888b in isolated branch feature/worship-duty-live, leaving the other checkout untouched.
- Fixed unsupported UUID aggregation, required service input checks and manager access revocation before hosted application.
- Added owner setup UI/API, independently scoped personnel grants, manual-only preferences, versioned service availability and song management.
- Added atomic persisted batch scheduling and draft-publication activity projection with qualification/availability revalidation.
- Added a native real-session test stack, concurrency checks and authentic browser checks. A local bootstrap-order error was corrected without bypassing the first-owner guard. Direct PostgREST stale error code 40001 is checked; the app maps it to HTTP 409.
- Concurrent main advanced again during verification. A final reconciliation and rerun are required before release.
- Phase 1 cleanup (branch claude/refactor-worship-duty-3b2f97, no behavior change): removed the unreachable fictional rehearsal transport, its fixtures and the in-memory scheduling simulation that only its own tests used; the catalog, pairing and applicability rules and their tests remain. Shared field validators, Las Vegas date helpers, duty labels, periods, suggestions and the private JSON reply are now defined once. Unused style rules were removed. SQL, grants and API contracts are unchanged. Verified with npm run build (438 Node tests, 198 PostgreSQL assertions, Worship PGlite suites) and 87 phone browser regressions. The native Worship stack was not rerun because another agent's stack occupies its fixed directory and ports.
- Phase 2 redesign (same branch): the module screens now follow the locked Day Sheet contract with shared tokens, header, underlined swipe tabs, time-first hairline lists and a desktop side column. Accessible names used by the native browser script are unchanged; permissions, SQL and API contracts are untouched. Evidence and gaps: docs/design/worship-duty/UI-QUALITY-REPORT.md.
- Fresh-start docs alignment (same branch, docs only): the Worship docs now follow the October 16 boundary in AGENTS.md. References to a separate duty application, its hosting and its spreadsheet, the migration framing and the handover gates that depended on another system were removed; schedules start empty from records configured in this app. Duty rules, permissions, migration status and verification history are unchanged. The fifth repository migration is now listed; the hosted ledger still has no Worship entries.
- Completion (October 24, PR #48): merged main through `9cf2531` without conflicts. Worship now registers its views with the shared app frame and uses route-scoped Midnight Sapphire tokens; My Duties gained summary tiles and duty cards, the planner a Sunday-first month grid, and owner setup Services/People/Songs tabs. The five migrations were renumbered to `20261024160000` to `20261024160400` so they sort after the latest applied migration, and their comments no longer name another application. The setup database suite now runs on every current migration. The local seed loader swaps the fixture file's hosted-Auth guard (added October 16, which real local Auth trips) for a stricter disposable-cluster check. The browser script now covers the calendar planner and the song plan order, confirm and copy steps. Hosted read-only check not run: connector unauthorized.
- Registry adoption (October 24, PR #48): merged main through `8606dad`. The route-scoped token block and the Worship frame-chrome overrides were removed; Worship now wears Midnight Sapphire from `lib/module-styles.ts` and `styles/lvz-tokens.css`, and its stylesheet reads tokens only. The browser script checks the registry style and Dark mode.
