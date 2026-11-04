# Contacts — operations and security runbook

> **Superseded in part (October 24, 2026):** every signed-in member can now use this app; managing it needs a manager grant. Owner-only wording below is historical. See [HANDOFF](../HANDOFF.md).

**Production target:** `https://lvz.app/modules/contacts` in Vercel project `lvzion-official`, team `lvzion`. **Hosted database:** Supabase project `otecqlkqirncotytbfns`. Original LV Zion systems are separate; never connect their databases or import their contacts by default.

## Current release and configuration

| Control | Verified state / source |
| --- | --- |
| Production Contacts UI | Vercel `dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv`, commit `87c5a8573ca01f7216f2c78df1da5b827b7380d2`, READY |
| Module URL | `/modules/contacts` |
| Runtime gate | `lib/server/contacts.ts`, `contactsReleaseEnabled()` |
| Production-only configuration | `LVZ_CONTACTS_OWNER_PILOT=true`; requires existing approved production environment and origin |
| Authentication | `requireMember()` in `lib/server/supabase.ts`; current verified session and member link |
| Module audience | One explicit verified-bootstrap-owner Contacts `manager` grant; no inherited access |
| Applied schema migration | `20261014224708_contacts_private_owner_pilot_v1` |
| Repository migration | `supabase/migrations/20261014224708_contacts_private_owner_pilot_v1.sql` |
| Database namespace | `contacts_private` — six RLS/FORCE RLS tables |
| API | `/api/contacts/[[...path]]` → server adapter; five authenticated RPC entry points |
| Evidence | [VERIFICATION.md](VERIFICATION.md), [R5 release record](OWNER-EXPERIENCE-R5.md) |

The app and database both authorize every request. Setting a frontend button visible does not grant database permission. The server rejects disabled environments, wrong origins, unknown paths, missing verified sessions and oversized/invalid JSON before private RPC work. Contact owner checks and DNC/lifecycle restrictions also occur in the database. Do not swap in service-role credentials or bypass RLS to make an error disappear.

**Do not enable** broad shares, leader management, cross-group read access, export, contact merging, bulk member imports, email/SMS/Signal, push notifications or DNC reversal without an approved policy and fresh end-to-end tests.

## Safe release procedure

1. Confirm current `main` SHA, desired Vercel team/project, and the current production deployment. Other LV Zion modules develop concurrently.
2. Compare pending repository migrations with [hosted migration ledger](../HOSTED-MIGRATION-LEDGER.json). Early repository IDs differ from hosted IDs. Never replay already applied CREATE statements or run unreviewed `db push`.
3. Run Node 24 with the pinned lockfile: `npm ci --ignore-scripts`, `npm run build`, then `npm run test:browser`. The build includes Node and disposable database suites. Use only synthetic data in automated tests. Existing browser tests do **not** certify a physical phone.
4. Before permission/schema changes, verify independent member/session authorization, explicit grant, RLS, wrong-member reads/writes, revoked-account behavior, optimistic versioning, DNC closure and rollback behavior. Document any blocker rather than silently widening access.
5. Deploy deliberately to **Production** for the verified commit; `vercel.json` disables automatic Git deployment and unrequested preview releases.
6. Confirm Vercel reports **READY** with `lvz.app` assigned to that exact build, and run signed-out/cross-origin/no-store checks. An owner-authenticated save/reload should be witnessed before claiming full live-end-to-end acceptance.
7. Update the Contacts verification and handoff documents with the actual deployment SHA, test counts, changes and open limitations. A docs-only Git push does **not** change the currently deployed app.

## Read-only verification examples

Run only against the **intended new** Supabase project. These return counts, not private records:

```sql
select count(*) as contacts_records from contacts_private.records;
select count(*) as contacts_grants
from app_private.module_access_grants g
join app_private.app_modules m on m.id=g.module_id
where m.module_key='contacts' and g.ended_at is null;
select count(*) as rls_and_force_rls_tables
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='contacts_private' and c.relkind='r'
  and c.relrowsecurity and c.relforcerowsecurity;
select count(*) as anonymous_callable_contacts_rpcs
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'contacts_%'
  and has_function_privilege('anon',p.oid,'EXECUTE');
```

These counts alone do not prove no authorization vulnerability; the dedicated private SQL tests and authenticated experience tests remain necessary. Do not SELECT names/phones/notes for release evidence.

## Fail closed and rollback

**Fastest access stop:** revoke the specific Contacts module grant through the approved member/module administration path (or suspend the Contacts module), so its RPC authorization fails immediately. Check that the member's Apps projection no longer exposes Contacts. This does not delete history.

**Disable the UI/API gate:** set `LVZ_CONTACTS_OWNER_PILOT=false` in Vercel **Production** and make a deliberate production deployment. This setting change alone does not mutate a previously built deployment; verify the new deployment is READY. Keep other production flags, signup and unrelated apps unchanged.

**Application rollback:** the previous pre-R5 production build was `dpl_2CkfiSr2EM1tQaAEj5ff3gMcRNEq`; inspect its readiness/compatibility at rollback time. Reverting application code does not imply dropping the Contacts database. Keep the schema, audit events, idempotency receipts and ownership history for recovery.

**Never** drop Contacts tables, erase retained notes/audits, import real personal address books or disable shared Supabase authentication/RLS as a rollback shortcut.

## Outstanding release gates

The owner-only R5 UI is live. The next *shared* Contacts release needs explicit decisions about privacy audience, field redaction, history visibility, individual consent and DNC, retention, cross-group sharing, oversight, stewardship and reassignment. Server-wide search, full task pagination, editing existing phone details, append-only note corrections, production owner save/reload and physical-device/accessibility checks are not complete as of this runbook. See [VERIFICATION.md](VERIFICATION.md).
