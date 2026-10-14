# Continuous Church Display — production release sequence

> Initial release contract. The [current handoff](../HANDOFF.md) confirms the installed schema and approved owner module, with one disabled screen, zero publications and zero active devices at audit. Display operations PR #32 subsequently merged and deployed; see [R2 operations](OPERATIONS-R2.md). An applied migration alone does not establish a deployed UI, and no physical TV acceptance is implied.

This module is for **https://lvz.app**. It builds on the real member/Auth system rather than the fictional preview branch. The existing Mother’s Love and Study Room Scheduler remain independent and unchanged.

## Release boundary
1. Apply only the additive private schema migration after confirming project ref `otecqlkqirncotytbfns` and backup/rollback controls.
2. Deploy the reviewed, tested real web routes at `/modules/continuous-display`, `/display`, `/api/display/manage`, and `/api/display/device` through the existing Vercel `lvzion-official` production project. Preserve current signup/email settings and modules.
3. Verify anonymous API denial, sign-in, initial unpaired TV behavior, and unchanged signup routes.
4. **Only then**, apply the separately reviewed owner-only activation command in `docs/continuous-display/live-activation.sql`. It is deliberately **not** placed in the migration directory for blind `db push`, because the standalone foundation migration test database has no bootstrapped owner. It was tested independently with a synthetic owner and confirmed idempotent.
5. Recheck module visibility through the authorized Apps feed and verify exactly one approved module manager (the confirmed existing owner), one disabled Lobby Display, four independent permissions, zero published slides and zero paired devices.

## What works once activated
Authorized owner may create up to sixteen concise text cards (announcements, date-specific schedules, events and approved campaign text); reorder, set durations, schedule a Las Vegas-local publication window, save as an optimistic draft, approve that exact revision, and publish a versioned snapshot. Previous published versions and anonymous playback remain independently separated from drafts. A phone may issue a 5-minute one-time pairing code; a TV visits `lvz.app/display` and enters it to receive a revocable, HttpOnly screen-scoped device session. The TV polls a minimal approved package every 12 seconds and expires its cached-in-memory eligibility within 30 seconds; offline restart is neutral. No service-role key enters a browser. No actual TV is connected automatically.

## Deliberately not published/activated
No real religious text, event data, QR link, private prayer details, contacts, Mother’s Love feed, room availability feed, media upload, video, or arbitrary URLs are seeded or imported. All new slides must be explicitly created, reviewed and approved by an authorized person. The default real screen has no active publication and is not paired; it displays a neutral welcome.

## Verification scope
- Production-based Next build, existing member/Auth regression suites and separate display tests must all pass.
- Disposable PostgreSQL verified the display schema, exact revision approval and publication, private table denial, screen isolation, one-time pairing, revocation, and TV-only projection.
- Physical iPad/70-inch TV, extended soak, live account workflow and browser/device tests are still required before a common-area TV pilot.
- An approved rollback reverts the Vercel deployment and retires module access without deleting publication/audit records. Do not drop live tables as rollback.

## Scope and support
Initial release supports text and animated backgrounds with reduced-motion support. Video/media sanitization and production Mother's Love adapters are independent later additions requiring explicit destination-specific review.
