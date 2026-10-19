# Morning Prayer simpler interface R6

[Actual module](https://lvz.app/modules/work-mission-prayer).

This is the October 14 R6 milestone record. Later Day Sheet and shared-frame releases supersede its visual reference and production deployment. Preserve the current [design contract](../design/LVZ-DESIGN-CONTRACT.md). The October 18 follow-up below records current provider and privacy checks without rerunning a full suite.

## Requested outcome

Anthony said the module needs to be simpler and cleaner, and explicitly chose continued independent execution. This is a targeted refinement of the existing Daybreak blue identity, rather than a new brand direction. Keep the four established member tabs and every existing capability, source review, session check and protected meeting command. No new external design provider, imagery, fonts or component library is introduced. No hosted preview is requested or created.

The first successful moment is seeing the next gathering or choosing one clear management task. The interface should show useful content first, with longer setup controls available when needed.

## Section 1: Interface cleanup

- Home has a quieter header, a clearer gathering card, compact upcoming rows and less implementation wording.
- Schedule keeps the calendar and selected date; the duplicate month list is tucked under All dates this month.
- Manage has Schedule, Materials and People sections. Date setup, recurring batches, time changes and meeting links open through familiar disclosure controls. Each gathering's controls stay with its own date. Empty request panels are omitted.
- Management has an explicit month selector. PWP creation uses month/week choices. Reading identifiers are generated internally, so owners do not type database keys.
- People uses familiar access-level choices, with custom permissions available separately. The People section appears only after the owner roster endpoint confirms access.
- Material publication retains the full wording, points and source under Review draft before the publishing action is shown.
- Type, input sizes, borders and spacing are calmer and more consistent. Native disclosures work with keyboard and touch; the bottom navigation remains visible.
- Success feedback follows a successful refresh. If a write was accepted but readback is unavailable, the screen says to refresh and confirm instead of claiming a confirmed saved result. Successful reading creation starts a fresh identifier for the next new draft.

## Section 2: Verification and release

The strict-type/application/database/Next production build passed 375 application tests and 198 SQL assertions. Fifteen isolated client browser cases cover the existing member paths, permissions, revocation/read guards, focused sections, month/week selection, two new reading creates, publication review, truthful uncertain-save feedback, keyboard disclosures and 320/390/768/1024 widths. Two cases emulate browsers that use text entry for month fields: incomplete schedule months remain editable without loading, and invalid PWP months cannot create a draft. Phone/desktop fixture screenshots were inspected. All 87 existing browser regression cases passed.

The initial interface release was merged PR #42, source `2b88682c672e74fb2443c605e9f6b206bfab444d`, READY production deployment `dpl_44DoGi1GHyJF3b3CafbZPRMywr9B`, with lvz.app and www.lvz.app aliases verified. Fifteen anonymous/origin checks passed on that deployment, with no new Work Mission runtime error cluster.

The final R6 month-entry guard was released October 14 through merged [PR #43](https://github.com/lovelaceaml-hub/lvzion-official/pull/43), source `04583159c090c43d790458e4f4197d6a62e9b245`, READY deployment `dpl_5nkVQyVZowo3ovS67NdrNwMdQY32`. Both real aliases and fifteen live privacy/origin checks passed. This historical deployment has since been superseded. [Release receipt and later observation](RELEASE-R6.json).

Screenshots are fictional local fixture evidence, not hosted member records or real schedule input:

- [Phone Home](../design/morning-prayer-simple/home-phone.png)
- [Phone Manage](../design/morning-prayer-simple/manage-phone.png)
- [Desktop Manage](../design/morning-prayer-simple/manage-desktop.png)

No dependency or database changes, new member grants, real dates, source wording, Zoom credentials or distribution. The preceding database migration and privacy gates stay in place. Real owner save/member join and physical iOS/Android acceptance remain unverified. No external usability study or full accessibility certification is claimed.

At the R6 release, the preceding compatible READY rollback was `dpl_8Jj8U36EVYvWaFRtvd2xBQxi8xKs`. This is a historical recovery record, not a rollback recommendation for subsequent releases. Recheck current schema compatibility and all concurrent modules before changing aliases. Do not undo the installed private-function guards.

## October 18 follow-up

The live alias returned READY deployment `dpl_DieNhYCz7injBNmDtRUBaTDb6qs6`, source `7f1128f7b85d93db58ff739e35dc08b15e8e374f` (shared-frame glass refinement, PR #61), on both lvz.app and www.lvz.app. Current main contains R6 by verified ancestry; newer Work Mission components preserve separate Schedule, Materials and People management and the month draft guard. No application code, configuration, migration or operational data was changed by this documentation follow-up.

Eight focused real-site checks passed: sign-in and module redirect, signed-out schedule/access/join denials, forged-origin meeting rejection, and signed-out Study Room/Display management denials. Private API responses retained no-store headers and exposed no join URL or access token. A read-only hosted aggregate check returned 15 RLS tables, one active module grant, seven capabilities, zero occurrences, zero publications and zero meeting references.

The full-suite counts above belong to October 14. No full repository, project or browser suite was run for this follow-up. Anthony's October 17 rule requires explicit approval for a named full suite immediately before each run. Push/PR/merge preflight found no tracked workflow and only sample local hooks; automatic Vercel Git deployments remain disabled. Current validation is limited to the eight smoke checks, aggregate readback, provider source/alias checks, documentation links, receipt JSON and diff inspection.

Authoritative dates and exception policy, approved material wording, verified meeting details and joining window, and eligible hosts/coordinator/member access remain owner-sourced configuration. Empty schedules are valid. Real hosted owner save, permitted member join and physical-device acceptance remain unverified. Outbound distribution remains disabled.

## Build log

- Started from clean main `2b664e7` on `change/work-mission-simpler`.
- Audited the overly long Manage page, duplicate schedule list and visible internal terminology.
- Applied the user's simpler/cleaner direction within the existing blue identity. Source editing/publishing and permission decisions remain separately gated.
- Built and checked the actual client in the isolated local harness. Corrected test transport/selection gaps without creating any production fixtures.
- Released the initial cleaner interface through PR #42 and verified the real production aliases and anonymous privacy boundaries.
- Added a final month-entry guard after checking native input support. React/browser tests emulate text fallback throughout re-renders, rather than changing one field temporarily. On October 14, re-ran the full build, all 87 existing browser cases, all 15 isolated module cases and strict types successfully.
- Released PR #43's exact source, verified READY status, real aliases and all fifteen live privacy/origin checks on October 14. Recorded this receipt on October 18 after preserving newer shared-design work and performing only focused current checks.
