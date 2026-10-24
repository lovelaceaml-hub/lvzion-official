# Groups & Gospel Planning

Updated October 24, 2026. Status: **built and tested locally with fictional data; not released.** The module is registered as a draft with no grants. Nothing is seeded, no hosted migration has been applied, and nobody can open it on https://lvz.app yet.

This supersedes the R1 fictional preview and R2 review SQL in draft PR #11 (`feature/gospel-planning-r1`). That branch was not merged; its useful parts were rebuilt on current `main`.

## What it does

One app at `/modules/gospel-planning` with two tabs. Swipe or use the bottom navigation (Preaching, center Apps launcher, My Group, More).

**My Preaching** (every member with access)
- Next: the next session and anything waiting on you (answer it, or record the result).
- Your availability: a few time ranges, optionally weekly for up to four weeks, with skipped weeks. Saving availability is not agreeing to a session.
- Plan a session: date, time, approved meeting place, one or two partners from your own group. It starts as **Proposed**.
- A leader in scope publishes it. Partners then answer: **Awaiting partner** until everyone accepts, then **Confirmed**.
- Changing the time, place or partners returns the session to Proposed; after it is published again everyone confirms the new version (**Please reconfirm**). Old answers stay in history. A missing answer never becomes a cancellation or a result.
- After the session, one partner records **one shared result** (completed or not held, with an optional note). The other partner sees it and can correct it with a reason; history is kept. Totals never double.
- Follow-up: **Open in Contacts** and **Create follow-up in Contacts** go to the separate Contacts app, which applies its own access checks. No session or contact data is passed.

**My Group** (four sections, in the Wayfinders order)
1. **Member Updates**: private to unit leaders (their unit) and group leaders. Optional "about" member, support needed, next action and "I will take the next action". Never shown to the member, the group, overseers or in the published plan.
2. **Gospel Review**: week counts for leaders (planned, proposed, awaiting partner, confirmed, results recorded, result needed) and the published review.
3. **Gospel Plan**: group leaders keep a private draft; a group leader with the Publisher role publishes the exact version to the group. The published version stays until a newer one is published.
4. **Request for Overseer**: a unit or group leader sends a request to an assigned overseer. Only those two see it. The overseer answers or asks a question; the leader replies or withdraws. Full history, and the screen says who acts next.

**Manage** (module managers only): approved meeting places, and Gospel roles (Publisher, Scheduler for a group or one unit, Overseer for a group). Managing gives no access to plans, updates, requests or sessions.

Not in this release (by design): rankings or scores, cross-group or cross-age matching, automatic suggestions, automated texting or notifications, room reservations.

## Permission model (proposed defaults, labeled for approval)

| Who | Can |
| --- | --- |
| Any member with access | Own availability, own sessions, own group's names, the group's published plan |
| Unit leader | Publish and change sessions whose partners are all in their unit; Member Updates for their unit; read the group draft; send overseer requests |
| Group leader | Everything for their group's sessions and Member Updates; edit the group draft; send overseer requests |
| Publisher (role) | Publish the group plan; requires a current group-leader appointment |
| Scheduler (role) | Publish and change sessions for a group or one unit |
| Overseer (role) | Read and answer only requests assigned to them for that group |
| Module manager | Places and roles only |
| Technical admin title | Nothing extra |

Leadership comes from the existing member appointments. Every request rechecks the signed-in member, current placement, appointment, role and module grant in the database, so ended roles, moves and revoked access take effect on the next action or refresh. A group move does not carry old sessions, plans or results to the new group; past results keep their original group.

## How it is built

- Database: `supabase/migrations/20261024150000_gospel_planning_core.sql`, private schema `gp_private`, every table with row level security and no direct browser access. One trusted command and one read function, both behind the member's own session. Version checks on every change, retry-safe request IDs, an audit log with no note text, and no overlapping commitments for one person (serialized with the member system's shared lock).
- Server: `app/api/gospel-planning` (read) and `app/api/gospel-planning/command` (write): signed-in members only, same-origin JSON, strict field checking in `lib/gospel-planning/contract.ts`, generic error messages, no caching.
- Screens: `app/modules/gospel-planning`, `components/gospel-planning/*`, shared app frame, shared `ui-` building blocks and tokens only.

