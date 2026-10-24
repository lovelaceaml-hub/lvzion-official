# Worship Duty interface quality record

Direction: **shared base + Theme Atlas 03 "Midnight Sapphire"**, chosen by Anthony on October 24, 2026 (per-app Atlas styles on one shared frame). This supersedes the October 14 Day Sheet treatment recorded in earlier versions of this file. Atlas references: screens `worship-duties`, `worship-calendar`, `worship-presider`, `worship-manage`, `worship-service`.

## How it is built

- **Shared frame:** the module registers its views with `FrameControls`; the root `AppFrame` owns the header (title, avatar) and the bottom bar. Bottom bar: Home, My Duties, center Apps, Manage (or Presider for a presider who does not schedule), More. More holds the remaining section, Setup for the owner and Reload. Home and section changes still ask before discarding an unsaved song plan.
- **Shared style registry:** Worship is registered in `lib/module-styles.ts` (`worship-duty`, Midnight Sapphire, dark by design). The frame sets `data-lvz-module="worship-duty"` and the palette comes from `styles/lvz-tokens.css`, which also styles the header and bottom bar. `components/worship-duty/worship-duty.css` holds page layout only and reads `var(--lvz-…)` tokens: no colors, fonts or radii of its own. Because the style is dark by design, Light, Dark and System all show the same palette.
- **Look:** deep blue ground, framed dark panels with fine sapphire rules, bright blue primary actions, spaced uppercase kickers, bold sans titles and a segmented section control, inside the shared header and bottom bar.
- **Screens:** My Duties has Upcoming / Next 7 days tiles and one card per duty. Manage has a Sunday-first month grid (only days with services can be chosen; a dot marks them), that day's services, the staged batch review and single-service editors. Setup has Services, People and Songs tabs. Swiping on the content switches tabs; the tab buttons stay the main control.
- **No church imagery, emoji or invented content.** Empty states are neutral.

## Evidence (fictional local fixture data only)

Taken by `scripts/test-worship-browser.mjs` on October 24 against the native local stack (real local Auth, PostgREST and PostgreSQL), viewport captures as a member sees them. Names such as "Ben Example" and song codes such as `FIXTURE-01` are fixtures, not real records.

| Screen | Phone (390px) | Desktop (1280px) |
| --- | --- | --- |
| My Duties (assigned member) | [my-duties-phone.png](my-duties-phone.png) | [my-duties-desktop.png](my-duties-desktop.png) |
| Manage, month calendar | [manage-phone.png](manage-phone.png) | [manage-desktop.png](manage-desktop.png) |
| Presider song plan | [presider-phone.png](presider-phone.png) | [presider-desktop.png](presider-desktop.png) |
| Setup, Services tab | [setup-phone.png](setup-phone.png) | [setup-desktop.png](setup-desktop.png) |
| My Duties, device in Dark mode | [my-duties-dark-phone.png](my-duties-dark-phone.png) | [my-duties-dark-desktop.png](my-duties-dark-desktop.png) |

Automated checks in the same run: no sideways scrolling at 320, 390, 430, 768 and 1280px on all three setup tabs and the planner; the frame shows Home, My Duties, Apps, Manage and More with the title Worship Duty; the frame carries `data-lvz-module="worship-duty"` with the Sapphire ground; with the device in Dark mode the page resolves `data-lvz-scheme="dark"` and keeps the same palette. `tests/appearance.test.ts` (shared contrast check) passes.

## Not done

- No automated accessibility scan, screen-reader pass, physical-phone check or first-time-user test.
- Contrast was reviewed by eye and against the Atlas tokens, not measured for every state.

## Shared frame requests

None open. The header icon and the palette now come from the shared registry (main `8606dad`). Worship screens were not added to the shared design sweep (`tests/design-sweep/sweep.spec.ts`), because Worship pages need the server-side member check; the native local browser run above covers them in Light and Dark instead.
