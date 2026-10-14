# Member onboarding completion — October 13, 2026 Pacific

> **Historical development snapshot — not current production status.** Statements below that `lvz.app` is paused, hosts only a prototype, has inactive sign-in or has no official modules describe the earlier phase when this page was written. The actual platform and owner-only Contacts app are live. See [current documentation](INDEX.md), [handoff](HANDOFF.md) and [Contacts scope](contacts/README.md). Keep this record for design decisions and test history; do not replay its superseded activation instructions.

## Implemented in this review branch

The member foundation now includes access-request intake and verification review, invitation creation/delivery/retry/status/revocation, verified account activation linked to an existing person, username/email sign-in, verified password recovery, session revocation, separate technical account suspension, independent department administration, organizational entry rename/archive, and an audited one-time initial-administrator bootstrap tool. The phone interface exposes the associated management screens. All demonstration records are fictional and preview edits are in memory.

Account approval is not authentication. A reviewer must independently verify identity and match a current unlinked member. Activation consumes a digest-bound, expiring invitation matched to the verified email. Email confirmation secrets are placed in URL fragments, removed from the address bar by the confirmation page, and consumed only after an explicit POST confirmation; GET requests and email-link scanners do not activate accounts. Recovery requires a short-lived server-signed proof bound to the actual verified user/session. Repeated invitation requests reuse the same idempotency key; mail-server acceptance and database delivery state are distinguished.

Technical sign-in suspension does not change church membership. Church-status reactivation cannot override a separate technical suspension. Department roles do not imply church authority, and church roles do not imply department authority. Empty entries can be archived without deleting history; active children, placements and appointments block archival.

## Executed verification

- Clean dependency-lock installation, strict TypeScript, and Next.js build passed.
- 42 Node contract/configuration/preview tests passed.
- 75 PostgreSQL assertions passed in disposable PGlite: the 53 existing foundation assertions plus 8 bootstrap and 14 onboarding assertions.
- 42 end-to-end local API assertions passed against **Supabase Auth v2.197.0**, **PostgREST v16.4**, the real Next.js routes, native PostgreSQL, and a real loopback SMTP sink.
- 5 additional real-service assertions passed for old-token denial after sign-out and simultaneous identical requests. Eight concurrent commands produced one idempotency receipt.
- 8 Chromium phone-viewport tests passed, including request approval, invitation simulation and independent technical controls.

The local integration setup was rebuilt from a fresh directory and the 47 real-service checks passed again. The official release binary hashes are pinned in `tests/integration/start-stack.mjs`. No external email was sent: the SMTP sink rejects all recipients outside `@example.invalid`. These are genuine local Auth/PostgREST tests, not a hosted authentication success claim. Chromium emulation is not a physical iPhone/Safari test. The earlier 53-assertion native backup/restore rehearsal remains documented; it was not repeated for this new onboarding schema.

## Hosted status — changed from the previous milestone

The new, previously empty Supabase project `otecqlkqirncotytbfns` now has the three schema migrations installed. It has **17 application tables with RLS**, **0 Auth users**, **0 members**, **0 linked accounts**, and **0 invitations** at verification. This is the new independent project only. No original application or original database was changed.

The hosted test-account creation operation was blocked by the tool's safety checks. It was not retried through another mechanism. Hosted sign-in remains disabled. A temporary identity bridge was replaced with a closed JWT-protected endpoint that performs no database or identity operation; its temporary Vercel bridge key and unused fixture password were cleared. Only review-branch preview environment variables were changed. Production environment variables and the production website were not changed.

The database security advisor reported informational notices for deliberately private, deny-by-default tables with RLS and no direct row policies. Do not weaken those tables simply to remove the informational notices. An independent review remains appropriate before real people use this system.

## Activation blocker, not additional product design

An authorized operator must complete hosted test-identity provisioning through the approved account flow, configure server-side identity/mail credentials and allowed test recipients, reconcile the migration ledger, and pass the hosted sign-in checks before enabling the feature. The current server configuration intentionally rejects the known hosted project reference until that explicit activation change is reviewed. Do not set an enable flag and assume sign-in works. No real-member import, production pilot, or real invitation campaign is authorized by these tests.

Domain `lvz.app` is still paused. Official individual app modules remain unselected. These are outside this member-foundation milestone.

## Repeatable checks

```sh
npm ci --ignore-scripts
npm run build                 # includes strict checks, 42 Node tests and 75 SQL assertions
npx playwright install chromium
npm run test:browser          # server must have live-member features disabled
```

For the real-service suite, use a disposable **Linux x64**, non-root environment with Node 24, PostgreSQL 17 client/server tools on PATH, curl and Python 3 with safe tar extraction. Ports 3000, 3001, 54321, 55436, 9999 and 1025 must be free. Build the app first. The setup refuses to overwrite an existing test directory.

```sh
node tests/integration/start-stack.mjs
LVZ_INTEGRATION_DIR=/tmp/lvz-integration npm run test:auth
node tests/integration/stop-stack.mjs
```

The suite is stateful and must begin with a fresh local test database. Keep `/tmp/lvz-integration` private: credentials and synthetic confirmation links live there. It is not an artifact for the repository or a production backup. The bootstrap operator tool is `scripts/bootstrap-foundation.mjs`; it has no public HTTP endpoint and requires a verified existing Auth identity, explicit independent role choices, an empty member foundation and the documented acknowledgement.
