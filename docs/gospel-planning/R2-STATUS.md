# Groups & Gospel Planning — R2 transactional core

**Date:** October 14, 2026. **State:** implemented and verified in disposable native PostgreSQL; unapplied, unactivated, not connected to the fictional UI.

This status extends the R1 README and BACKEND-PLAN. Their original statements that the backend was design-only describe R1. R2 adds executable review SQL and real database-concurrency evidence for the bounded core below, not a completed backend or live application.

## What changed

`transactional-core-review.sql` is deliberately outside `supabase/migrations`. It adds fourteen private tables, current-scope helper functions, trusted commands and a purpose-specific workspace projection. It reuses foundation members, dated placements, appointments, verified-session identity and explicit module access. It creates no second roster or login.

The implemented core covers own confirmed availability intervals; same-group pair proposals; authorized exact-version publication; participant responses with a separate response revision; immutable session revisions; existing commitment holds during a material change; half-open overlap exclusion; a matching-revision check on commitment windows; explicit cancellation; a canonical shared result with immutable corrections; new group/week safe drafts; separately retained safe publications; authorized retry receipts; and minimal audit metadata.

Publishing and naming partners never manufacture acceptance. A revised session returns to proposal and needs publication and new responses. Remaining participants' old intervals stay held until explicitly replaced or released. Missing responses do not invent cancellations or completion. Cancellation is a terminal phase change; the material version remains the last immutable scheduling revision. These are proposed review semantics, not silently adopted live church policy.

## Authority and privacy

Editing a group plan requires both an explicit module capability and its current group-leader appointment. Scoped scheduling and publishing use separate grants. A module manager flag, group title alone, technical-admin title or client actor field does not confer ministry authority. Grants are bound to the current placement. All commands reauthorize before serving a retry receipt, including a creator removed from a session. Unit-scoped scheduling loses access when a participant leaves that unit placement.

The core shares the member foundation's transaction advisory lock `741085`, uses READ COMMITTED, then rechecks current session/member/placement/module authority. This intentionally coarse lock provides a consistent starting point for revocation ordering. All future protected grant/revocation paths must preserve that ordering. It is not a protection against a database infrastructure owner issuing arbitrary direct SQL.

Anonymous, authenticated and service roles receive no direct private-table/function grants. All fourteen tables have RLS. Both public RPC definitions remain ungranted and behind a literal-false activation guard. The existing Next.js `/api/gospel-planning` gate is unchanged.

The workspace includes only own availability, permitted own-group names, scoped sessions, canonical group-safe results and safe publications. It does not return another member's availability. A moved or unavailable participant's name is replaced by a generic label where current directory scope no longer allows it. Historical result group IDs remain fixed rather than following a member transfer.

## Executed verification

The final native run completed **77 named checks**, including **six controlled concurrent scenarios**, on PostgreSQL **17.10**. Each concurrent scenario used independent `psql` processes and verified a real advisory-lock wait through `pg_stat_activity` before releasing the first transaction. These were not sequential reducer tests or a mocked database.

| Concurrent scenario | Observed result |
|---|---|
| One member accepts overlapping sessions | First commitment succeeds; queued acceptance fails `GP_OVERLAP`; only one commitment remains. |
| Material revision and old-version response | Revision succeeds; queued old response fails `GP_STALE`. |
| Draft edit and stale publication | Edit succeeds; queued publish fails `GP_STALE`; prior published version survives. |
| Two partners report the same session | One report succeeds; the other fails `GP_STALE_REPORT`; totals are not doubled. |
| App grant revoked before a queued save | Queued save fails `GP_DENIED`. |
| Leadership ends before a queued workspace read | The actual queued response omits the former leader's draft; permitted ordinary-member content remains. |

Other executed checks include all-table RLS, direct-role denial, closed runtime gate, own-group directory projection, unit/group/technical boundaries, client actor injection rejection, stale availability, unknown timezone rejection, no inferred acceptance, response compare-and-swap, idempotent retries, changed-receipt payload denial, back-to-back intervals, old commitment holds, exact revision-window matching, removed-creator retry denial, transfer-history scope, report corrections and inactive members.

A `pg_dump`/`pg_restore` round trip into a second database in the same disposable cluster preserved the closed gate, private-table denial, report correction history and overlap exclusion. Existing test roles were present in that cluster. This is **not** a hosted backup/restore or full-cluster disaster-recovery test.

The uploaded SQL and Python blobs match the executed files byte for byte. Source fingerprints and run times are in `R2-VERIFICATION-SUMMARY.json`. The complete named-check output is regenerated by the test command.

## Run again safely

```sh
python3 scripts/gospel-planning/verify_native.py
```

Run as a non-root user with Python 3.10+ and PostgreSQL 17+ tools (`initdb`, `pg_ctl`, `psql`, `pg_dump`, `pg_restore`, `createdb`) plus the matching `btree_gist` extension installed. The test creates its own temporary cluster, uses an owner-only Unix socket, disables TCP, ignores ambient PostgreSQL connection settings and stops/removes the cluster in `finally`. It accepts no database URL or existing database target. All identities, approval records, capabilities and locations are fictional fixtures confined to that cluster.

The fixture scheduling date is January 9, 2030; revise that future test date before it becomes past. Past-report fixtures use relative database time. The app's production clock is not overridden.

Inputs are the four named foundation migrations pinned at `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`, the repository Auth test bootstrap and this review SQL. The runner explicitly selects those files rather than applying all concurrent workstream migrations.

## What is still not implemented or verified

The four-section fictional UI remains unchanged. **Restricted Member Updates and Request for Overseer storage, authority, handoff and confidential-history policies are not implemented by this core.** Do not place their text in safe plan fields to work around that boundary.

Availability in this core is an absolute-interval projection, not a persisted template/exception editing API. The browser-to-server adapter and recurrence/timezone contract still need implementation. Same-group pairs, maximum payload/range bounds and commitment-hold semantics are review defaults, not irrevocable ministry policy.

There is no live HTTP transport or UI database connection, real Supabase Auth/PostgREST integration, Contacts handoff, room reservation, shared My Week feed, notification delivery, public display projection, external calendar write or advanced matching engine in R2. SQL authorization tests use the foundation's test Auth tables/session claims. They do not validate hosted login, cookies, CSRF, network retries or real session lifecycle behavior. The R1 browser/domain suites were not rerun as part of this native run.

Only catalog metadata was read from the new hosted Supabase project. The observed application schema still contained the protected member foundation, not this Gospel core. No hosted schema changes, migration replay, user provisioning, member/contact import, legacy app activation, provider, domain or production promotion occurred.

## Next implementation order

1. Finish private Member Updates and Overseer Request transactions, assignments and history with proposed conservative scopes; keep them separate from safe publications. Confirm the unresolved live owner/publisher and confidential-history decisions before activation.
2. Implement strict server request/response adapters against the platform session, including recurrence expansion, response revisions, generic errors, no-store behavior and the foundation's request-origin policy. Keep live activation closed.
3. Exercise real disposable Auth/PostgREST integration and concurrent HTTP requests, including revoked sessions and all authorization mutation paths. Reconcile the current foundation/Contacts contracts rather than merging other workstreams blindly.
4. Add only authorized Contacts, true room and minimized platform-feed adapters, then independent security review, hosted migration mapping, rollback/restore review and physical Safari/Android testing before an explicitly authorized limited pilot.

The next step is implementation of the remaining private workflow and server integration, not production promotion of this review SQL.
