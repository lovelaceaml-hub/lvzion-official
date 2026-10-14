# LV Zion Official handoff

## Quick links

- [Actual app](https://lvz.app)
- [Private repository](https://github.com/lovelaceaml-hub/lvzion-official)
- [Current setup and Build log](ACTUAL-APP-SETUP.md)
- [Release controls](RELEASE-GATES.md)
- [Hosted migration mapping](HOSTED-MIGRATION-LEDGER.json)

## Current work

change/actual-app-setup contains the main application release. Anthony explicitly requested the actual app at lvz.app and no additional previews. Automatic preview publication is disabled in Vercel; automatic Git deployments are disabled in vercel.json. The app's actual front door is sign-in. Fictional routes redirect on production. Other module draft branches and original LV Zion apps remain outside scope.

New confirmed accounts start Unassigned to category, group and unit and see only their own records. Authorized member administration verifies membership and places each person, retaining history/audit. The designated first owner confirms the privately configured email, receives independent organization/department/technical administration, and remains Unassigned. Organization entries are created only from Anthony's supplied instructions. No member roster is imported.

## Applied and verified

Six migrations are now applied on the actual new project. The older three were not replayed; all definitions match the repository under the documented normalization. Production origin is configured. The earlier template update used an ignored management API field; the corrected *_content field is now applied and strictly verified by readback. The Before User Created hook enforces app-issued signup tickets. Owner designation is private. Confirmed-email enrollment is enabled after verified SMTP delivery. Before configuration there were zero Auth users, members and linked accounts.

128 application tests, 182 PostgreSQL assertions, 32 phone Chromium tests, 44 local signup checks and 42 invitation/recovery checks passed. The real local hook also rejected a direct signup bypass and allowed app-issued tickets. External security review was waived by Anthony. Hosted owner confirmation and first sign-in were verified privately. Physical-device testing is not yet claimed.

## Current production and email

The actual app and self-service signup are live at https://lvz.app/sign-up. Production deployment dpl_HPHS62hL45xLa65yELUNNLt2gzRK is READY at main commit 85ec8e63626ce7bf62d449e396e79bd46b907f93, merged in PR #18. The live signup form has a six-character minimum. Hosted confirmation failure returns the sign-in recovery path with no-store headers. Anonymous member API access is denied; the public member page contains only a loading shell. Signup, verified delivery and account-email switches are enabled only for production. Twelve production signup/access checks passed; fictional routes redirect, anonymous private records are denied and a forged-origin request created no Auth identity. The provider reports the SMTP test delivered to its own synthetic delivered@resend.dev inbox. TLS authentication was verified. No real account or personal record was created for testing.

The approved Resend key has sending-only access to auth.lvz.app and is stored in personal Keychain plus Supabase/Vercel secret stores. No credential files or logs contain its value. Resend remains on the free plan with paid overages off. Anthony specifically approved thirty signup-confirmation emails per hour on 2026-10-14. The value was applied and read back at thirty. The earlier rejected increase was not bypassed. SMTP port is a string in the current management API.

## User handoff

The designated owner registered and confirmed the email, then encountered the default browser-bound confirmation failure. The email was already confirmed; the account had a valid display name but no member link. Signing in with the existing password completed the profile. Read-only verification confirmed enabled account access, intake/Unassigned status, all three independent administrative roles, zero placements and one owner-initialization audit entry. No real identity details are stored in Git. The owner can now configure actual organization names and place members.

The earlier management API call used mailer_templates_confirmation instead of mailer_templates_confirmation_content, so it was silently ignored. The hosted template still used ConfirmationURL and browser-bound PKCE. The corrected template links directly to /auth/continue with a fragment token and explicit confirmation POST. scripts/configure-signup-email.mjs now applies the proper content setting and verifies the exact content/subject plus required email confirmation. The local SMTP gateway uses that same template, preventing a separate local template from hiding hosted drift. Legacy PKCE failures offer an explicit sign-in recovery link.

Retain dpl_9r1r6Gae4cRwtTnAtDmMunn9yqTX for immediate website rollback to signup-closed actual app, and the earlier static dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk for full prototype fallback. To halt enrollment, disable the database enrollment switch and production signup flag. Never erase audit/history or drop the additive schema as a rollback shortcut.

Personal credentials use Apple Passwords or Keychain only. No credentials or designated personal email are in Git.

## Password policy update

Anthony requested six characters as the minimum on 2026-10-14. The signup, invitation-activation and recovery forms and their server validation now agree. Supabase Auth and the actual signup, invitation and recovery pages were verified at six in production deployment dpl_5XtZ7FjKqF71w3unp8z59Vqd2722, commit 9ac33961ad37c433e41cf256dbd3dfe2d9479b78. The earlier twelve-character rule is superseded by this direct instruction.

## Organization and placement completion

The current bounded workflow is docs/ORGANIZATION-WORKFLOW.md, with plain-language instructions in docs/USER-MANUAL.md. Anthony requested two empty units in each existing group and completion of this management flow. The actual structure is verified at four age categories, eight groups and sixteen units, all empty, with sixteen audited unit creations. The current branch adds a nested hierarchy, parent-bound creation, rename/archive controls, shared placement choices and clear leadership scope. Backend authorization and schema are unchanged. The final build passed 131 application tests and 182 SQL assertions; all 42 phone Chromium checks passed. The controller reviewed the complete scoped change. The previous production deployment remains live until the new release and signed-in view are verified.
