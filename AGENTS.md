# LV Zion Official

Independent Next.js application. The original LV Zion applications and databases are outside this repository's work.

## Read first

Read README.md, docs/HANDOFF.md, docs/ACTUAL-APP-SETUP.md and docs/RELEASE-GATES.md. The active organization workflow and its Build log are docs/ORGANIZATION-WORKFLOW.md, with instructions in docs/USER-MANUAL.md. The completed actual setup and earlier Build log are docs/ACTUAL-APP-SETUP.md. The hosted/repository migration mapping is docs/HOSTED-MIGRATION-LEDGER.json. For the **live** Study Room module, start with docs/study-rooms/README.md, docs/STUDY-ROOM-R4-LIVE.md and docs/study-rooms/CUTOVER-RUNBOOK.md; the older R1–R3 docs are historical checkpoints.

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
- **Study Room:** the module is deployed to `lvz.app` with an explicit single-owner manager grant, but `app_private.study_booking_activation.bookings_open=false` remains mandatory until a verified and approved cutover. R4 permits audited inventory and service-calendar configuration only; it cannot open bookings. Never grant all members access, use the public Firebase lobby as a booking export, or change/disable the original Firebase booking functions without the signed-off cutover runbook. Do not claim synthetic browser tests prove a real hosted member booking.

Personal credentials for this project use Apple Passwords or macOS Keychain only. Do not access the user's work password store.
