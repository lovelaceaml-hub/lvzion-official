# lvz.app audit and repair, October 24, 2026

Anthony reported that the whole app "is not functioning correctly and the visual design is all messed up". This audit covers the existing app on `main` (`d1698af`), screen by screen, and records what this branch fixed.

How it was checked: the app ran locally on loopback with member activation off. Every screen was opened with fictional fixtures only (the repository's demo workspace and intercepted API answers). Nobody signed in to or wrote to the live app. Screens were captured at 390px (phone) and 1280px (desktop) by `node scripts/design-sweep.mjs <folder>`; each screenshot has a JSON file beside it with layout checks (dock overlap, sideways scrolling, console errors, page titles, brand count).

- Before: [before/390](before/390), [before/1280](before/1280)
- After: [after/390](after/390), [after/1280](after/1280), including dark appearance screens `40` to `47`
- Screenshots are reduced to 256 colors to keep the repository small.

## Design direction (Anthony, October 24)

One shared base everywhere, and each app wears its own style from the Theme Atlas. Base: **Layered Tabs** (Atlas Foundation, the direction of the Atlas home, sign-in, sign-up and profile screens). Appearance: **System, Light, Dark**. Full contract: [LVZ-DESIGN-CONTRACT.md](../../design/LVZ-DESIGN-CONTRACT.md).

## Defects found

Status: **Fixed** on this branch, **Remaining** (with reason), or **By design**.

### Function

| # | Screen | Defect | Status |
| --- | --- | --- | --- |
| F1 | Sign in, sign up, recovery, request access, install | The member bottom dock (Home, My Week, Apps, Profile, More) and profile circle showed to signed-out visitors. On phones the dock covered the sign-up password field. Every dock button led to a page that needs sign-in. | Fixed. Public pages show the header with Sign in (Create account on the sign-in page) and no dock. See `before/390/03-sign-up.png` and `after/390/03-sign-up.png`. |
| F2 | Study Rooms, signed out or loading | While loading, the page said "Checking your reservation access..." next to a Sign in button, even for signed-in members. The signed-out result looked like an error. | Fixed. Loading says "Loading Study Rooms..." with no buttons. Signed out says "Sign in to reserve a study room." with Sign in. Other failures offer Try again. |
| F3 | All member pages, signed out | Signed-out handling was inconsistent: Contacts, Church Display and Morning Prayer redirect to sign-in; Study Rooms, Home and Who can book stayed on the page with different messages and the member dock. | Fixed for the chrome and messages: any member page whose sign-in check says signed out now hides the dock and shows Sign in in the header, with a clear message. Remaining: the server redirect is still used only where it already existed (see R1). |
| F4 | Appearance, signed out | Reachable without signing in. | By design: it is a device-only setting with no member data. Signed-out visitors now see the public header, not the member dock. |
| F5 | Who can book (Study Rooms), signed out | Said "Only group leaders can change who books in their group." to visitors who were simply signed out. | Fixed: "Sign in to manage who can book." with Sign in. |
| F6 | Contacts, not granted | A signed-in member without Contacts saw "This record or action is no longer available." plus a Sign in link. | Fixed: "Contacts has not been assigned to your account."; Sign in only appears when signed out. |
| F7 | Contacts, empty | With no contacts at all it said "No contacts match. Change the search or status, or load more contacts." | Fixed: "No contacts yet". The search message remains for real no-match searches. |
| F8 | Church Display, no screen assigned | A warning notice and the empty state repeated the same message. | Fixed: one empty state that says what to do. |
| F9 | Any unknown address | The default unstyled Next.js 404 page. | Fixed: a styled "Page not found" page with Go to Home. |
| F10 | Every screen | Tapping the header did not go Home (church UI rule). | Fixed: the header title is a Home link. |
| F11 | Forms under the fixed bars | A focused field could sit under the fixed header or dock. | Fixed: the page scrolls focused fields clear of both bars. |
| F12 | Console | Only the expected 401, 403 and 404 resource messages from fictional denials. No script errors on any screen, before or after. | No change needed. |
| F13 | Members management at 390px | The sweep first flagged fields under the dock. | Not a defect: the fields were inside collapsed sections. The sweep now ignores hidden content. |

### Visual

| # | Screen | Defect | Status |
| --- | --- | --- | --- |
| V1 | Sign in, sign up, recovery, activation, Home loading | "LV Zion" appeared twice (header and page wordmark). | Fixed: the page wordmark is removed. |
| V2 | Whole app | Three competing visual languages (green serif Day Sheet, Study Rooms Lavender Softform with glass, and a 24-theme picker layered over both). | Fixed: one base plus one Atlas style per app; the 24-theme picker is replaced by System, Light, Dark. Saved theme choices map to Light or Dark. |
| V3 | Apps sheets (frame and Home) | App tiles printed short names ("Rooms", "Contacts", "Prayer") that overflowed the tile onto the app name. | Fixed: each app tile shows its icon. |
| V4 | Page titles | Serif page titles sat beside sans controls on every screen. | Fixed: the base uses bold sans titles as in the Atlas; Work Mission keeps the editorial serif of Linen Editorial. |
| V5 | Who can book (Study Rooms) | Wore the green base and had a stray centered "Study Rooms" link. | Fixed: it wears the Study Rooms style and has a "Back to Study Rooms" link. |
| V6 | Contacts, Morning Prayer, Church Display, Members | All looked the same green; no app had its own identity except Study Rooms. | Fixed: Tidal Teal, Linen Editorial, Pearl Garden and Graphite & Chrome. Profile stays on the base. |
| V7 | Sign in and other account pages | The form floated directly on the page background. | Fixed: the form sits on one raised surface, as on the Atlas sign-in screen. |
| V8 | More menu | Appearance and Install used the same icon. | Fixed. |
| V9 | No dark mode | Light only. | Fixed: Dark and System, with a dark companion for every light app style; Worship Duty, Concert and Song library are dark by design. |

### Remaining

| # | Item | Why it remains |
| --- | --- | --- |
| R1 | Contacts, Church Display and Morning Prayer still redirect signed-out visitors to the sign-in page, while Study Rooms and Home show a sign-in message in place. | Making every page redirect needs a session check before the page loads. It cannot be verified locally without a real sign-in, and a wrong check could lock signed-in members out. Both paths now look and read the same. |
| R2 | The live "Checking your reservation access..." stall was not reproduced. | Local fixtures answer immediately, and the live app was off limits. The loading text and buttons are fixed; confirm on the live site after release. |
| R3 | Unknown addresses show the member dock to signed-out visitors. | The frame cannot tell a 404 from a member page by its address. Low impact. |
| R4 | Contacts and Morning Prayer repeat the header title as the page title. | Module content; left for the module owners. |
| R5 | Study Rooms' current-time label is partly hidden under the column headings when the time is at the top of the grid. | Existing approved layout; unchanged. |
| R6 | No physical phone check. | Browser emulation only. |
| R7 | Groups & Gospel Planning style. | Resolved: registered as Skyline Grid at its build session's request. |

## Verification on this branch

See the pull request description for the exact commands and results.
