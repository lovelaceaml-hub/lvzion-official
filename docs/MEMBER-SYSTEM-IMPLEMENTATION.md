# Member System: Implementation and Review Plan

Status: **first development slice staged in Git; NOT applied to Supabase.**
Source: `database/member_system_foundation.sql`.
Tests: `supabase/tests/member_foundation.sql`.
Data: `supabase/seed/fictional_members.sql` (**disposable database only**).
Branch: `feature/member-system-secure-r1`, stacked on draft mobile PR #1.
Decision source: `docs/PRODUCT-DECISIONS.md` (2026-10-13, questions 61–66).

## Hard boundaries

- Independent GitHub / Vercel / Supabase project only. Do not touch original LV Zion apps.
- Do not apply this SQL to Supabase production, merge it into `main`, or enable real login yet.
- Never seed fixtures into production. Do not create fake shared email addresses for live authentication.
- Do not import real membership, send invites, enroll real users, or register/configure `lvz.app`.
- No official app modules are approved; numbered demo apps remain mockups.
- Database DDL is **a candidate**, not a verified applied migration; reviewer must test and inspect it.

## Delivery stages

| Stage | Engineering work | Exit requirement |
|---|---|---|
| 1 — Structural | Member/person, category/group/unit, placements, departments, separate role assignments, private contacts, account links, audit, transfer and invitation request models | Reviewer signs off; isolated DB receives migration and fixtures |
| 2 — Identity | One approved member ↔ one Supabase Auth user; invited account activation; username/email password; private verified recovery | Account cannot link itself arbitrarily; no account enumeration |
| 3 — Member operations | Scoped unit/group/global member edits; department-specific grants; transfers require receiving acceptance or authorized direct override | Cross-scope, race, audit and suspension integration tests pass |
| 4 — Mobile integration | Personalized profile, own-group directory, role-appropriate Manage cards | UI uses authenticated RLS-backed data, not demo switches |
| 5 — Release | Mobile testing, back-up and restore, threat review, approved pilot, monitoring | No real data before explicit launch approval |

### First slice: implemented in SQL (pending execution)

1. Dynamic age category → group → unit, and durable member record.
2. Exactly one non-ended primary placement per member, with unit/group referential consistency and history retention.
3. Separate many-to-many department memberships and scoped, non-expiring role appointments.
4. Auth user–member link in a private schema; **no** implicit Auth sign-up creates a church member.
5. Private contacts/credentials references/invitations/access requests/transfers/audit tables; no general client access.
6. Current active account lookup rechecks member status and link enabled in PostgreSQL on each authorized query.
7. RLS-only ordinary names directory, restricted to active people in caller's current group. Access to `members` grants only `id` and `display_name` columns.
8. Group/unit leadership, explicit global pastoral/member administrator authority, and independent department-manager name lookup. Technical administrator carries no ministry-data authority.
9. Audited member-display-name corrections through INSERT-only `member_name_changes` with RLS, a second locked scope check, and a private trigger. No blanket UPDATE privilege.
10. On departure from a group/unit, old group/unit leadership rights stop being effective even when an appointment has not been manually ended. The appointment history is retained.

**Not yet implemented**: transfer acceptance transaction; invitation activation; password recovery; role assignment / org catalog management UI; username login endpoint; general contact management; realtime; full dashboard connection. Placeholder tables are not functioning workflows.

## Permission matrix (current first slice)

| Action | Ordinary member | Unit leader | Group leader | Department manager | Pastoral/member admin appointment | Technical admin |
|---|---|---|---|---|---|---|
| Read own profile name | Yes | Yes | Yes | Yes | Yes | Yes |
| Read active names in own group | Yes | Yes | Yes | Yes | Yes | Yes |
| Read other group names | No | No | No | Only active members in assigned department | Yes | No |
| Rename member in managed unit | No | Yes | Yes if inside managed group | No from department authority alone | Yes | No |
| Rename member elsewhere | No | No | Only if inside managed group | No | Yes | No |
| View other members' contact details | No | Not granted in this slice | Not granted | Not granted | Not granted | No |
| Alter appointments, place members, transfer groups | No | Not yet | Not yet | Not yet | Not yet | No |

Appointments remain until a human ends them; active group/unit scope is separately checked for access. Global pastoral/member administrator is an explicit appointment, not an inferred title. Future department write operations require independent audited commands.

## Authentication architecture — implementation contract for Stage 2

Supabase Auth supports **email/password**, not username/password natively. Use a **single server-side sign-in endpoint** for both inputs rather than a browser-visible username→email lookup.

