# LV Zion Official handoff

## Quick links

- [Actual app](https://lvz.app)
- [Private repository](https://github.com/lovelaceaml-hub/lvzion-official)
- [Current setup and Build log](ACTUAL-APP-SETUP.md)
- [Release controls](RELEASE-GATES.md)
- [Hosted migration mapping](HOSTED-MIGRATION-LEDGER.json)
- [Worship Duty integration (not live)](worship-duty/README.md)
- [Worship Duty Work handoff](worship-duty/WORK-HANDOFF.md)

## Current work

change/actual-app-setup contains the main application release. Anthony explicitly requested the actual app at lvz.app and no additional previews. Automatic preview publication is disabled in Vercel; automatic Git deployments are disabled in vercel.json. The app's actual front door is sign-in. Fictional routes redirect on production. Other module draft branches and original LV Zion apps remain outside scope.

New confirmed accounts start Unassigned to category, group and unit and see only their own records. Authorized member administration verifies membership and places each person, retaining history/audit. The designated first owner confirms the privately configured email, receives independent organization/department/technical administration, and remains Unassigned. Organization entries are created only from Anthony's supplied instructions. No member roster is imported.

## Applied and verified

The original member setup applied six migrations. Additional module and signup migrations have since been applied. Current hosted migration metadata must be reconciled with HOSTED-MIGRATION-LEDGER.json before any future schema change. The older three were not replayed; all definitions match the repository under the documented normalization. Production origin is configured. The earlier template update used an ignored management API field; the corrected *_content field is now applied and strictly verified by readback. The Before User Created hook enforces app-issued signup tickets. Owner designation is private. Confirmed-email enrollment is enabled after verified SMTP delivery. Before configuration there were zero Auth users, members and linked accounts.

128 application tests, 182 PostgreSQL assertions, 32 phone Chromium tests, 44 local signup checks and 42 invitation/recovery checks passed. The real local hook also rejected a direct signup bypass and allowed app-issued tickets. External security review was waived by Anthony. Hosted owner confirmation and first sign-in were verified privately. Physical-device testing is not yet claimed.

## Current production and email

The actual app and self-service signup are live at https://lvz.app/sign-up. The organization release dpl_URciYVcPXdq5cJTURF9DpfAaSFZU is READY at ce41310e3ef932af58d51e7c4c66af985146c23f (PR #24). The subsequent verified production deployment dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv at 87c5a8573ca01f7216f2c78df1da5b827b7380d2 retains that release by verified Git ancestry. The live signup form has a six-character minimum. Hosted confirmation failure returns the sign-in recovery path with no-store headers. Anonymous member API access is denied; the public member page contains only a loading shell. Signup, verified delivery and account-email switches are enabled only for production. Twelve production signup/access checks passed; fictional routes redirect, anonymous private records are denied and a forged-origin request created no Auth identity. The provider reports the SMTP test delivered to its own synthetic delivered@resend.dev inbox. TLS authentication was verified. No real account or personal record was created for testing.

The approved Resend key has sending-only access to auth.lvz.app and is stored in personal Keychain plus Supabase/Vercel secret stores. No credential files or logs contain its value. Resend remains on the free plan with paid overages off. Anthony specifically approved thirty signup-confirmation emails per hour on 2026-10-14. The value was applied and read back at thirty. The earlier rejected increase was not bypassed. SMTP port is a string in the current management API.

## User handoff

The designated owner registered and confirmed the email, then encountered the default browser-bound confirmation failure. The email was already confirmed; the account had a valid display name but no member link. Signing in with the existing password completed the profile. Read-only verification confirmed enabled account access, intake/Unassigned status, all three independent administrative roles, zero placements and one owner-initialization audit entry. No real identity details are stored in Git. The owner can now configure actual organization names and place members.

The earlier management API call used mailer_templates_confirmation instead of mailer_templates_confirmation_content, so it was silently ignored. The hosted template still used ConfirmationURL and browser-bound PKCE. The corrected template links directly to /auth/continue with a fragment token and explicit confirmation POST. scripts/configure-signup-email.mjs now applies the proper content setting and verifies the exact content/subject plus required email confirmation. The local SMTP gateway uses that same template, preventing a separate local template from hiding hosted drift. Legacy PKCE failures offer an explicit sign-in recovery link.

Retain dpl_9r1r6Gae4cRwtTnAtDmMunn9yqTX for immediate website rollback to signup-closed actual app, and the earlier static dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk for full prototype fallback. To halt enrollment, disable the database enrollment switch and production signup flag. Never erase audit/history or drop the additive schema as a rollback shortcut.

Personal credentials use Apple Passwords or Keychain only. No credentials or designated personal email are in Git.

## Password policy update

Anthony requested six characters as the minimum on 2026-10-14. The signup, invitation-activation and recovery forms and their server validation now agree. Supabase Auth and the actual signup, invitation and recovery pages were verified at six in production deployment dpl_5XtZ7FjKqF71w3unp8z59Vqd2722, commit 9ac33961ad37c433e41cf256dbd3dfe2d9479b78. The earlier twelve-character rule is superseded by this direct instruction.

## Organization and placement completion

The current bounded workflow is docs/ORGANIZATION-WORKFLOW.md, with plain-language instructions in docs/USER-MANUAL.md. Anthony requested two empty units in each existing group and completion of this management flow. The actual structure is verified at four age categories, eight groups and sixteen units, all empty, with sixteen audited unit creations. The live workflow provides a nested hierarchy, parent-bound creation, rename/archive controls, shared placement choices and clear leadership scope. Backend authorization and schema are unchanged. The integrated final build passed 244 application tests and 198 SQL assertions; all 77 browser checks passed. The controller reviewed the complete scoped change. The real signed-in owner view was verified at 4/8/16. Adult Male showed two groups with two units each. Selecting Adult Female / Group 2 / Unit 2 showed the complete path; the selection was cleared without submission. The owner and all groups remain Unassigned/empty. Public management and signup pages return 200, while anonymous member API access returns 401 with no-store. Proof is docs/screenshots/organization-live.jpg. No physical-device test is claimed.

## Contacts module: verified owner-only production release

Contacts is deployed as the real LV Zion module at [lvz.app/modules/contacts](https://lvz.app/modules/contacts), using verified LV Zion authentication and explicit one-owner-only module access. Vercel deployment `dpl_2qdE7XJTTJjvG2V6p8sXkQqTG6VZ` is READY at `7aec7b5c1a777828ddace44c498ac90e2c9a5995`. Supabase migration `20261014224708_contacts_private_owner_pilot_v1` is applied; six private Contacts tables are RLS/FORCE RLS protected. No real contacts were imported. The owner remains Unassigned without inventing a group/unit. Production flag `LVZ_CONTACTS_OWNER_PILOT=true` is explicitly scoped to this verified release. Anonymous access is denied. The owner-only interface includes contact entry, author notes, follow-ups, do-not-contact, archival and audit history; sharing/leader access/export/messages are disabled. Full build: 241 tests, 182 foundation SQL assertions. The owner's browser-authenticated save/reload should still be confirmed manually, and full cross-member workflow approval is separate.

**Detailed release evidence, verified denials and rollback:** [Contacts Live Owner Release](contacts/LIVE-OWNER-RELEASE.md). Original LV Zion applications and other module branches were unchanged.

## Actual signup completion — live release

Self-service signup was extended by [PR #27](https://github.com/lovelaceaml-hub/lvzion-official/pull/27), merged at `af3ec1ebed8cdf2036f383e314aa7938cb7d8849`. Vercel production deployment `dpl_oT4pR8hoP1j9QuvMiWqcw8N4RmaH` is READY, and `https://lvz.app/sign-up` serves required separate first and last name fields. The confirmed enrollment path now persists both name parts in a private, member-linked RLS-protected table without changing legacy names, original display_name behavior, Unassigned placement, owner bootstrap or existing approvals.

A protected resend-confirmation action is available from the check-email screen; automatic email sends on refresh remain forbidden. Pending confirmation survives same-tab refresh. Supabase migration hosted version `20261014225857` is applied and reconciled in the ledger. Read-only hosted verification showed private direct-table access denied, anonymous enrollment denied, and old member counts unchanged. Production type/Node/disposable-database/build checks passed, and public authentication pages responded correctly. Separate mobile Playwright execution, actual new-member SMTP delivery and physical iOS/Android interaction tests were not performed for this release. See [Actual App Setup](ACTUAL-APP-SETUP.md) for verified scope, deployment and rollback.

## Contacts R5 verified private workspace

The real Contacts module at [lvz.app/modules/contacts](https://lvz.app/modules/contacts) was expanded in merged PR #31. Production deployment `dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv` is READY at commit `87c5a8573ca01f7216f2c78df1da5b827b7380d2`. It adds owner-only loaded-name search, status overview, accessible-record duplicate suggestions and the real shared Apps picker. The complete production build passed **322 app tests + 198 foundation SQL assertions**; five local Chromium widths passed. Signed-out and cross-origin Contacts requests were denied on the live domain. The existing owner-only database grant is unchanged, with zero contact records at verification. Confidential member sharing and richer database worklists are **not** enabled. Evidence and precise limitations: [Contacts owner experience R5](contacts/OWNER-EXPERIENCE-R5.md).

## Worship Duty integration — NOT live

The user requested Worship Duty as another module of the **real** `lvz.app`. [Draft PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25), branch `feature/worship-duty-live`, integrates the R1/R2 member-facing code with the current live foundation; historical [PR #5](https://github.com/lovelaceaml-hub/lvzion-official/pull/5) is based on a superseded member branch and is **not** to be directly merged. The historical R3 month planner remains **fictional and without persistent production storage**.

As checked October 14, the real Supabase project had **zero Worship Duty module records, private tables, public RPCs or grants**. Four Worship-specific SQL migrations in the draft branch remain unapplied. The fourth owner-setup migration is not tested, and the owner setup screen/API are not committed. No real Worship session/write, branch build, or production deployment has been verified for this current integration. A READY production `lvz.app` build refers to the **other** live modules, not Worship.

**Authoritative module documents:** [status/index](worship-duty/README.md), [Work handoff](worship-duty/WORK-HANDOFF.md), [feature inventory](worship-duty/IMPLEMENTATION-STATUS.md), [release checklist](worship-duty/PRODUCTION-RELEASE-CHECKLIST.md), [migration order/status](worship-duty/MIGRATION-STATUS.md), [verification plan](worship-duty/VERIFICATION-PLAN.md), [structured evidence](worship-duty/STATUS-EVIDENCE.json).

Next authorized work is to finish and test the setup front end and backend, reconcile with concurrently updated `main`, validate SQL/RLS and exact member permissions, perform controlled hosted migration + owner verification, and deliberately deploy the tested combined production build. Do **not** import legacy rosters or touch `lv-zion-duties.web.app`. Documentation-only commits do not launch this module.
