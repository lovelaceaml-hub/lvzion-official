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

Six migrations are now applied on the actual new project. The older three were not replayed; all definitions match the repository under the documented normalization. Production origin and confirmation template are configured. The Before User Created hook enforces app-issued signup tickets. Owner designation is private and enrollment remains disabled during setup. Before configuration there were zero Auth users, members and linked accounts.

124 application tests, 182 PostgreSQL assertions, 31 phone Chromium tests, 39 local signup checks and 42 invitation/recovery checks passed. The real local hook also rejected a direct signup bypass and allowed app-issued tickets. External security review was waived by Anthony. Physical-device and hosted owner confirmation are not yet claimed.

## Remaining setup

Resend free-plan auth.lvz.app domain is verified. The restricted sending key is prepared, awaiting browser-required credential confirmation, then will be stored in Keychain and provider secret stores. SMTP connection and public enrollment activation remain. The actual app is live at lvz.app from merged PR #14, commit 3d4519856bebc322b27869d7dd3292258f54326f, production deployment dpl_9r1r6Gae4cRwtTnAtDmMunn9yqTX. Twelve actual production HTTP checks passed, and the browser displays the real sign-in page. Fictional routes redirect and anonymous member requests are denied. The owner has not created or confirmed an account yet. Retain dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk for website rollback.

Personal credentials use Apple Passwords or Keychain only. No credentials or designated personal email are in Git.
