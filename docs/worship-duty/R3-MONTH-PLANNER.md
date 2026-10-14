# Worship Duty R3 — month planning, services and serving setup

Status: fictional review implementation. Operational R2 routes, authentication guards and hosted environments remain unchanged.

## Scope

This increment adds `/worship-duty-preview/planning` inside LV Zion Official and stays in draft PR #5 on `feature/worship-duty-r1`. It builds on R2 commit `5042e4dda19a3209167af28686f1c102cfca7d23`, not another application's branch. No original Firebase app, Sheet, database or real roster is involved.

## Working fictional experiences

Month planner: month navigation, List and Calendar layouts, department-limited slots, open/problem counts, expandable per-service details, coverage filters, staged assignment changes, an explicit review dialog, a reason, and all-or-nothing batch validation. A batch can contain at most 40 unique cells. Legal swaps are validated against the complete proposed final assignment state. Saved services increment once per batch; failed validation leaves the entire saved state unchanged. Candidate conflicts are resolved at final review rather than preventing legitimate swaps from being staged.

Suggestions: propose empty slots only, prefer a compatible prayer for usher roles, exclude manual-only candidates, and leave saved assignments in place. This is a bounded fictional review aid, NOT the original Usual/Auto/Rotation/Random historical algorithms. The default Opening Prayer assignee must be explicitly configured and eligible; no real person's identity is embedded.

Services: an independently appointed fictional service coordinator creates drafts, reviews regular-month proposals, publishes, reschedules and cancels. Ordinary department scheduling does not grant these global controls. Cancellation retains service, assignments and song plan as history and closes pending requests. A reschedule revalidates existing assignments and song applicability, closes old pending requests, and returns the exact service's song plan to draft without copying or erasing it. Past, cancelled and sung services cannot be changed. New services start unpublished.

Regular month: Saturday Morning 10:00, Afternoon 14:30, Evening 19:30 and Tuesday Evening 19:30 use the reference's documented fallback start times. End times are explicitly labeled TWO-HOUR REVIEW PLACEHOLDERS, not an approved duration policy. Existing and past regular services are skipped. Creating these drafts does not publish them. Feast/special services are entered individually; no feast date is invented.

Department: current fictional department members can be paused from that department's duty participation, marked manual-only, and qualified for specific duties. Primary placement, platform member status, independent department memberships and existing assignments remain intact. Eligibility removal flags retained assignments for review. App-specific roster versions prevent stale saves. The Opening Prayer default affects future drafts only.

Unsaved work: changing a month, section, role or editing target requires confirmation before discarding staged/form edits; browser unload registers a best-effort native warning. Native-dialog accessibility and keyboard/mobile flows are part of browser verification. Full page reload resets all fictional data and local audit entries.

## Critical implementation boundary

The new database-migration repository write was blocked by a tool safety check. It was NOT retried using another mechanism. The proposed R3 migration was not committed or applied. The empty CLI-generated migration in the temporary workspace is not part of the repository. No new service-editor grants, roster/default relations or planning RPCs exist in hosted Supabase as a result of this increment.

Accordingly this planner has NO network transport and is NOT wired to the R2 operational endpoint. Its all-or-nothing behavior and permission checks are tested pure in-memory behavior, NOT evidence of database transactions or server-side authorization for these new operations. R2's existing authenticated workspace remains separately intact and disabled for hosted/production use. Do not substitute the fictional planner for a production component or treat its role selector as authentication.

## Database work still required

Design review remains necessary for independent, manually ended service-editor appointments; app-specific serving/roster versions; optional Opening Prayer defaults; a month-bounded department projection; an audited atomic batch command; and service-lifecycle reconciliation of personal activities/notices, requests and program versions. New operations must derive the actor from the existing verified session, deny raw table access, share authority-change locking with the foundation, verify affected versions and scopes, and preserve history. Explicit module/grant configuration is never part of a fixture import.

A future schema implementation must be tested in a disposable database, then an approved isolated hosted environment, without bypassing the known production-reference guard. Two-session race testing, actual Auth-to-PostgREST verification, backup restore, physical devices, accessibility review, and explicit ownership/activation approval remain launch gates.

## Test plan

`tests/worship-duty-r3.test.ts` tests permission separation, month calendars/leap days, Pacific standard/daylight time, skipped/repeated wall-clock times, legal paired swaps, batch rollback, stale/duplicate/wrong-department cells, manual-only suggestions vs assignment, eligibility changes without historical deletion, optional defaults, regular-month deduplication, draft creation/publication, cancellation, rescheduling and historical immutability. Build and browser evidence must be recorded after execution; this document does not itself claim a passing test run.
