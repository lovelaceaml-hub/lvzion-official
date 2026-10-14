# Study Room launch continuation — October 14, 2026

Canonical reconciliation is **PR #9**, branch `feature/study-rooms-reconciliation-r3`. PR #8 is the separate Continuous Display workstream; earlier Study Room prose pointing to #8 is a documentation error, not a different release branch.

## Status

The user requested progression through launch. **The real application has not launched.** Release remains blocked by unmet hosted authentication, restore, operational-policy and physical-device gates. Launch intent is not evidence these checks passed, nor authorization to guess named manager/member grants or override an existing access safeguard.

## Implemented in this continuation

Client-only access-epoch guard shared by schedule, manager-config, history and reschedule reads. A 401/403 invalidates pending private reads and clears the workspace; late responses from an older access state cannot restore private data. Write access denial clears locally instead of immediately refreshing data back onto the screen. An explicit new retry can recheck access. No authentication, database permission, hosted project guard or grant was relaxed.

The active screen advances a stale selected date after Las Vegas midnight rather than repeatedly refreshing yesterday. Browser dates are refresh hints only; PostgreSQL still authorizes all booking times.

Ten new Node cases exercise stale-read rejection, retry and calendar-boundary behavior. Four new browser scenarios use explicitly synthetic intercepted API responses: history-denial versus pending schedule, reschedule-denial clearing, write-denial clearing, and midnight refresh. These are not genuine hosted Auth/PostgREST tests.

## Executed local checks

- 10 new Node tests passed.
- TypeScript and optimized Next.js build passed.
- 26 Study Room Chromium browser cases passed, including the four new regressions and previous booking/management/history flows. Runner `cmd_47aca1a284c14459b4f226bbac1d`, exit 0.
- The first local browser run encountered a stale running Next server after rebuilding. Restarting it with the new build resolved those failures; the passing run used a freshly started server.
- Full exact Git-backed application/build and deployed browser results must be recorded after committing. The sandbox contains an older foundation snapshot and its local tests are not substituted for the full Git-backed suite.

## Verified environment and blockers

Connected Supabase project `otecqlkqirncotytbfns` is healthy. Permitted migration inspection returned only the three existing member-foundation migrations. No isolated branch exists. The connector quoted a development branch at **USD 0.01344/hour**; approval was requested and no branch was provisioned without it.

The platform runtime deliberately rejects the hosted production ref for active sign-in. That guard was preserved. A proposed operations migration write and a hosted SQL inspection were blocked by tool safety controls; neither operation was retried through a different path. The empty local migration placeholder was removed. No new SQL, schema application or hosted identity/grant operation was completed in this continuation.

Still unfinished: inventory creation, weekly service-restriction management and approved special-day replacement behavior. Existing R3 controls are unchanged. A controlled pilot also requires explicit owner/managers/eligible participants, confirmed live inventory/hours/restrictions, and a cutover rule so the original and new scheduler cannot accept conflicting real bookings for the same resources.

Still unverified: authorized isolated hosted Auth-to-PostgREST workflows and real-session denial/revocation; hosted migration-ledger reconciliation and backup/restore; physical iPhone/Safari, real multi-device behavior and independent security/accessibility review.

No production merge/promotion, domain/alias change, original Firebase change, real-member import, invitation or real notification was performed. Do not represent this client-hardening milestone as a production release or as the full operational R4 scope.
