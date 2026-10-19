# Study Rooms — Lavender Softform

## Approved scope

The owner selected prototype **06 / Lavender Softform**, then requested a continuous schedule reaching the bottom of the screen, a more transparent floating Reserve card with the selected grid behind it, and a final ordering change: resource items become tabs attached directly to the header, with dates below them. The instruction to make this design the real app authorizes this implementation and its deliberate production release.

This is the current Study Rooms visual direction. It supersedes the earlier green Soft Panels, separate `+ Open` tiles, hourly-only time labels, resource-after-date ordering, and circle-only Apps styling described in earlier release records. Those records remain historical evidence.

## Screen behavior

The schedule view uses this order:

1. The shared compact module header, title and authenticated member avatar.
2. Rooms, Whiteboards and TVs as attached header tabs.
3. The server-bounded four-day date window and its navigation arrows.
4. A continuous ruled schedule with a half-hour time rail, actual resource columns, availability, existing bookings and current-time indicator.

The schedule scroll area extends to the viewport bottom. Selecting an available cell highlights it in plum without changing the scroll area's height or resetting its position. A translucent floating tray shows the selected resource and time beside Reserve. Reserve opens the existing review and confirmation flow. Scroll-end clearance lets the final available interval move above both the tray and bottom navigation.

The shared five-item dock remains Home, Schedule, center Apps, Bookings and More. Apps is raised above the dock as a plum rounded square with a pearl four-square icon. The Apps list remains server-filtered. History, refresh and authorized management remain available through the existing controls.

## Visual and accessibility decisions

Lavender and plum tokens are scoped to the Study Rooms route. The header, attached tabs, date controls, selected slot, Reserve action and dock follow the approved soft raised treatment. The grid retains legible text and fine rules while remaining visible behind the floating glass surfaces. Booked and unavailable states stay distinct from selectable cells.

Interactive targets remain at least 44 px. Resource controls retain programmatic pressed state and descriptive accessible names; time cells keep full resource and AM/PM availability labels. Keyboard focus, native reservation dialogs, reduced-motion behavior and reduced-transparency fallbacks are preserved. Decorative date effects do not create availability rules.

The frame's optional header-content and viewport mode are registered only for the active schedule view. Switching views or routes clears these controls so other modules retain their existing frame behavior.

## Data and release boundaries

This release changes client presentation and shared frame integration. It does not seed reference-image rooms, dates or bookings. Inventory, booking windows, reservations, closures and permissions remain supplied by the existing application endpoints. Server availability rechecks, conflict handling, reservation bundles, history and permission denials remain in place.

There are no database migrations, grant changes, activation changes or new dependencies. Automatic Git deployments remain disabled. Production is released deliberately from a verified source commit; no preview is required.

## Verification

Local verification used Node 24.19.0 and the pinned lockfile, installed with `npm ci --offline --ignore-scripts`. The production build passed TypeScript, all **386 application/disposable-database tests**, **198 additional PostgreSQL permission assertions**, and the optimized Next.js build. A final type check also passed after the test-fixture additions.

The final complete browser suite passed **131 of 131 checks**, with no exclusions. It used the existing activation-disabled loopback server and an installed Chromium executable selected through a local-only Playwright config. The source configuration remains portable.

Responsive checks at **320, 390 and 1280 px** verified attached resource tabs, date preservation when switching resource kinds, viewport-bottom grid geometry, stable scroll position and height on selection, overlay clearance, and access to the final 10:30 PM interval. Existing booking review/save, bundles, conflicts, cancellation, history, manager access, anonymous denials and current-time/manual-scroll cases passed. Final screenshots at these widths were reviewed with both empty selection and the selected reservation tray.

Visual review caught a production CSS compatibility issue: when the prefixed backdrop declaration followed the standard declaration, minification retained only the prefixed property and Chromium lost the blur. The declarations now keep the standard property last. A browser regression checks the computed filters on the loaded production CSS. The more transparent tray keeps its approved low opacity while the blur prevents underlying grid text from competing with its summary. The now-label background also covers the full time-label area.

The first full run exposed four unrelated fixture failures. The Display fixture now derives its mocked server time and leases from the same frozen browser clock. The three preexisting sign-in/resend failures now use an explicit HTTP-loopback-only fixture for the pinned BotID client challenge; production authentication code and settings are unchanged. Their API, privacy and denial assertions were retained, and a focused four-case run passed before the final complete suite.

Browser fixtures use synthetic data on the real module route. They do not represent a real member's production reservation, hosted BotID acceptance or physical-device acceptance. The exact production receipt is recorded after deliberate deployment.

## Recovery

The preceding verified production deployment is `dpl_DieNhYCz7injBNmDtRUBaTDb6qs6`, runtime source `7f1128f7b85d93db58ff739e35dc08b15e8e374f`. With no schema changes in this release, it remains a compatible presentation rollback. Verify provider state and aliases before performing any recovery action.
