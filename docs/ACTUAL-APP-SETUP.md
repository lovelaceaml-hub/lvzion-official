# Actual LV Zion Official setup

Current instructions updated October 16, 2026. Read the [handoff](HANDOFF.md), [release controls](RELEASE-GATES.md) and [fresh-start correction](FRESH-START-2026-10-16.md) before changing production. Revision-specific receipts remain in Git history; completed setup is not a request to repeat it.

## Target and authority

The application is https://lvz.app, Vercel project `lvzion-official` in team `lvzion`, with Supabase project `otecqlkqirncotytbfns`. Only explicitly approved requirements for this self-contained application govern implementation. Schedules and configuration are created deliberately within it and may be empty.

Anthony authorized the actual production application and prohibited unrequested previews. Automatic Vercel Git deployments remain disabled. Deploy deliberately after validation and verify source/aliases. External security review was previously waived; tests and authorization controls were not waived. Do not purchase services, enable paid overages, import a roster or widen module grants without specific approval.

## Member and owner behavior

The front door is sign-in. Confirmed-email self-service signup creates exactly one intake/Unassigned member with no age category, group or unit. Ordinary intake accounts see only their own profile. Authorized member administration independently verifies membership and assigns placement, retaining the decision and history. Department and technical authority remain separate.

The privately designated initial owner personally confirms the email and chooses a password. A singleton initialization receipt prevents repeated grants. The owner begins Unassigned and can configure the approved hierarchy. Do not fabricate placements or expose the private designation in Git.

## Signup and authentication controls

Production activation requires the exact project, production origin and Vercel environment. Local credentials cannot activate this backend. Keep confirmed-email signup, durable keyed rate buckets and BotID Basic safeguards enabled. Paid deep analysis is not enabled.

Signup uses a single-use, email-bound ticket expiring after five minutes. The Before User Created hook rejects direct signup without an approved ticket. Browser roles cannot issue tickets or read private settings. Invitation tickets require an existing verified invitation; tickets do not confer member permissions.

Confirmation tokens are kept in the URL fragment and require deliberate POST; a page GET or email scanner must not create membership or send confirmation mail. The configured confirmation template uses `mailer_templates_confirmation_content`, not the ignored similarly named setting. Local integration tests must use the same template. Failed browser-bound confirmation offers password sign-in recovery for an already confirmed account without weakening email verification.

The owner-approved minimum password length is six characters across signup, invitations and recovery, with longer passwords accepted up to 128 characters. Authentication security settings are not changed by the calendar correction. The approved signup-confirmation email rate is thirty per hour; do not silently raise it.

Resend uses the dedicated `auth.lvz.app` sender and the approved free plan with paid overages disabled. Sending credentials remain restricted and stored only in personal Keychain and Supabase/Vercel provider stores. DNS, SMTP/TLS and delivery must be verified before modifying email readiness. No credential or personal owner address belongs in logs, exports, Git or screenshots.

## Names and refresh behavior

First and last names are required and validated separately. Signup sends display name plus both individual fields while retaining the one-use ticket and bot/rate controls. Private name storage is visible only to the account and authorized pending-member administrators. Existing names are not split or backfilled heuristically.

Confirmed-session onboarding creates one Unassigned member without invented roles or organization placement. The pending-confirmation screen survives a same-tab refresh without storing passwords or email in tab storage. Resend is explicit, rate-limited and generic enough to limit account enumeration; GET/refresh cannot send mail.

## Current module setup

Study Rooms is available within the authorized Apps registry. Booking is enabled for the existing audience, with empty weekly and special-date restrictions. Empty weekly saves are supported. Resource inventory, private reservation history, receipt/version controls, overlap checks and management permissions remain intact. The October 16 database correction removed four exact never-edited defaults, updated calendar version to 2 and wrote one audit event. See [current operations](study-rooms/README.md).

Contacts is a private owner workspace until the October 24 open-access migration is applied, then a private workspace for each signed-in member, with RLS, ownership, author-only notes, do-not-contact and audit controls. Sharing, export and communications remain separately controlled. Read [Contacts operations](contacts/OPERATIONS.md) and [verification](contacts/VERIFICATION.md).

Display publishes only reviewed content to explicitly paired devices. Work Mission uses deliberately entered dates, materials, host assignments and protected meeting links. Neither a module tile nor a passing build establishes a broader audience or physical-device acceptance.

## Verification and recovery

The October 16 production build at `dfad3817911f2ba195a21762986f54cceed46d78` passed 382 tests, 198 additional PostgreSQL permission assertions, TypeScript and Next.js build. Deployed-browser checks used synthetic private API responses and separately verified anonymous denials. They did not create a real Auth identity, reservation, invitation or email.

Use the [migration ledger](HOSTED-MIGRATION-LEDGER.json) because hosted and repository versions differ. Apply only pending, tested incremental SQL. Do not replay applied installation statements or run a blind database push. Keep member/account/history tables intact.

Choose a verified deployment compatible with the current schema for recovery. If enrollment must pause, use the application enrollment controls and production signup/email switches; do not erase enrolled members or audit data. A Study Room maintenance pause is local to this application. Do not restore unapproved calendar defaults as a recovery shortcut.

Historical Auth integration, organization and module receipts are version-specific. Run the needed checks for the current change and report exactly what was executed. Physical-device and genuine hosted-member acceptance remain separately identified.
