# Release controls

The actual application is https://lvz.app. Use only Supabase project `otecqlkqirncotytbfns` and Vercel project `lvzion-official` in team `lvzion`. No unrequested previews, automatic Git publications, purchases or unrelated-project changes are authorized. External security review was previously waived by Anthony; this does not waive application tests or access controls.

## Self-contained application

The October 16, 2026 owner correction is authoritative. All modules use their own deliberately created records, schedules and configuration. Empty calendars are valid. Only explicitly approved requirements govern implementation. A reference design does not authorize copying data, recurring schedules or external operational dependencies.

Read `AGENTS.md`, the [current handoff](HANDOFF.md), the [fresh-start release record](FRESH-START-2026-10-16.md) and the [hosted schema ledger](HOSTED-MIGRATION-LEDGER.json). Earlier milestone receipts document past execution, not current prerequisites. Do not blindly replay applied schema changes.

## Verification and privacy

Run the documented type, application, disposable-database and relevant browser checks before release. Verify the exact production source and aliases after deployment. Distinguish synthetic tests from genuine authenticated hosted transactions and physical-device acceptance. Documentation-only updates need accurate links, JSON and privacy checks, not a production redeployment.

Keep email confirmation, signup abuse protections, Unassigned own-record privacy, independent leader placement and exact production configuration enabled. Preserve user-selected passwords and confirmed-name handling. Do not invent placements or import a real roster. Credentials remain in provider stores or personal Keychain; never Git, screenshots, logs or exports.

## Study Rooms

Booking is enabled for the existing authorized audience after the October 16 correction. Weekly and special-date calendars are empty; managers can deliberately configure restrictions, including none. No member or manager grants were added by this release.

An application-local pause may stop new reservations and holds for maintenance while allowing supported cancellation and early release. Configuration changes retain idempotency, optimistic versions, overlap checks, auditing and privacy. Never displace active reservations silently. Do not reinstate the unapproved installation defaults. See [Study Rooms operations](study-rooms/README.md).

## Contacts

Until migration `20261024170000_open_access_group_placement` is applied, the workspace is restricted to its explicitly granted owner account; afterwards every signed-in member has a private workspace of their own records. Preserve the production-only release switch (`LVZ_CONTACTS_OWNER_PILOT`), current session/member checks, module grants, forced private-table RLS, ownership, do-not-contact restrictions, auditing and idempotency. Organization or technical leadership does not confer contact access.

Sharing, reassignment, confidential oversight, exports and outgoing communications require separately approved and tested audiences, consent, field/history visibility and retention. A passing frontend build does not authorize broader grants. [Verification and owner acceptance](contacts/VERIFICATION.md) remain the reference.

## Display and Work Mission

Display content is published only after authorized review, and screens are explicitly paired. Physical TV playback acceptance must be reported separately from browser testing.

Work Mission uses owner-supplied dates, hosts, materials and meeting credentials. Do not seed real occurrences or infer schedules. Member/join permissions and outbound distribution remain explicitly controlled. Preserve installed compatible schema changes and [completion evidence](morning-prayer/COMPLETION-R5.md).

## Recovery

Choose a verified deployment compatible with the current schema and enabled modules. Keep grants and history intact. Do not use additive-schema deletion, data erasure or reinstatement of unapproved defaults as rollback shortcuts. Recheck sign-in, signup and affected authorized routes after promotion or rollback.
