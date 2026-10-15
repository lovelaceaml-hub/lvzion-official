# Morning Prayer simpler interface R6

[Actual module](https://lvz.app/modules/work-mission-prayer).

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

The initial interface release is live: merged PR #42, source `2b88682c672e74fb2443c605e9f6b206bfab444d`, READY production deployment `dpl_44DoGi1GHyJF3b3CafbZPRMywr9B`, with lvz.app and www.lvz.app aliases verified. Fifteen anonymous/origin checks passed on that deployment, with no new Work Mission runtime error cluster. The final month-entry compatibility guard is verified locally and awaits its production receipt.

Screenshots are fictional local fixture evidence, not hosted member records or real schedule input:

- [Phone Home](../design/morning-prayer-simple/home-phone.png)
- [Phone Manage](../design/morning-prayer-simple/manage-phone.png)
- [Desktop Manage](../design/morning-prayer-simple/manage-desktop.png)

No dependency or database changes, new member grants, real dates, source wording, Zoom credentials or distribution. The preceding database migration and privacy gates stay in place. Real owner save/member join and physical iOS/Android acceptance remain unverified. No external usability study or full accessibility certification is claimed.

Rollback uses the preceding compatible READY production deployment `dpl_8Jj8U36EVYvWaFRtvd2xBQxi8xKs`, preserving current data and all concurrent modules. Do not undo the installed private-function guards.

## Build log

- Started from clean main `2b664e7` on `change/work-mission-simpler`.
- Audited the overly long Manage page, duplicate schedule list and visible internal terminology.
- Applied the user's simpler/cleaner direction within the existing blue identity. Source editing/publishing and permission decisions remain separately gated.
- Built and checked the actual client in the isolated local harness. Corrected test transport/selection gaps without creating any production fixtures.
- Released the initial cleaner interface through PR #42 and verified the real production aliases and anonymous privacy boundaries.
- Added a final month-entry guard after checking native input support. React/browser tests emulate text fallback throughout re-renders, rather than changing one field temporarily. Re-ran the full build, all 87 existing browser cases, all 15 isolated module cases and strict types successfully. Final compatibility release receipt pending.
