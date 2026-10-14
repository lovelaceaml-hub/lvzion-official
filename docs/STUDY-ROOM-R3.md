# Study Room Reservation — R3 reconciliation

> **Historical Study Room development evidence.** These earlier review/preview/activation assertions apply to the commits and test environments named below. The actual module is now integrated at `lvz.app/modules/study-rooms` with owner setup, but the **production booking gate remains closed** and the original Firebase scheduler remains authoritative. Read [STUDY-ROOM-R4-LIVE.md](STUDY-ROOM-R4-LIVE.md) and [CURRENT-STATUS.md](CURRENT-STATUS.md) before any operational change.

## Scope and safety

Development-only integrated module at `/modules/study-rooms`; fictional, in-memory review at `/study-rooms-preview`. This revision does not publish the module, grant member access, apply hosted migrations, import real records, change production aliases, or touch the original Firebase scheduler. Existing original applications remain independent.

## Reviewed ancestry

Canonical backend: PR #3 at `f8a2ec519073b8102af35142a545667d35e30ab9`. Reviewed parallel UI: PR #4 at `5b9a28f3fea2ba7db5a0162ace6715fbf2dde482`. Member-platform base: PR #2 at `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`.

Isolated branch: `feature/study-rooms-reconciliation-r3`. Integration commit `734cd339f5e58249f0ac43ae79b8200f6ae28559` has PR #3 and the reviewed PR #2 head as parents. Its tree preserves the full updated member platform plus all 25 canonical Study Room R1/R2 paths. Neither source branch was rewritten, force-pushed, or deleted. Contrary to the earlier handoff, the inspected PR #3 reported mergeable at the start of this session.

PR #4 contributes the combined-resource concept and four-day phone navigation. Its mock booking policy and shared-card purpose labels were not blindly merged. The canonical implementation retains R2's explicit resource-unit selection, native review dialogs, PostgreSQL authorization and transactional model. PR #4's branch remains intact for design provenance. There is only one canonical migration chain, not two competing schemas.

## Implemented in R3

### Atomic combined reservations

A reservation can contain one room, one whiteboard and one TV, or a subset. One reservation ID, owner, version and My Week activity represent the entire selection. All selected inventory must be available for the entire interval; a conflict on an accessory rejects the complete transaction. Rescheduling keeps identity and ownership; cancellation and early ending release all selected resources together. Past membership and original end times remain available in private history.

The new append-only migration `20261014115815_study_room_bundles.sql` was generated with the Supabase CLI. It backfills old single-resource records into a private, RLS-protected booking-resource relation, enforces one resource per kind, and binds slot claims to bundle membership with a deferred composite foreign key. Existing R2 command/schedule/admin functions become inaccessible internal implementations behind the new authorized wrappers. The same advisory transaction lock coordinates bookings, manager changes and identity transitions. Legacy single-resource clients cannot silently strip accessories during rescheduling.

### Member and manager experience

The form supports accessory checkboxes and explicit unit selection, intersection-based start/end options, and one combined review. The full-day grid reflects occupancy under every selected resource kind. My Reservations is owner-only even for managers; an explicitly authorized Manage bookings view provides oversight separately.

Private history supports any past date range up to 31 days per request, 50-row pagination, cancelled and ended records, complete resource membership, revision, purpose details, cancellation reason and original end time. A manager must deliberately request managed history; ordinary members cannot use that flag. Private history does not broaden shared schedule visibility.

Mobile improvements include four-day navigation, persistent Reserve Now, safe-area spacing, keyboard-operable native dialogs, visible focus, reduced-motion support, labelled controls and tablet reservation cards. Browser testing found and corrected a mobile viewport overflow caused by paired native date inputs.

### Refresh and conflict handling

The authenticated screen uses no-store requests, request cancellation and sequence guards. While visible and online it refreshes every 20 seconds, and also on focus, visibility restoration and reconnection. Same-origin tabs broadcast only an invalidation string, never reservation payloads. Authentication/access loss clears private views. A 409 refreshes authoritative data before reporting a stale revision or unavailable resource. Successful saves followed by a failed refresh are reported as saved-but-not-refreshed rather than failed bookings.

These mechanisms are implemented; genuine hosted two-device Auth/PostgREST operation remains a release test, not a claim established by the fictional preview.

### Existing platform integration

The existing `study-rooms` registry key, module ID, authorization helpers, member identity, activity and notification pipeline remain canonical. Combined resources update one private-safe activity title/location. Purpose/contact details do not enter My Week. Existing generic Apps/favorites/manager and notification mechanisms are preserved rather than replaced with parallel records. End-to-end hosted navigation and grants remain part of the controlled-pilot gates.

## Verification performed before UI commit

| Check | Result / scope |
| --- | --- |
| TypeScript | Passed in isolated development workspace |
| Next production build | Passed in isolated development workspace |
| New domain/history Node tests | 13 passed |
| New PGlite wrapper test | Passed; executes 57 R3 SQL assertions |
| Existing reservation SQL | R1 41 and R2 42 passed with the R3 migration |
| Native PostgreSQL | 53 member-foundation + 14 onboarding-permission + 36 module-runtime + 41 R1 + 42 R2 + 57 R3 assertions passed: 243 recorded assertions |
| Native contention | Shared-accessory booking, concurrent bundle reschedule and closure-versus-bundle races passed |
| Native backup/restore | Fictional local pg_dump/pg_restore preserved booking/membership/slot/receipt/history counts, RLS and anonymous history denial |
| New browser scenarios | 6 passed in phone Chromium emulation; includes 390/820/1024 viewport checks |

The same SQL assertions repeated under PGlite and native PostgreSQL are not additional distinct tests. The initial sandbox snapshot did not contain the latest complete repository test set; therefore these results do not by themselves establish the final Git-backed full-suite result. Record that deployment result separately after inspecting the exact UI commit's build logs. Local Auth-shaped fixtures are not genuine hosted Auth/PostgREST tests. Phone emulation is not physical iPhone/Safari verification.

Reproduce targeted checks:

```sh
npm run typecheck
node --experimental-strip-types --test tests/study-room-bundles.test.ts tests/study-room-bundles-database.test.ts
npm run build
npx playwright test tests/browser/study-room-bundles.spec.ts
```

Reproduce native checks against an EMPTY disposable loopback database only (PostgreSQL tools must be installed):

```sh
STUDY_TEST_DATABASE_URL=postgresql://TEST_USER@127.0.0.1:55439/lvz_study_test_r3 \
  node scripts/test-study-bundles-native.mjs
```

The native harness refuses non-loopback hosts, non-test database names and an existing application schema. It retains fictional evidence and a restored database for inspection; it never connects to hosted Supabase.

## Remaining implementation and activation gates

Weekly service-restriction editing, special-service override rules and adding inventory units are not implemented in R3. Existing date-specific closures, closure reopening, renaming and enable/disable controls remain available. Confirm the development scheduling defaults before live use: inventory counts, operating hours, half-hour intervals, four-day horizon and Tuesday/Saturday restrictions. No priority-based takeover is implemented.

Before real-member activation: reconcile the platform's hosted migration ledger; complete isolated hosted Auth/PostgREST permission, revocation and rollback tests; perform and document the hosted backup/restore drill; verify real iPhone/Safari and multi-device refresh; complete full accessibility and integration review; approve actual booking policy, named reservation managers and limited pilot participants; then obtain explicit production release authorization. The proposed Study Room module remains DRAFT and ungranted until those gates are satisfied.

Hosted read-only inspection found only the three member foundation/hardening/onboarding migrations. No reservation or module-runtime migration was applied during this work.
