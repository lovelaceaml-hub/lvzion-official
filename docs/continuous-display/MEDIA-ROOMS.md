# Church Display: pictures, videos and study rooms

Built 2026-11-13 on Anthony's request: one official church TV that shows more than text, with slides that are easy to add, remove and schedule. Released 2026-11-13: migration applied, merged in #83, production deployment `dpl_82tboxaBzGMdaCX2WSXfiDQad2iZ` on lvz.app. Content is not added yet.

## What a manager can do

In Apps, Church Display, Content:

- **Add a slide with one tap**: Text, Picture, Video or Study rooms. Remove any slide with Remove slide. Change a slide's type from its Content type menu.
- **Picture**: choose a JPG, PNG or WebP (up to 50 MB). Pick "Show the whole picture" or "Fill the screen". Optional caption.
- **Video**: choose an MP4 or WebM (up to 50 MB). The slide's time is filled in from the video's length. The TV plays it with sound (after one tap on the TV) and moves on when it ends.
- **Study rooms**: today's bookings from lvrooms.web.app, room and time only. The booking in progress is marked "In use now"; finished ones drop off; up to seven rows, then "and N more later today". If the feed is down the slide says "Room bookings are not available right now."
- **Timing**: every slide keeps its own Duration and the optional "Show only during specific dates and times" window, inside the playlist's overall dates. Save, approve and publish work exactly as before.

## Open link and full screen (Anthony, 2026-11-13)

"just have the link able to show this and be able to be full screen mode". lvz.app/display now plays the main display's published playlist for anyone who opens it, with no pairing. The main display is the oldest screen (Lobby Display). A Full screen button shows on load, mouse move or tap and hides after 4 seconds; double-click or the F key also toggles it, and the screen is kept awake where the browser allows. Pairing is optional, at lvz.app/display?pair=1. Server side this uses `display_public_snapshot()` (migration `20261113233000_display_public_link.sql`, service role only), which returns only published, in-window slides, never drafts or devices.

## Sound and landscape (Anthony, 2026-11-13)

"Sound needs to play and full screen needs to auto landscape." Videos start with sound. Browsers refuse sound before the first tap on a page, so if a TV blocks it the video plays silently and a "Tap for sound" button shows; one tap anywhere (or on Full screen) turns sound on for every later video. Full screen asks the device to turn to landscape; if it cannot (iPhone) or stays upright, the display is turned sideways on screen. Exit full screen undoes both.

## The Words of Mother's Love (Anthony, 2026-11-13)

"real mother's love. and when a new submission happens it auto shows that even if on another screen display". A Mother's Love slide (20 to 900 seconds, default 2 minutes) plays the real Mother's Love TV (https://mothers-love.vercel.app/display) during its turn, with its song. The server checks the public Mother's Love feed every 10 seconds for the newest recognition's id and time only. When a newer one appears, the TV switches to the Mother's Love turn at once, whatever is showing, and opens it with `?welcome=<id>` so that recognition plays its arrival (Mother's Love side: the renderer welcomes it on first load if published within 15 minutes). Needs the Mother's Love change that allows lvz.app to frame its renderer (mothers-love PR #57). Migration `20261113235000_display_mothers_love.sql` lets the database accept the slide.

Pictures shown whole (portrait flyers on a wide TV) sit on a blurred, dimmed copy of themselves instead of black bars.

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
