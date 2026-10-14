# Release controls

Anthony authorized actual app setup at https://lvz.app on 2026-10-14. No new previews are authorized. Use the full replacement release path after the tests in AGENTS.md pass. The earlier development-only gates are historical and superseded for this main app setup. External security review was explicitly waived.

Keep email confirmation, own-record Unassigned privacy, independent leader placement, exact production configuration and bot/rate checks enabled. Verify sender delivery before opening public signup. The first owner confirms the privately designated email and chooses their own password. No fabricated placement or real roster import is authorized.

Keep production-only secrets in provider stores and personal integration credentials in Keychain. Original LV Zion apps and unrelated draft modules remain out of scope. Physical-device testing is still a useful follow-up and is not claimed complete.

See ACTUAL-APP-SETUP.md for validation, migration reconciliation and rollback.

## Contacts owner-only module — current production scope

The [Contacts owner pilot](contacts/README.md) is an independently authorized module, not the member directory. Its production-only `LVZ_CONTACTS_OWNER_PILOT` flag, verified session, individual module grant, private-table RLS, owner checks, do-not-contact restrictions and audit/idempotency records remain essential. A group placement, department appointment or technical role does not grant private contact records.

Before extending access beyond the current owner, approve explicit sharing/oversight audiences, field and note-history disclosure, consent and do-not-contact treatment, data retention, cross-group boundaries and stewardship. Independently test unauthorized reads, grant revocation, database transactions and the owner-authenticated production save/reload. Current verification and limitations: [Contacts verification](contacts/VERIFICATION.md). Do not widen database permissions to make an unfinished UI control appear functional.
