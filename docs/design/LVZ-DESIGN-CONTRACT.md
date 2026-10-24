# LV Zion design contract: one base, a style per app

Status: current contract, October 24, 2026. Supersedes the Day Sheet contract (October 14), the 24-theme device picker (October 19) and the per-release glass notes as the source of truth for how screens look. The earlier documents remain as history in Git.

Anthony's decision (October 24, 2026): **one shared base** used everywhere (app frame, header, bottom dock with the raised center Apps button, typography, spacing, radii, controls, empty, error and loading states), and **each app wears its own style** from Anthony's Theme Atlas (October 19, 2026). The device appearance choice is **Light, Dark or System**.

## The pieces

| What | Where | Notes |
| --- | --- | --- |
| Tokens: base palette (light and dark), type, spacing, radii, motion, and every module style | `styles/lvz-tokens.css` | The only place colors are defined. Loaded globally. |
| Shared building blocks (`ui-` classes) | `styles/lvz-ui.css` | Buttons, fields, lists, notices, sheets, empty states. |
| App frame: header, bottom dock, Apps and More sheets | `components/app-frame.tsx`, `components/app-frame.css` | Rendered once by the root layout. Modules never draw their own header or bottom bar. |
| Module registry: route, title, icon and Atlas style per app | `lib/module-styles.ts` | The frame reads it to set `data-lvz-module`. |
| App tile icons | `components/module-icon.tsx` | Used by the Apps sheets and Home. |
| Module actions in the dock | `FrameControls` from `components/app-frame.tsx` | Two neighbors of Apps, optional More items, optional title and style override. |
| Appearance (Light, Dark, System) | `lib/appearance-preference.ts`, `lib/appearance.ts`, `components/appearance-sync.tsx`, `/appearance` | Resolved before first paint to `:root[data-lvz-scheme]`. |
| Swipe between tabs | `lib/use-swipe-tabs.ts` | Every tabbed view. |
| Script copies of base colors | `lib/design-tokens.ts` | Manifest and theme-color meta only. |

## The shared base

Neutral base: **Layered Tabs** (Atlas 01, the Foundation direction used on the Atlas `main-home`, `main-signin`, `main-signup` and `main-profile` screens). It is quiet paper with forest-green actions, close to the earlier Day Sheet, so existing screens keep their calm look while dropping the serif and glass mix.

- Home, sign in, sign up, password recovery, Appearance, Profile and anything not registered as a module wear the base.
- Type: the phone's own system text everywhere. Page titles use `--lvz-font-display` (base: bold system sans, tight tracking). Sizes 12, 14, 16 (body and every input), 18, 22, 30, 40.
- Spacing: 4px steps (`--lvz-space-1` to `--lvz-space-12`); gutter 20px on phones, 48px from 900px.
- Radii: 8, 12, 16 and round. A module may change the scale only if its approved design requires it (Study Rooms does).
- Every tap target is at least 44px; buttons and inputs are 48px. Focus ring 3px `--lvz-focus`.
- Empty states: one bold line and one sentence, plus one action when useful (`.ui-empty`). Errors say what happened and what to do next (`.ui-notice` with a tone). Loading says what is loading.
- Church rules: minimal and professional, no cross or church imagery, no emoji, swipe switches tabs, tapping the header title goes Home.

### Frame behavior

- Header: module icon and title on the left (a link to Home), profile circle on the right.
- Bottom dock: Home, module action, raised center **Apps**, module action, More. Only for signed-in members.
- Signed out: public pages (`/`, sign in, sign up, recovery, activation, request access, install) and member pages whose access check answers "signed out" show the header with **Sign in** (or **Create account** on the sign-in page) and no dock, avatar, Apps or More.
- Fixed bars never cover a focused field: the page has scroll padding for the header and dock.
- `/display` (paired TV player) stays full screen with no frame and ignores the device appearance.

## Module styles

Each module style redefines palette tokens only, inside `[data-lvz-module="<key>"]`, with a dark companion under `:root[data-lvz-scheme="dark"] [data-lvz-module="<key>"]`. Atlas picks that are dark by design keep their palette in both schemes. Status colors (danger, warning, success) follow the scheme.

