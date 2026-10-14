# LV Zion Official — Study Room module, production setup

> **Historical first live-module release.** Current production has progressed to [Study Room R4 management controls](STUDY-ROOM-R4-LIVE.md), but **real reservations are still closed** pending the original Firebase reconciliation and explicit cutover. The initial migration and preview results below are retained for traceability. [Current status](CURRENT-STATUS.md).

**Real host:** https://lvz.app/modules/study-rooms  
**Live GitHub:** lovelaceaml-hub/lvzion-official; integrate only through production main.  
**Original scheduler:** https://lvrooms.web.app (unchanged, remains booking authority).

## Production database installation (October 14, 2026)
The connected production Supabase project is `otecqlkqirncotytbfns` under the Las Vegas Zion organization. All of the following additive SQL migrations were individually applied successfully, and their presence was verified by the hosted migration ledger:

| Repository file | Hosted version | Name |
|---|---|---|
| `20261014221015_study_rooms_core_live.sql` | 20261014221429 | study_rooms_core_live |
| `20261014221018_study_rooms_changes_live.sql` | 20261014221435 | study_rooms_changes_live |
| `20261014221021_study_rooms_bundles_live.sql` | 20261014221437 | study_rooms_bundles_live |
| `20261014221636_study_rooms_owner_review_gate.sql` | 20261014222303 | study_rooms_owner_review_gate |

Hosted data inspection after these changes: 12 resources (4 rooms, 5 boards, 3 TVs), zero new-system bookings, one explicitly approved owner-manager grant, one approved Study Room module. All private reservation and activation tables have RLS. The authenticated SQL booking gateway checks `app_private.study_booking_activation.bookings_open` before allowing reserve, hold, or reschedule; hosted readback returned **false**. Only cancellation and early release remain available for any future retained reservations. Public RPC wrappers use invoker rights; internal legacy command implementations are not exposed to anonymous callers.

## Launch scope and non-goals
The designated, already-confirmed application owner receives one explicit Study Room `manager` grant. This is **not** automatically inherited from technical administrator, group leader, pastoral staff or department authority. Owner sees an authorized module in the shared Apps / My Week system. No ordinary member has been granted access.

The `/modules/study-rooms` UI and `/api/study-rooms` endpoints are integrated into the current, functional live LV Zion app, not the old member prototype. UI displays a clear nonbooking setup state, with Reserve Now, grid booking and manager hold disabled while the gate is closed. PostgreSQL enforces the same restriction independent of UI.

No Firebase data was imported, no original scheduler files, records, domains or permissions were changed; no real member invitations or outbound notifications were sent. Do not enable booking while the original Firebase scheduler can independently accept the same resources: the two databases do not yet share an occupancy authority.

## Verified code evidence and remaining boundary
The live-baseline code integration preview at commit `d507e1d` built READY on Vercel: 184 Node application tests, 182 PostgreSQL foundation assertions, TypeScript, optimized Next build. The final gated preview on commit `27a8e308d5a4a62f6e42415160d22b3ab02ab81d` built READY after fixing an unsupported UUID aggregate and PGlite type annotation, and a deployed phone-Chromium owner-mode test passed using mocked schedule/admin JSON. This browser test does NOT prove live member login or a real booking. The current production deployment must still be explicitly checked after merge/promotion, especially the signup flow and the new module's unauthenticated 401 behavior.

Before enabling booking for real members: read/obtain a conflict-free cutover or import of Firebase reservations; confirm live inventory and rules with the manager; test authenticated database commands and all permission boundaries using approved accounts; then issue a **separate explicit activation migration** and grant viewer access to authorized members. A physical iPhone/Safari test and backup/restore rehearsal remain recommended release checks. The owner-only setup may be published without enabling booking.
