# Study Rooms — Soft Panels redesign

Owner direction, October 18, 2026: Soft Panels is the main interface. Floating Glass supplies restrained accents only. This explicitly supersedes the older Day Sheet appearance rules for Study Rooms; other modules retain their design.

## Experience

- Compact Study Rooms header and calendar shortcut.
- Rooms / Whiteboards / TVs segmented control with a raised white active tab.
- Previous/next date arrows and selector limited to the server's booking window.
- Opaque raised resource columns, plus signs for available slots, muted booked cells and deep green selection.
- Selecting a slot shows resource/time and Continue. Continue opens details and review; only Confirm saves.
- Home, Schedule, center Apps, Bookings and More. More contains history, refresh and authorized manager tools. Apps retains the authorized module registry.
- Glass only on navigation/action accents, with readable opaque fallbacks.

Actual inventory, booking windows, local pauses, permissions, bundles, private details, cancellation, rescheduling, receipts and versions are retained. No schema, grants, stored bookings, restrictions or production configuration change. Reference-image dates and sample bookings are never seeded.

A refreshed conflict invalidates Continue; confirmation still rechecks server availability. Empty inventory has a neutral message. Closing the reservation sheet restores Continue.

## Verification

Node 24 and exact lockfile (`npm ci --ignore-scripts`). Production build, TypeScript, 386 application tests and 198 disposable PostgreSQL permission assertions passed. Browser checks run synthetic responses on the actual module route with activation disabled. This does not establish a genuine hosted member transaction or physical-device acceptance.

Coverage: booking/review/confirm, bundling, cancellation, editing, early release, manager configuration, authorization revocation, date limits, stale selection, empty inventory and Apps navigation. Responsive review at 320, 390 and 1280 pixels. Final browser totals and release receipt follow after verification.

Final browser result: **50/50 Study Rooms and group-access checks passed** on a clean production build. The full application browser run was **110 passed, 3 failed**. The same three failures were reproduced after restoring the original Study Rooms source from main `2ab00311b771a783f0b8c4296013858e67406187` and rebuilding: the fail-closed sign-in message expectation and both confirmation-resend tests. They are unrelated baseline failures and were not changed in this design task.

The standard browser download was unavailable in this workspace. Browser verification used an isolated Chromium 153 package with Playwright 1.64; the repository dependency lockfile and normal browser configuration are unchanged. Temporary browser configuration and synthetic screenshots are not application runtime assets.

## Production release

Merged PR #57. Runtime source: `aaca121bdeb652b2eb882037d94b4b88983f2894`. Deployment `dpl_EW2kSavK6oHXme3AxLg7BhZTRytU` is READY in Vercel project `lvzion-official`, team `lvzion`, target production. Provider readback confirms this exact source and the `lvz.app` / `www.lvz.app` aliases.

Live verification on October 18 (Las Vegas): `/modules/study-rooms` and `/sign-in` returned 200; the served CSS contains the new date strip and final Soft Panels sizing, and the served JavaScript contains the new More management control. Anonymous availability, admin, operations and history endpoints all returned 401 with private/no-store caching. No signed-in hosted reservation was created. No preview was published. Database and permissions were unchanged.

The preceding deployment `dpl_99bVq58phv1XR6dKcpvkruaXsQ21` remains a schema-compatible rollback target. This release receipt is documentation only and does not require redeployment.
