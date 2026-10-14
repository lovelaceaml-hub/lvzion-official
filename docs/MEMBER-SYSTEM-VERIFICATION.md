# Member foundation verification

Executed October 13, 2026 Pacific / October 14, 2026 UTC using fictional records in temporary isolated infrastructure.

| Check | Observed result |
| --- | --- |
| Clean install from npm lockfile (`npm ci --ignore-scripts`) | PASS |
| Strict TypeScript and Next route type generation | PASS |
| Node contract/application tests | 25 PASS |
| Native PostgreSQL 17.10 database assertions | 53 PASS |
| Disposable PGlite database assertions | Same 53 PASS |
| Native dump → fresh database → restore | Same 53 assertions PASS after restore |
| Chromium phone-viewport browser tests | 5 PASS |
| Next.js production build in isolated sandbox | PASS |

The database count is 53 distinct assertions, not 159: the suite was repeated on native PostgreSQL, PGlite and the restored native database. Tests used test-only Auth tables and functions. They do not prove the live Supabase Auth, email, REST or deployment integration.

The browser suite verifies own-group names-only visibility and viewport fit, an authorized name correction and audit entry, inactive-account denial, live sign-in disabled by default, and anonymous member-API denial with no-store responses. Chromium phone emulation is not a real iPhone/Safari test.

Security fixes include private authorization helpers instead of direct policy reads of denied private tables; independent department and organizational authority; exactly one placement for active people; suspension/reactivation session cutoff; expired-session denial; transactional audited transfer and member commands; idempotent request handling; strict allowed fields for direct RPC calls; and blocked execution of the unchecked internal command.

No hosted Supabase DDL, real member imports, invitations, emails, production environment changes, or production release were performed. Independent human review, full hosted Auth/PostgREST integration, load/concurrency testing and real-device review remain release gates. A local dump/restore is not a hosted backup/PITR service verification.

All new runtime member-system code is TypeScript. The preserved older JSX concept has not been fully migrated; do not describe the whole repository as TypeScript-only.