1. Client submits `identifier` plus password to `POST /api/auth/sign-in` over HTTPS; do not log request bodies.
2. Server enforces per-IP **and per-identifier** limits with a shared backend limiter (not in-process memory). Respond with one generic invalid-credentials message regardless of username/email existence; avoid materially different response times where feasible.
3. If identifier is an email, normalize it and authenticate via Supabase Auth password sign-in.
4. If identifier is a username, validate `^[a-z][a-z0-9._-]{2,31}$`, resolve `app_private.account_links.username` on a **trusted server only**, retrieve the associated Supabase Auth email using server-admin credentials, then call password sign-in. Never return the resolved email to the browser. Do **not** fabricate `@lvz.app` addresses.
5. For either path, check the newly signed-in identity's `public.my_membership_id()`. A missing, unlinked, disabled or inactive member is denied. Do not grant member access merely because a Supabase Auth user exists.
6. Issue secure, HttpOnly, SameSite cookies with appropriate CSRF defenses; refresh and verify identity on server request boundaries. Always authorize **inside the database** too.
7. Support sign-out and session revocation. On suspension, RLS immediately denies member data; revoke outstanding refresh sessions through the trusted admin path. Auth access JWTs can outlive sign-out, hence the DB status check.
8. Member invites are generated server-side with time-bound **hashed tokens**, connected to preexisting member identities after verification. Self-service access requests never self-approve.
9. Password reset/recovery uses verified account-owned email and Supabase Auth's approved reset mechanism. Username-only members without a deliverable email require a separately approved **manual verification** procedure; no password disclosure.
10. Keep publishable key public only; **never** expose secret/service-role credential under `NEXT_PUBLIC_`. Set server-only secrets and SMS/email providers only when the workflow is approved and protected.

There is **no working username login UI or server resolver in this first slice**, and no privileged secret was added. Implementing a login form without the identity and rate-limit controls above would be misleading and unsafe.

## Management and transfer contract — Stage 3

- Organizational hierarchy administration is distinct from technical administration.
- Unit and group leaders may change only approved member fields within **current** scope. Every consequential write must include actor, reason, old/new state, and timestamp.
- Cross-group move: source leader submits request → receiving group accepts → one transaction locks the member, closes active placement, inserts new placement, emits audit, and changes effective group directory access. Receiving privileges must not activate before acceptance.
- Pastoral/member administrator may process a direct move only with an explicit role and rationale.
- Department appointments remain independently effective through group moves, except when revoked intentionally.
- Never hard-delete members, placements, appointments or audit history in normal operations. Suspending a person blocks application data while records remain.
- Use transactional locking and unit/group composite constraints to reject stale or conflicting move requests. Recheck actor and scope **after** acquiring locks.
- Technical admins only operate technical settings, not church-person data, unless separately appointed to church authority.

## Test strategy and cost boundary

1. Obtain approval for any additional **billable Supabase database branch**. Current Las Vegas Zion production project has no app tables and no DB branches; do not treat this as permission to apply DDL to it.
2. After approved isolated branch/local Supabase setup, run the SQL file as an initial reviewed migration. If using Supabase CLI, run `supabase migration new member_system_foundation` using the installed CLI version, place the reviewed SQL in the CLI-generated migration, then run on the disposable database. Do not fabricate migration history.
3. Apply `supabase/seed/fictional_members.sql` to disposable DB only. It intentionally does not create Auth identities.
4. Execute `supabase/tests/member_foundation.sql` with `psql -v ON_ERROR_STOP=1`; test transaction generates temporary fictional Auth identities and always `ROLLBACK`s.
5. Verify RLS enforcement for anonymous requests, group A/B isolation, unit/group management, department separation, technical admin, global authorization, suspension, old-scope revocation, unique placement, and auditable changes. Report actual outputs, not just expected assertions.
6. Run Supabase security/performance advisors against the **isolated branch**; address findings before promotion.
7. Build pinned dependency lockfile / TypeScript migration in the mobile foundation branch; add lightweight CI without exhausting GitHub Actions quota.
8. Make PR review mandatory before merge. No production schema deployment, member pilot, invite campaign or real data import is part of this slice.

## Follow-on decisions (do not block safely isolated schema work)

- Real age category/group/unit names and who is authorized to maintain each catalog.
- Username account recovery where no personal email is available.
- Exact fields each leader or department head may modify, especially contact information.
- Whether broader pastor appointments need further per-operation capability grants.
- Which official app launches first; keep demo tiles generic.

## Security references

- Supabase RLS (column grants and private helper functions): https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase database-function privileges: https://supabase.com/docs/guides/database/functions
- Supabase 2026 explicit Data API grants: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- Supabase password sign-in: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
