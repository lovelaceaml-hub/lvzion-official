# LV Zion Official

Independent Next.js application. The original LV Zion applications and databases are outside this repository's work.

## Read first

Read README.md, docs/HANDOFF.md, docs/PLAN-SELF-SERVICE-SIGNUP.md and docs/RELEASE-GATES.md. The active plan and its Build log are docs/PLAN-SELF-SERVICE-SIGNUP.md. The earlier hosted/repository migration mapping is docs/HOSTED-MIGRATION-LEDGER.json.

## Verification

Use Node 24. Run `npm ci --ignore-scripts`, `npm run build` and `npm run test:browser`. Browser tests run against a loopback-only server, with activation disabled. For real local Auth signup testing, run `LVZ_SIGNUP_INTEGRATION=true node tests/integration/start-stack.mjs`, then `LVZ_INTEGRATION_DIR=/tmp/lvz-integration node scripts/test-signup-integration.mjs`, then `node tests/integration/stop-stack.mjs`. The disposable integration directory must be new, and contains only fictional identities and ephemeral test credentials. Never commit or publish that directory. Never send a real address to local SMTP.

## Boundaries

- Main is not the member-development release. PR #1 targets main, PR #2 targets the mobile foundation, and signup work is stacked on PR #2's member branch.
- Git pushes can trigger Vercel previews. Ask before publishing a preview. Never merge or promote production without explicit approval.
- Hosted signup and member activation remain disabled. The runtime rejects the known hosted Supabase project. Use only an approved isolated database for hosted tests.
- New migrations are unapplied. Do not run db push: hosted foundation migration IDs differ from local filenames. Use the ledger to reconcile them before an explicitly authorized deployment.
- No real member enrollment/import, domain changes, original app changes, bootstrap user provisioning or paid providers in this work.
- No secrets, private member records, emails or Auth tokens in logs, screenshots, Git or review exports. Use Keychain/provider stores for operational secrets.
