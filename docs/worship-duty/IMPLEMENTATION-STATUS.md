# Worship Duty: implementation status and feature boundaries

**Snapshot: October 14, 2026.** The production integration is **draft PR #25**. Check GitHub `main`, the PR head, Vercel and Supabase again before acting; concurrent teams continue to change them. This is a documentation update, not new proof of an operational release.

## Real integration files in PR #25

| Area | Source | State |
| --- | --- | --- |
| Authenticated module | `app/modules/worship-duty/page.tsx` | Uses existing `requireMember()`, `member_module_home` grant check, and explicit production activation; unmerged |
| Same-origin application API | `app/api/worship-duty/route.ts` | Cookie-authenticated GET/POST, disabled until explicit module flag; unmerged |
| Core member interface | `components/worship-duty/connected-workspace.tsx` | My Duties, Presider, Manage; real runtime path wired to the existing RPC client; unmerged |
| Shared transport and validation | `lib/worship-duty/{client-transport,http-handler,api-contract,activation}.ts` | Whitelisted commands/results and fail-closed access; no browser role/actor authority |
| Duty catalog and rules | `lib/worship-duty/domain.ts` | 27 slots / eight departments, service applicability and conflict guards |
| Historical R1/R2 backend | `20261014103007_worship_duty_review.sql`, `20261014112521_worship_duty_authenticated_queries.sql` | Four public wrappers in total: `worship_workspace`, `worship_command`, `worship_workspace_v2`, `worship_lookup`; **unapplied** |
| Registration and access | `20261014224325_worship_duty_live_activation.sql` | Maps department labels and gives only the verified existing owner initial module manager/song editor access; **unapplied/unverified** |
| Owner setup backend | `20261014224327_worship_duty_live_setup.sql` | Draft service-editor grants, owner projection and audited commands; **unapplied/untested** |
| Owner setup front end | `/modules/worship-duty/setup` + `/api/worship-duty/setup` | **Missing from PR #25**: implement, validate, test before allowing the new backend |
| Historical month planner | old [draft PR #5](https://github.com/lovelaceaml-hub/lvzion-official/pull/5) | **Fictional in-memory only, not merged/ported to PR #25** |

The current production app remains authoritative for login, member IDs, age/group/unit hierarchy, existing administrative grants, My Week/Apps and in-app activity/notice framework. New Worship code must not duplicate those foundations.

## Duty rules, permissions and privacy

- Eight departments, **27 stable duty IDs**. Active assignments are for an exact service, not the entire date. Maintain exact Las Vegas service times.
- Normal limit: **one duty per member per service**. Built-in exception: exactly one **Thanks or Closing Prayer** plus one actual usher (`usher_door`, `usher_front`, `usher_back`, `usher_1`, `usher_2`). **Opening Prayer never pairs**, Lobby Security is not an usher, and three duties are rejected. Any additional pairs require **separate recorded approval**; none are seeded or imported.
- Member eligibility requires active foundation membership, active department membership, qualification and module access, plus availability. A newly signed-up Unassigned/intake account is **not** a qualified worker by default. The verified owner may administer initial setup via a specific bootstrap-backed grant without fabricating their placement.
- Organizational, unit, group, technical and department administration are **not interchangeable**. Duty writes require an actual relevant department-management scope **and** explicit Worship manager access. Song editing requires assigned Presider or separate song-editor appointment. Setup authority must be expressly bounded to the verified bootstrap owner or an independently approved later grant.
- The server resolves identity from the existing verified Supabase Auth session and checks roles, service, department and grant in PostgreSQL. Never trust a browser-supplied `actorId`, `role`, `isAdmin` or selected fictional persona.
- Ordinary member projections must hide other-group identities; scoped department leaders see only the names relevant to their duty administration. Private tables require RLS and deny direct browser-table access. Audit records and service histories are retained.
- Individual day-off changes, change requests and request withdrawal do **not** silently release existing assignments. Stale changes must fail, not retry or overwrite another administrator.

## Supported earlier code vs. unverified operational use

R1/R2 contain member duty cards, exact-service Presider song plans, manual scheduling, availability flags, requests/replacement, scoped candidates and recovery from uncertain saves. Those paths have **prior fictional/PGlite coverage in PR #5** but have not been verified through real production Auth and PostgREST in PR #25. The repository files are not the same as a deployed capability.

Current user-visible production setup is **not implemented** for service creation, publication, cancellation, qualification, song catalog, manager/access grants or full month operations. SQL-only operations in an unapplied draft migration must not be called 'ready'.

Automatic fill, full recurrence, advanced per-service availability, song history analytics, external notifications and calendars are not implemented and need separately approved requirements. The R3 fictional open-slot suggestion is **not** an automatic fill feature.

## Historical test provenance

Old development PR #5 reported 198 Node tests, 111 foundation permission assertions, and separate R2/R3 fictional browser runs. These results are **not transferable** to PR #25's live production integration after rebasing on changed member/Study Rooms/Contacts/display code. Use [VERIFICATION-PLAN.md](VERIFICATION-PLAN.md) and record new tests against the exact merged source.

## Rollback

No data was imported or synchronized from any other source; schedules start empty. A code rollback must not delete or rewrite member history. See [production release checklist](PRODUCTION-RELEASE-CHECKLIST.md).