### Design: Skyline Grid

Gospel Planning wears the Theme Atlas style **Skyline Grid** (light blue-grey ground, white surfaces, navy text, blue `#1863a3` actions, square-edged grid look). Why: it is the Atlas style made for schedules and organization, which is what this app is; it is unused by every other app; and it reads clearly at every age with no decorative imagery. A device appearance chosen under More, Appearance always overrides it.

To swap styles: change `GOSPEL_PLANNING_THEME` in `lib/gospel-planning/theme.ts` to another Atlas ID. When the shared module-style API from the design repair work (`lib/module-styles.ts`, `data-lvz-module`) lands on `main`, Gospel Planning moves to that registry (requested as key `gospel-planning`, Atlas Skyline Grid) and `theme.ts` plus `app/modules/gospel-planning/layout.tsx` are deleted. The module CSS uses tokens only, so it needs no color changes.

## Verification (October 24, 2026, local only)

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run build` (typecheck plus compile since #56; no test suite) | Passed after merging main `9cf2531`. Next.js 16.4.0 also printed a security advisory recommending an upgrade; not acted on. |
| `tests/gospel-planning.test.ts` (unit: contract, statuses, dates, theme, route guards) | 11 passed |
| `tests/gospel-planning-database.test.ts` (PGlite, all migrations + fictional seed + `supabase/tests/gospel_planning.sql`) | 116 SQL assertions passed |
| `scripts/gospel-planning/test-races.mjs` (real PostgreSQL 16, two connections, local disposable cluster) | 9 passed: overlapping acceptances, answer vs change, stale publish, double report, revoked access, ended leadership, simultaneous first saves, lock-guarded commitments, private tables |
| `tests/browser/gospel-planning.spec.ts` (Playwright, phone size, real module route; API calls run the real SQL in an in-process database) | 9 passed |

Not run: the full repository suite (`npm test`, `npm run test:db`, all browser tests), per the standing rule that full suites need Anthony's explicit approval. No hosted database, real sign-in or physical phone was used. Browser runs used the locally installed Chromium 1194 because Playwright 1.64's own browser is not installed on this Mac.

Run again:

```bash
node --experimental-strip-types --test tests/gospel-planning.test.ts tests/gospel-planning-database.test.ts
node scripts/gospel-planning/test-races.mjs
npm run build && npx playwright test tests/browser/gospel-planning.spec.ts
```

Screenshots: [phone, member preaching](screenshots/gospel-member-preaching-phone.png), [phone, leader week](screenshots/gospel-leader-week-phone.png), [phone, member group](screenshots/gospel-member-group-phone.png), [phone, manage](screenshots/gospel-manage-phone.png), [desktop, group](screenshots/gospel-group-desktop.png).

## Ready for release: what Anthony must approve

1. **Policy defaults** above (who publishes sessions and plans, unit leaders reading the group draft, members not writing Member Updates, two or three partners per session, availability up to four weeks ahead). Change any before release.
2. **Merge** this pull request (after the design repair branch, or rebase onto it).
3. **Hosted migration** `20261024150000_gospel_planning_core` on Supabase `otecqlkqirncotytbfns`: reconcile `docs/HOSTED-MIGRATION-LEDGER.json`, apply only this migration, read back that the module is still draft with zero grants, places and roles. No new database extension is needed.
4. **First setup** (in order): approve the module (status approved); grant yourself the manager permission; grant access to the first leaders and members; in Manage, add the approved meeting places, assign Publisher to each group leader who should publish, and Overseer for each group. Nothing works for members until places exist and leaders are appointed in Organization.
5. **Deploy** to https://lvz.app (automatic deploys stay off).
6. **Live checks**: signed-out API returns 401; a real leader saves and publishes a draft; a real member saves availability, a session goes Proposed → Awaiting partner → Confirmed; one shared result; a member in another group sees none of it; one check on a physical iPhone.
7. Decide separately whether to act on the Next.js security upgrade advisory (affects the whole app, not this module).

Before activation, the review handoff also lists open questions: confidential history for Member Updates and requests after a leader changes, cross-group sessions, report fields beyond completed/not held, and confirmation cadence.
