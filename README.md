# LV Zion Official

Independent phone-first application. The original LV Zion projects remain separate and untouched.

## Development status

Member foundation development lives on `feature/member-system-secure-r1`, reviewed through draft PR #2, stacked on mobile prototype PR #1. Neither PR has been merged to `main`.

- `/` preserves the original interactive mobile concept.
- `/member-preview` is a working fictional member-management simulator: nine sample people, role-specific My Week / My Group / Manage / Profile, member editing, placements, transfers, departments, appointments, and audit.
- `/members` uses authenticated server APIs. It remains disabled until a separately reviewed isolated Supabase target is configured.
- `/sign-in`, `/activate`, `/reset-password`, and Auth callbacks implement the account-flow boundaries; real identity/email integration is not activated or fully verified.

The fictional selector is not authentication. Preview edits stay in page memory and reset on reload. No real accounts, emails, member data, production schema changes, or official app-module selection are part of this increment. `lvz.app` remains paused.

## Reproducible checks

Node 24.x; exact package versions and npm lockfile are committed.

```sh
npm ci --ignore-scripts
npm run check
npm run build
npx playwright install chromium
npm run test:browser
npm run dev
```

`npm run check` runs strict TypeScript checking, 25 Node tests and 53 database assertions in disposable PGlite. The same 53 SQL assertions also passed in native PostgreSQL 17.10 and after a native dump/restore. Five Chromium phone-viewport tests passed. These results do not establish hosted Supabase Auth/PostgREST integration or real-device Safari behavior.

## Database and safety

Apply the two files under `supabase/migrations/` in timestamp order only to an approved, empty isolated database. Supabase CLI generated both filenames. The old `database/member_system_foundation.sql` deliberately fails because it is superseded; do not apply the alternate `docs/sql` proposal.

`supabase/tests/bootstrap.sql` creates test-only Auth shims. NEVER execute it on a hosted Supabase database. `supabase/seed/fictional_members.sql` is for disposable environments only.

Real member APIs fail closed by default and explicitly reject the current production project reference. No new production secrets or Vercel environment changes were made. Do not use a service-role/secret client for member-management requests.

Read [implementation](docs/MEMBER-SYSTEM-IMPLEMENTATION.md), [verification](docs/MEMBER-SYSTEM-VERIFICATION.md), [product decisions](docs/PRODUCT-DECISIONS.md), and [release gates](docs/RELEASE-GATES.md).
