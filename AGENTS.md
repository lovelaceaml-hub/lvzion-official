# LV Zion Official

Self-contained, phone-first Next.js application at https://lvz.app, with its own Supabase database.

## Authoritative product boundary — October 16, 2026

Anthony requires a genuine fresh start. This applies to every module and supersedes conflicting historical documents, handoffs, tests and implementation assumptions.

- Implement only requirements explicitly approved for LV Zion Official. A design reference approves appearance or interaction only, not data, schedules, operational policies or dependencies.
- The product must have no knowledge of a separate application. Do not add references, links, imports, synchronization, fallback endpoints, migration prerequisites or handover gates involving another application.
- Production schedules, service restrictions, assignments and events come only from records deliberately configured for this application. Start empty. Do not infer recurring schedules from conversation history or populate them from examples.
- Empty schedules and configuration are valid. Show useful neutral empty states. Test fixtures remain isolated from production handlers and must never become fallback data.
- Application rollout depends only on this application's own configuration, authorization, data integrity and verification. Do not require changes to another system before a module can function.
- Preserve existing accounts, permissions, member history and intentionally entered records. Remove only positively identified unapproved defaults; audit any production correction.
- Retain compact module headers and a prominent center Apps launcher in module bottom navigation.

## Read first

Read README.md, docs/README.md, docs/HANDOFF.md, docs/ACTUAL-APP-SETUP.md and docs/RELEASE-GATES.md. The boundary above takes precedence over older installation receipts. For Contacts, also read docs/contacts/README.md, docs/contacts/OPERATIONS.md and docs/contacts/VERIFICATION.md. Organization implementation and its Build log are in docs/ORGANIZATION-WORKFLOW.md. Member instructions are in docs/USER-MANUAL.md. Reconcile hosted schema changes with docs/HOSTED-MIGRATION-LEDGER.json before applying SQL. Inspect current GitHub and production state before changing either; preserve concurrent development.

For Work Mission, read docs/morning-prayer/SIMPLER-R6.md and docs/morning-prayer/COMPLETION-R5.md. Real dates, materials, links and grants are owner-sourced. Run `npm run test:morning-prayer:browser` and `npm run test:morning-prayer:races` for changes to that module (the latter requires local PostgreSQL binaries).

For Study Rooms, use docs/study-rooms/README.md. Historical installation receipts are evidence of past tests, not current scheduling requirements.

## Verification

Use Node 24. Run `npm ci --ignore-scripts`, `npm run build` and `npm run test:browser`. Browser tests use a loopback-only server with activation disabled. For real local Auth signup tests, run `LVZ_SIGNUP_INTEGRATION=true node tests/integration/start-stack.mjs`, then `LVZ_INTEGRATION_DIR=/tmp/lvz-integration node scripts/test-signup-integration.mjs`, then `node tests/integration/stop-stack.mjs`. Use a new disposable integration directory containing only fictional identities and ephemeral test credentials. Never commit or publish that directory or send real addresses to local SMTP.

## Release and security boundaries

- Target the actual application at https://lvz.app. Do not publish a preview unless Anthony explicitly requests that preview.
- Automatic Git deployments remain disabled in vercel.json. Private code pushes do not authorize automatic publication. Release deliberately after validation.
- Self-service signup is authorized. New accounts start Unassigned to age category, group and unit; only authorized leaders assign placement.
- Use only Supabase project otecqlkqirncotytbfns and validate the https://lvz.app origin. Do not modify unrelated projects or services.
- Apply only pending, tested schema migrations. Reconcile the hosted ledger rather than replaying applied CREATE statements.
- Do not broaden module access or remove authorization checks as part of this correction. A booking pause may be used for maintenance or local readiness, never as an external-system dependency.
- Do not place private emails, member records, credentials, Auth tokens or secrets in Git, logs, screenshots or exports. The owner chooses his password. Never invent organizational labels to activate an account.
- Keep production credentials in provider stores. Personal credentials use Apple Passwords or macOS Keychain; do not access work password stores.
- Do not purchase services or incur new costs without specific approval.
- Report exactly which tests ran and which deployment was verified. Synthetic tests do not prove a real hosted member transaction.
