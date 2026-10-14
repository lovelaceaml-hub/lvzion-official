# LV Zion Mobile Product Decisions

Recorded 2026-10-13 from the design interview. This is a new application, *not* a migration of the old app architecture. The previous six app concepts and demo slots are not an approved official app lineup.

## Current implementation status

This file retains the original design decisions and proposals. Current implementation is documented in the [handoff](HANDOFF.md) and [member guide](USER-MANUAL.md). The actual app, confirmed-email signup and requested 4/8/16 hierarchy are live; older prototype-only, unconfigured-email and unknown-label statements below are historical. The current auth routes are /sign-in, /sign-up and /auth/continue; do not configure callbacks from the earlier proposed route names. No design proposal here independently authorizes migration, module activation or a member import.

## Mobile experience
- Personalized hybrid home with **My Week** and **Manage** tabs; default is My Week.
- Today, Week and Calendar inside My Week; prominently show next activity, then smaller upcoming items. Tapping an activity opens a bottom sheet with context and quick actions.
- Main bottom navigation: Home, raised center Apps button, Notifications. Profile from header.
- Apps button opens a nearly full-height sheet. Members see only authorized apps, with up to eight user-chosen compact icon favorites; pin and reorder by Edit or long-press, synced between home and Apps sheet.
- Enter each app at its own landing screen; apps have contextual bottom navigation, central Apps switcher and role-restricted Manage tab. Top-left LV Zion button returns home.
- Main Manage is a needs-attention overview with grouped responsibilities. Specific department tools belong inside each app, not on the main dashboard.
- Notification center groups Needs Action above Recent. Per-app optional push settings. The user requested detailed previews; sensitive content still requires explicit review before enabling pushes.
- A short skippable initial setup; English launch with localization-ready architecture; no universal search; approved nonsensitive offline views may be read-only.
- Overall visual system: elegant/spacious/rounded, restrained motion, distinct app accent colors.

## People, governance and data
- Membership records distinct from sign-in accounts; leaders invite members; people may request account access. Member group directory is group-limited and names-only; ordinary members do not see others' phones/emails.
- Member profiles show organizational position, group/unit, department memberships and authorized management access. Members may edit personal contact/preferences; official data changes require authorized action.
- Member, Unit leader, Group leader, Pastoral Staff, App administrator are organizational positions; department membership and app-level management rights are independently assigned. Department leaders can assign members within authorized departments; broader oversight is explicitly granted.
- Cross-group move requires request and receiving acceptance; authorized staff/admin can transfer directly. Group-related access ends on departure, unrelated department rights continue until changed.
- Inactive member accounts are suspended while historical records remain. Leadership assignments last until manually ended by authorized personnel; maintain appointment audit history, no automatic expiry.
- Administrative activity log includes actor, time and consequential-change rationale.
- Confidential details are protected server-side with role/department authorization, not merely hidden in UI.

## Implementation guardrails
- Initial target 150 active people from a 400-member congregation; design to scale to all 400.
- Use efficient queries, incremental changes and realtime subscriptions where warranted; do not full-poll every few seconds.
- Supabase PostgreSQL/RLS/Auth/Realtimes/Storage, Vercel Next.js, private GitHub repository.
- No real personal data in prototype or repository; no permanent deletion, migration, purchase, or bulk invitation without explicit authorization.

## Decisions confirmed: member-system interview 61-66

Confirmed on 2026-10-13; these supersede any conflicting recommendations, but do not automatically authorize production migrations.

- **61 A: Organizational hierarchy:** Age Category → Group → Unit → Member. The later approved age categories are Adult Male, Adult Female, Young Adult Male and Young Adult Female; each now has Group 1 and Group 2, each with Unit 1 and Unit 2. Administrators will manage organizational entries, not hard-code their labels into UI logic.
- **62 C: Placement:** A member has one active primary group/unit placement (the unit is part of that group) and may hold multiple department memberships or independent department-management assignments.
- **63 C: Sign-in:** Username **or** email plus password. Supabase Auth does not natively support username/password sign-in, so username resolution and account recovery must be designed securely; a login UI alone does not satisfy this requirement. Do not create fake shared email addresses or expose whether a username exists.
- **64 C: Initial membership population:** Start with fictional accounts and fixtures; use a controlled, reviewed import of the real congregation only after explicit authorization, duplicate review, security tests, and documented backup/recovery.
- **65 A: Delegated member management:** Unit leaders manage members within assigned units; group leaders oversee members in their groups; Pastoral Staff have broader specifically granted organizational authority. Cross-group transfers retain the established request/receiving-acceptance workflow; this answer does not remove transfer controls.
- **66 B: Technical vs church authority:** App administrators manage technical settings/account operations without automatic access to ministry records, confidential member fields, or organizational decision-making. Such access requires a separately granted, scoped church role.

### Historical registration-stage snapshot (2026-10-14)

- **`lvz.app` is owned and verified** under Vercel team `lvzion`; annual renewal is enabled. This is the canonical production address for the new LV Zion Official application, not the former LV Zion app.
- The apex domain `lvz.app` is attached to Vercel project `prj_4icc6S1jw8OVKWD9AOI1oiB5fwYe`. Vercel reports clean DNS configuration and an issued auto-renewing TLS certificate.
- `www.lvz.app` is also attached to the same project, Vercel-verified, with a permanent HTTP 308 redirect to `lvz.app` and its own TLS certificate.
- **Current site is synthetic design prototype only**; no real member account/login, member data or organizational admin access is active. Domain registration does not make it ready for congregation rollout.
- **Still pending:** deploy and verify functioning `/login` and `/auth/callback` routes. Only then set Supabase Auth site URL to `https://lvz.app` and allowed redirect callback(s) for the new project; confirm password reset and invitation flows.
- **Email is not yet configured:** Vercel DNS has no MX, SPF, DKIM, or DMARC records, and no chosen mail provider. Choose transactional sending provider and inbox/forwarding provider, then add provider-issued DNS records and verify them before using `@lvz.app`.
- See `docs/DOMAIN-SETUP.md` for current verified status, remaining tasks and separation boundaries.

