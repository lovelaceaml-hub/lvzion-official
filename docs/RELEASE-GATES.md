# LV Zion Official: Release Gates

## Current verified state
- New private GitHub repository exists, and a draft pull request contains the mobile design prototype.
- Fresh Vercel project exists; a Git-backed preview built successfully on `feature/mobile-foundation-v1`. The existing live design preview remains a separate inline-source deployment.
- Supabase Pro organization: **Las Vegas Zion** (`ypidsvtopuiqvbvvucbp`).
- New Supabase PostgreSQL project: **lvzion-official** (`otecqlkqirncotytbfns`), **us-west-1**, `ACTIVE_HEALTHY`.
- Database public schema has zero application tables and its initial security advisory check reported no findings.
- Vercel development, preview and production environment settings contain only the new project's public Supabase URL and publishable key. No service role key was installed.
- **Not implemented:** login, data tables, RLS policies, server authorization, notifications, live directory, official modules, tested recovery, and true offline access.

## Before any real member launch
1. Establish protected, reviewed Git-to-Vercel release workflow and confirm which branch drives production. Keep the working inline deployment until the replacement is verified.
2. Pin dependencies with a reproducible npm lockfile. Migrate the prototype to TypeScript; add lint, typecheck, unit tests, permission integration tests, and mobile browser acceptance tests. Avoid excessive GitHub Actions usage.
3. Approve the definitive user/account and group/unit/team model. Implement Supabase Auth, verified session management, RLS, and server-side authorization. Never rely solely on hidden UI.
4. Implement own-group names-only directory, independent department/leadership assignment rights, transfers with history, suspended inactive users, and audit events.
5. Establish encrypted backups of the new database with a real restore test, data-retention policy, and recovery instructions.
6. Confirm the **official app lineup** before implementing or importing application-specific data. Never migrate existing member data without deliberate approval.
7. Review private-detail handling in push previews, secure caches, PWA offline use, and accessible interactions.
8. Pilot with fictional records and designated test accounts, then an explicitly approved small live cohort and documented go/no-go.

## Safety boundary
The prior LV Zion projects and all existing church apps are read-only references. Do not reuse their source/database, delete them, or modify their production settings.
