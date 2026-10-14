# LV Zion Official

A new, independent phone-first application. Previous LV Zion apps and databases are references only and remain untouched.

## Development status

`feature/member-system-secure-r1` contains the member and organizational foundation, independent department/technical permissions, history-preserving management, verified invitation and recovery workflows, and a module integration framework. Draft PR #2 is stacked on mobile prototype PR #1; neither is a member-launch approval.

The permanent domain **https://lvz.app is registered and connected** to the new Vercel project. `www.lvz.app` redirects to the apex. It still serves the earlier public design prototype, not the development branch. Email hosting and operational `@lvz.app` senders are not configured.

## Review routes

- `/`: preserved original home concept.
- `/experience-preview`: fictional phone-first My Week / Manage / Apps / Notifications.
- `/member-preview`: fictional member, leadership, department and technical-administrator management. Demo mutations are in-memory only.
- `/roster-preview`: fixed fictional import rehearsal with duplicate and placement review. No uploads, accounts or database writes.
- `/install`: phone-installation guidance, manifest and opt-in public-only offline fallback.
- `/members` and `/members/manage`: session-authorized workspace; hosted activation remains deliberately gated.
- `/request-access`, `/sign-in`, `/auth/continue`, `/activate`, `/reset-password`: account workflows implemented in code, not activated for real members.

The new hosted Supabase project contains three applied foundation migrations and seventeen RLS-protected tables, with zero Auth users or member records at the last inspection. The module-runtime migration remains **unapplied**. No official individual application has been selected or published.

Hosted test identity provisioning was previously blocked by tool safety checks. It is not retried through another mechanism; the known hosted-reference guard and disabled delivery remain. Existing local real-service Auth test results are not evidence of hosted sign-in success.

## Development

Use Node 24 and the committed exact dependency lockfile.

```sh
npm ci --ignore-scripts
npm run dev
npm run build
npm run test:browser
```

`build` executes strict route/TypeScript checking, Node tests and disposable PostgreSQL permission tests before Next.js compiles. Browser tests use Playwright Chromium at a phone viewport. Do not add unnecessary automatic workflows to the GitHub Actions budget.

For an offline local roster dry-run only:

```sh
node --experimental-strip-types scripts/roster-preflight.mjs roster.csv authorized-context.json
```

The summary excludes names/contact values and writes nothing. Do not commit a real roster or authorized-context export.

## Read first

- [R6 development work and boundaries](docs/AUTONOMOUS-FOUNDATION-R6.md)
- [Domain setup](docs/DOMAIN-SETUP.md)
- [Onboarding verification](docs/ONBOARDING-COMPLETION.md)
- [Member verification](docs/MEMBER-SYSTEM-VERIFICATION.md)
- [Product choices](docs/PRODUCT-DECISIONS.md)
- [Release gates](docs/RELEASE-GATES.md)
- [Hosted migration ledger](docs/HOSTED-MIGRATION-LEDGER.json)

Keep migrations reconciled with the hosted ledger before CLI deployment. Never install seed/bootstrap test files into production. Independent review, hosted test accounts, email deliverability, backup restore and physical-device testing remain launch gates.
