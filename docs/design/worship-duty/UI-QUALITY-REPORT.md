# Worship Duty interface quality record

Direction: **A. Day Sheet**, locked by Anthony on 2026-10-14 in [LVZ-DESIGN-CONTRACT.md](../LVZ-DESIGN-CONTRACT.md). This module adopts that contract; it adds no palette, font, external asset or dependency. Every color, size, radius and duration in `components/worship-duty/worship-duty.css` is a `var(--lvz-...)` token, and the screens use the shared `ui-` blocks, `AppHeader` and `useSwipeTabs`.

## What changed on screen

- Shared header: tapping the LV Zion wordmark goes home (still asks first when a song plan has unsaved changes). Setup and Reload sit on the right.
- Serif page title (My Duties, Presider, Manage, Setup) with a plain kicker; no letter-spaced capitals.
- Underlined tabs below the title. Swiping left or right on the tab content switches tabs with the contract's rule (60px, 1.5 times more across than down, under 600ms, no wrap). The tab buttons remain the main control.
- Lists, not cards: upcoming duties, the service schedule, requests, duty editors and setup services are hairline rows. Only forms (assignment, planner, batch review, setup forms) sit on a white surface.
- Time first: every scheduled row starts with the Las Vegas clock and day in tabular figures.
- Desktop (900px and wider): white header bar, a reading-width heading, the list column, and a 320px side column holding "Your availability" (My Duties) or "Requests waiting" (Manage). On phones the requests come first, availability after the schedule.
- Song order uses arrow icon buttons from the shared icon set, each with a spoken label ("Move song 1 up").
- Status notices use the shared tones: success for "Saved.", warning for uncertain saves and conflicts, danger for errors.

## Evidence (fictional fixture data only)

Screenshots in this folder were taken from the real components rendered by a local, uncommitted harness page, with the Worship API answered by fictional records (names such as "Sam Rivera" and "Chris Park" are invented). They are not evidence that any real service, member or song was entered.

| Screen | Phone (390px) | Desktop (1280px) |
| --- | --- | --- |
| My Duties | [my-duties-phone.png](my-duties-phone.png) | [my-duties-desktop.png](my-duties-desktop.png) |
| Presider song plan | [presider-phone.png](presider-phone.png) | [presider-desktop.png](presider-desktop.png) |
| Manage (planner, staged batch, open editor) | [manage-phone.png](manage-phone.png) | [manage-desktop.png](manage-desktop.png) |
| Setup (member open) | [setup-phone.png](setup-phone.png) | [setup-desktop.png](setup-desktop.png) |

Checks run on 2026-10-14:

- No sideways scrolling at 320, 390 and 1280px on all four screens.
- Keyboard: Tab order reaches the wordmark, Setup, Reload, then the tabs; the focused tab shows the 3px focus ring.
- A simulated touch swipe on the My Duties content moved to Presider.
- Every input keeps its visible label; all accessible names used by the native Worship browser script are unchanged (for example "Planner service", "Glory song", "Apply reviewed assignments", "Add approved song").

## Not done

- The native Worship browser script (real local Auth and database) was not rerun: another agent's Worship test stack occupies its fixed directory and ports.
- No automated accessibility scan, physical-phone check or first-time-user test was run. No fidelity percentage is claimed.

## Requests for the shared core

- `ui-header` could switch to the solid white bar by itself at 900px; this module does it with one local rule.
- A shared bottom tab bar class, if the contract wants one on phones; this module uses the underlined `ui-tabs` at the top.
