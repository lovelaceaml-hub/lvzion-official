# LV Zion Official — Study Room Reservation (first official app)

**Decision:** The church's first individual module for the new independent LV Zion Official platform is **Study Room Reservation**. This decision was made in earlier LV Zion planning and is now recorded as the official first module direction. Selecting the module does **not** mean the new implementation is approved for live rollout or that legacy permissions are accepted unchanged.

## Product intent

Within the LV Zion Official app, members reserve study rooms, whiteboards and TVs while seeing resource-specific daily schedules and their own active reservations. Authorized managers can oversee assignments, holds, cancellations, displacement and audit history. The parent platform provides verified member identity and independent organization/department permissions.

No separate login or deployment into the original Firebase scheduler is permitted. The older scheduler at https://lvrooms.web.app remains operational as-is until a separate cutover decision. No existing reservation, profile or group record is copied at this stage.

## Confirmed legacy behavior studied as reference

Reference source (read-only): `lovelaceaml-hub/study-room-scheduler`, `main`, `functions/lib/config.js` and its README, checked October 14, 2026.

- Room inventory: Rooms 1–4 (4 total), Boards 1–5 (5 total, three Large and two Vertical), TVs 1–3 (3 total).
- Reservation days: today + next 3 days, with a special-day extension mechanism.
- Grid: half-hour intervals from 10:00 to 23:00 in `America/Los_Angeles`. Once a slot has begun it cannot be newly booked.
- Regular service exclusions: Tuesday 19:30–20:30; Saturday 10:00–11:00, 14:30–15:30, 19:30–20:30. This list must remain administrator-configurable for the real module.
- A reservation may claim several resource kinds at the same time; units assigned per resource kind.
- Member purposes: Contact (highest), New Member, Other. The current Firebase app can move, shorten or replace lower-priority bookings after warning.
- Force override exists in the old implementation for any member, with warnings; administrative holds are protected.
- Current member bookings are browser-anonymous/device-bound; Admin uses a PIN and can edit, hold, restore, document notes, and remove records older than eight weeks.
- Existing lobby TV displays a daily summary with short public names; this is a privacy-sensitive part of the design.
- Firebase member/admin views refresh every 30 seconds; lobby TV every minute, and state changes trigger immediate refresh.

These are legacy facts, **not automatically approved future policy**. The new account-based security architecture changes the privacy and authorization context.

## New R1 scope

### Implemented (synthetic, disconnected)

- Phone-first `/study-rooms-preview` with explicit fictional banner.
- Browse resources in Room / Whiteboard / TV tabs, date chips, availability period, and per-resource schedule.
- Sticky **Reserve now** primary action, a sheet with time window, purpose, detail and multi-resource selection.
- Local, temporary, fictional reservation confirmation and cancellation under My reservations. Refreshing clears these; nothing is submitted to a server or to either database.
- Shared pure TypeScript policy `lib/study-room-policy.ts`: current window, half-hour grid, open/close, current-time rules, regular service blocks, resources, active conflict checks, atomic all-requested-kind allocation of free units, contact/name/purpose field validation. It does not connect to the legacy app.
- Explicit rejection of automatic priority takeover/Force override in R1. Show the selected legacy rule and explain that the new authorization scheme must be reviewed first.
- Unit tests `tests/study-room-policy.test.ts` and mobile browser checks for navigation, reservation simulation and lack of writes.

### Next implementation after product review

1. Create an independent, unexposed `app_private` reservation schema in **the new** Supabase project, with RLS and a unique/exclusion conflict invariant that cannot be bypassed by concurrent requests.
2. Select how all authorized members obtain the module grant, how independent department-management assignments work, and whether special overrides require a higher role or approval. The selected module may be offered broadly, but neither organizational hierarchy nor technical admin status automatically grants access.
3. Implement transactional create/cancel/end-early, all-resource atomic allocation, admin holds and immutable audit events. A member should see only their own private details; availability should disclose minimal information, and the lobby display must be separately authorized/redacted.
4. Reimplement and verify priority displacement (including reservation still in progress, move/shorten/release, notice delivery, and no resurrection after later cancellation) only with an explicit approved policy. Reconsider the old 'every member can Force override any member' rule for named accounts.
5. Admin controls: configure hours, service exclusions, booking window, resource list/units, special days, and purpose labels without redeploying code; preserve unit identifiers and audit history.
6. Integrate the module with the platform's `My Week`, favorites, notification feed and typed module registry only after migration and grants/permissions are reviewed. The general module-runtime migration is still unapplied.
7. Test with fictional accounts, including concurrent booking and overlapping resource contention, race conditions, senior-member priority, overrides, cancelled bookings, unread notices, unit reassignment and mobile/focused access.
8. Verify hosted Auth/email plus backup restore, independent security review, physical iPhone/Android behavior and limited pilot before cutover. Do not change the original app on this branch.

## Deferred choices (do not block fictional preview)

- New platform policy for legacy Contact > New Member > Other preemption and Force override authorization.
- Display name/privacy treatment in common-area TV versus authenticated member phone.
- Authorized room administrators, booking-change reviewers, and special-day editors.
- Real member grant rules and the transition timeline away from the separate Firebase scheduler.

## Safety and release boundary

- The original live Study Room Scheduler stays completely unchanged and authoritative for real reservations.
- Do not read or publish the live Firestore bookings into the fictional review page.
- No real reservation is created, no user is enrolled, and no hosted schema migration is executed by opening/using this preview.
- `lvz.app` remains on the existing public synthetic prototype; review this app only on the Git-backed preview branch.
- The generic module registry and authenticated Supabase login remain gated until separately verified.

**Related code:** `lib/study-room-policy.ts`, `app/study-rooms-preview/page.tsx`, `tests/study-room-policy.test.ts`.
