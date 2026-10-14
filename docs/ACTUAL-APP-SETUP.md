# Actual LV Zion Official setup

## Authority and release

Anthony requested the actual app at https://lvz.app on 2026-10-14, and prohibited additional previews unless explicitly requested. This supersedes the earlier development-only boundary. Release uses full replacement after automated validation. Automatic Vercel previews are disabled at project level and Git deployments are disabled in vercel.json. Independent external security review was waived by Anthony. Original apps, real-member imports and unrelated module draft branches remain outside scope.

## Behavior

The front door is actual sign-in. Confirmed email signup creates an intake member with no age category, group or unit. Ordinary intake members see only their own profile. Pastoral/member administration independently verifies and assigns an active unit. The placement and decision are retained in audit history. Department and technical authority remain separate.

A privately designated first owner receives member, department and account administration after personally confirming the designated email. The singleton receipt prevents repeated initialization. The owner starts Unassigned and can create the actual hierarchy. No organizational names or placements are fabricated. The designated email is stored privately in the database, never in Git.

## Production controls

Production requires the exact approved Supabase project, https://lvz.app, actual Vercel production and explicit activation. Isolated/local credentials cannot activate that backend. Public signup also requires confirmed mail readiness and BotID Basic. The app checks bot signals and durable keyed rate buckets. A single-use, email-bound ticket expires after five minutes; Supabase's Before User Created hook rejects direct signup without it. Browser roles cannot issue tickets or read private settings. Invitations receive tickets only for existing verified invitation records. Tickets grant no member permissions.

BotID uses explicit basic checks on client/server. Paid deep analysis is not enabled. Resend uses a dedicated auth.lvz.app sender on the approved free plan. Never enable overages without permission. Confirmation links keep tokens in fragments and require an explicit POST. Email confirmation remains enabled, anonymous signup disabled, password minimum six characters. Recovery and invitation messages use the same verified SMTP provider.

## Validation

124 application tests, 182 disposable PostgreSQL permission assertions, 31 phone Chromium checks, 39 local signup/Auth/PostgREST/SMTP checks and 42 existing invitation/recovery checks passed. These local checks use fictional identities and a loopback mail sink. Hosted SMTP/TLS delivery is now verified. The owner's real email confirmation remains a separate human step. Physical-device checks remain unclaimed.

## Migration and rollback

The existing three foundation migrations were compared before release and were not replayed. Three additive migrations were applied individually: module runtime, self-service enrollment, production owner setup. Before application the hosted database had zero Auth users, members and account links. Enrollment remained disabled during configuration. See HOSTED-MIGRATION-LEDGER.json for differing hosted and repository IDs.

Retain the old production deployment dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk for website rollback. The additive schema is compatible with that static prototype. If real enrollment needs to stop, disable the database enrollment setting and the production signup/email flags. Do not drop tables or erase existing enrollment/audit records. Do not blindly run db push because older hosted migration IDs differ.

## Build log

- Replaced the prototype front door with actual sign-in and redirected fictional routes in production.
- Added explicit production safeguards, first-owner initialization without placement, free bot checks and a server-only signup ticket hook.
- Applied tested additive database migrations and configured exact production confirmation links.
- Created and verified public DNS entries for auth.lvz.app. The restricted credential connection is pending user confirmation. Actual app release is merged in PR #14 and production deployment dpl_9r1r6Gae4cRwtTnAtDmMunn9yqTX is READY at commit 3d4519856bebc322b27869d7dd3292258f54326f. Twelve actual production HTTP checks passed. Signup remains off until delivery is connected and verified.

- The user specifically approved creating the sending-only auth.lvz.app key and saving it in Keychain and Supabase/Vercel on 2026-10-14. Personal Keychain and both provider stores were verified without exposing its value.
- SMTP/TLS authentication passed and Resend reported a non-personal provider test delivered. Resend free plan and disabled paid overages were verified.
- Automatic approval review rejected an unapproved email-rate increase from two to thirty per hour. The existing cap was retained while the approved connection was completed. A specific capacity decision is pending.
- Real database enrollment and production signup/email switches are now enabled. Production deployment dpl_8aR37Y4qqZRfvfJbT9sMLA2MY7VK is READY at c33bcb638e28822c24c5695ce5f610c535406e01. Twelve production signup/access checks passed, and all app tables retain RLS.
- The real signup form is available for the owner to choose a password and confirm their own email. No real account or imported record was created by the agent.

- Anthony requested a six-character password minimum on 2026-10-14. Signup, invitation activation, password recovery and Supabase Auth use the same six-character minimum. Longer passwords remain accepted up to 128 characters.

- Anthony approved thirty signup-confirmation emails per hour on 2026-10-14. The setting was applied and verified at thirty; no other limits were changed.
- The first real owner confirmed the email, but the default hosted template still used browser-bound PKCE because the earlier template update used an ignored setting name. The correct mailer_templates_confirmation_content property is now applied and strictly checked by provider readback. Local mail tests share that exact template.
- The owner's password sign-in completed the profile. Read-only verification confirmed three administrative roles, enabled access, Unassigned status with zero placements and exactly one audited owner initialization. No owner identity details or passwords were saved in Git.
- Legacy PKCE confirmation failure now offers explicit sign-in recovery. Regression coverage checks fresh-browser email confirmation and password completion of a confirmed but unlinked profile. Confirmation still requires deliberate POST; email scanners cannot create membership.

- Corrected confirmation build passed 128 application tests, 182 PostgreSQL assertions, 32 phone-browser checks and 44 real local signup checks, including fresh-browser confirmation and sign-in repair of a confirmed but unlinked profile.
