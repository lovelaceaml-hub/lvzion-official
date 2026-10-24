# LV Zion design contract: one design language, a palette per app

Status: current contract, October 24, 2026 (evening). Supersedes the morning version of this document ("one base, a style per app"), the Day Sheet contract (October 14), the 24-theme device picker (October 19) and the per-release glass notes. The earlier documents remain as history in Git.

Anthony's decision (October 24, 2026): every app shares **one design language, Liquid Opal**, taken from the Theme Atlas Study Rooms availability screen (`screens/study-availability/mobile/liquid-opal.png`). "All the apps should have the design of this app. Of course colors and things can be different depending on the app but it should all still look related." Each app keeps the screen structure of its own Atlas screens, rendered in the Liquid Opal material; only the accent and tint palette changes per app. The device appearance choice is **Light, Dark or System**, and Dark uses the same material.

The earlier release changed colour tokens only. This contract is about layout and components: every screen is composed from the shared kit below. Side-by-side evidence for every rebuilt screen (rebuilt Light, rebuilt Dark, the Atlas screen in Liquid Opal, the Study Rooms reference) is in `docs/design/atlas-build/`.

## The material

- **Ground**: a soft gradient tint (`--lvz-backdrop`: two tints and the accent wash over the ground colour), fixed behind the page.
- **Glass panels**: frosted rounded cards (`--lvz-glass`, `--lvz-glass-border`, `--lvz-glass-shadow`, radius `--lvz-radius-xl`, 30px), with a light blur where supported and a solid surface under reduced transparency.
- **Actions**: one gradient pill per screen (`--lvz-action`: accent to its partner `--lvz-accent-2`), also used for the selected segment, the selected date chip and the hero card.
- **Controls**: pill segmented control with a filled active pill; round date chips with a filled selected chip; rounded square quick-access tiles; stat tiles; a rounded search pill; rows inside glass cards with rounded icon or initials boxes; small tags; a floating selection tray; a small muted legend; icon empty states.
- **Frame**: a frosted full-width header with the app's rounded gradient icon tile, its name and a small uppercase subtitle, and a round gradient avatar; a floating rounded dock (Home, module action, raised round gradient **Apps**, module action, More).
- Type: the phone's own system text everywhere (no serif titles). Sizes 12, 14, 16 (body and every input), 18, 22, 30, 40. The Atlas renders 9 to 12px text; the product scales it to these minimums.
- Spacing: 4px steps; gutter 20px on phones, 48px from 900px. Radii: 10, 16, 24, 30 and round.
- Every tap target is at least 44px; buttons and inputs are 48px. Focus ring 3px `--lvz-focus`.
- Empty states: an icon, one bold line and one sentence, plus one action when useful. Errors say what happened and what to do next. Loading says what is loading.
- Church rules: minimal and professional, no cross or church imagery, no emoji, swipe switches tabs, tapping the header title goes Home.

## The pieces

| What | Where | Notes |
| --- | --- | --- |
| Tokens: base palette (light and dark), every app palette, type, spacing, radii, motion and the derived material | `styles/lvz-tokens.css` | The only place colours are defined. Loaded globally. |
| Shared building blocks (`ui-` classes) | `styles/lvz-ui.css` | Page heading, glass, hero, quick tiles, stat tiles, search, segmented control and tabs, date chips, section header with text action, rows and icon boxes, tags, timeline, tray, legend, detail pairs, buttons, fields, notices, empty states, sheets. |
| React kit | `components/ui-kit.tsx` | `PageHeading`, `Hero`, `SectionHeader`, `TextAction`, `Glass`, `QuickGrid`, `StatTile`/`StatGrid`, `SearchField`, `Segmented`, `DateStrip`, `IconBox`, `Row`, `Tag`, `Tray`, `EmptyState`, `initialsOf`. |
| App frame: header, dock, Apps and More sheets | `components/app-frame.tsx`, `components/app-frame.css` | Rendered once by the root layout. Modules never draw their own header or bottom bar. A dock action may carry `short` (visible label) while `label` stays its accessible name. |
| Module registry: route, title, icon and palette per app | `lib/module-styles.ts` | The frame reads it to set `data-lvz-module`. |
| App tile icons | `components/module-icon.tsx` | Used by the Apps sheets and Home. |
| Appearance (Light, Dark, System) | `lib/appearance-preference.ts`, `lib/appearance.ts`, `components/appearance-sync.tsx`, `/appearance` | Resolved before first paint to `:root[data-lvz-scheme]`. |
| Swipe between tabs | `lib/use-swipe-tabs.ts` | Every tabbed view. |
| Script copies of base colours | `lib/design-tokens.ts` | Manifest and theme-color meta only. |
| Atlas side-by-side captures | `tests/design-sweep/atlas.spec.ts`, `tests/design-sweep/atlas-screens/<app>.ts`, `scripts/atlas-gallery.mjs` | Fictional fixtures only. See "Checking a screen". |

### Frame behaviour

- Header: the app's icon tile, title and subtitle on the left (a link to Home), the profile circle on the right.
- Bottom dock: Home, module action, raised center **Apps**, module action, More. Only for signed-in members.
- Signed out: public pages (`/`, sign in, sign up, recovery, activation, request access, install) and member pages whose access check answers "signed out" show the header with **Sign in** (or **Create account** on the sign-in page) and no dock, avatar, Apps or More.
- Fixed bars never cover a focused field: the page has scroll padding for the header and dock.
- `/display` (paired TV player) stays full screen with no frame and ignores the device appearance.

