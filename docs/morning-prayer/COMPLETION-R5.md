# Work Mission completion R5

Actual module: [Morning Prayer](https://lvz.app/modules/work-mission-prayer). Original retired application: `lovelaceaml-hub/morning-prayer-app`, inspected as reference only. No legacy Firebase or GroupMe changes.

## Acceptance and scope

The authorized outcome is a production-ready scheduling and hosting module inside LV Zion Official, with existing member authentication, independent permission grants, source-supported material editing and a private meeting broker. The initial checkout was clean at `4c8554e`. Work used a separate checkout. Concurrent Church Display PR #39 at `d054d65` is integrated; its code and additive migration are preserved. No fabricated real dates, hosts, lessons or credentials are permitted.

## Section 1: Scheduling and hosting

Use Home, Schedule, Me and Manage. Coordinators can enter individual dates or review bounded explicit weekday batches (up to 62 dates, at most 180 days ahead). All new dates need verification. Move, cancel, app-day and restore preserve the same occurrence and audit history. Restore creates an unverified, unassigned live gathering and never restores an old meeting secret. Rescheduling invalidates meeting verification and host confirmation. Pending requests retain the incumbent until approval; self-approval is denied. Eligible host assignment requires a separate explicit capability and eligibility decision.

## Section 2: Material corrections and private access

Editors can correct unpublished drafts and published materials using the latest catalog revision, even without permission to read member publications. Each correction creates an immutable version. Editing resets source attestation; publication remains a separate permission. Superseded drafts cannot be offered as new publications. Member feeds contain published wording only, with source labels; no AI lessons are seeded.

The protected Zoom broker checks the current member/session, exact occurrence, explicit joining permission, schedule verification, encrypted Vault reference, verification epoch and configured window. Links are never part of schedule or roster projections. Series locking and fresh permission checks prevent requests waiting behind a revoke from saving or releasing a secret afterward. Owner grant revocation and eligibility pausing remain available after an account is disabled. Ordinary leadership titles confer no module permission.

## Section 3: Read projections and browser behavior

Home and Me use complete safe future occurrence projections across the selected calendar month. Hosting shows future dates over a 62-day horizon. Request cards include the actual occurrence date. Join state includes the upcoming Home occurrence. The same placement-aware host-name projection is used everywhere.

The active page refreshes every 30 seconds and on focus/visibility changes. Superseded reads are aborted and ignored; a denied latest read clears the private workspace. Date entry uses one Las Vegas conversion, rejecting skipped/repeated DST times. No sensitive offline cache is added.

## Section 4: Release and verification

Release is a deliberate full replacement at lvz.app, as expressly requested. No hosted preview is created. R4 migration `20261014235216` was already applied before this task; it is not replayed. R5 replaces private function definitions only, preserves existing grants/RLS/public wrappers and seeds no operational data.

Combined strict-type/application/database/Next build passed: 375 application tests and 198 foundation SQL assertions. All 87 existing browser cases passed together on the final dedicated-server run. Six isolated Morning Prayer phone/client cases and four native PostgreSQL two-connection races passed. Migration `morning_prayer_completion_r5` is applied with hosted version `20261015010132`; readback verifies the catalog/restore functions and unchanged one-owner, empty operational state. Production application deployment is pending. Browser fixtures exercise the actual client in a disposable local harness, with no authentication bypass added to the application. Native PostgreSQL tests use two real connections and fictional identities. They do not prove an owner has entered real hosted content or joined a real meeting. Physical iOS/Safari remains unverified.

Rollback: retain READY deployment `dpl_GTe6J1uz4wBFAcFgWLSU9DEyaC8J` from `d054d65`, which includes the concurrent Display controls and R4 module. Roll back application aliases only after confirming that deployment contains all concurrent modules. The R5 function replacements remain compatible with R4 callers. Keep the additive schema and immutable audit/history. Never drop tables or replay foundation migrations as a rollback shortcut. Meeting access can be revoked in Manage and series/member capabilities remain independently gated.

## Owner-supplied operational details

Authoritative gathering dates and exception policy; actual permitted Zoom links and joining window; eligible hosts and coordinator/member grants; approved source wording and publication review. These cannot be inferred from the retired app. Outbound distribution, automated source sync and member rollout are not enabled by this release.

## Build log

- Inspected current private main, actual production alias, hosted migrations and retired reference. Discovered R4 was merged and its database migration already installed, while production still ran an older READY build after a failed build attempt.
- Fixed the duplicate/malformed test bootstrap path by using the shared test role already installed. Added coverage for unpublished draft corrections, publication separation, exact dates, cross-month future hosting, atomic conflict rollback, disabled-account revocation and exception restoration.
- Added reproducible client browser and native race scripts. Corrected two older Study Room browser fixtures to return their required operations projection; no Study Room application code or booking gate changed. Browser config now starts its own inactive test server rather than reusing an unrelated local server.
- Integrated the concurrent Church Display source and migration. 375 application tests, 198 SQL assertions, 87 existing browser cases, six Work Mission browser cases and four native races passed. R5 hosted migration applied and read back; application release pending. Final review also tightened the compatible R3/R4 setup RPC after a lock wait; its guard is applied as hosted migration `20261015010537`.
