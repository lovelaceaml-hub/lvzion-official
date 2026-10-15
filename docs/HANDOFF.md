# LV Zion Official handoff

## Quick links

- [Actual app](https://lvz.app)
- [Private repository](https://github.com/lovelaceaml-hub/lvzion-official)
- [Current setup and Build log](ACTUAL-APP-SETUP.md)
- [Release controls](RELEASE-GATES.md)
- [Hosted migration mapping](HOSTED-MIGRATION-LEDGER.json)
- [Contacts owner guide](contacts/USER-GUIDE.md) · [Current scope](contacts/README.md) · [Runbook](contacts/OPERATIONS.md)
- [Study Room current status](study-rooms/README.md)
- [Study Room cutover runbook](study-rooms/CUTOVER-RUNBOOK.md)

## Work Mission interface refinement R6

Anthony asked for a simpler, cleaner module and authorized independent execution. [R6 evidence](morning-prayer/SIMPLER-R6.md) records focused management sections, quieter member screens, native disclosures and simpler material entry. No database, grants, real input data or external distribution changes. This interface release is pending production verification; R5 remains the preceding compatible READY release.

## Work Mission completion R5

Work Mission completion is released at [the actual module](https://lvz.app/modules/work-mission-prayer); see [R5 completion and Build log](morning-prayer/COMPLETION-R5.md). R4 was already merged/applied; R5 hosted migration `20261015010132` now replaces private functions without creating real dates or grants. Current readback: one active module owner grant, seven capabilities, 15 RLS tables, zero occurrences/publications/meeting references. Concurrent Church Display PR #39 is preserved. Deployment `dpl_8Jj8U36EVYvWaFRtvd2xBQxi8xKs` is READY at `caf5ba80849bbd460e24807e6878ec668611d93e` (merged PR #40), with lvz.app/www.lvz.app aliases verified. The compatible setup guard `20261015010537` is also installed. Verification: 375 app tests, 198 SQL assertions, 87 existing browser cases, six isolated Work Mission client cases, four native concurrency races and 15 live privacy/origin checks. Real hosted owner save, member join and physical-device acceptance remain unverified.

## Earlier verified snapshot (before Work Mission R5)

Hosted counts checked October 14, 2026 at 23:26 UTC; production source refreshed after the concurrent Display merge. The actual app is [lvz.app](https://lvz.app), with [member management](https://lvz.app/members/manage). No new preview is authorized.

- The refreshed Vercel alias lookup returned READY deployment `dpl_FFquRhvQkTW1xv1gRVz1SuKBg66S`, source `de5dcdede5fc740873fddfa36467d9d47f318fd6`, on `lvz.app` and `www.lvz.app`. This is the concurrent Display R2 release from PR #32. The initial audit snapshot was Contacts R5 at `87c5a85`; the documentation branch incorporated the later main without changing its code. Documentation commits do not deploy application changes.
- The organization workflow is complete: Adult Male, Adult Female, Young Adult Male and Young Adult Female, two groups per category and two units per group. Hosted aggregates are 4 categories, 8 groups, 16 units and zero current placements. New confirmed signups remain Unassigned until independent verification and authorized placement.
- Four approved modules each have one active grant: Contacts, Study Rooms, Continuous Display and Work Mission Morning Prayer. Module approval is separate from congregation rollout. See the [module status table](../README.md#current-module-boundaries).
- Study Room booking gate is closed. Display has one disabled screen, zero publications and zero active devices. Morning Prayer has one enabled series, zero occurrences and zero material publications. These are metadata/count checks, not authenticated save or physical-device acceptance.
- Hosted metadata lists 16 applied migrations. The [ledger](HOSTED-MIGRATION-LEDGER.json) now includes Display, Morning Prayer and Display operations. PR #32 was open at initial audit, then merged and independently deployed during this task. Its [R2 release record](continuous-display/OPERATIONS-R2.md) is now on main. Do not replay its applied migration. The deployment lookup verifies source/aliases, not new owner-save or physical-TV acceptance.

## Remaining boundaries and next work

No organization setup action remains for Anthony. Broader module rollout is separate: Study Rooms needs legacy booking cutover, Contacts needs real owner save/reload acceptance and shared-access policy, Display needs reviewed content/device acceptance, and Morning Prayer needs authoritative schedules/materials and approved member/join access. Open feature PRs do not imply approval or deployment. Original applications and real roster imports remain outside scope.

Use [all documentation](README.md), [member instructions](USER-MANUAL.md), [release controls](RELEASE-GATES.md) and the [documentation audit](DOCUMENTATION-AUDIT.md). The sections below preserve milestone-specific test counts and deployment receipts; they are not claims that every historical version is current. No new app/browser suite was run for this prose-only maintenance.

## Study Room Reservation — live owner configuration; booking CLOSED

Study Room is a **real integrated module** at [`lvz.app/modules/study-rooms`](https://lvz.app/modules/study-rooms). Initial integration is merged [PR #22](https://github.com/lovelaceaml-hub/lvzion-official/pull/22), and its inventory/service-calendar expansion is merged [PR #30](https://github.com/lovelaceaml-hub/lvzion-official/pull/30), production merge commit `7237109e46315a726cc88fa2069db0d58fbc69b1`. Vercel deployment `dpl_2CkfiSr2EM1tQaAEj5ff3gMcRNEq` passed its build and was READY; subsequent READY production deployment `dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv` at `87c5a8573ca01f7216f2c78df1da5b827b7380d2` includes R4 by ancestry.

The five Study Room migrations are **applied** in hosted Supabase `otecqlkqirncotytbfns`, including R4 `study_room_policy_operations` (hosted ID `20261014225514`). Verified on October 14: 12 resources (4 rooms/5 boards/3 TVs), one approved module with **one active owner-manager grant**, zero new-system bookings or occupied slots, original four weekly service blocks, no special-day overrides and **`bookings_open=false`**. Owner-only inventory creation and weekly/special-day rule management are deployed; ordinary members cannot book yet. No Firebase reservations were imported and **the original `lvrooms.web.app` is still the booking authority**.

Final release verification: **317 application tests + 198 disposable PostgreSQL permission assertions**, TypeScript/build passed; **six Chromium phone/tablet tests** passed against the deployment using synthetic manager/viewer fixtures, and live anonymous Study Room schedule/admin/history/operations GET plus operations POST returned **401**. A real authenticated hosted manager write, a complete Firebase export/write freeze, hosted restore and physical Safari remain **unverified**. Do not conflate module publication with booking cutover. Details and the stop conditions are in [current status](study-rooms/README.md), [R4 verification](STUDY-ROOM-R4-LIVE.md) and [cutover runbook](study-rooms/CUTOVER-RUNBOOK.md).

## Completed actual-app setup

The earlier change/actual-app-setup branch delivered the main application release. Anthony explicitly requested the actual app at lvz.app and no additional previews. Automatic preview publication is disabled in Vercel; automatic Git deployments are disabled in vercel.json. The app's actual front door is sign-in. Fictional routes redirect on production. Other module draft branches and original LV Zion apps remain outside scope.

New confirmed accounts start Unassigned to category, group and unit and see only their own records. Authorized member administration verifies membership and places each person, retaining history/audit. The designated first owner confirms the privately configured email, receives independent organization/department/technical administration, and remains Unassigned. Organization entries are created only from Anthony's supplied instructions. No member roster is imported.

## Historical actual-app setup verification

The original member setup applied six migrations. Additional module and signup migrations have since been applied. Current hosted migration metadata must be reconciled with HOSTED-MIGRATION-LEDGER.json before any future schema change. The older three were not replayed; all definitions match the repository under the documented normalization. Production origin is configured. The earlier template update used an ignored management API field; the corrected *_content field is now applied and strictly verified by readback. The Before User Created hook enforces app-issued signup tickets. Owner designation is private. Confirmed-email enrollment is enabled after verified SMTP delivery. Before configuration there were zero Auth users, members and linked accounts.

At the original actual-app setup milestone, 128 application tests, 182 PostgreSQL assertions, 32 phone Chromium tests, 44 local signup checks and 42 invitation/recovery checks passed. The real local hook also rejected a direct signup bypass and allowed app-issued tickets. External security review was waived by Anthony. Hosted owner confirmation and first sign-in were verified privately. Physical-device testing is not yet claimed.

## Earlier production and email receipts

The actual app and self-service signup are live at https://lvz.app/sign-up. The organization release dpl_URciYVcPXdq5cJTURF9DpfAaSFZU is READY at ce41310e3ef932af58d51e7c4c66af985146c23f (PR #24). The subsequent verified production deployment dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv at 87c5a8573ca01f7216f2c78df1da5b827b7380d2 retains that release by verified Git ancestry. The live signup form has a six-character minimum. Hosted confirmation failure returns the sign-in recovery path with no-store headers. Anonymous member API access is denied; the public member page contains only a loading shell. Signup, verified delivery and account-email switches are enabled only for production. Twelve production signup/access checks passed; fictional routes redirect, anonymous private records are denied and a forged-origin request created no Auth identity. The provider reports the SMTP test delivered to its own synthetic delivered@resend.dev inbox. TLS authentication was verified. No real account or personal record was created for testing.

The approved Resend key has sending-only access to auth.lvz.app and is stored in personal Keychain plus Supabase/Vercel secret stores. No credential files or logs contain its value. Resend remains on the free plan with paid overages off. Anthony specifically approved thirty signup-confirmation emails per hour on 2026-10-14. The value was applied and read back at thirty. The earlier rejected increase was not bypassed. SMTP port is a string in the current management API.

## Owner initialization and confirmation recovery history

The designated owner registered and confirmed the email, then encountered the default browser-bound confirmation failure. The email was already confirmed; the account had a valid display name but no member link. Signing in with the existing password completed the profile. Read-only verification confirmed enabled account access, intake/Unassigned status, all three independent administrative roles, zero placements and one owner-initialization audit entry. No real identity details are stored in Git. The owner can now configure actual organization names and place members.

The earlier management API call used mailer_templates_confirmation instead of mailer_templates_confirmation_content, so it was silently ignored. The hosted template still used ConfirmationURL and browser-bound PKCE. The corrected template links directly to /auth/continue with a fragment token and explicit confirmation POST. scripts/configure-signup-email.mjs now applies the proper content setting and verifies the exact content/subject plus required email confirmation. The local SMTP gateway uses that same template, preventing a separate local template from hiding hosted drift. Legacy PKCE failures offer an explicit sign-in recovery link.

Historical fallback receipts are dpl_9r1r6Gae4cRwtTnAtDmMunn9yqTX (signup closed) and dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk (static prototype). These predate current modules and are not the default rollback for a later release. Choose a verified compatible deployment for the affected release, preserve current module/access gates, and recheck signup and all enabled modules before promotion. To halt enrollment, disable the database enrollment switch and production signup flag. Never erase audit/history or drop the additive schema as a rollback shortcut.

Personal credentials use Apple Passwords or Keychain only. No credentials or designated personal email are in Git.

## Password policy update

Anthony requested six characters as the minimum on 2026-10-14. The signup, invitation-activation and recovery forms and their server validation now agree. Supabase Auth and the actual signup, invitation and recovery pages were verified at six in production deployment dpl_5XtZ7FjKqF71w3unp8z59Vqd2722, commit 9ac33961ad37c433e41cf256dbd3dfe2d9479b78. The earlier twelve-character rule is superseded by this direct instruction.

## Organization and placement completion

The completed bounded workflow is [Organization workflow](ORGANIZATION-WORKFLOW.md), with plain-language instructions in [Member guide](USER-MANUAL.md). Anthony requested two empty units in each existing group and completion of this management flow. The actual structure is verified at four age categories, eight groups and sixteen units, all empty, with sixteen audited unit creations. The live workflow provides a nested hierarchy, parent-bound creation, rename/archive controls, shared placement choices and clear leadership scope. Backend authorization and schema are unchanged. The integrated final build passed 244 application tests and 198 SQL assertions; all 77 browser checks passed. The controller reviewed the complete scoped change. The real signed-in owner view was verified at 4/8/16. Adult Male showed two groups with two units each. Selecting Adult Female / Group 2 / Unit 2 showed the complete path; the selection was cleared without submission. The owner and all groups remain Unassigned/empty. Public management and signup pages return 200, while anonymous member API access returns 401 with no-store. Proof is docs/screenshots/organization-live.jpg. No physical-device test is claimed.

## Contacts module: verified owner-only production release

Contacts is deployed as the real LV Zion module at [lvz.app/modules/contacts](https://lvz.app/modules/contacts), using verified LV Zion authentication and explicit one-owner-only module access. Vercel deployment `dpl_2qdE7XJTTJjvG2V6p8sXkQqTG6VZ` is READY at `7aec7b5c1a777828ddace44c498ac90e2c9a5995`. Supabase migration `20261014224708_contacts_private_owner_pilot_v1` is applied; six private Contacts tables are RLS/FORCE RLS protected. No real contacts were imported. The owner remains Unassigned without inventing a group/unit. Production flag `LVZ_CONTACTS_OWNER_PILOT=true` is explicitly scoped to this verified release. Anonymous access is denied. The owner-only interface includes contact entry, author notes, follow-ups, do-not-contact, archival and audit history; sharing/leader access/export/messages are disabled. Full build: 241 tests, 182 foundation SQL assertions. The owner's browser-authenticated save/reload should still be confirmed manually, and full cross-member workflow approval is separate.

**Detailed release evidence, verified denials and rollback:** [Contacts Live Owner Release](contacts/LIVE-OWNER-RELEASE.md). Original LV Zion applications and other module branches were unchanged.

## Actual signup completion: historical live release

Self-service signup was extended by [PR #27](https://github.com/lovelaceaml-hub/lvzion-official/pull/27), merged at `af3ec1ebed8cdf2036f383e314aa7938cb7d8849`. Vercel production deployment `dpl_oT4pR8hoP1j9QuvMiWqcw8N4RmaH` is READY, and `https://lvz.app/sign-up` serves required separate first and last name fields. The confirmed enrollment path now persists both name parts in a private, member-linked RLS-protected table without changing legacy names, original display_name behavior, Unassigned placement, owner bootstrap or existing approvals.

A protected resend-confirmation action is available from the check-email screen; automatic email sends on refresh remain forbidden. Pending confirmation survives same-tab refresh. Supabase migration hosted version `20261014225857` is applied and reconciled in the ledger. Read-only hosted verification showed private direct-table access denied, anonymous enrollment denied, and old member counts unchanged. Production type/Node/disposable-database/build checks passed, and public authentication pages responded correctly. Separate mobile Playwright execution, actual new-member SMTP delivery and physical iOS/Android interaction tests were not performed for this release. See [Actual App Setup](ACTUAL-APP-SETUP.md) for verified scope, deployment and rollback.

## Contacts R5 verified private workspace

The real Contacts module at [lvz.app/modules/contacts](https://lvz.app/modules/contacts) was expanded in merged PR #31. Production deployment `dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv` is READY at commit `87c5a8573ca01f7216f2c78df1da5b827b7380d2`. It adds owner-only loaded-name search, status overview, accessible-record duplicate suggestions and the real shared Apps picker. The complete production build passed **322 app tests + 198 foundation SQL assertions**; five local Chromium widths passed. Signed-out and cross-origin Contacts requests were denied on the live domain. The existing owner-only database grant is unchanged, with zero contact records at verification. Confidential member sharing and richer database worklists are **not** enabled. Evidence and precise limitations: [Contacts owner experience R5](contacts/OWNER-EXPERIENCE-R5.md).
