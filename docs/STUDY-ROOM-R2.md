# Study Room Reservation R2 — changes and manager controls

> **Historical Study Room development evidence.** These earlier review/preview/activation assertions apply to the commits and test environments named below. The actual module is now integrated at `lvz.app/modules/study-rooms` with owner setup, but the **production booking gate remains closed** and the original Firebase scheduler remains authoritative. Read [STUDY-ROOM-R4-LIVE.md](STUDY-ROOM-R4-LIVE.md) and [CURRENT-STATUS.md](CURRENT-STATUS.md) before any operational change.

This increment continues PR #3, feature/study-room-reservations-v1, from commit 8623294183777dd58ffb22b5ac41888e858c980f. The separate Study Room UI proposal (PR #4), Worship Duty branch, original Firebase scheduler, production deployment and domain configuration are not changed. This document supersedes R1's statement that reservation editing and all manager scheduling controls are unimplemented.

## Implemented behavior

**Edit / reschedule:** the owner or an explicitly assigned reservation manager can change a future non-hold reservation's resource, date, time and private purpose detail. Availability excludes only the reservation being edited. The booking ID and owner remain unchanged. The slot claims, reservation fields, My Week activity and audit revision update atomically. Failure retains the original booking and slots. Running bookings cannot be moved retrospectively.

**Stale-screen protection:** booking writes require the version displayed when the user opened the dialog. A stale reschedule or cancellation is rejected, even if the UI refreshes while the dialog is open. Identical request retries return the original result without another booking, notification or audit event. The old command implementation is private and no longer executable by browser roles.

**End early:** a running non-hold reservation can release remaining complete 30-minute slots. The release boundary is rounded UP from the server clock, never accepted from a client. At 4:15 PM a 4–5 PM reservation releases the 4:30–5 PM slot. The occupied/current half hour and the original scheduled end remain in history. An ended reservation cannot be edited or cancelled again, and a final partial slot alone is not released. The My Week activity is removed from upcoming views without deleting its booking history.

**Manager resource controls:** rename and enable/disable the existing resources. A resource with remaining booked slots cannot be disabled. Versions prevent a stale manager screen from overwriting newer configuration. Renaming updates the safe resource label used by the corresponding My Week activities.

**Date-specific closures:** an explicitly assigned reservation manager can close a resource or all resources for a selected date and half-hour interval, and reopen it with a reason. Existing reservations are never silently evicted. Closure reasons are private; ordinary availability shows only Scheduled closure. A removed closure is retained as an inactive, versioned record. These closures add exclusions to the original weekly service blocks; they do not replace weekly worship schedules or extend the four-day member booking window.

The fictional preview includes a Simulated time selector (9:00 AM / 4:15 PM) to exercise early release. This is a presentation-only simulation, not an authentication or real database clock override. Preview reservations and configuration remain in browser component memory and reset on reload.

## Verification performed October 14, 2026

- 17 new policy/simulator tests passed, plus the new database-test wrapper.
- **42 new R2 SQL assertions** passed in disposable PGlite and again in native PostgreSQL. The prior **41 reservation assertions** also passed. These are 83 distinct reservation assertions, not 166 different cases.
- Native concurrent create: one competing booking wins; the other gets a conflict; an exact retry creates no duplicate.
- Native concurrent reschedule: one editor wins; the stale editor fails; one booking and one My Week activity remain.
- Native closure versus reservation: one succeeds and the other fails; neither can silently evict the other's committed result.
- **12 reservation browser cases passed** in phone Chromium: the five previous cases plus seven R2 cases, including date moves and layouts at widths 320, 390, 430, 768 and 1280.
- Strict TypeScript and the local optimized Next.js build passed. Local recovered-snapshot regression: 74 Node tests and 72 older foundation assertions passed. This snapshot contains fewer unrelated foundation tests than the complete Git-backed branch; do not misrepresent that count as the complete repository suite.

R2 early-ending database tests replace only a private clock function inside a rollback-only, local test transaction to create a deterministic running reservation. No customer payload can change that function. Native contention tests use independent PostgreSQL connections to a disposable UNIX-socket-only cluster, then stop and remove it. No hosted URL, real person, email, external notification or credential is used.

## Release gates remain

The append-only migration 20261014110636_study_room_changes.sql and the original room/module migrations remain unapplied to hosted Supabase. No module grants or accounts are created. The app is not live for congregation bookings. Hosted Auth/REST integration, migration-ledger review, actual ownership/access assignments, independent security review, physical-device accessibility and an authorized pilot remain necessary.

Still not implemented here: simultaneous multi-resource booking parity with the separate PR #4 prototype, resource inventory creation, replacement weekly schedules/extended special-day booking windows, retrospective history browsing, push notifications or immediate cross-device updates. Changes refresh after writes, on page focus and via Refresh. Priority takeover remains disabled pending an explicit decision. Do not merge overlapping Study Room route/schema proposals without a reviewed integration decision.

## Reproduce

Run npm run typecheck, npm test, npm run test:db, npm run build. Run npx playwright test tests/browser/study-rooms.spec.ts tests/browser/study-room-changes.spec.ts. Native PostgreSQL regression/contention: node scripts/test-study-concurrency.mjs (non-root local environment with initdb, pg_ctl and psql installed).
