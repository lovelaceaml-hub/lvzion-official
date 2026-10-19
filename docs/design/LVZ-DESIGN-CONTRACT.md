# LV Zion design contract: Day Sheet

Status: locked. Anthony chose direction **A. Day Sheet** on 2026-10-14 from three options (A Day Sheet, B Module Board, C First Light). His selection, as given: "A. Day Sheet (Recommended)". No extra note.

Evidence: [direction board](directions/direction-board.html) with phone and desktop exports in [directions/](directions/), and the earlier look in [before/](before/).

The latest approved Study Rooms exception is [Lavender Softform](../study-rooms/LAVENDER-SOFTFORM-2026-10-19.md). Its resource tabs, dates, continuous grid and floating controls supersede earlier Study Rooms appearance rules below; the base contract still governs other module content.

Every screen in lvz.app follows this contract: Home, sign in and sign up, member management, and every module (Work Mission prayer, Study Rooms, Church Display, Contacts, Worship Duty). Material changes to it go back to Anthony.

## The idea

Home reads like a printed order of the day: one time line from morning to night, a thin "now" mark, and your apps underneath. Calm, orderly, unhurried. Readable for members of every age.

## Files modules use

| What | Where | How |
| --- | --- | --- |
| Tokens (color, type, spacing, radius, motion, sizes) | `styles/lvz-tokens.css` | Loaded globally by `app/globals.css`. Use `var(--lvz-...)`; never a raw hex, font name or pixel radius in module CSS. |
| Shared building blocks (`ui-` classes) | `styles/lvz-ui.css` | Loaded globally. Prefer these over restyling the same piece. |
| Header (tap wordmark goes home) | `components/app-header.tsx` | `<AppHeader homeHref="/members">…right-side items…</AppHeader>` |
| Swipe between tabs | `lib/use-swipe-tabs.ts` | `const swipe=useSwipeTabs(tabs,current,setCurrent)`, spread `{...swipe}` on the tab content. |
| Token values in scripts | `lib/design-tokens.ts` | Only for places CSS cannot reach (manifest, theme color). |

If a module needs a value that is not a token, ask the shared-core owner to add one. Do not add a module palette.

## Color

Light only for now (`color-scheme: light`). A dark set needs Anthony's approval first.

| Token | Value | Use |
| --- | --- | --- |
| `--lvz-ground` | #f2f4f1 | Page background (grey-green paper) |
| `--lvz-surface` | #ffffff | Inputs, sheets, the few separate objects |
| `--lvz-sunken` | #e8ede9 | Quiet wells, disabled areas |
| `--lvz-ink` | #132e28 | Text (13.1:1 on ground) |
| `--lvz-ink-quiet` | #5a6d67 | Secondary text, past items (4.97:1 on ground) |
| `--lvz-ink-faint` | #869690 | Decoration only (dots, rules); never text |
| `--lvz-line` | #dce3df | Hairlines between rows |
| `--lvz-line-input` | #869690 | Input and secondary-button borders (3.1:1) |
| `--lvz-accent` | #1f5c4d | The one action color: primary buttons, selected tab, links, "now" mark |
| `--lvz-accent-strong` | #174a3e | Hover and pressed |
| `--lvz-accent-soft` | #e2ede8 | Icon tiles, avatar, info notices |
| `--lvz-alert` | #b4532a | Unread dot only |
| `--lvz-danger`, `--lvz-warning`, `--lvz-success` and their `-soft` | see file | Status only, never decoration |

## Type

- `--lvz-font-sans`: the phone's own system text (San Francisco on iPhone). Used for everything.
- `--lvz-font-serif`: the system serif (New York on iPhone, Georgia elsewhere). Only for the page title (`.ui-title`) and the Home greeting.
- Scale: 12, 14, 16 (body and every input, so phones do not zoom), 18, 22, 30 (page title on phone), 40 (page title on desktop).
- Weights: 400, 600, 700. Times and counts use tabular figures (set on `body`).
- Labels are sentence case. No letter-spaced all-caps labels.

## Spacing, shape and size

- 4px steps: `--lvz-space-1` (4) through `--lvz-space-12` (48).
- Page side gutter `--lvz-gutter`: 20px on phones, 48px from 900px wide.
- Radius: 8 (small chips), 12 (buttons, inputs, notices, icon tiles), 16 (sheets, surfaces). Round only for avatars and counts.
- Every tap target is at least 44px (`--lvz-tap`); buttons and inputs are 48px.
- Reading column `--lvz-reading-max` 640px; full layout `--lvz-content-max` 1120px.

## Layout

- **Lists, not cards.** Content sits on the ground divided by hairlines (`.ui-row`). Use `.ui-surface` only for something that is truly a separate object: a form, a notice, a sheet.
- **One primary action per screen** (`.ui-button`). Everything else is secondary or quiet.
- **Phone:** one column, header at top, bottom tab bar where the screen has top-level sections.
- **Desktop (900px and up):** the header becomes a white bar with top navigation; the main column keeps the list and a 320px side column holds apps and "needs your attention". Do not just stretch the phone layout.
- **Time first:** anything scheduled shows its time on the left in tabular figures, then what it is, then where.

## Navigation rules

