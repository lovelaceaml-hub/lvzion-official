# LV Zion Official member guide

- [Open the app](https://lvz.app/members)
- [Member management](https://lvz.app/members/manage)
- [Create an account](https://lvz.app/sign-up)

## Sign up and sign in

Create an account with your own first and last names, personal email and a password of at least six characters. Open the confirmation email and confirm your account. If an older confirmation link says it could not finish, sign in with the password you chose.

New accounts start Unassigned to age category, group and unit. An authorized member administrator verifies the person and places them. Unassigned accounts can see only their own records.

## Manage age categories, groups and units

Open Member management. Authorized organization administrators see **Age categories, groups and units** at the top.

1. Open an age category to see its groups and units.
2. Use **Add a group** inside the correct age category, or **Add a unit** inside the correct group. The parent is set by that branch.
3. Enter a name and the reason for the change, then create the entry.
4. To rename a placeholder, open **Rename or archive** beside the entry. Renaming keeps existing member placements and history.
5. Archive only an empty entry. The app blocks archival while children, member placements or appointments still depend on it. History is retained.

The initial structure has four age categories, two placeholder groups per category and two placeholder units per group. The placeholders are named Group 1, Group 2, Unit 1 and Unit 2. They can be renamed as the actual organization is established.

## Verify and assign a registered member

1. Find the person under **Unassigned members**.
2. Check their identity and church membership independently, including whether an existing member record already represents them.
3. Choose age category, then group, then unit. Check the complete placement shown below the choices.
4. Choose **I independently verified membership and identity** and enter the verification and placement reason.
5. Select **Verify and assign member**. The member becomes active in that placement; the decision and placement history are retained.

Changing the age category clears the old group and unit choices. Changing the group clears the old unit choice. Email confirmation alone does not verify church membership.

## Add an existing member and invite them

Use **Add a member record** under **Members you manage** only for an independently verified person who does not already have a record. Choose the full placement and document the reason. This creates a member record without a login account.

Use **Member invitations** to invite an existing unlinked member at their verified personal email. The person chooses their own password. Do not create a duplicate record for a person who already signed up. Failed invitation delivery can be retried using the unchanged form.

## Move a member or appoint a leader

Open a member under **Members you manage**, then **Change primary placement**. Choose the destination age category, group and unit and document the reason. Previous placements remain in history. Cross-group transfers by scoped leaders require receiving-group acceptance. A separately authorized member administrator can transfer directly.

Under **Organizational leadership**, select an active member and the role. Unit and group leadership use that member's current placement. Place an Unassigned member before appointing them to a unit or group. Appointments remain until an authorized administrator ends them. A move can make a previous appointment ineffective without erasing its history.

Organization, department and account administration are independent permissions. Member placement does not grant administrative access.

## A change could not be saved

Keep the form unchanged and retry after a connection failure. Organization changes reuse the same request receipt so an uncertain create does not create another entry. If the message says an entry still has members or children, finish the required moves first. Do not erase member history to remove an entry.

## Study Room Reservation owner setup

Open [Study Room Reservation](https://lvz.app/modules/study-rooms) while signed in to your LV Zion member account. The app appears in **Apps** only for members with an active explicit Study Room grant; technical, department, pastoral and group positions do **not** grant access automatically.

**Current status:** The designated application owner has the sole active Study Room manager grant. The module shows actual inventory/availability, but **"Bookings Not Open"** is intentional. The original [Study Room Scheduler](https://lvrooms.web.app) remains the booking authority until a verified, approved transition. Do **not** use `lvz.app` for real new reservations yet.

For an authorized Study Room manager, the page offers:

1. **Availability / My Reservations / Manage bookings / History.** View the current date's resources and slots, owner-specific records and authorized private history. There are zero new-system bookings at the last verified check. The date chips span today and the next three days.
2. **Resources & date closures.** Rename or enable/disable rooms, boards and TVs. Add or remove a date-specific closure for one resource or all resources, with a reason. A conflict with an existing slot is refused; historical records are preserved.
3. **Inventory & service calendar → Add a room, whiteboard or TV.** Pick the kind, enter a unique descriptive resource name and a management reason, then save. The change is version-checked and audited.
4. **Manage weekly service restrictions.** Review each day/time block (Las Vegas time), edit or add intervals and a reason, then save all intervals together. Times must lie on the 10:00 AM–11:00 PM half-hour grid and cannot overlap for the same weekday.
5. **Special dates & service overrides.** Choose the date, add service blocks (or intentionally leave none), enter a reason and save. A special-day override **replaces**, not adds to, the usual week's service blocks on that date. **Restore normal weekly schedule** removes the override. Resource/date closures remain separate.
6. If the server reports a stale configuration version or overlapping existing booking, **refresh and review** rather than forcing the change. Manager settings cannot open the booking gate, and no existing reservation may be silently displaced.

The booking backend supports combined room + board + TV reservations with atomic release and private history, but those actions are **not enabled for real members**. When a future approved cutover activates them, members will choose an available resource/time and one of the Contact / New Member / Other purposes; the server rechecks availability and My Week is updated without revealing private purpose details to other groups. Do not promise this workflow is already active.

The [current Study Room status](study-rooms/README.md) and [cutover runbook](study-rooms/CUTOVER-RUNBOOK.md) explain precisely what remains before bookings can open.

## Open an authorized app

Use **Apps** to see modules explicitly assigned to your account. Signing up or receiving a placement does not automatically grant every app.

- [Contacts](https://lvz.app/modules/contacts): the current workspace is private to the authorized owner. Sharing, export and messages are unavailable.
- [Study Rooms](https://lvz.app/modules/study-rooms): manager setup is available, but new bookings remain closed while the original scheduler is still the booking authority.
- [Continuous Display](https://lvz.app/modules/continuous-display): owner setup is available. Review and approve the exact content before publishing, and pair a real screen only when authorized. No screen was paired during setup.
- [Work Mission Morning Prayer](https://lvz.app/modules/work-mission-prayer): owner setup starts with empty schedules and materials. Check the real dates and approved wording before publishing. Member meeting-link access remains unavailable.

See [all documentation](README.md) for each module's release evidence and remaining limits.
