# Study Room Reservation — verified R4 production release

**Current as of October 14, 2026.** This is the canonical release evidence for the real [`lvz.app/modules/study-rooms`](https://lvz.app/modules/study-rooms), complemented by the [current-status index](study-rooms/README.md) and the [cutover runbook](study-rooms/CUTOVER-RUNBOOK.md). It is not an authorization to switch booking systems.

## Release provenance

- R3 initial production integration: merged [PR #22](https://github.com/lovelaceaml-hub/lvzion-official/pull/22). Earlier R3 draft reconciliation was [PR #9](https://github.com/lovelaceaml-hub/lvzion-official/pull/9), **not #8** (Continuous Display).
- R4 expanded management: merged [PR #30](https://github.com/lovelaceaml-hub/lvzion-official/pull/30) into `main` as `7237109e46315a726cc88fa2069db0d58fbc69b1`; its production deployment `dpl_2CkfiSr2EM1tQaAEj5ff3gMcRNEq` is READY.
- A newer verified production deployment `dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv`, commit `87c5a8573ca01f7216f2c78df1da5b827b7380d2`, is READY and includes R4 by Git ancestry. Future documentation-only commits can advance `main` without redeploying the app.
- **No Firebase scheduler migration, bulk permissions or opening of the booking gate occurred.** The original [`lvrooms.web.app`](https://lvrooms.web.app) remains the designated independent booking authority.

## Implemented in the real module

The authenticated Study Room page and its protected APIs are built into the existing LV Zion member system, not another standalone platform. One combined reservation can contain at most one of each kind (room, whiteboard, TV), sharing booking ID, owner, optimistic revision, private audit, My Week activity and atomic slot claims. Owner-only reservations, private bounded/paginated history, reschedule, cancel, early release, time-aware availability and cross-tab refresh are implemented in code **but new live bookings are gated closed**.

**Manager operations R4:** inventory creation; resource rename/enable/disable; day-specific resource/all-resource closures; recurring Tuesday/Saturday/other weekly service restriction editor; special-day *replacement* or reset (even with zero restrictions). The manager must have an explicit module `manager` grant. Requests are validated, versioned, idempotent, audited and serialized using the existing booking lock. Every calendar update is enforced by the same database function used by booking validation and daily availability; active claimed slots prevent incompatible changes. No forced eviction, priority takeover or separate unrestricted manager bypass exists. The disabled booking footer was corrected so it does not intercept touches on a phone.

## Hosted schema and safe activation state

Supabase production project: `otecqlkqirncotytbfns` (Las Vegas Zion).

| Source migration | Hosted migration ID | Purpose |
| --- | --- | --- |
| `20261014221015_study_rooms_core_live.sql` | `20261014221429` | R1 private resource, booking and slot schema |
| `20261014221018_study_rooms_changes_live.sql` | `20261014221435` | R2 reschedule, early release, closure and history |
| `20261014221021_study_rooms_bundles_live.sql` | `20261014221437` | R3 atomic multi-resource membership |
| `20261014221636_study_rooms_owner_review_gate.sql` | `20261014222303` | Owner-only module grant and default-closed booking gate |
| `20261014224006_study_room_policy_operations.sql` | `20261014225514` | R4 manager inventory and service calendar |

At the read-only production check on October 14: the module was **approved** and had **one active manager grant** to the existing designated owner (no general viewer grants); **12 resources** (4 rooms, 5 boards, 3 TVs), **zero new bookings and zero occupied slots**; four original weekly service blocks, no special-day overrides and policy version **1**. The booking gate `app_private.study_booking_activation.bookings_open=false` was verified. Direct private table access is protected by RLS, and anonymous execution of R4 private function helpers was denied. These are point-in-time findings; verify current hosted state before a later release.

The original Firebase configuration also lists four rooms, five boards, three TVs, Las Vegas 10:00 AM–11:00 PM, 30-minute increments, a four-day horizon, Tuesday 7:30–8:30 PM and Saturday 10–11 AM, 2:30–3:30 PM and 7:30–8:30 PM service blocks. **That configuration match is not evidence that the old reservations were copied or old writes were frozen.**

## Exact tested release evidence

- The final R4 production merge built on Vercel with **317 Node application tests passed** and **198 disposable PostgreSQL foundation permission assertions passed**, no reported failures. TypeScript and optimized Next.js production build passed; `dpl_2CkfiSr2EM1tQaAEj5ff3gMcRNEq` is READY.
- Six deployed phone-oriented Chromium checks passed against the integrated application using **synthetic intercepted** manager/viewer responses: inventory and weekly/day changes, ordinary-member denial, anonymous operations API access and responsive 360/390/768/1024 widths. An earlier run detected a fixed disabled footer obscuring touch targets; the shipped version passed after that fix.
- Signed-out production HTTP checks against schedule, administrative controls, private history and operations returned **401** and private/no-store headers; a signed-out operations POST was also denied **401**.
- R4 disposable PostgreSQL tests cover explicit manager/viewer permission boundaries, original closed gate, duplicate resources, optimistic revisions, idempotent receipts, conflicts, audit and special-day fallback. Earlier R3 native concurrency tests and fictional restore drill are separately documented in [R3 verification](STUDY-ROOM-R3-VERIFICATION.md).
- **Not demonstrated by these checks:** an actual signed-in owner performing a hosted management write, genuine cross-device persistent reservations, complete legacy Firebase export, old write freeze, production hosted restore, physical Safari or an independent module security/a11y assessment. Do not present simulated fixtures as real Auth verification.

## Remaining release gate: authoritative booking cutover

The original Firebase system has separate, live-designated booking functions and Firestore state. Its Firestore rules deny browser reads; the public cached lobby view is not a complete export. The new R4 module includes no way to change `bookings_open` through the management UI or operations RPC, and member grants are not inherited from church leadership.

The production release ends at **owner-only configuration**. To allow member bookings, complete the [cutover runbook](study-rooms/CUTOVER-RUNBOOK.md): authorized full old-data export, identity/resource mapping, old server-side write freeze, conflict-free reconciled import, genuine hosted sign-in/booking and restore tests, named manager/member approvals, single-authority cutover and explicit gate activation. Never open both independent writers at the same time.

## Change-control and documentation

Merged source: [PR #22](https://github.com/lovelaceaml-hub/lvzion-official/pull/22) and [PR #30](https://github.com/lovelaceaml-hub/lvzion-official/pull/30). Hosted migration mapping is [`HOSTED-MIGRATION-LEDGER.json`](HOSTED-MIGRATION-LEDGER.json); hosted IDs differ from local filenames. **Do not run a blind `supabase db push` or replay existing `CREATE` statements.** No original Firebase repository, production Firebase bookings, imported church roster or other module ownership was altered in this Study Room release.
