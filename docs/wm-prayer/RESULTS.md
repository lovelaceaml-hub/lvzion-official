# WM R1 executed results — October 14, 2026

## Verified development build

Application commit: `d98f3d34c960f9fb9793b33d33917629ae114d77`.
Vercel deployment: `dpl_FVNUwYb7qPzdQTkAT99c7n49iun3`, READY, preview environment.
Preview: https://lvzion-official-n7356zdu8-lvzion.vercel.app/wm-prayer-preview
Draft PR: https://github.com/lovelaceaml-hub/lvzion-official/pull/7

The final verification-document/test-selector commit does not change the application code tested above.

## Executed checks

- TypeScript and Next.js optimized build: passed.
- Node test run: **176 passed, 0 failed, 0 skipped**. This includes the WM domain tests and the disposable WM SQL test suite, not 176 WM-only cases.
- Existing foundation PostgreSQL permission harness: **111 assertions passed**, disposable PGlite only.
- Remote Chromium browser verification: **34 checks passed** at the preview above. Home, archive, lesson and review screens showed no horizontal document overflow at 320/390/430 px widths. Draft → independent approval → separate publication worked. Corrections preserved the prior publication. Incomplete-source review was blocked. Technical-role denial, publisher/source separation, simulated join without navigation, cancellation/rescheduling and duplicate scenarios passed.
- Separate PNG download and safe explanation checks passed for outline, three-lenses and learning-path layouts. Four mobile screenshots and three card screenshots were captured in the disposable verification session.
- Anonymous live API returned **401** with private/no-store. No browser exceptions or requests to Gmail, Zoom, Signal or Supabase were observed during the fictional UI tests.

Initial runs identified test-fixture UUID casting and an incorrect expected table count; both were corrected. The SQL asserts the thirteen exact WM tables and RLS on each. Browser selectors were corrected for nested select labels; no application authorization rule was relaxed to obtain a pass.

## Limits and remaining work

Automated viewport/overflow checks are not physical-device or accessibility certification. Captured image files could not be transferred into the review surface for visual inspection, so final visual approval is still outstanding. Test code reproduces the screenshots; no temporary preview-access token is committed or included here.

The preview copies the explanation, but its clipboard payload currently omits the gathering-date prefix shown in the text box; the image and displayed text include the fictional date. Unify those export projections and add a clipboard-equality regression check before a real sharing pilot. Copying by selecting the displayed text preserves that date in this preview.

The dormant import planner is unit tested; review-screen import buttons are simulations, not a live Gmail integration. Source-section references establish traceability, not semantic accuracy. Human content/privacy review remains mandatory. SQL is an unapplied review candidate outside `supabase/migrations`; full hosted PostgREST/JWT, storage, concurrent ingestion and retention/deletion policies require release review.

No production promotion/merge, hosted database migration, real member grants, gathering credentials, recurring job, paid provider, real recap publication or message distribution was performed. See README and VERIFICATION for all activation gates.
