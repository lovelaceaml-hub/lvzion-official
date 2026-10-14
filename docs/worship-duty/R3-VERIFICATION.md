# Worship Duty R3 — tested fictional planning milestone

October 14, 2026. This increment develops the recommended month planner, service lifecycle and department setup without changing production or the member foundation.

## Evidence

Tested application commit: `54015837858a5f5b4d8fd7fb117f385089e273cf`.

Preview: `https://lvzion-official-ige7mfps7-lvzion.vercel.app/worship-duty-preview/planning`.
Deployment `dpl_82u7saTKnAtVs2tuHaVYLJL8qZLf`: READY. Protection remains enabled; temporary review credentials are supplied separately, not committed.

The subsequent evidence commit adds only this report, machine-readable evidence and the browser runner. Its application files remain identical to the tested application commit. The PR body records the final documentation deployment and any repeated browser result.

| Verification | Result |
| --- | --- |
| TypeScript and Next.js preview build | Passed |
| Combined Node suite | 198 passed, zero failed or skipped |
| New R3 pure-domain cases | 27, included in the combined count |
| Existing foundation PostgreSQL permission assertions | 111 passed |
| Deployed Chromium R3 browser checks | 40 passed, process exit zero |

Browser completion: `2026-10-14T13:03:05.682Z`, command `cmd_001131275c264b929bf8a531be38`.

## What the passing tests establish

The fictional month planner supports department-scoped List/Calendar review, explicit staged batches, legal swaps under the prayer/usher rule, rejection of triples and stale versions, reviewed empty-slot suggestions, unsaved-navigation confirmation, and date-based coverage filtering. Roster participation changes retain current assignments and primary placement; their effects are visible as problems to review. Manual-only settings remain independent of eligibility for deliberate assignment.

The fictional service coordinator has separately demonstrated authority from a department leader. New services and regular-month suggestions remain drafts until an explicit publication review. A configured, qualified Opening Prayer default applies only to new drafts; no default is invented. Cancellation retains assignments and the exact song plan as history, and pending requests are closed. Rescheduling validates assignment availability/applicability and song sections, closes requests tied to the old service details, and returns its existing song plan to draft without copying another service's values. Pure-domain tests cover rejection and all-or-nothing behavior, not a new database transaction.

Pacific local-time conversion rejects skipped or repeated daylight-saving wall times. Regular-service END times are labeled two-hour review placeholders, not approved durations. No feast date or service is generated automatically. Existing and past regular services are skipped; repeating the preparation does not create duplicates.

The 40 browser checks include four views at five widths (320/390/430/768/1280), planning and lifecycle permissions, batch staging/save/failure, paused participation, defaults, regular-month review, cancellation history, unsaved-edit confirmation, and keyboard focus wrapping plus Escape behavior inside a native review dialog. They also smoke-test the older R1/R2 entry screens and verify the operational API still returns 503/disabled with private no-store headers. No browser exceptions or unexpected backend calls occurred during the passing run.

## Fixes during verification

Build checks caught an unclosed JSX label and an overly broad array-narrowing/index type; both were fixed without reducing validation. The first browser run caught focus leaving the review dialog during repeated Tab navigation. A route-scoped keyboard boundary now wraps within the active dialog. The original test remains and passes; background controls are not made focusable to work around it.

## Reproduce

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
WORSHIP_PREVIEW_URL="$AUTHORIZED_FICTIONAL_PLANNING_URL" node scripts/verify-worship-planning.mjs
```

The runner accepts only the explicitly fictional LV Zion Vercel planning path. It blocks browser requests to app APIs and known hosted/original data backends. A separate read-only HTTP probe verifies the disabled operational endpoint. It emits four screenshots and a JSON report; require `succeeded:true`, 40 passing checks and process exit zero. A partial report after a failed run is not success. No temporary authentication cookie, state file or share-token URL is written to the repository.

## Important uncompleted work

A tool safety check blocked the proposed new database-migration repository write. It was not retried through another mechanism. No R3 SQL migration, grants, schema, planning RPC or hosted data was committed/applied. The empty migration filename created by the CLI in the disposable workspace is not in the repository.

R3 is therefore **fictional in-memory only**, including its service coordinator identity, roster permissions, batch behavior and audit entries. It has no network transport and cannot change the hosted database. Those client-side checks are design/testing aids, not production authorization. R2's real authenticated API/RPC code path remains separate, unchanged and disabled for hosted/production activation.

The still-needed backend work, historically accurate Fill algorithms, full hosted real-session/concurrency verification, approved ownership/grants, backup restore, physical devices and complete accessibility review are listed in `R3-MONTH-PLANNER.md` and the earlier R2 handoff. Browser width/focus tests are not physical-device or comprehensive visual-accessibility certification. The older complete R1/R2 browser suites were not rerun this turn, only their entry screens; their Node/database regressions are included in the passing build.

No original app/repository/Firebase/Google Sheet changes, real member imports, outgoing notifications, production aliases or environment changes, merge, or promotion occurred. Keep draft PR #5 unmerged.
