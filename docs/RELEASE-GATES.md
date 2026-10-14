# Release controls

Anthony authorized actual app setup at https://lvz.app on 2026-10-14. No new previews are authorized. Use the full replacement release path after the tests in AGENTS.md pass. The earlier development-only gates are historical and superseded for this main app setup. External security review was explicitly waived.

Keep email confirmation, own-record Unassigned privacy, independent leader placement, exact production configuration and bot/rate checks enabled. Verify sender delivery before opening public signup. The first owner confirms the privately designated email and chooses their own password. No fabricated placement or real roster import is authorized.

Keep production-only secrets in provider stores and personal integration credentials in Keychain. Original LV Zion apps and unrelated draft modules remain out of scope. Physical-device testing is still a useful follow-up and is not claimed complete.

See ACTUAL-APP-SETUP.md for validation, migration reconciliation and rollback.

## Study Room Reservation: independent booking-activation gate

The **real Study Room module** and R4 owner-management controls are already published at [lvz.app/modules/study-rooms](https://lvz.app/modules/study-rooms); that release is **not** permission to open bookings. As of the October 14 production check, the module had exactly one explicit owner-manager grant, and the Supabase row `app_private.study_booking_activation.bookings_open` was **false**, with zero new bookings.

Keep the original [lvrooms.web.app](https://lvrooms.web.app) Firebase scheduler authoritative until its active/future reservation export is complete and verified, its **server-side** booking and administrator restore writes are demonstrably frozen, the records/slots are reconciled without inventing member identities, and genuine hosted signed-in member/manager booking, revocation, physical-device and backup/restore tests pass. Only a separate recorded scheduling-owner authorization may permit gate activation and explicitly scoped viewer/manager grants. Never allow overlapping independent writers.

For operational procedures and stop/rollback criteria, see [Study Room cutover runbook](study-rooms/CUTOVER-RUNBOOK.md); [verified R4 release evidence](STUDY-ROOM-R4-LIVE.md) distinguishes shipped code from unavailable booking access.
