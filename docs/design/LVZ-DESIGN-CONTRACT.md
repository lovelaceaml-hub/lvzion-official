# LV Zion design contract: Day Sheet

Status: locked. Anthony chose direction **A. Day Sheet** on 2026-10-14 from three options (A Day Sheet, B Module Board, C First Light). His selection, as given: "A. Day Sheet (Recommended)". No extra note.

Evidence: [direction board](directions/direction-board.html) with phone and desktop exports in [directions/](directions/), and the earlier look in [before/](before/).

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