## App palettes

Each palette redefines palette tokens only, inside `[data-lvz-module="<key>"]`, with a dark companion under `:root[data-lvz-scheme="dark"] [data-lvz-module="<key>"]`. The material tokens are derived from the palette on every scope, so every app gets the same material. Status colours (danger, warning, success) follow the scheme.

| App | Key | Light | Dark |
| --- | --- | --- | --- |
| Home, sign in, sign up, Profile and anything unregistered | (base) | Liquid Opal violet `#6146c9` to blue | violet night |
| Study Rooms (and Who can book) | `study-rooms` | the approved Lavender Softform values `#7041a8` | plum night |
| Contacts | `contacts` | teal `#086568` | deep teal |
| Work Mission (Morning Prayer) | `work-mission` | linen brown and gold `#6d5436` | dark linen |
| Members and organization | `members` | graphite `#343a43` | graphite night |
| Continuous Display management | `continuous-display` | garden green `#49643e` | garden night |
| Groups & Gospel Planning | `gospel-planning` | sky blue `#1863a3` | night sky |
| Worship Duty | `worship-duty` | sapphire `#1f4fbf` | midnight sapphire |
| Mother's Love (no route yet) | `mothers-love` | rose | rose night |
| Concert, Song library (no routes yet) | `concert`, `song-library` | dark by design | same |

Notes:
- Worship Duty is no longer dark by design: Light is a light sapphire Liquid Opal and Dark is the Midnight Sapphire companion.
- Groups & Gospel Planning no longer uses square Skyline Grid edges or a flat header; it has the same round material as every app.
- Work Mission titles use the system font like every other app.
- The Profile tab and the Unassigned profile wear the base palette; the organization and management tabs wear graphite.

### Palette tokens an app may set

`--lvz-ground`, `--lvz-surface`, `--lvz-sunken`, `--lvz-ink`, `--lvz-ink-quiet`, `--lvz-ink-faint`, `--lvz-line`, `--lvz-line-input`, `--lvz-accent`, `--lvz-accent-strong`, `--lvz-accent-soft`, `--lvz-on-accent`, `--lvz-focus`, `--lvz-accent-2` (gradient partner), `--lvz-tint-1` and `--lvz-tint-2` (backdrop tints), `--lvz-time-marker`, `--lvz-shadow-sheet`, `--lvz-shadow-pop`; for a dark-by-design palette also `--lvz-glass-edge` and `--lvz-glint`. Nothing else.

Readability is enforced by `tests/appearance.test.ts`: in every palette and scheme, text, secondary text and links reach 4.5:1 on both ground and surface, and button text reaches 4.5:1 on the accent and on its gradient partner.

## Appearance: Light, Dark, System

- More, then Appearance, offers three choices. Default is System.
- Stored under the existing key `lvz.appearance.v1` as `light`, `dark` or `system`. Choices saved by the October 19 release still work: a dark theme (Midnight Sapphire, Aurora Night, Copper Noir, Plum Velvet) becomes Dark, any other theme becomes Light.
- A small script in the page head applies the choice before first paint. System follows the device and updates when the device switches. Other tabs update on change. A blocked store still applies the choice for the session and says it could not be saved.

## How an app adopts the design

1. **Register the app** in `lib/module-styles.ts` with its route, title, icon and palette label. The frame then sets `data-lvz-module` on every page under those routes, including setup and loading screens.
2. **Add its palette** to `styles/lvz-tokens.css` (light and dark), including `--lvz-accent-2` and the two tints, then run `node --experimental-strip-types --test tests/appearance.test.ts`.
3. **Compose screens from the kit** (`components/ui-kit.tsx` and the `ui-` classes), following the structure of the app's Atlas screens in `previews/liquid-opal.html`. Module CSS uses tokens only: no hex colours, font names or pixel radii.
4. **Register dock actions** with `<FrameControls left={...} right={...} more={[...]}/>`. Pass `module={null}` for a view that should wear the base palette, and `title` when the view needs a different header title.
5. **States**: signed out (401) shows a Sign in action; not granted (403) says the app is not available for the account; empty data shows an icon empty state. Never show sample records as fallback; Atlas content is illustrative only.

## Checking a screen

Add the screen to `tests/design-sweep/atlas-screens/<app>.ts` (fictional fixtures only, and the Atlas screen it matches), build, then:

```
LVZ_SWEEP_PORT=3110 LVZ_SWEEP_SPEC=atlas node scripts/design-sweep.mjs <scratch>/shots "<name prefix>"
node scripts/atlas-gallery.mjs <scratch>/shots docs/design/atlas-build "<name prefix>"
```

The capture runs loopback servers with activation disabled and installed Google Chrome, at 390px (and 1280px for screens marked `wide`) in Light and Dark. Keep every permission and data rule as it is.

## Will never be

- A second header, a module bottom bar, or a palette outside `styles/lvz-tokens.css`.
- Sample or reference-image data presented as real records.
- Church imagery, crosses, emoji, or decorative clutter.

## Ownership

The shared-frame owner changes `styles/lvz-tokens.css`, `styles/lvz-ui.css`, `components/ui-kit.tsx`, `components/app-frame.*`, `lib/module-styles.ts`, the appearance files and this document. App owners request additions. Material changes go back to Anthony.
