# Groups & Gospel Planning — R1 fictional week

Development date: October 14, 2026. Status: isolated interactive prototype; not an activated church application or approved live permission policy.

## Scope and provenance

This work implements the first fictional slice from `LV_Zion_Gospel_Planning_Review.md` and `LV_Zion_Gospel_Planning_Development_Handoff.md`, supplied by the user. Base: member foundation PR #2 at `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`. All changes are additive within this module and its tests/docs. No shared app registry, auth, domain, migration, dependency or other workstream file is replaced.

Read-only sources inspected: legacy `lovelaceaml-hub/preaching` at `0b3b2bf4d74ed7283cc083a8cac50ef152ccca57`, selected PRODUCT-BRIEF, PARTNER-SCHEDULING-PLAN, USER-MANUAL (370–560), solver and solver-test definitions, planning-service source; the foundation APP-INTEGRATION-FRAMEWORK; Contacts WORKFLOW-AND-PERMISSIONS at `a13ad885d07cc878d0368ebe16c69d382b6a9dc3`; plus the supplied review's earlier group/account findings. This is not a new audit of every legacy file or live database, and legacy tests were not rerun.

The older Companion's age-category-wide discovery, immediate self-publication and automatic contact sharing are NOT adopted. Its source is a workflow reference, not an authorization contract. Shared Contact Tracker is an independent, unmerged workstream, not a ready production dependency.

## Open and exercise

Run the normal Next development server and open `/gospel-planning-preview`. The preview uses a fixed October 14, 2026, 10:00 AM Las Vegas clock and two fictional groups. Reloading discards edits. It never writes localStorage, sessionStorage, IndexedDB, a database, notifications, Contacts, calendars or room reservations.

1. Start as the member. Review the upcoming invitation, save personal availability ranges and record the already-ended sample session result.
2. In Preaching, create a Friday pair proposal using the two default fictional participants and an approved sample location. It does not accept for either participant.
3. Expand the sample controls, choose Group leader + publisher, open Manage, review the exact proposal and publish. Switch to the invited partner and explicitly respond.
4. As the leader, revise its time or location. The material version changes, responses become pending and earlier commitments remain held until participants respond to the revision. Review and publish again; switch to the partner and reconfirm.
5. Advance the preview clock to Sunday, record one shared result, then switch partners to view/correct that same canonical report. A correction needs a reason. No result is inferred from silence.
6. Open Check Contacts handoff: it explicitly reports unavailable. No contact is opened, created or shared.
7. Use Manage's four sections: Member Updates, Gospel Review, Gospel Plan, Request for Overseer. Add a restricted item and assigned next action; edit a group-safe draft; review its exact version before publication. Switch to the member to see only the published safe projection.
8. Switch to the assigned overseer to respond or request clarification. Switch to Unit A leader, other-group member and technical-only administrator to inspect the bounded views. Fail-next-save and revoke-access controls are fictional error/revocation demonstrations, not real account operations.

The preview navigation includes a center Apps button; this is local exploration, not a change to the foundation navigation contract. Contacts, Rooms and Display entries describe unavailable adapters rather than pretending to complete another app's operation.

## Implemented behavior

Personal Today uses only the actor's sessions, even when that actor also manages a group. The scoped coordination view is separate. Own-group candidates expose IDs and names only. Unit restricted items, group planning/publishing, scheduling and assigned oversight are separate capabilities in the domain specification. The technical fixture has no Gospel app grant.

Group plans use a separately published safe snapshot. Editing a replacement draft preserves the existing publication. Restricted updates and oversight requests are different records and never included in the publication operation. The current next-action field is textual (responsible party and due date); a full structured task lifecycle is still a later slice.

Availability supports up to 14 ranges, repeats for one to four weeks and date exceptions. IANA timezone conversion rejects ambiguous/nonexistent local times. Manual proposals use two same-group participants. Publication rechecks availability revisions/coverage and existing commitments. Participant responses, publication and completed reports remain distinct facts. Session and report operations use expected versions; retries are bound to actor, placement, receipt and payload.

Historical report group attribution stays with the stored session group. App revocation, inactivity and ended appointments affect the next protected operation in the in-memory specification. Real production enforcement still requires server-derived identity and transactional database checks.

## Important limits

All fixtures and simulated roles are shipped to the browser. This is intentional fake-data prototyping, NOT a confidentiality boundary, hosted authentication test, production RLS test or secure replacement for the member system. Do not place real member/support/contact content here. The read/mutation API `/api/gospel-planning` returns generic 503 with private no-store, for all implemented methods, and never returns fixtures.

The pure domain tests cover competing commands sequentially. They do NOT establish two-request database race safety. UI browser tests, hosted authentication, disposable database concurrency and physical Safari/Android checks must be reported separately. See the verification record when added.

Assisted matching, triples, casting lots, cross-group/cross-age planning, required result counts, notifications, actual My Week delivery, room links, broadcast projections and live Contacts actions are not activated. No legacy account, roster, contact, password, DB connection or permission code was imported.

## Historical reporting taxonomy — reference only

The legacy USER-MANUAL lists Male Adult and Female Adult in 20s/30s/40s/50s/60s/70s; Young Adult Office Worker or Univ. Student (M/F); and Student High Sch. Student or Middle Sch. Student (M/F). These categories are not required, inferred or stored in this prototype. Current field requirements need an explicit decision before activation; no campaign tracker, response rating or leaderboard is added.

## Run checks

`node --experimental-strip-types --test tests/gospel-planning.test.ts`

`npm run typecheck`

`npm run build`

Keep all production activation guards in place. Do not merge other app branches merely to exercise this preview. See BACKEND-PLAN.md for the next isolated implementation boundary.