## Original proposed member-system data architecture (design record)

This section records the original blueprint before hosted implementation. Current applied migrations are in [the ledger](HOSTED-MIGRATION-LEDGER.json); the old unapplied status does not describe today's production.

| Entity | Purpose and essential constraint |
| --- | --- |
| `age_categories`, `church_groups`, `church_units` | Administrator-configured Age Category → Group → Unit hierarchy; units belong to one group and groups to one category. |
| `members` | Durable church-person record separate from authentication, including status and non-sensitive display information. Keep contact information in restricted storage. |
| `member_placements` | Auditable group/unit history with start/end timestamps; **at most one active primary placement** per member. |
| `member_private_contacts` | Private email/phone and sensitive preferences; no exposure through ordinary group directory. |
| `account_links` | Links an activated Supabase Auth user to exactly one approved member record; members can exist before login is created. |
| `departments`, `department_memberships` | Multiple department associations independent from the primary church group/unit. |
| `role_assignments` | Explicit, time-bounded-by-manual-end responsibility and scope (unit, group, department, app, or broad pastoral scope); technical administrator is a separate authorization concern. |
| `invitations`, `access_requests` | Reviewed account activation; both leader-initiated invites and member access requests are supported without creating duplicate members. |
| `transfer_requests` | Source/destination group and unit, requested-by, approved/accepted-by, and status; preserve placement history, block premature privilege changes. |
| `audit_events` | Actor, operation, scoped target, time, rationale and minimal safe before/after metadata. Never store passwords or tokens. |

### Authorization invariants

1. PostgreSQL RLS and trusted server authorization enforce permissions; never trust role switches, query filters, or hidden navigation alone.
2. Ordinary members can view their own allowed profile information and a **names-only directory restricted to their own group**. They cannot enumerate members' private contacts.
3. Unit and group leaders can change authorized member records **only within their active assignment scope**. Broad access must be explicitly assigned to Pastoral Staff.
4. Department managers' permissions apply **only to their assigned departments and application functions**; group leadership alone does not confer those permissions.
5. App administrator privileges for deployments, configuration, or troubleshooting do not confer ministry-data access.
6. Group transfer commits, role changes, invitations and contact changes must be transactionally validated and audited; departure revokes the former group/unit access while unrelated department rights are retained until independently changed.
7. Suspended accounts lose session/application access while historical member records and audit history remain. No hard deletion by default.
8. Restrict private data in notifications and offline caches. Do not place Supabase service-role keys in a client bundle, Git repository, or public environment variables.

### Implementation order and acceptance checks

1. **Stabilize existing prototype:** reproducible lockfile, TypeScript conversion, lint/type checks, selective lightweight CI (mind the GitHub Actions budget), tested phone/PWA navigation. Keep the existing public deployment unchanged.
2. **Model hierarchy and memberships:** reviewed migration on new Supabase project, seeded fictional categories/groups/units/members, one-primary-placement constraints, placement-change history, and deny-by-default RLS.
3. **Identity and onboarding:** member/invitation matching, username-or-email sign-in and verified recovery, verified activation flow, suspension and sign-out/session revocation. Do not bulk invite real people.
4. **Scoped leadership tools:** unit/group/pastoral and technical-admin views using a shared server-side permission engine; request-and-accept transfer workflow; auditable role appointments.
5. **Connect member dashboard:** real authorized member profile, group label, department badges, role-specific Manage sections, and privacy-safe notifications; retain fictional sample events until app data sources exist.
6. **Approve first official app modules:** only after the app lineup and each module's owner/data-access rules are confirmed. Earlier legacy apps and prototype numbered tiles are not automatically in scope.
7. **Pilot then launch:** automated permission-denial/privilege-escalation tests, duplicate-import dry run, data-backup/restore rehearsal, mobile accessibility checks, and a limited, authorized member pilot before any larger rollout.

### Specific checks for first acceptance test

- A member in Group A cannot see Group B's members or private contact details in either UI or direct API requests.
- A unit leader can edit their own unit's authorized fields but cannot change another unit or grant themself a role.
- A department manager cannot obtain group-wide administrative privileges, and a technical admin cannot read ministry data.
- A group transfer does not grant destination permissions before acceptance and removes old group permissions when finalized.
- A member without an activated login remains one durable person record; activating the invited account links the existing record instead of inserting a duplicate.
- Suspending an account blocks access; audit and placement history remain intact.

### Open items to answer without holding up safe prototype work

- Exact age-category labels and the group/unit naming system used by Las Vegas Zion.
- Identity verification and password recovery for people with usernames but no deliverable personal email.
- Which official application module launches first, its accountable owner, and its restricted data fields.
- Whether `support@lvz.app` will receive via forwarding or a dedicated inbox; choice of transactional email provider.

## Self-service signup update, 2026-10-14

Anthony requires members to sign up themselves. They begin Unassigned to age category, group and unit. Email confirmation enables only their own pending profile. Independently authorized pastoral/member administration verifies church membership and sets the initial placement. The previous leaders-invite-only decision is superseded for new records. Verified invitations remain available for an existing record; names are never an automatic identity match. Email/password is the new-member login, with existing invitation usernames preserved. No real enrollment or production release is authorized by this development increment.
