# Work handoff: Worship Duty

**Status, October 24, 2026:** the module is built and verified locally on draft [PR #48](https://github.com/lovelaceaml-hub/lvzion-official/pull/48) (branch `claude/refactor-worship-duty-3b2f97`, merged with main through `9cf2531`). It is not released. What Anthony must approve, in order, is in [README.md](README.md#ready-for-release-what-anthony-must-approve).

## Sources

- Repository `lovelaceaml-hub/lvzion-official`, branch `main` (changes often; merge it again before release).
- PR #48 contains everything from the older draft PR #25 (`feature/worship-duty-live`), including the Codex worktree's local commits. PR #5 is closed and historical.
- Vercel team `lvzion`, project `lvzion-official`, domain `lvz.app`. Supabase project `otecqlkqirncotytbfns`.
- Read the root `AGENTS.md`, `docs/HOSTED-MIGRATION-LEDGER.json` and [MIGRATION-STATUS.md](MIGRATION-STATUS.md) before any hosted change.

## What exists on PR #48

- `/modules/worship-duty` and `/api/worship-duty`: My Duties, Presider and Manage behind `requireMember()`, the module grant and the production flag.
- `/modules/worship-duty/setup` and `/api/worship-duty/setup`: owner-only Services, People and Songs setup. The browser never supplies actor or role.
- Persistent monthly planner (list and month calendar) with reviewed, atomic, versioned batches. Single-service editing, change requests, availability, song plans.
- Shared app frame and the module-scoped Midnight Sapphire style.
- Five unapplied migrations, renumbered `20261024160000` to `20261024160400`.
- Tests: Worship unit and PGlite database suites, the native local stack (`tests/integration/start-worship-stack.mjs`, `scripts/test-worship-integration.mjs`, `scripts/test-worship-browser.mjs`).

## Open items

1. **Hosted read-only check** (queries in [MIGRATION-STATUS.md](MIGRATION-STATUS.md)). Not run on October 24 because the Supabase connector needed authorization. An October 14 Codex session ended while applying the first migration; confirm nothing partial exists before applying.
2. **Release steps** 1 to 6 in the README, each with Anthony's approval.
3. **Shared frame requests** for the design session: a Worship entry in `routeDetails` (header icon) and moving the token block to the shared module-token contract. See [UI-QUALITY-REPORT.md](../design/worship-duty/UI-QUALITY-REPORT.md).
4. **Not built and not approved:** automatic fill, recurring service generation, song history analytics, push, email or calendar delivery, configurable extra duty pairs.

## Constraints

Schedules start empty and are created in lvz.app; nothing is imported and no other application is referenced. Department scheduling, Presider song editing and setup are separate grants; technical or group roles do not imply them. No credentials, member data or emails in Git. Full test suites need Anthony's explicit approval; use focused checks. Keep `LVZ_WORSHIP_DUTY_ENABLED` off and module grants unissued until Anthony approves the release.

## Completion definition

An authorized real member signs in to lvz.app, opens Worship Duty from Apps, reads actual database duties, makes a scoped change and sees it persist. The owner configures real services and the eligible roster. Unauthorized users cannot see hidden people or change another department. Production verification names the Vercel deployment, commit and hosted migration versions.
