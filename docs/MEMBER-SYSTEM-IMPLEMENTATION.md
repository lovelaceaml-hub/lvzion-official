# LV Zion Official — member-system implementation

> **Historical development snapshot — not current production status.** Statements below that `lvz.app` is paused, hosts only a prototype, has inactive sign-in or has no official modules describe the earlier phase when this page was written. The actual platform and owner-only Contacts app are live. See [current documentation](INDEX.md), [handoff](HANDOFF.md) and [Contacts scope](contacts/README.md). Keep this record for design decisions and test history; do not replay its superseded activation instructions.

Branch: `feature/member-system-secure-r1`; draft PR #2 stacked on the unmerged mobile prototype PR #1.

Read [ONBOARDING-COMPLETION.md](ONBOARDING-COMPLETION.md) for current implemented features, executed tests, hosted state and the remaining activation blocker. This supersedes the earlier proposal-only status.

## Schema

The three ordered migration files under `supabase/migrations` define the foundation, direct-command validation/session expiry checks, and onboarding/account/catalog administration. The old `database/member_system_foundation.sql` deliberately fails instead of reapplying an obsolete proposal. Do not apply the alternate `docs/sql` proposal. Hosted migration versions differ from the earlier CLI-generated filenames; the exact mapping is recorded in `HOSTED-MIGRATION-LEDGER.json` and must be reconciled before a CLI push.

Members are durable person records independent of Auth accounts. Active members require one current primary placement; inactive history is retained. Organizational, department and technical appointments are separate. Names-only directory projections restrict ordinary members to their own group. Private contact and account tables are not exposed through general row grants.

All consequential changes use audited, idempotent database commands. Actor identity comes from verified Auth state, active membership, technical enablement, a valid Auth session and a suspension cutoff—not UI role selection or user-editable metadata. Private helpers use fixed empty search paths and explicit function privileges. Exposed wrappers are security invoker. Do not expose `app_private` in PostgREST.

## Application

`/member-preview` is a fictional in-memory simulator. `/members` uses session-authorized server routes when an approved environment is activated. `/request-access`, `/sign-in`, `/auth/continue`, `/activate` and `/reset-password` implement onboarding. Confirmation is explicit and uses a POST; recovery is tied to a signed, verified-session proof. Mail is text-only through a configured TLS SMTP provider outside local tests and limited to approved test recipients. No service-role key is exposed to the browser.

`LVZ_MEMBER_SYSTEM_ENABLED` stays false in the hosted review branch. The local integration path is only enabled for fixed loopback URLs, an explicit local flag, and a non-Vercel runtime. No production settings, original systems, domain configuration or real-data imports are part of this work.