| App | Key | Atlas style | Light | Dark |
| --- | --- | --- | --- | --- |
| Home, sign in, profile | (base) | Layered Tabs | paper and forest green | deep green-black companion |
| Study Rooms (and Who can book) | `study-rooms` | Lavender Softform, approved Oct 19 (Liquid Opal family) | approved values, unchanged | plum night companion |
| Worship Duty | `worship-duty` | Midnight Sapphire | dark by design | same |
| Work Mission (Morning Prayer) | `work-mission` | Linen Editorial, serif titles | linen and bronze | dark linen companion |
| Contacts | `contacts` | Tidal Teal | teal | deep teal companion |
| Members and organization | `members` | Graphite & Chrome | graphite | graphite night companion |
| Continuous Display management | `continuous-display` | Pearl Garden | botanical green | garden night companion |
| Groups & Gospel Planning | `gospel-planning` | Skyline Grid, square edges, flat header and dock | blue grid | night grid companion |
| Mother's Love | `mothers-love` | Rose Quartz | rose | rose night companion |
| Concert | `concert` | Aurora Night | dark by design | same |
| Song library | `song-library` | Copper Noir | dark by design | same |

Notes:
- Study Rooms keeps its approved Lavender Softform layout and values. Its raised plum Apps square and attached resource tabs are scoped to the `study-rooms` style. Atlas Liquid Opal is the same purple family; no redesign was made.
- Members: the Profile tab and the Unassigned profile wear the base; the organization and management tabs wear Graphite & Chrome.
- Groups & Gospel Planning wears Skyline Grid (requested by its build session on October 24): square 7px corners and a flat header and dock with no blur or shadow.

### Palette tokens a style may set

`--lvz-ground`, `--lvz-surface`, `--lvz-sunken`, `--lvz-ink`, `--lvz-ink-quiet`, `--lvz-ink-faint`, `--lvz-line`, `--lvz-line-input`, `--lvz-accent`, `--lvz-accent-strong`, `--lvz-accent-soft`, `--lvz-on-accent`, `--lvz-focus`, `--lvz-time-marker`, `--lvz-shadow-sheet`, `--lvz-shadow-pop`; optionally `--lvz-font-display`, `--lvz-display-weight`, `--lvz-display-tracking` and the radius scale. Nothing else.

Readability is enforced by `tests/appearance.test.ts`: in every style and scheme, text, secondary text and links reach 4.5:1 on both ground and surface, and button text reaches 4.5:1 on the accent.

## Appearance: Light, Dark, System

- More, then Appearance, offers three choices. Default is System.
- Stored under the existing key `lvz.appearance.v1` as `light`, `dark` or `system`. Choices saved by the October 19 release still work: a dark theme (Midnight Sapphire, Aurora Night, Copper Noir, Plum Velvet) becomes Dark, any other theme becomes Light.
- A small script in the page head applies the choice before first paint. System follows the device and updates when the device switches. Other tabs update on change. A blocked store still applies the choice for the session and says it could not be saved.

## How a module adopts its Atlas style

1. **Register the module** in `lib/module-styles.ts`: `{key:'worship-duty',routes:['/modules/worship-duty'],title:'Worship Duty',icon:'calendar',atlas:'Midnight Sapphire',darkByDesign:true}`. The frame then sets `data-lvz-module` on every page under those routes, including setup and loading screens.
2. **Use the style block** in `styles/lvz-tokens.css`. Worship Duty, Groups & Gospel Planning, Mother's Love, Concert and Song library blocks are already there. A new module asks the shared-frame owner to add one from its Atlas `tokens.json` (`bg`, `surface`, `ink`, `muted`, `accent`, `onAccent`, `line`), plus a dark companion unless the pick is dark by design. Run `node --experimental-strip-types --test tests/appearance.test.ts` to check contrast.
3. **Write module CSS with tokens only**: `var(--lvz-accent)`, `var(--lvz-surface)` and so on. No hex colors, font names or pixel radii in module CSS, so the module follows Light, Dark and its style automatically.
4. **Use the shared pieces**: `ui-title`, `ui-button`, `ui-field`/`ui-input`, `ui-list`/`ui-row`, `ui-notice`, `ui-empty`, `ui-sheet`. Do not add a module header or bottom bar; register actions with `<FrameControls left={...} right={...} more={[...]}/>`. Pass `module={null}` for a view that should wear the base (as Profile does), and `title` when the view needs a different header title.
5. **States**: signed out (401) shows a Sign in action; not granted (403) says the app has not been assigned; empty data shows a neutral `ui-empty` line. Never show sample records as fallback.
6. **Check** 320, 390 and 1280px in Light and Dark with `node scripts/design-sweep.mjs <out-dir> "<screen-name>"` (add your screens to `tests/design-sweep/sweep.spec.ts`). Keep every permission and data rule as it is.

## Will never be

- A second header, a module bottom bar, or a module palette outside `styles/lvz-tokens.css`.
- Sample or reference-image data presented as real records.
- Church imagery, crosses, emoji, or decorative clutter.

## Ownership

The shared-frame owner changes `styles/lvz-tokens.css`, `styles/lvz-ui.css`, `components/app-frame.*`, `lib/module-styles.ts`, the appearance files and this document. Module owners request additions. Material changes go back to Anthony.
