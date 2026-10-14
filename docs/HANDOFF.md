# LV Zion Official handoff

## Quick links

- [Actual app](https://lvz.app)
- [Private repository](https://github.com/lovelaceaml-hub/lvzion-official)
- [Current setup and Build log](ACTUAL-APP-SETUP.md)
- [Release controls](RELEASE-GATES.md)
- [Hosted migration mapping](HOSTED-MIGRATION-LEDGER.json)

## Current work

change/actual-app-setup contains the main application release. Anthony explicitly requested the actual app at lvz.app and no additional previews. Automatic preview publication is disabled in Vercel; automatic Git deployments are disabled in vercel.json. The app's actual front door is sign-in. Fictional routes redirect on production. Other module draft branches and original LV Zion apps remain outside scope.

New confirmed accounts start Unassigned to category, group and unit and see only their own records. Authorized member administration verifies membership and places each person, retaining history/audit. The designated first owner confirms the privately configured email, receives independent organization/department/technical administration, and remains Unassigned. No hierarchy names or real records are imported.

## Applied and verified

Six migrations are now applied on the actual new project. The older three were not replayed; all definitions match the repository under the documented normalization. Production origin and confirmation template are configured. The Before User Created hook enforces app-issued signup tickets. Owner designation is private. Confirmed-email enrollment is enabled after verified SMTP delivery. Before configuration there were zero Auth users, members and linked accounts.

124 application tests, 182 PostgreSQL assertions, 31 phone Chromium tests, 39 local signup checks and 42 invitation/recovery checks passed. The real local hook also rejected a direct signup bypass and allowed app-issued tickets. External security review was waived by Anthony. Physical-device and hosted owner confirmation are not yet claimed.

## Current production and email

The actual app and self-service signup are live at https://lvz.app/sign-up. Production deployment dpl_8aR37Y4qqZRfvfJbT9sMLA2MY7VK is READY at main commit c33bcb638e28822c24c5695ce5f610c535406e01. Signup, verified delivery and account-email switches are enabled only for production. Twelve production signup/access checks passed; fictional routes redirect, anonymous private records are denied and a forged-origin request created no Auth identity. The provider reports the SMTP test delivered to its own synthetic delivered@resend.dev inbox. TLS authentication was verified. No real account or personal record was created for testing.

The approved Resend key has sending-only access to auth.lvz.app and is stored in personal Keychain plus Supabase/Vercel secret stores. No credential files or logs contain its value. Resend remains on the free plan with paid overages off. Supabase's existing signup-email cap remains two per hour. Automatic approval review rejected an unapproved increase to thirty; a separate specific user decision is pending. Do not raise that cap until approved. SMTP port is a string in the current management API.

## User handoff

The designated owner must choose their own password on the real signup page and confirm the email. The form was prepared with the user-supplied account details; no password was entered by the agent. After confirmation, verify the private bootstrap receipt, three independent administrative roles and null placement. The owner can configure actual category/group/unit names. Do not fabricate them. Physical-device testing remains unclaimed. Keep real identity/contact details and private member records out of Git and screenshots.

Retain dpl_9r1r6Gae4cRwtTnAtDmMunn9yqTX for immediate website rollback to signup-closed actual app, and the earlier static dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk for full prototype fallback. To halt enrollment, disable the database enrollment switch and production signup flag. Never erase audit/history or drop the additive schema as a rollback shortcut.

Personal credentials use Apple Passwords or Keychain only. No credentials or designated personal email are in Git.
