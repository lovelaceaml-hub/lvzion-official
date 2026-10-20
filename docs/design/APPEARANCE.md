# Device appearance

Anthony requested that the visual theme collection be applied to the current application on October 19, 2026. **More → Appearance** offers the 24 named directions as device preferences. **Current app design** remains the default and restores existing module styling, including the approved Study Rooms Lavender Softform release.

The preference changes the actual shared tokens, typography, surfaces and controls. It does not replace module layouts, add prototype screens, configure schedules, change grants or copy sample records. Published `/display` audience compositions are excluded from personal appearance preferences.

The only persisted value is an allow-listed theme ID in `lvz.appearance.v1`. It survives refresh and navigation and synchronizes across tabs. Storage failure still applies the current selection with an explicit unsaved message. The initial script applies a known saved choice before paint. Theme controls remain disabled until their handlers are ready, so an immediate reset cannot be lost during hydration.

Implementation: `lib/appearance-themes.ts`, `lib/appearance.ts`, `styles/lvz-themes.css`, `components/appearance-sync.tsx`, `components/appearance-picker.tsx`, and `/appearance`.

## Focused verification

- TypeScript: `npm run typecheck` passed.
- Nine selected unit checks: `node --experimental-strip-types --test tests/appearance.test.ts tests/design-tokens.test.ts` passed.
- Thirteen selected browser checks: `tests/browser/appearance.spec.ts` and `tests/browser/app-frame.spec.ts` passed using local Chrome against the activation-disabled loopback app. Covered persistence/reset, blocked storage, real cross-tab changes, keyboard use, a 320px picker, the shared frame at 320/390/1280px, Apps and More, anonymous avatar denial, date/resource layout and reservation review.
- Optimized production compilation passed with `node node_modules/next/dist/bin/next build --webpack`; this bypasses the package wrapper that invokes full test suites.
- Seven selected compiled-app browser checks passed: all six appearance cases plus the existing compiled glass-surface regression.
- Solid text and primary-action color pairs passed the 4.5:1 token check for all themes. This is not a full accessibility certification of every translucent or gradient surface.

No full repository/application test suite, full database suite or complete browser suite was run. The package `build` wrapper invokes full suites; release builds for this change must use an explicit deployment-only `buildCommand` override that runs type checking and Next.js compilation without that wrapper. It must not change the project's default command or silently enable automatic deployments.

## Production release — October 19, 2026 (Las Vegas)

Released from `0197e83f1ee5fd28ceaaea3cc339b1a9ab800580` through [PR #65](https://github.com/lovelaceaml-hub/lvzion-official/pull/65). Deployment `dpl_HVSBqrSGcvVaTQupPhwaAkU7FDVk` is **READY** with `lvz.app` and `www.lvz.app` aliases and no alias error. The per-deployment build used `npm ci --ignore-scripts` and `npm run typecheck && node node_modules/next/dist/bin/next build --webpack`. The full-suite wrapper and automatic Git deployments were not enabled.

The live [Appearance page](https://lvz.app/appearance) returned HTTP 200 and identified this exact deployment. A fresh, anonymous browser found 25 choices (the existing app design plus 24 themes), applied Liquid Opal, retained it after refresh, and restored the current design. Study Rooms then retained its approved lavender background. No browser JavaScript errors were observed. Read-only live checks returned HTTP 200 for sign-in/sign-up and HTTP 401 for anonymous avatar and Study Rooms availability requests. No hosted member booking, real account mutation or published display change was performed.

The machine-readable [release receipt](APPEARANCE-RELEASE.json) records this verification. The preceding deployment `dpl_J9vTBQ2woZQ8a6abcCKicnUBxzVj` remains a schema-compatible rollback target. This record is a documentation-only follow-up; it does not require another deployment.
