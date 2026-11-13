# Healing Concert

RSVP tickets with QR codes and door check-in, inside lvz.app. Built 2026-11-12 from Anthony's plan
(inside lvz.app; members and their guests; attendance only, no participation score; ticket on screen and by email).

Status: **live on lvz.app since 2026-11-12** (Anthony: "Yes, release it"). Deployment `dpl_4kDkqdkxAN5sxMc29eg4HYMu7b4V` from main `dc520a4`; migration applied and the app approved. No concert is set up yet: a manager enters the real date, times, venue and seats in Concert settings.

## What people see

| Who | Where | What they can do |
|---|---|---|
| Any signed-in member | Apps → Healing Concert (`/modules/concert`) | See the concert, RSVP (party of 1 to 10), get a QR ticket on screen and by email, share a personal invite link |
| A guest with no account | The member's invite link (`/concert/i/…`) | RSVP with name, email, optional phone and party size; the ticket opens right away and is emailed |
| Anyone with a ticket | `/concert/ticket/…` (in the email) | Show the QR code at the door; a quiet link to create an LV Zion account |
| Door staff (concert managers) | More → Scan tickets (`/modules/concert/scan`) | Scan with the phone camera (or from a photo); green Welcome, amber Already checked in, red Not valid |
| Concert managers | More → Guest list, Concert settings | Live counts, search, manual check-in and undo, resend a ticket, remove a ticket, download the list (CSV), set the date/time/venue/seats, open or close RSVP, close the concert |

The owner manages it automatically. Give door volunteers a `manager` grant on the `concert` app.

## How it works

- One open concert at a time (`app_private.concert_events`). Closing it keeps the guest list; its tickets then scan as "another event".
- Each member has one stable invite link. Guests who RSVP through it are recorded with who invited them.
- Ticket and invite links are derived on the server from `LVZ_CONCERT_TOKEN_SECRET`; the database stores only SHA-256 digests. The QR code holds the ticket link, so any phone camera opens the ticket page.
- An email already on the list never gets a second ticket and never reveals the first one: the ticket is re-sent to that address instead.
- Seats count party sizes. RSVP stops when seats run out or a manager closes RSVP.
- Guest RSVP is protected by BotID and its own rate-limit buckets (50 tries per network, 10 per email, each 15 minutes).
- Ticket email (text and HTML with the QR as an inline image) goes through the existing SMTP settings and only when `LVZ_EMAIL_DELIVERY_ENABLED=true`. Without mail the ticket still shows on screen.
- Scanning uses the browser's built-in QR reader where it exists and the `jsqr` library elsewhere (iPhone Safari).

Code: `supabase/migrations/20261112180000_healing_concert.sql`, `lib/concert/`, `app/api/concert/`, `app/modules/concert/`, `app/concert/`, `components/concert/`.

## Checks run on 2026-11-12 (focused only, no full suite)

- `tests/concert-database.test.ts`: 45 SQL assertions on the real migrations (draft closed, permissions, RSVP, duplicate email, invite tracking, capacity by seats, scan ok/already/invalid/cancelled/other event, manual check-in/undo/cancel, stale versions, closing RSVP and the concert, no direct table access).
- `tests/concert.test.ts`: 6 unit tests (scan parsing, RSVP validation, commands, email text and escaping, CSV formula protection).
- `tests/browser/concert.spec.ts`: 3 phone-size browser tests on the real pages against a disposable database (member RSVP and ticket, invite link, door scan of a generated QR photo, guest list check-in, manager setup, signed-out prompt, invalid invite page).
- TypeScript and the production Next.js build.

Live checks on 2026-11-12, signed out: `/modules/concert` and `/modules/concert/scan` load; `/api/concert` and `/api/concert/scan` return 401; unknown invite and ticket links reach the database and show "not valid"; a scripted guest RSVP is refused by BotID (403).

Not yet verified: a signed-in RSVP, real email delivery, and a real phone camera scan. These need the real concert details first (no test event was created in production).

## Release steps (done 2026-11-12 except steps 5 and 6)

1. Set `LVZ_CONCERT_TOKEN_SECRET` (random, 32+ characters) in the Vercel production environment. Never change it after tickets go out.
2. Apply `20261112180000_healing_concert.sql` to project `otecqlkqirncotytbfns` and update `docs/HOSTED-MIGRATION-LEDGER.json`.
3. Deploy with the Vercel CLI from a clean checkout (automatic Git deploys stay off).
4. Approve the module: `update app_private.app_modules set status='approved',approved_at=clock_timestamp(),approved_by=<owner member id> where module_key='concert';`
5. In the app, open Concert settings and enter the real date, times, venue and seats.
6. Confirm `LVZ_EMAIL_DELIVERY_ENABLED` and the SMTP settings in production, then make one real RSVP to Anthony's email and scan it on a phone at the door.
