# Study Room Scheduler cutover — release runbook

**Status: NOT EXECUTED. Booking remains CLOSED on `lvz.app`.** This is a controlled operational procedure, not permission to disable the original Firebase scheduler or import real records. Read [current status](README.md) before using it.

## Systems and boundaries

| System | Purpose | Current authority |
| --- | --- | --- |
| `lvz.app/modules/study-rooms` | Real LV Zion member-based Study Room module, Supabase-backed | Owner-only configuration; **not accepting new bookings** |
| `lvrooms.web.app` | Existing original Study Room Scheduler, Firebase `lvz-rooms` | Remains the independent booking system until a verified freeze/cutover |
| Supabase `otecqlkqirncotytbfns` | LV Zion Official members, manager grants, resources, bookings, slots, audit | Production R1–R4 schema; `app_private.study_booking_activation.bookings_open=false` |
| GitHub `lovelaceaml-hub/lvzion-official` | Current application source | [PR #22](https://github.com/lovelaceaml-hub/lvzion-official/pull/22) + [PR #30](https://github.com/lovelaceaml-hub/lvzion-official/pull/30) released; old Firebase repo remains untouched |

The old Firestore rules deny direct browser reads. Firebase Cloud Functions access the records with privileged server permissions; the public lobby feed is a cached, partial, privacy-filtered view. **Do not use it as a complete booking export.**

## Prerequisites and go/no-go authority

Identify a named church scheduling owner, authorized legacy Firebase administrator, LV Zion app owner and rollback contact. Obtain their explicit approval for the pilot/cutover scope, any user notices, a maintenance window and the final booking authority. The current single owner-only Study Room manager grant **does not authorize** unilateral disabling of old Firebase writes or assigning new member rights.

Before a go decision, confirm:
- The actual 4 rooms, 5 whiteboards, 3 TVs and any newer inventory, 10 AM–11 PM local hours, 30-minute steps, Tuesday 7:30–8:30 PM and Saturday 10–11 AM, 2:30–3:30 PM and 7:30–8:30 PM restrictions, and the four-day booking window. Never silently replace these defaults with guesses.
- Whether the old system's special-day **extended opening window**, priority-based displacement/restore, administrator notes and anonymous Firebase booking identity require parity, redesign or an explicitly approved deprecation. R4 can replace one date's service blocks, but it **does not** reproduce special-day extended opening windows; automatic priority takeover is not enabled.
- An authorized, complete read of current and future Firestore reservations, including holds, multi-resource assignments and cancellations that still block occupancy. Historical/confidential notes must be handled separately with minimal access.
- A tested backup and point-in-time recovery plan for both production systems. A local fictional `pg_dump`/restore drill is **not** a hosted restore exercise.
- A verified way to freeze **server-side** Firebase booking, admin-create, reschedule and restore writes; changing only the old web UI is insufficient.

**STOP** if any of these cannot be verified. The new booking gate must stay `false`.

## Cutover sequence

### 1. Rehearse with non-personal data

Use an authorized isolated environment or a safe disposable fixture. Exercise combined room/board/TV booking and atomic rollback on an accessory conflict, overlapping/stale requests, cancellation and early release. Test ordinary users, explicitly granted managers, revoked members, different groups, date/weekday boundary changes and two devices. Repeat with physical iPhone/Safari and an accessibility pass as release requirements.

### 2. Obtain a complete, immutable old-system export

From an authorized Firebase server/admin facility (not the public lobby API), export an as-of timestamp and a consistent inventory of all active/future reservations and holds. Include legacy record ID, state, resource kind + unit, Las Vegas date/start/end, modification/version where available, and a minimally scoped ownership reference. Protect sensitive names, contact purposes and administrator notes; do not put personal data, tokens, secret keys or the raw export in Git, CI logs or screenshots. Record counts by day, resource and status, hash the protected snapshot, and establish who certified completeness.

### 3. Map and reconcile ownership

Review the one-to-one inventory map (`room-1…4`, `wb-1…5`, `tv-1…3`) against current IDs and additions in the new database. Do **not** infer a member identity from a display name, anonymous Firebase UID or contact name. Match an owner only through an explicit approved identity mapping; otherwise obtain permission to represent occupancy as an explicit managed hold with audit provenance. Preserve stable original IDs in a protected import ledger for idempotent retries and verification; never fabricate credentials or duplicate member records.

In the rehearsal, reject overlapping or off-grid reservations, missing inventory, expired/ambiguous time ranges and inconsistent multi-resource memberships. Reconcile source/destination counts and intervals, not just totals. A green UI test is insufficient.

### 4. Freeze the original authoritative writes

At the approved cutover time, stop old **server-side** create/restore/edit/hold writes, including any administrator pathways. Prove that a real attempted write is rejected at the old Cloud Functions endpoint; keep documented read-only access for verification. Take a final export after the freeze and reconcile any bookings changed since the first snapshot. **Do not open `lvz.app` bookings during this interval.**

### 5. Import and verify in the new database

Apply an independently reviewed, idempotent, additive migration/import with the protected legacy-ID mapping and authorized booking/hold ownership. Do not edit a live reservation without preserving audit history. Reconcile occupancy **resource by resource and slot by slot** for the full overlapping booking horizon and any specially approved days. Verify unique constraints, My Week activity privacy, manager history and all-resource releases. Replay the same import once in rehearsal and prove it produces no duplicate booking, activity, receipt or slot.

### 6. Verify live Auth and recovery with authorized accounts

Using approved test members and manager grants, exercise genuine hosted sign-in → availability → reserve → reload/second device → reschedule → cancel/end-early. Verify no unauthorized direct table access, no manager role inheritance from unrelated group/technical roles, 401/403 behavior on revocation, no private purpose leakage and concurrency conflicts. Run the hosted restore/rollback rehearsal; record the exact recovery point and owner approval.

### 7. Make a single authoritative cutover

With old writes still demonstrably frozen and all reconciliation checks passing, secure the named owner's recorded go decision. Only then deploy a separate reviewed change that opens the **database** booking gate and grants the specific approved members `viewer` or `manager` access. Validate one genuinely persisted reservation in production with the designated test owner. Do not make the two systems independent writers for the same inventory and dates.

### 8. Monitor and hand over

Confirm old read-only status, new writes/refreshes, conflict rates, mobile usability, privacy of My Week updates and support/escalation ownership. Obtain written completion evidence including export certification, rollback drill, go approval, enabled access roster and test results. Update [R4 evidence](../STUDY-ROOM-R4-LIVE.md), [hosted migration ledger](../HOSTED-MIGRATION-LEDGER.json), [release gates](../RELEASE-GATES.md) and [member manual](../USER-MANUAL.md) with the *actual* date and new deployment IDs.

## Rollback and failure policy

- **Before enabling new booking:** keep `study_booking_activation=false`; restore/continue old-system writes only under the scheduling owner's authority, after ensuring the frozen/exported booking records remain consistent. Do not delete private new-system schema to roll back a UI release.
- **After any new booking is accepted:** disabling the new booking gate can prevent new writes, but reverting the Vercel build **does not undo bookings**. Reconcile every accepted slot and member communication before allowing old booking writes again. Preserve audit and original database state. Never reopen Firebase while unsynchronized new reservations could conflict.
- **Failure/uncertainty:** no-go; leave the system with one known writer and a named incident owner. Do not “try both” or silently switch data sources.

## Evidence checklist (blank until actually executed)

| Required evidence | Present as of October 14, 2026? |
| --- | --- |
| Original complete authenticated Firebase reservation export and verified counts | **No** |
| Old Cloud Functions write freeze/rejection proven | **No** |
| Approved import/ownership mapping and idempotent dual-inventory reconciliation | **No** |
| Authenticated hosted member/manager reservation tests on actual devices | **No** |
| Hosted recovery/rollback rehearsal and documented cutover owner | **No** |
| Explicit activation decision, member grants and production gate open | **No — deliberately closed** |

This is why owner-only configuration is **live** while new member bookings are **not**.
