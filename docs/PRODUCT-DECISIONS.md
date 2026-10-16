# LV Zion Official product decisions

Consolidated October 16, 2026. These are owner-approved product requirements, not a claim that every proposed feature is already implemented. The current handoff and module guides report implementation status.

## Authoritative fresh start

LV Zion Official is a self-contained application at https://lvz.app. It uses its own authentication, member records, module permissions, calendars and configuration. Only explicitly approved requirements apply. A reference design approves appearance or interaction, not data, scheduling policy or operational dependencies.

Production schedules, events, assignments and materials start empty and are entered deliberately for this application. Empty calendars are valid. Do not infer times from conversation history, numbered prototype tiles or test fixtures. Fictional activities must never appear as production fallback content. Preserve existing accounts, grants and intentionally entered records. Superseded milestone proposals do not override this boundary.

## Mobile experience

The approved direction is phone-first, with a personalized My Week default and a role-restricted Manage overview. Today, Week and Calendar views prioritize the next actual activity. Activity detail uses an accessible bottom sheet with appropriate actions.

The main navigation includes Home, a prominent raised center Apps button and Notifications. Profile is available from the header. Every module keeps its header compact and a center Apps launcher in contextual bottom navigation. Each app opens at its own landing screen and shows only authorized management controls. Home controls return to the member dashboard.

The Apps sheet shows only server-authorized modules. The approved favorites direction supports up to eight compact user-selected favorites with pin/reorder behavior synchronized with Home. Notifications group Needs Action above Recent; detailed previews and optional push require separate review of confidential content. This document is not authorization to publish private notification data.

Retain the approved Day Sheet design contract, restrained motion, accessible target sizes and distinct module accents. Initial setup should be short and skippable. Launch in English with localization-ready architecture. No universal search is required. Only approved nonsensitive offline views may be read-only.

## People and governance

The hierarchy is Age Category → Group → Unit → Member. The approved categories are Adult Male, Adult Female, Young Adult Male and Young Adult Female. Each initially has two owner-requested groups, each with two units; administrators can rename the placeholders. Never hard-code organization labels into authorization logic.

A member has one active primary group/unit placement and may belong to multiple departments. Membership records are distinct from sign-in accounts. The ordinary directory is names-only and limited to the member's own group. Other members' private contact details are not exposed.

Organizational, department and technical authority are independent. Unit and group leaders act only within their assigned scopes; broader pastoral authority must be explicit. Department management applies only to assigned departments/functions. Technical administration does not imply ministry-data or organizational decision authority.

Cross-group moves require a request and receiving acceptance unless a separately authorized member administrator performs a direct transfer. Departure removes the previous group-related access; unrelated department rights continue until separately changed. Placement, appointment and audit history remain intact. Appointments continue until manually ended; inactive/suspended members lose applicable access without deletion of their history.

## Identity and signup

Members may register themselves using separate first and last names, personal email and password. Confirmed accounts begin Unassigned to category, group and unit. Email confirmation enables only the account's own pending profile. An authorized administrator independently verifies identity and membership before placement. Names alone never establish identity.

Verified invitations remain available for existing unlinked records without duplication. The approved password minimum is six characters, consistently enforced across signup, invitation activation and recovery. The owner chooses their password; no fabricated credentials or shared email identities are allowed.

Username-or-email sign-in remains an approved requirement; secure username resolution and recovery must not reveal account existence. Current implemented behavior must be reported honestly rather than inferred from a login field.

## Data and authorization invariants

Use PostgreSQL RLS and trusted server authorization. Never rely on hidden navigation, client role switches or caller-provided identity. Membership changes, transfers, invitations and consequential administration are transactional and audited with actor, time, reason and safe before/after metadata.

Keep private contacts restricted, enforce one primary placement, and link an Auth identity to the appropriate durable member record. Preserve history and deny access on suspension. No real roster import, bulk invitations, permanent deletion or purchase is authorized merely by this design record. Any later import needs explicit scope, duplicate review and recovery planning.

Fixtures belong only in disposable tests. Production screens read authorized application records, never fictional schedules. No secrets, personal records or service-role credentials may appear in Git, client bundles or public environment variables. Use efficient queries, incremental changes and realtime only where useful; avoid full-data polling every few seconds.

## Acceptance and current references

Test cross-group privacy, scoped leadership, department/technical separation, transfer timing, duplicate-free enrollment, suspension, audit retention and all anonymous denial paths. Check phone navigation, accessible dialogs, center Apps behavior and explicit empty states. Validate live source and aliases separately from repository commits. Physical-device and genuine hosted-member acceptance must not be inferred from synthetic fixtures.

Current guidance: [handoff](HANDOFF.md), [release controls](RELEASE-GATES.md), [member guide](USER-MANUAL.md), [Study Rooms](study-rooms/README.md), [design contract](design/LVZ-DESIGN-CONTRACT.md), [database ledger](HOSTED-MIGRATION-LEDGER.json).
