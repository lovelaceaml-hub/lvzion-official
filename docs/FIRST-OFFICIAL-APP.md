# First official application: Study Room Reservation

**User selection, October 14, 2026:** Study Room Reservation is the first official app for LV Zion Official. This supersedes earlier statements that no first module had been selected. Selection approves development, not production activation, migrations, real-data import, or taking over the original scheduler.

## Confirmed experience carried forward

Persistent Reserve Now; Room / Whiteboard / TV; Contact first, New Member second, Other last with input; only available starts and valid ends; explicit review and confirmation; full-day schedule with resource columns; My Reservations; cancellation with history retained. Existing reference configuration uses America/Los_Angeles, 10 AM–11 PM, 30-minute slots, today plus three days, four rooms, five whiteboards, and three TVs. Tuesday/Saturday service blocks remain reference defaults, not an assertion of an updated church schedule.

## New-system privacy and administration

The old scheduler's global name/purpose display must not override LV Zion Official's stricter group-name privacy. Show occupancy across groups as Reserved. Show names only to the owner, members of the same current group, or explicitly assigned reservation managers. Contact/new-member names and Other detail are private to the owner and reservation manager; never included in My Week titles, notifications or ordinary group views. No member-account identity is accepted from booking requests.

Reservation managers are explicitly assigned to this app. Unit/group/technical titles do not automatically grant reservation-management rights. Past appointments and booking history remain; no hard-delete behavior is adopted.

## First development slice and remaining decisions

Build the independent reservation workflow, resource occupancy, conflict checks, cancellation, manager holds, and transactional My Week projection with synthetic records. The original app's purpose-priority takeover and member override logic are NOT enabled automatically: they can displace somebody else's reservation and require an explicit new-app decision. Existing legacy Admin PINs, anonymous/public lobby access, real bookings and automatic historical deletion are not imported. No date-specific September 21 exception carries forward as a recurring rule.

Hosting activation, the named accountable app owner, actual individual module grants, migrated special-day rules, physical-device review and live Auth testing remain release gates. The selected domain lvz.app stays paused. Existing repository lovelaceaml-hub/study-room-scheduler is reference-only.

Reference inspected: study-room-scheduler@3f9f2dfd9d17ba42397f109ff63cfdb5d8931f26/functions/lib/config.js. Canonical module key: study-rooms. No record for a real person is present in this change.
