# Study Room Reservation — current production status

**Verified on October 14, 2026.** This is the current entry point for Study Room work inside the **real** [LV Zion Official app](https://lvz.app/modules/study-rooms). It supersedes the present-tense launch claims in the earlier R1–R3 development notes, while preserving their original test evidence.

## Current status

| Capability | Verified state |
| --- | --- |
| Integrated web module | **Deployed** on `lvz.app/modules/study-rooms` (not a standalone website or in-memory demo). |
| Production member platform | Confirmed-email LV Zion sign-in and shared Apps/My Week module registry are live; the Study Room module record is **approved**. |
| Study Room permissions | **One active manager grant**, assigned to the existing designated, confirmed application owner. No general-member reservation grants. Administrative, group or pastoral authority does not implicitly grant Study Room access. |
| Inventory | **4 rooms, 5 whiteboards and 3 TVs** (12 resources); 10:00 AM–11:00 PM, 30-minute grid, four-day booking horizon. |
| Management features | Resource rename/enable/disable, closures, **add inventory**, recurring service restriction editing and special-day replacement/reset; private audit, optimistic versions, conflict checks. |
| Combined reservations | Authenticated PostgreSQL code supports one reservation across up to one room, one board and one TV, with atomic create/change/cancel/release and private history. |
| **New booking acceptance** | **CLOSED at the database**, `app_private.study_booking_activation.bookings_open=false`. Both reservation creation and manager holds/rescheduling are refused. |
| Production new-system records | **0 bookings and 0 occupied slots** at the last read-only check; calendar version **1**, no special-date overrides. |
| Original booking authority | [lvrooms.web.app](https://lvrooms.web.app) remains the separate Firebase scheduler; its live booking records have **not** been exported, reconciled or frozen. |
| Member-wide launch and cutover | **NOT COMPLETE**; do not turn on booking or grant members until the [cutover gates](CUTOVER-RUNBOOK.md) pass. |

This is an **owner-configuration release**, not a claim that members can presently book on `lvz.app`. A working route or UI alone does not prove a completed booking migration.

## Where to go

- **Owners/managers:** [Study Room at lvz.app](https://lvz.app/modules/study-rooms) → availability, My Reservations, authorized management and service calendar. A signed-out visitor sees only an authorization/loading shell. See the [member and manager manual](../USER-MANUAL.md#study-room-reservation-owner-setup).
- **Developers/reviewers:** [R4 production evidence](../STUDY-ROOM-R4-LIVE.md) and [original module installation](../STUDY-ROOM-LIVE-RELEASE.md). The merged source is [PR #22](https://github.com/lovelaceaml-hub/lvzion-official/pull/22) (initial production module) plus [PR #30](https://github.com/lovelaceaml-hub/lvzion-official/pull/30) (R4 operations).
- **Migration operator:** [Firebase → LV Zion cutover runbook](CUTOVER-RUNBOOK.md). The hosted/repository migration IDs are tracked in [the migration ledger](../HOSTED-MIGRATION-LEDGER.json). Never run a blind `supabase db push`.
- **Historical evidence (not current release status):** [R1](../STUDY-ROOM-VERIFICATION.md), [R2](../STUDY-ROOM-R2.md), [R3](../STUDY-ROOM-R3.md), [R3 verification](../STUDY-ROOM-R3-VERIFICATION.md), and [R3 access-race handoff](../STUDY-ROOM-LAUNCH-READINESS.md). Canonical R3 reconciliation is **PR #9**, not PR #8; PR #8 belongs to Continuous Display.

## Verified release provenance

R4 was merged through **[PR #30](https://github.com/lovelaceaml-hub/lvzion-official/pull/30)** as `7237109e46315a726cc88fa2069db0d58fbc69b1`. That production Vercel deployment `dpl_2CkfiSr2EM1tQaAEj5ff3gMcRNEq` was READY. A newer production deployment `dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv` at `87c5a8573ca01f7216f2c78df1da5b827b7380d2` was verified READY and retains R4 by Git ancestry. Documentation-only commits to `main` do not by themselves prove a newer production deployment.

The final integrated R4 build passed **317 Node application tests and 198 disposable PostgreSQL foundation assertions**, with TypeScript and Next.js production build passing; **six deployed phone-Chromium tests** passed (synthetic manager/viewer data plus direct anonymous API denial). Live signed-out GETs against the schedule, administration, history and operations APIs, and an anonymous operations POST, each returned **401** with private/no-store controls. This is *not* evidence of a real signed-in owner booking, a complete hosted Auth/PostgREST user journey, physical Safari or hosted backup/restore.

## Code map

- Screen: `app/modules/study-rooms/page.tsx` (loading, access loss, refresh) and `components/study-rooms/` (member view, change dialog, history, manager controls, `use-receipt-save.ts` for idempotent manager saves).
- Rules: `lib/study-rooms/domain.ts` holds the shared booking validation, service hours (10:00 AM to 11:00 PM on half-hour slots), labels and the fictional test fixtures (`demoSchedule`, `simulate`); `admin.ts`, `operations.ts` and `history.ts` validate their requests with the same helpers. PostgreSQL stays authoritative.
- API: `app/api/study-rooms/` (schedule, command, history, admin, operations); `lib/study-rooms/server.ts` holds the shared sign-in check and messages.
- October 15, 2026 redesign: the screens follow the locked [Day Sheet design contract](../design/LVZ-DESIGN-CONTRACT.md) (shared tokens, `AppHeader`, underlined tabs with swipe, rows instead of cards, a 320px manager column on desktop). `tests/browser/study-room-layout.spec.ts` checks 320, 390 and 1280px widths, 44px targets, the home link and swipe; set `LVZ_SCREENSHOT_DIR` to save review screenshots. Current review screenshots (fictional data) are in [screens/](screens/).
- October 15, 2026 cleanup: merged duplicated validation, time lists and labels, removed the unused preview-only code paths, with no change to permissions, database rules or the closed booking gate.

## Compact reservation-screen refinement — October 15, 2026

The member-facing screen now uses a single-line header instead of a large page hero; resource-type controls sit above four full-date chips. The real 30-minute room/whiteboard/TV availability table has large rounded cells, clear unavailable/occupied states and an optional selected-slot confirmation above the bottom bar. Selecting a slot pre-fills the existing two-step reservation form; no POST is made until the existing authenticated confirmation flow runs.

- **Bottom bar:** Home, Schedule, **Apps (center)**, Bookings, and authorized Manage / History. The Apps button opens a native in-place switcher and reads the same member-specific, server-filtered `/api/members/experience` feed as the member home. It never shows unapproved or unassigned apps.
- **Member home:** the already-central Apps button is visually emphasized; `/members?apps=1` also opens the authorized home Apps sheet as a compatible fallback for future modules.
- **Accessibility:** screen-reader labels on every button, visible focus controls, 44px minimum interaction targets, scrollable four-resource grid on narrow phones, keyboard-closeable dialogs and no document-level horizontal overflow.
- **Boundaries:** presentation-only: existing modules, calendar policy, permissions, PostgreSQL validation, authenticated endpoints and `bookings_open=false` are unchanged. Do not use this design release to migrate or activate the old Firebase booking records.
- **Verification:** `tests/browser/study-room-layout.spec.ts` additionally checks open-slot selection/pre-filled times and an in-place Apps switcher with a fictional authorized module feed. Browser fixtures are synthetic, not evidence of hosted member sign-in or a successful live booking.

Release provenance and actual production state must be recorded only after a passing build and explicit Vercel production deployment.

## Safe default

Do not change `study_booking_activation`, add general-member grants, invent booking owners, or modify the original Firebase scheduler to “complete the launch” without the verified source export, a checked old-endpoint write freeze, authenticated member/manager tests, a recovery plan and explicit cutover approval. The new operational calendar can be configured without opening bookings.

*Last production/data cross-check: October 14, 2026. For live state, re-read the connected Vercel alias and hosted Supabase records rather than assuming this snapshot cannot change.*
