# Worship Duty: LV Zion Official module

**Status, October 24, 2026: built and verified locally; NOT RELEASED.** The migrations are unapplied, `LVZ_WORSHIP_DUTY_ENABLED` is off and no member has a Worship grant.

Worship Duty is a module of [lvz.app](https://lvz.app), using its Supabase project, sign-in and member records. Its route is `/modules/worship-duty`; do not treat that link as working until the steps below are done.

Under the October 16, 2026 fresh-start boundary in the root `AGENTS.md`, the module has no knowledge of any separate application. Services, assignments, qualifications and songs start empty and are created inside lvz.app. An empty schedule is a valid state.

## What is built

- **My Duties:** your published duties as cards, summary counts, request a change or withdraw it, the full schedule of a chosen service and your day availability.
- **Presider:** the song plan for an exact service (preparation songs in order, Glory, Thanks and Choir where they apply), save, confirm, and a copy-only text preview. Nothing is sent anywhere.
- **Manage:** a monthly planner (list or month calendar) that stages up to 40 changes for one reviewed, all-or-nothing save; single-service editing; change requests waiting for a decision.
- **Setup (owner only):** Services (create, edit, publish, cancel), People (department participation, module access, qualifications, scheduling and song-editor grants, per-service availability) and Songs (approved catalog).
- **Look:** the shared app frame (header, bottom bar with center Apps) and the Theme Atlas "Midnight Sapphire" style from the shared module style registry. It is dark by design, so it looks the same in Light, Dark and System. Screenshots and notes: [UI-QUALITY-REPORT.md](../design/worship-duty/UI-QUALITY-REPORT.md).

## Ready for release: what Anthony must approve

Each step needs its own yes. Nothing here has been done.

1. **Merge draft [PR #48](https://github.com/lovelaceaml-hub/lvzion-official/pull/48) into `main`.**
2. **Read-only hosted check, then apply the five Worship migrations** to Supabase `otecqlkqirncotytbfns`, one at a time, in this order (details and the exact check queries in [MIGRATION-STATUS.md](MIGRATION-STATUS.md)):
   1. `20261024160000_worship_duty_review`
   2. `20261024160100_worship_duty_authenticated_queries`
   3. `20261024160200_worship_duty_live_activation` (registers the module, gives only the verified owner access, and adds any of the eight Worship departments missing from the department list)
   4. `20261024160300_worship_duty_live_setup`
   5. `20261024160400_worship_duty_operations`
3. **Turn on `LVZ_WORSHIP_DUTY_ENABLED=true`** for Production in Vercel project `lvzion-official`. No other setting changes.
4. **Deploy** the merged `main` to production deliberately (automatic Git deploys stay off), keeping the current deployment as the rollback target.
5. **First owner setup, done by Anthony in the app:** open Apps, then Worship Duty, then Setup. Add songs, create the first services (they start as drafts), approve the people who serve and their qualifications, grant department scheduling, then publish.
6. **Live checks after deploy:** the owner sees Worship Duty in Apps and can save and reload a setup change; an ordinary member without a grant is refused; signed-out requests to `/api/worship-duty` and `/api/worship-duty/setup` return 401; Study Rooms, Contacts, Morning Prayer, Church Display and signup still work.

Rollback: turn the flag off and restore the previous deployment. The Worship tables stay; no data is deleted.

## Read next

- [MIGRATION-STATUS.md](MIGRATION-STATUS.md): migration order, October 24 audit, hosted check queries.
- [LAUNCH.md](LAUNCH.md): verification commands and the build log.
- [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md): code map, permissions and privacy rules.
- [PRODUCTION-RELEASE-CHECKLIST.md](PRODUCTION-RELEASE-CHECKLIST.md): full acceptance list and rollback.
- [REFERENCE-AUDIT.md](REFERENCE-AUDIT.md): the approved 27-duty catalog, pairing rules and service applicability.
- [DATA-MODEL.md](DATA-MODEL.md), [VERIFICATION-PLAN.md](VERIFICATION-PLAN.md), [WORK-HANDOFF.md](WORK-HANDOFF.md), [STATUS-EVIDENCE.json](STATUS-EVIDENCE.json).

## Source of truth

| Item | Reference |
| --- | --- |
| Current work | Draft [PR #48](https://github.com/lovelaceaml-hub/lvzion-official/pull/48), branch `claude/refactor-worship-duty-3b2f97`. It contains all of the older draft PR #25 (`feature/worship-duty-live`) |
| Superseded | PR #25 (contained in PR #48); PR #5 (closed, historical prototype) |
| Live app | `lovelaceaml-hub/lvzion-official` `main`; Vercel `lvzion-official`; domain `lvz.app` |
| Supabase | Project `otecqlkqirncotytbfns` |

## Non-negotiable boundaries

No alternate sign-in, separate member table, outside data source, import, invented placement, outgoing messages or new spending. New accounts start Unassigned; department membership and appointments are separate from group and unit placement. Module grants and approved status are checked on the server.
