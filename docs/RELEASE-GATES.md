# Release controls

Anthony authorized actual app setup at https://lvz.app on 2026-10-14. No new previews are authorized. Use the full replacement release path after the tests in AGENTS.md pass. The earlier development-only gates are historical and superseded for this main app setup. External security review was explicitly waived.

Keep email confirmation, own-record Unassigned privacy, independent leader placement, exact production configuration and bot/rate checks enabled. Verify sender delivery before opening public signup. The first owner confirms the privately designated email and chooses their own password. No fabricated placement or real roster import is authorized.

Keep production-only secrets in provider stores and personal integration credentials in Keychain. Original LV Zion apps and unrelated draft modules remain out of scope. Physical-device testing is still a useful follow-up and is not claimed complete.

Use the [handoff](HANDOFF.md) for current deployed source and module-specific gates, the [migration ledger](HOSTED-MIGRATION-LEDGER.json) before schema work, and [actual setup receipts](ACTUAL-APP-SETUP.md) for historical validation. A module tile, applied schema or open PR is not a completed rollout. Keep Study Room bookings closed until approved cutover, Contacts private, Display unpublished/unpaired until reviewed, and Morning Prayer member/join access gated. Documentation-only commits require link/JSON/diff/privacy checks, not a production deployment. Historical prototype fallbacks must not be promoted as a routine rollback for current modules.

## Study Room Reservation: independent booking-activation gate

The **real Study Room module** and R4 owner-management controls are already published at [lvz.app/modules/study-rooms](https://lvz.app/modules/study-rooms); that release is **not** permission to open bookings. As of the October 14 production check, the module had exactly one explicit owner-manager grant, and the Supabase row `app_private.study_booking_activation.bookings_open` was **false**, with zero new bookings.

Keep the original [lvrooms.web.app](https://lvrooms.web.app) Firebase scheduler authoritative until its active/future reservation export is complete and verified, its **server-side** booking and administrator restore writes are demonstrably frozen, the records/slots are reconciled without inventing member identities, and genuine hosted signed-in member/manager booking, revocation, physical-device and backup/restore tests pass. Only a separate recorded scheduling-owner authorization may permit gate activation and explicitly scoped viewer/manager grants. Never allow overlapping independent writers.

For operational procedures and stop/rollback criteria, see [Study Room cutover runbook](study-rooms/CUTOVER-RUNBOOK.md); [verified R4 release evidence](STUDY-ROOM-R4-LIVE.md) distinguishes shipped code from unavailable booking access.

## Contacts: owner-only confidentiality boundary

The [Contacts owner workspace](contacts/README.md) is active only for its explicitly granted verified account. The Production-only `LVZ_CONTACTS_OWNER_PILOT` switch, current authenticated member/session, module grant, forced private-table RLS, contact ownership, do-not-contact restrictions and audit/idempotency enforcement must remain in effect. An organizational or technical leadership role does **not** confer contact access.

Before enabling sharing, reassignment, confidential oversight, full worklist/search, export or outgoing communications, approve and test the exact audience, consent/DNC, field/history visibility and retention policy. A green frontend build does not authorize a wider grant. See [Contacts verification](contacts/VERIFICATION.md) for current evidence and unexecuted owner-session acceptance.

## Work Mission R5 release boundary

[Completion R5](morning-prayer/COMPLETION-R5.md) and [release receipt](morning-prayer/RELEASE-R5.json) record the verified actual-app source, tests and compatible rollback deployment. Scheduling, grant management and the protected broker are live, while the hosted module remains one-owner-only and empty. No member grants, real schedule, meeting credentials, materials or outbound distribution were seeded. Real owner save/member join and physical-device acceptance remain separate operational checks. Do not replay the installed R4/R5/compatible setup migrations.
