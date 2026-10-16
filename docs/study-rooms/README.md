# Study Rooms — current operations

Verified October 16, 2026. Study Rooms is an integrated application at [lvz.app/modules/study-rooms](https://lvz.app/modules/study-rooms), using LV Zion Official authentication, its own calendar, reservations and permissions.

## Current state

- Booking is enabled for the existing explicitly authorized audience. This release does not add member or manager grants.
- The weekly restriction calendar and special-date calendar are empty. Calendar version is 2. Four unedited installation restrictions were removed by the owner-directed correction and the change was audited. No reservations were deleted.
- Weekly restrictions are optional. An authorized manager may save an empty array or remove the final restriction. Nothing is inferred from a weekday, conversation history or a design example.
- At verification there were zero reservations. Inventory and existing account, member and permission records were retained.
- Availability is computed from this application's stored reservations, explicit restrictions and closures. PostgreSQL remains authoritative. A booking pause is a local maintenance control, not an integration prerequisite.

## Member workflow

Choose a date and resource type, select an available time, review the resource, purpose and interval, then confirm. A reservation may combine up to one room, one whiteboard and one TV. Availability is rechecked when saved. My Reservations and History retain changes and cancellations; other members' bookings do not disclose private names or purpose details.

The header remains compact. The bottom bar contains Home, Schedule, **Apps in the center**, Bookings, and authorized Manage or History. The Apps launcher uses the server-filtered, member-specific module list.

## Manager workflow

Explicitly authorized managers can add and configure inventory, create closures and holds, manage weekly restrictions and replace restrictions for individual dates. Enter a reason for audited changes. Concurrent edits require a refreshed version; calendar changes never silently displace reservations. An empty special-date replacement intentionally removes weekly restrictions for that date, while resource closures still apply.

No weekly restrictions are preselected. Add only actual approved intervals for this application. An empty list displays **No weekly restrictions configured.**

## Release and verification

Runtime source: `dfad3817911f2ba195a21762986f54cceed46d78`.
Production: `dpl_HxTFTX6mRCn4JAUH3Mv4mSsuj7ZC`, READY with `lvz.app` and `www.lvz.app` aliases verified.

The production build passed 382 application/database tests, 198 additional PostgreSQL permission assertions, TypeScript and Next.js build. Fresh-start regressions check empty calendars, explicitly configured calendar preservation, unchanged anonymous function denials and prohibited runtime references. Browser regression source is `tests/browser/study-room-operations.spec.ts`.

Database correction: repository `20261016180000_study_rooms_fresh_calendar.sql`; hosted `20261016173939_study_rooms_fresh_calendar`. Readback verified an empty weekly list, version 2, booking enabled, zero bookings and one correction audit event. Anonymous command and operations execution remain denied.

A synthetic deployed-browser check is not evidence of a real signed-in owner transaction or physical-device acceptance. See the [fresh-start release record](../FRESH-START-2026-10-16.md) for the final verification scope. Historical installation receipts are not current operating requirements.

## Development and recovery

Read `AGENTS.md` and [release controls](../RELEASE-GATES.md). Only explicitly approved LV Zion Official requirements govern this module. Do not populate production calendars from fixtures. The fixture seed is restricted to disposable test databases.

Use incremental, tested schema changes and reconcile the [hosted ledger](../HOSTED-MIGRATION-LEDGER.json). Never replay applied installation SQL. Preserve grants, audit history and intentionally entered records. To pause booking for maintenance, use this application's booking activation state; do not delete reservations or invent scheduling policy. Validate a compatible deployment before rollback, and do not restore superseded defaults.
