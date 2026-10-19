# Study Rooms — owner reference layout correction

Anthony's second reference on October 18 replaces the continuous raised columns with individual rounded time tiles.

- The schedule opens directly with icon-labelled Study rooms, Whiteboards and TVs tabs. Other booking screens retain the compact module header.
- Date navigation stays within the application's bookable horizon. The selected date and short instruction precede the grid.
- Time labels appear at each hour, with a thin rail spanning the two half-hour rows. Every row and button retains its full time in its accessible label.
- Each available slot is a separate rounded `+ Open` tile. Selected slots use a green check; unavailable/owned/booked states remain distinct.
- A full-width Reserve button remains above the Home / Schedule / center Apps / Bookings / More navigation. It opens the booking details sheet; only the existing Confirm action saves. Selecting a tile prefills its resource and interval and shows a summary above Reserve.
- A conflict disables Reserve and asks the member to choose another time. A local booking pause disables the action. Empty resource inventory has no reservation action.
- Refresh details and group-access links remain available under More, with warnings still visible on the schedule.

The sample image supplies appearance only. Actual inventory, availability, dates, permissions and service restrictions remain authoritative. No database changes or seed data are part of this correction.

## Verification

Production build, TypeScript, 386 application tests and 198 disposable PostgreSQL permission assertions passed. Browser verification covers the actual module route with synthetic API fixtures and activation disabled, including phone/tablet layout, booking lifecycle, permission denials, stale reads and the authorized Apps launcher. Physical phones and genuine hosted member transactions remain separate acceptance checks.

Final result: 51/51 Study Rooms and group-access browser checks passed on a clean production build. Screenshots reviewed at 320, 390 and 1280 pixels, including selected tile and reservation sheet. Browser runtime used the isolated Chromium package documented in the prior Soft Panels receipt. The previously reproduced unrelated sign-in/resend baseline failures are unchanged.
