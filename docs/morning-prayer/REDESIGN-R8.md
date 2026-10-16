# Morning Prayer Day Sheet redesign R8

[Actual module](https://lvz.app/modules/work-mission-prayer). Phase 2 of the lvz.app refactor and redesign. The module now follows the locked [Day Sheet design contract](../design/LVZ-DESIGN-CONTRACT.md) that Anthony chose on 2026-10-14. Every capability, permission check, database call and API request is unchanged from [R7](REFACTOR-R7.md); only the screens changed.

## What members see

- The shared header: tapping "LV Zion" goes back to the member home.
- A serif page title, "Morning Prayer". The sections (Home, Schedule, Me, Manage) are a white bottom tab bar with line icons on phones, as the product decisions ask for apps, and underlined tabs under the title from 900px wide. Swiping left or right on the content also changes section, following the shared rule (at least 60px across, mostly sideways, under 600ms, no wrap). The visible tabs stay the main control. The calendar ignores swipes so a date tap is never mistaken for one.
- Home leads with the next gathering's time in large tabular figures, then the date, host and whether the date is confirmed. "Join the gathering" is the one primary action and appears only when joining is open. Upcoming dates follow as a day line: time on the left, a small marker, then host and date. PWP for the month sits underneath on phones and in a 320px side column on desktop.
- Schedule keeps the month calendar on the paper background; only scheduled days get a white tile. The selected date's details sit beside the calendar on desktop.
- Me and Manage use hairline lists instead of cards. Setup forms open from hairline disclosure rows. Buttons, inputs, notices and empty states use the shared `ui-` classes.
- The old blue palette, gradient hero, letter-spaced labels, the "WM" tile and the footer are gone. The three style files became one, built only from `styles/lvz-tokens.css`; it holds no raw colors, fonts or pixel radii.

## Evidence

Fictional fixture screenshots (no member data), regenerated with `node scripts/test-morning-prayer-browser.mjs morning-prayer-screens.spec.ts`:

| Screen | Phone 390px | Narrow 320px | Desktop 1280px |
| --- | --- | --- | --- |
| Home | [phone](../design/work-mission-day-sheet/home-phone.png) | [320](../design/work-mission-day-sheet/home-narrow.png) | [desktop](../design/work-mission-day-sheet/home-desktop.png) |
| Schedule | [phone](../design/work-mission-day-sheet/schedule-phone.png) | [320](../design/work-mission-day-sheet/schedule-narrow.png) | [desktop](../design/work-mission-day-sheet/schedule-desktop.png) |
| Me | [phone](../design/work-mission-day-sheet/me-phone.png) | [320](../design/work-mission-day-sheet/me-narrow.png) | [desktop](../design/work-mission-day-sheet/me-desktop.png) |
| Manage | [phone](../design/work-mission-day-sheet/manage-phone.png) | [320](../design/work-mission-day-sheet/manage-narrow.png) | [desktop](../design/work-mission-day-sheet/manage-desktop.png) |

## Not done here

- No first-time-user test, no physical iPhone or Android check, and no full accessibility audit. Focus rings, labels, 44px targets and no sideways scrolling at 320px are covered by the browser tests and screenshots.
- The desktop header is still the plain shared header; the white top bar with navigation described in the contract belongs to the shared core.
- Not deployed.

## Build log

- Merged the shared core branch with the contract and tokens (`5fcbe5a`) into the R7 branch.
- Rebuilt every screen on the shared header, tokens and `ui-` classes; merged the three style files into one token-only file.
- Reviewed fictional screenshots at 390, 320 and 1280px. Fixed wrapping action buttons, a duplicate first upcoming date, stretched desktop buttons and wrapping status labels.
- Found that `docs/PRODUCT-DECISIONS.md` and the contract both keep a bottom tab bar for app sections on phones; restored it with shared icons, keeping underlined tabs for desktop.
- Added a browser case for the home wordmark and the swipe thresholds, and a screenshot spec for this evidence.
- `npm run build` passed: strict types, 379 application tests, SQL assertions and the Next production build. 16 of 16 Morning Prayer browser cases and 4 of 4 PostgreSQL race cases passed. The shared core branch had no newer commits at finish (`5fcbe5a`).
