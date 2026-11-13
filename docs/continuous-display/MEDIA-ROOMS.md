# Church Display: pictures, videos and study rooms

Built 2026-11-13 on Anthony's request: one official church TV that shows more than text, with slides that are easy to add, remove and schedule. Released 2026-11-13: migration applied, merged in #83, production deployment `dpl_82tboxaBzGMdaCX2WSXfiDQad2iZ` on lvz.app. Content is not added yet.

## What a manager can do

In Apps, Church Display, Content:

- **Add a slide with one tap**: Text, Picture, Video or Study rooms. Remove any slide with Remove slide. Change a slide's type from its Content type menu.
- **Picture**: choose a JPG, PNG or WebP (up to 50 MB). Pick "Show the whole picture" or "Fill the screen". Optional caption.
- **Video**: choose an MP4 or WebM (up to 50 MB). The slide's time is filled in from the video's length. The TV plays it without sound and moves on when it ends.
- **Study rooms**: today's bookings from lvrooms.web.app, room and time only. The booking in progress is marked "In use now"; finished ones drop off; up to seven rows, then "and N more later today". If the feed is down the slide says "Room bookings are not available right now."
- **Timing**: every slide keeps its own Duration and the optional "Show only during specific dates and times" window, inside the playlist's overall dates. Save, approve and publish work exactly as before.

## How it is built

- Slide rules: `lib/continuous-display/live-contract.ts` (app) and `display_private.valid_items` in migration `20261113220000_display_media_rooms.sql` (database). Durations: text 8 to 60 s, picture 5 to 300 s, video 5 to 900 s, rooms 8 to 120 s.
- Files: private bucket `display-media`, no storage policies, so only the server can read or write. Managers get a one-time upload link after `display_media_authorize(screen,'upload')` (needs the screen's edit permission). File names are random and chosen by the server.
- Playback: `/api/display/media/<file>` redirects to a short signed link only for a paired TV whose published playlist uses that file, or for a manager previewing a screen they hold a permission on.
- Rooms: `lib/continuous-display/rooms.ts` projects the lvrooms lobby feed to room label, start and end for today in Las Vegas time; `lib/server/rooms-feed.ts` reads it at most once a minute and only when a published slide is a rooms slide.
- The migration also closes an old gap: the database used to accept a text slide with a missing title, message or duration (the app never sent one).

## Checks run (2026-11-13)

Focused only, no full suite:
- `node --experimental-strip-types --test tests/display-*.test.ts`: 59 passed (includes the new `display-media-rooms.test.ts` and `display-media-rooms-database.test.ts`).
- `npm run build`: passed (includes type check).
- `npx playwright test tests/browser/display-media-rooms.spec.ts tests/browser/display-live.spec.ts tests/browser/display-operations.spec.ts`: 11 passed, fictional data only.

Not verified: a real upload to the hosted bucket, a signed-in manager on lvz.app, the live lvrooms feed through lvz.app, and a physical TV.

## Release steps

1. Done 2026-11-13. Apply `supabase/migrations/20261113220000_display_media_rooms.sql` to project `otecqlkqirncotytbfns` and record it in `docs/HOSTED-MIGRATION-LEDGER.json`.
2. Done 2026-11-13. Merge the pull request and deploy lvz.app (automatic Git deploys stay off).
3. In Church Display, add a Video slide and upload "Shake Nevada 60s (cinematic, widescreen, smaller file).mp4" (22 MB, in Drive). The 61 MB widescreen version is over the 50 MB limit.
4. Add a Study rooms slide, save, approve, publish, and check the paired TV.
