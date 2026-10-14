# LV Zion Official

Independent Next.js application. The original LV Zion applications and databases are outside this repository's work.

## Read first

Read README.md, **docs/INDEX.md and docs/CURRENT-STATUS.md first**, then docs/HANDOFF.md, docs/ACTUAL-APP-SETUP.md and docs/RELEASE-GATES.md. The verified live state, module boundaries and migration source mapping are in docs/CURRENT-STATUS.md and docs/HOSTED-MIGRATION-LEDGER.json. The completed organization workflow and its historical Build log are in docs/ORGANIZATION-WORKFLOW.md; member instructions are in docs/USER-MANUAL.md. The completed actual setup and earlier Build log are docs/ACTUAL-APP-SETUP.md. The earlier hosted/repository migration mapping is docs/HOSTED-MIGRATION-LEDGER.json.

## Verification

Use Node 24. Run `npm ci --ignore-scripts`, `npm run build` and `npm run test:browser`. Browser tests run against a loopback-only server, with activation disabled. For real local Auth signup testing, run `LVZ_SIGNUP_INTEGRATION=true node tests/integration/start-stack.mjs`, then `LVZ_INTEGRATION_DIR=/tmp/lvz-integration node scripts/test-signup-integration.mjs`, then `node tests/integration/stop-stack.mjs`. The disposable integration directory must be new, and contains only fictional identities and ephemeral test credentials. Never commit or publish that directory. Never send a real address to local SMTP.

## Boundaries

- Anthony requires the actual application at https://lvz.app. Do not create or publish a preview unless he explicitly asks for that specific preview.
- Automatic Git deployments are disabled in vercel.json. Private backup pushes must not publish previews or production. Releases are deliberate production deployments after validation.
- Anthony authorized actual application setup and self-service signup on 2026-10-14. New accounts start Unassigned to age category, group and unit; only authorized leaders assign placement.
- Use the existing LV Zion Official Supabase project, otecqlkqirncotytbfns. Production activation must validate this exact ref and https://lvz.app origin. Keep other apps and services untouched.
- Apply only pending, tested migrations. Hosted foundation IDs differ from local filenames; reconcile with docs/HOSTED-MIGRATION-LEDGER.json rather than replaying existing CREATE statements.
- The first owner uses the email Anthony supplied directly in this chat. Do not put that private email in Git. He chooses his password himself. Never create fictitious organizational labels to activate an owner account.
- No secrets, private member records, email addresses or Auth tokens in logs, screenshots, Git or review exports. Use Keychain or provider secret stores.
- Do not purchase services or incur new costs without specific approval. Original applications, real member imports and unrelated draft module branches remain out of scope.

Personal credentials for this project use Apple Passwords or macOS Keychain only. Do not access the user's work password store.

## Documentation updates

Update the canonical docs/INDEX.md, docs/CURRENT-STATUS.md, README.md and release/handoff notes when real production changes occur. Treat older design/preview documents as historical evidence; do not rewrite their old test results. Confirm migrations against live Supabase list_migrations and Git main, and clearly distinguish approved modules from real member, booking, publication and device activation. Documentation-only commits need no Vercel deployment.
