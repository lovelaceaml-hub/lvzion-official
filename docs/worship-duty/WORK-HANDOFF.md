# Work-mode handoff: Worship Duty real integration

**Resume implementation on the ACTUAL LV Zion Official web app.** User-approved objective: a verified, operational Worship Duty module inside [lvz.app](https://lvz.app), at **`/modules/worship-duty`**, using the existing member system. Do not build a separate app or stop at a fictional prototype. Schedules start empty and come only from records configured in this app.

## Immediate source references

- Live GitHub: `lovelaceaml-hub/lvzion-official`, branch `main` (changes frequently).
- Existing integration draft: [PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25), branch `feature/worship-duty-live`. **Continue this workstream; do not simply merge historical PR #5**.
- Historical R1 to R3 work: [PR #5](https://github.com/lovelaceaml-hub/lvzion-official/pull/5) based on stale member foundation PR #2; R3 month planner not persisted.
- Vercel: team `lvzion`, project `lvzion-official`; domain `lvz.app`.
- Supabase: Las Vegas Zion Pro organization, project `otecqlkqirncotytbfns`.
- Read current `AGENTS.md`, `README.md`, `docs/HANDOFF.md`, `docs/ACTUAL-APP-SETUP.md`, `docs/RELEASE-GATES.md` and `docs/HOSTED-MIGRATION-LEDGER.json`.

## Point-in-time status

On October 14, 2026, the real LV Zion production app already had self-service signup, a verified bootstrap owner and new Unassigned member flow, organization/group/unit administration, Study Rooms and other separately integrated modules. The Worship module remains **unreleased**. Read-only Supabase check found **0 Worship modules, tables, public RPCs and grants**; the hosted ledger had 16 applied non-Worship migration versions at that instant. No Worship migrations were applied. Vercel currently serves a READY `main` build; verify the exact alias/commit anew.

This documentation workstream merged an observed production main head into PR #25 **without modifying other workstreams**. The branch still requires code implementation/testing. GitHub commits, Supabase migrations and production deployments may continue concurrently: **inspect fresh heads and reconcile before any write**.

## Implementations already on PR #25

- Authenticated `/modules/worship-duty` page and `/api/worship-duty` GET/POST using existing `requireMember()`, authorized module feed and strictly gated production runtime.
- Shared My Duties / Presider / Manage interface, exact-service songs, scoped candidates and requests, availability flags, manual assignment rules, stale-save/no-repeat recovery, and unsaved song-plan navigation protection.
- Domain catalog and tests: 27 duties/eight departments. Normally one duty per service; only one Thanks/Closing Prayer plus one *actual* usher may overlap. Opening Prayer never pairs; Lobby Security is not an usher; triples invalid.
- Five **unapplied** SQL files: R1 schema, R2 query layer, live module registration+owner-only initial grant, owner setup backend and additive operations; see [MIGRATION-STATUS.md](MIGRATION-STATUS.md).
- Rules and audits: [REFERENCE-AUDIT.md](REFERENCE-AUDIT.md), [DATA-MODEL.md](DATA-MODEL.md), and [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md).

**Absent from PR #25**: operational owner setup screen and API, strict tests for the latest owner setup SQL, a tested durable month planner and automatic fill. An earlier attempt to write setup UI/API was blocked by tool safety checks; it was not committed. Do not bypass or misrepresent that blocker.

## Resume sequence: do real work, not only an outline

1. **Verify current state:** read PR #25 and actual `main` Git refs, current Vercel production target, Supabase schema/RLS and migration ledger. Preserve every concurrent signup/organization/Contacts/Study Rooms/Continuous Display/Morning Prayer update. Check any overlaps before cherry-picking or creating merge commits.
2. **Audit the five SQL migrations:** test against the currently deployed foundation, especially owner with intake/Unassigned status, independent department-admin roles, module activation, service cancellation/reconcile of module activities and notices, trigger invariants and `SECURITY DEFINER` access. Fix only Worship code; no unreviewed provider changes. Reconcile live migration versions, not just file names.
3. **Finish owner setup workflow:** actual `/modules/worship-duty/setup` and strictly authenticated `/api/worship-duty/setup` GET/POST; client and server contracts/validation; friendly phone-first service draft/publication/reschedule/cancel screens, authorized member qualifications/access grants and song management. Do not permit browsers to supply trusted actor/role. Initial owner access must be *explicit* and limited; no imported members.
4. **Persistent scheduling:** integrate month list/calendar and reviewed atomic changes against real scoped RPCs after tested implementation, then verify vacancy proposals and manual-only preference without moving saved assignments. Do not add automatic fill without separately approved requirements.
5. **Tests:** Node 24, `npm ci --ignore-scripts`, `npm run build`, `npm run test:browser`; isolated SQL/Auth/PostgREST and owner/anonymous/wrong-department/revocation/two-session tests, backup/restore, mobile/accessibility and other-module regressions. Old R1/R2/R3 fictional tests do **not** prove production.
6. **Hosted installation:** only when implementation and verified migrations are ready, apply each pending migration to the **exact** named Supabase project; inspect function grants/RLS, recheck migrations and actual owner access. Do not `db push` across mismatched historical ledger. Keep module disabled until successful checks.
7. **Real release:** ensure environment gate `LVZ_WORSHIP_DUTY_ENABLED=true` only after backend + ownership ready, build/deploy real combined `main` deliberately (Git deployments are disabled), verify `https://lvz.app/modules/worship-duty` and Apps/My Week tile as an actual authorized member. Confirm unauthorized failures; confirm signup, Study Rooms, Contacts, Morning Prayer and display remain intact. Keep the rollback target.
8. **Closeout:** update these docs, central handoff, migration mapping, PR description and test evidence with exact SHA, hosted version IDs and verified deployment. Do not claim 'launched' until real sessions and persisted actions are demonstrated.

## Security / data constraints

The user approved using the real `lvz.app` project, not creating another member system. Reuse the current session/cookie infrastructure, actual member UUIDs, Age Category → Group → Unit placement, department memberships, existing module registry and notifications. The designated owner was verified but remains Unassigned (no fabricated placement); ordinary new members see only themselves until authorized assignment. Department scheduling and Presider/song editing are separate scoped privileges; technical admin status alone grants neither. No roster import, outgoing Signal/email/push or new costs without separate authorization.

A real login password, OAuth token, provider secret and private owner email **must never be embedded in Git/docs/logs**; keep credentials in the service secret stores. Preserve rollback-safe historic records.

## Completion definition

An authorized real member can sign into `lvz.app`, open Worship Duty in My Week/Apps, read **actual database** duties, submit scoped changes and verify persistence. The designated verified owner can configure real services and the explicitly eligible roster. No unauthorized user can access hidden people or change another department. Production verification includes the `lvz.app` domain, correct Vercel commit and Supabase migration/grant status.

If a blocked tool or missing user-specific approval prevents a required step, complete independent work, commit on PR #25, and report the exact blocker. Never silently 'release' a partially fictional module.
