# WM R1 executed results — October 14, 2026

## Initial verified development build

Application commit: `d98f3d34c960f9fb9793b33d33917629ae114d77`.
Vercel deployment: `dpl_FVNUwYb7qPzdQTkAT99c7n49iun3`, READY, preview environment.
Initial preview: https://lvzion-official-n7356zdu8-lvzion.vercel.app/wm-prayer-preview
Draft PR: https://github.com/lovelaceaml-hub/lvzion-official/pull/7

## Executed checks

- TypeScript and Next.js optimized build: passed.
- Node test run: **176 passed, 0 failed, 0 skipped**. Includes the WM domain tests and disposable WM SQL suite, not 176 WM-only cases.
- Existing foundation PostgreSQL permission harness: **111 assertions passed**, disposable PGlite only.
- Remote Chromium browser verification: **34 checks passed** on the initial preview. Home, archive, lesson and review had no horizontal document overflow at 320/390/430 px. Draft → independent approval → separate publication worked. Corrections preserved publication. Incomplete sources blocked review. Technical-role denial, publisher/source separation, simulated join without navigation, cancellation/rescheduling and duplicate scenarios passed.
- Separate PNG download and safe explanation checks passed for outline, three-lenses and learning-path layouts. Four mobile and three card screenshots were captured.
- Anonymous live API returned **401** with private/no-store. No browser exceptions or requests to Gmail, Zoom, Signal or Supabase were observed during the fictional tests.

Initial runs identified fixture UUID casting and an incorrect expected table count; both were corrected. SQL now asserts all thirteen named WM tables and RLS on each. Browser selectors were corrected for nested select labels; no application authorization was relaxed.

## Clipboard correction

The initial copy handler omitted the gathering date displayed in the text area. The UI now derives one `shareText` projection and uses it for both clipboard and displayed text. Explicit accessible labels were also added to the three scenario/role/gathering selectors. `scripts/verify-wm-clipboard.mjs` adds three real browser clipboard-equality checks, including the fictional gathering date. These changes require the latest preview build and browser rerun; final verified deployment/results are recorded in the draft PR.

## Boundaries and remaining work

Automated viewport checks are not physical-device/accessibility certification. Captured files could not be transferred to the review surface for visual inspection; final visual approval is outstanding. Scripts reproduce those images. No temporary access token is committed.

The dormant import planner is unit tested; review-screen imports are simulations, not Gmail. Evidence IDs establish traceability, not semantic accuracy; human accuracy/privacy review is mandatory. SQL remains an unapplied review candidate outside migrations. Full PostgREST/JWT/storage/concurrent-ingestion testing and retention/deletion rules need release review.

No production promotion/merge, hosted migration, real member grants, gathering credentials, recurring job, paid provider, real recap publication or message distribution was performed. See README and VERIFICATION for activation gates.
