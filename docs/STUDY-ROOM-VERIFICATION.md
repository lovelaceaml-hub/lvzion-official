# Study Room Reservation — first-module verification

> **Historical Study Room development evidence.** These earlier review/preview/activation assertions apply to the commits and test environments named below. The actual module is now integrated at `lvz.app/modules/study-rooms` with owner setup, but the **production booking gate remains closed** and the original Firebase scheduler remains authoritative. Read [STUDY-ROOM-R4-LIVE.md](STUDY-ROOM-R4-LIVE.md) and [CURRENT-STATUS.md](CURRENT-STATUS.md) before any operational change.

## Scope of this change

First official module selected by the user: Study Room Reservation. Dedicated review branch: feature/study-room-reservations-v1, based on the member/module foundation commit f0771afb48c1dae77b629c11203e632b90d48f7a. The proposal does not merge into production, mutate the original room scheduler, publish live module access, change hosted Auth, send email, import booking/member data, or work on lvz.app.

## Executed checks, October 14, 2026

- 13 new shared-domain tests passed: purpose order; Las Vegas date; date rejection; occupied starts and capped ends; adjacency/overlap; Tuesday/Saturday services; horizon/past times; identity/override injection rejection; purpose validation; booking/cancellation/history; third-party cancellation denial; manager-only holds.
- One automated PGlite test executes **41 distinct SQL assertions** for app grants, owner privacy, anonymous/direct-table denial, overlapping bookings, idempotency, invalid fields, manager holds, cancellation/history and safe My Week/notification projection.
- The same SQL regression script passed on a separate native PostgreSQL cluster, with all foundation/module migrations loaded. This was a new local cluster using a private UNIX socket with TCP listening disabled, not the hosted Supabase database.
- Native concurrent requests from two distinct fictional members for the same resource/time produced **exactly one successful booking** and one conflict rejection; one booking, two slot claims, one activity. An identical retry by the winner produced no duplicate booking. The test cluster was stopped and deleted afterward.
- Five mobile Chromium browser tests passed: full resource grid, purpose/time/review/confirm flow, private detail absent from the shared schedule, cancellation history, manager-only holds, and unauthorized API denial. This is not a claim of real iPhone/Safari verification.
- Strict TypeScript checks and a local Next.js build passed.

The new SQL assertions are 41 distinct checks repeated on native PostgreSQL and PGlite, not 82 different cases. The existing repository's build tests still run separately. Supabase Auth/REST integration for this new reservation module, real-device accessibility, hosted backup restoration and a live member pilot have not been verified by these local checks.

## Reproduction

Run npm ci --ignore-scripts, npm run typecheck, npm test, npm run test:db and npm run build. Install the test Chromium browser then run npx playwright test tests/browser/study-rooms.spec.ts. For the UNIX-socket concurrency test, a non-root local environment needs native initdb, pg_ctl and psql on PATH: node scripts/test-study-concurrency.mjs. This script accepts no hosted database URL and uses only synthetic @example.invalid identities.

## Not activated

The CLI-generated migration 20261014091723_study_room_reservations.sql is unapplied to hosted databases. It registers Study Room Reservation in DRAFT, not approved/published, and grants no person module access. A named app owner, actual resource/service-rule review, explicit viewer/manager assignments, existing upstream PR-conflict reconciliation, independent review and hosted testing are still needed before enabling real reservations.

## Deliberately not inherited

Purpose-based automatic displacement, anonymous/public name display, shared Admin PIN, real-data copy and legacy age-based hard deletion are not enabled. Priority takeover can cancel another user's booking and requires a separate explicit policy decision. This version never silently evicts an existing booking. Full resource configuration/special-day editing, immediate live cross-device refresh, and reservation editing/rescheduling are follow-on work; current live updates refetch after writes, on page focus, and when the user taps Refresh.
