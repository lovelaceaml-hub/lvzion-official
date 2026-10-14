# Study Room Reservation — production R4 management controls

## Release scope
Live module: **https://lvz.app/modules/study-rooms**. Source: `lovelaceaml-hub/lvzion-official`, current main; feature work developed in `feature/study-rooms-operations-r4`. This document tracks actual repository and hosted changes. It is not a claim of booking cutover.

## Management features
- Authorized reservation managers may add room, whiteboard or TV inventory units, using case-insensitive unique names, audit reasons and optimistic versioning.
- Recurring weekly service restrictions can be updated as a set, and one-off special dates can **replace** normal weekday restrictions (including explicitly zero restrictions) or be reset to weekly defaults.
- Each management operation requires an authenticated, specifically granted Study Room manager, a validated idempotency key, the current configuration revision and an audit reason. Requests run under the existing transaction/advisory lock. Saved change history and command receipts are retained.
- The exact booking command implementations in R1/R2 and the R2 daily schedule projection were updated to consult **one shared effective-calendar function**. A migration aborts if the reviewed source text does not match; we do not introduce a manager-only rule that the server booking engine ignores.
- Changes that would conflict with any unexpired claimed reservation slot roll back. No forced displacement or automatic cancellation.
- Phone-friendly management sections and inline accessible labels; booking-disabled footer no longer covers the manager panel. No schema or function exposes private purpose or owner details to ordinary members.

## Hosted database (Las Vegas Zion, project `otecqlkqirncotytbfns`)
New R4 migration: `supabase/migrations/20261014224006_study_room_policy_operations.sql`, applied through connected Supabase as hosted version `20261014225514`, name `study_room_policy_operations`.

Verified immediately after application:
- `study_operations_snapshot()`: version **1**, four original Tuesday/Saturday restrictions, zero special-day overrides, **zero new-system bookings**, `bookingsOpen=false`.
- New private `study_policy_state` and `study_special_days` have RLS; anonymous users cannot execute private effective-calendar or snapshot helpers.
- Existing inventory counts remain 4 rooms, 5 whiteboards and 3 TVs, and the one owner-only manager grant remains unchanged.
- No import from Firebase; no mass member grants, real outbound notifications or changes to Firebase.
- The separate `app_private.study_booking_activation.bookings_open` gate remains CLOSED. The management RPC has no action that can open it.

## Verification performed
- Git-backed Vercel development builds with the R4 migration and application code: **193 Node application tests** and **182 PostgreSQL foundational permission assertions** passed, TypeScript/optimized Next build READY.
- R4 disposable PGlite SQL regression covers permission separation, closed-gate enforcement, resource creation and duplicate denial, version checking, weekly and special-day overrides, idempotency and audit.
- The exact R4 deployed client passed **six Chromium phone-oriented browser checks**, including manager inventory/weekly/special-day submission with synthetic transport, ordinary-member restriction, direct anonymous endpoint denial and 360/390/768/1024 viewport fit. The first browser run exposed a disabled fixed-footer overlay; the fix was verified by a full passing rerun.
- These client transport fixtures do **not** demonstrate real owner login, persistent hosted API operations, WebKit or physical Safari.

## Live booking cutover (still NOT authorized/completed)
The original https://lvrooms.web.app remains an independent booking authority. Its Firestore rules prohibit direct reads/writes, and member Cloud Functions require Firebase authentication; public lobby occupancy is not a safe substitute for a complete, lockable booking export.

**Before any booking activation:**
1. Obtain an authorized export of active Firebase reservations, including the resources and dates/times (without exposing private contact details unnecessarily), and verify its completeness. Reconcile them into the new scheduler as approved reservations or explicit occupancy holds without inventing new member identities.
2. Freeze/retire the old booking writes at the Firebase authoritative endpoint, and verify a write is actually rejected; a UI banner or redirect alone is insufficient. Arrange a brief read-only maintenance window.
3. Reconcile data with the new database, verify there are no double bookings across all rooms/boards/TVs, exercise real authenticated member create/change/cancel and separate manager permissions, and verify restoration/rollback.
4. Only then explicitly authorize and execute the separate cutover activation and chosen member grants. The original and new booking endpoints must never accept conflicting concurrent writes.

No Firebase administration connection or authorized full legacy export is available through the current tools. This is the final external integration blocker to real reservations, not an unfinished visual prototype. Do not open bookings simply because the new module is on `lvz.app`.