- Tapping the header wordmark always goes home (`AppHeader`).
- Tabs are underlined text (`.ui-tabs` and `.ui-tab` with `aria-selected` or `aria-current`). Visible tabs are always the main control.
- Swiping left or right on tab content switches tabs: at least 60px across, at least 1.5 times more across than down, finished in under 600ms, no wrap at the ends. Swipes starting in inputs or `[data-no-swipe]` areas are ignored.
- Sheets are native `<dialog>` elements (`.ui-sheet`): bottom sheet on phones, centered on desktop, closable with Escape and a visible close button.

## Motion

Short and only to explain a change: `--lvz-duration-fast` 120ms, `--lvz-duration` 200ms, `--lvz-duration-slow` 320ms, easing `--lvz-ease`. Reduced-motion settings set every duration to zero.

## Icons and imagery

- One line-icon family (Lucide style, 1.8 stroke, 20px). Existing `components/home-icons.tsx` is the shared set.
- No photos, illustrations, crosses or other church imagery. No emoji anywhere in the interface.

## Words

- Plain words people already use: "Sign in", "Your apps", "Needs your attention", "Saved".
- A button says exactly what happens. Errors say what went wrong and what to do next.
- Empty states are one sentence and, when useful, one action. Loading states say what is loading.

## Accessibility (must pass)

WCAG 2.2 AA: text contrast at least 4.5:1, interface borders at least 3:1, visible focus ring (3px `--lvz-focus`), every control reachable by keyboard, labels on every input, 44px targets, layout works at 320px wide with no sideways scrolling, text can grow to 200%.

## Will never be

- A wall of cards, colored tiles or floating boxes.
- Gradients, glow, blurred blobs or decorative circles.
- Pill badges or letter-spaced capitals on everything.
- A module with its own color scheme.

## How modules adopt it

1. Delete local color, font and radius values; replace with `var(--lvz-...)` tokens.
2. Swap hand-made buttons, inputs, tabs, rows and notices for the `ui-` classes where they fit.
3. Use `AppHeader` so the wordmark goes home; add `useSwipeTabs` wherever there are tabs.
4. Remove cards that only wrap a list; let rows sit on the ground with hairlines.
5. Check 320px, 390px and 1280px widths and keyboard focus. Keep every permission and data rule exactly as it is.

## Ownership

The shared-core owner changes `styles/lvz-tokens.css`, `styles/lvz-ui.css`, `components/app-header.tsx`, `lib/use-swipe-tabs.ts`, `lib/design-tokens.ts` and this file. Module owners may request additions. `tests/design-tokens.test.ts` keeps script and CSS tokens in step and checks the swipe rule.

## Study Rooms exception — approved October 18, 2026

Anthony selected the Soft Panels reference as the Study Rooms design, with Floating Glass used only for accents. This supersedes the no-shadow/no-gradient and underline-navigation rules for this module only. Keep the shared palette, compact header, accessible controls and center Apps launcher. The booking grid stays opaque and readable: raised white resource columns, muted booked cells, green selection and a contextual Continue bar. Glass is limited to navigation and action accents. Resource inventory, dates and bookings come from this application's actual records; reference-image sample data is never seeded.

### Study Rooms layout refinement — later October 18 reference

The owner's later reference uses separate rounded `+ Open` tiles and hour labels spanning half-hour rows, superseding continuous raised resource columns. The schedule begins with icon-labelled resource tabs and uses a full-width Reserve button above the required bottom navigation. Glass remains accent-only. Details: [layout correction](../study-rooms/TILE-LAYOUT-2026-10-18.md).

## Shared persistent frame — approved October 18, 2026

Anthony requested a persistent matching header and bottom control across pages, based on the supplied raised/glass Apps button references. This supersedes the wordmark header, desktop top navigation and no-glass restrictions for shared navigation. Use `AppFrame` in the root layout and register real module actions with `FrameControls`; do not add separate module bottom bars. The header shows the module symbol/title and circular member avatar. Home, centered Apps and More remain stable; the two neighboring actions follow the module. Glass stays an accent and content stays opaque. Full-screen TV playback remains immersive. See [implementation, mapping and verification](../SHARED-APP-FRAME-2026-10-19.md).

### Later October 18 glass/date refinement

Owner explicitly approved stronger reflective glass on dates and Reserve, a detailed shimmering Apps circle and today button, decorative Tuesday/Saturday glow, edge-to-edge square-corner header, and a deeper bottom dock. Dates precede a slim resource selector and show today plus three days within the configured booking horizon. Keep 44px targets, readable content, reduced-motion/transparency fallbacks and unchanged availability rules. See [refinement details](../GLASS-REFINEMENT-2026-10-19.md).

### Latest Study Rooms direction — Lavender Softform, October 19, 2026 UTC

The owner selected prototype 06 and explicitly requested implementation in the real app. Study Rooms now uses scoped lavender/plum tokens and soft raised surfaces. Rooms, Whiteboards and TVs are tabs connected to the shared header; dates follow below. The continuous ruled grid reaches the viewport bottom, with half-hour labels and plus-only open cells. The selected cell remains visible behind a more transparent floating selection/Reserve tray, above the shared dock and its raised plum Apps rounded square. The scroll area must not shrink on selection, and its final interval must scroll clear of the floating controls.

This approval supersedes the earlier green palette, separate time tiles, hour-spanning rail, dates-before-resources and Apps-circle rules for Study Rooms only. Keep shared token ownership, 44px targets, readable states, keyboard access, reduced-motion/transparency fallbacks and server-sourced data. See [implementation and verification](../study-rooms/LAVENDER-SOFTFORM-2026-10-19.md).
