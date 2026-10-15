> Simpler interface refinement: [R6](SIMPLER-R6.md). R5 below records the installed operational foundations.

> Current actual-app implementation: [Completion R5](COMPLETION-R5.md). Historical R2 material below remains reference only.

# Morning Prayer — corrected legacy-app workstream R2

> Historical R2 development record. Current actual-app setup is in [LIVE-SETUP](LIVE-SETUP.md), with the verified hosted snapshot in the [handoff](../HANDOFF.md). Preview links and unapplied-schema statements below describe the older milestone only.

## Scope correction and boundaries

This module is based on `lovelaceaml-hub/morning-prayer-app`, the older **Morning Prayer Gathering — Las Vegas Work Mission** application at `lv-wm-prayer.web.app`. The user explicitly corrected the earlier recap direction and asked to continue. The Zoom recap prototype PR #7 stays on hold, unmerged, outside this branch. No recap generator, Gmail ingestion, educational graphics, attendance/PWP completion tracking, prayer journals, rankings or distribution is introduced here.

Base: member foundation PR #2, `feature/member-system-secure-r1` at `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`. Branch: `feature/morning-prayer-legacy-r2`. Other PRs, original Firebase apps, source Sheets, GroupMe jobs, public domain and hosted database remain unchanged.

## Reference audit — October 14, 2026

Pinned legacy commit: `57962d65e38c93c22f173f1872160c2839da224b`. Read-only inspection of README, manifest, USER-GUIDE, IMPLEMENTATION, Daybreak design README and relevant `app.js` hosting/volunteer sections. The reference uses Home / Schedule / Me / Manage, daily readings, monthly/weekly PWP, single/multi-date volunteer requests, own host-change requests and coordinator decisions. Pending changes keep the incumbent assigned; approval releases a host or assigns an applicant. Legacy app-approved overrides take precedence over Sheet refresh until reconciled.

The old name/PIN, anonymous Firebase writes, attendance and public roster patterns are not authorization for the new platform. Current member identities, Age Category → Group → Unit placement and independent department/technical authority come from the foundation. Cross-group host names stay `Assigned host` for ordinary members; explicit scoped coordinators can resolve hosts for their actual duties. This conservative visibility policy awaits accountable-owner review.

Companion `wm-groupme-prayer-post` is separate from the app. Its README documents paused posting and schedule sync, not freshly verified runtime status. No old repo changes, hosting release, Firestore write, scheduler inspection/change, token, source URL or old member records are copied.

Hosted Supabase `otecqlkqirncotytbfns` read-only check: only three foundation migrations (20261014051733, 20261014051804, 20261014051924), no mpg_private or wm_private schema. Preserve the migration-ledger mapping; do not blindly replay repository migration versions.

## Fictional preview

The preview screen component was removed in [R7](REFACTOR-R7.md); this section is kept as history.

Route `/morning-prayer-preview`; canonical inactive module landing `/modules/work-mission-prayer`. Only in-memory fictional fixtures. Reload resets changes. Persona controls are demonstrations, not authentication. No arbitrary personal details are collected.

Home prioritizes the next occurrence and conditionally simulates joining. PWP month/week content and reading dialogs use explicitly fictional placeholders. Schedule offers a weekday calendar, per-date details and multi-date volunteering. Me shows own hosting and request status, not attendance. Manage separates request review, occurrence/host administration and material editing/publication.

Requests are transactional: a multi-date batch succeeds entirely or not at all; retries are actor-scoped and exact; stale versions cannot overwrite newer changes. Host change leaves the incumbent until approval. Approval rechecks eligibility and occurrence version, and supersedes competing requests. Explicit coordinator assignments and moved dates require host confirmation. Rescheduling preserves identity/history and invalidates meeting-access verification. Cancellation/app days remove live joining without deleting history.

The ten-minute join window, example weekday pattern, 30-minute duration, manually assigned-host confirmation and request supersession policy are **proposed fictional defaults**, not approved current configuration. Actual timezone, recurrence/exceptions, host eligibility, window, link policy and affected-host handling require owner verification before real use.

## Explicit permission matrix

All capabilities require active verified membership, approved generic module access and an explicit series-scoped grant. No technical, organizational or department title automatically confers these capabilities.

| Capability | Purpose | Not implied |
|---|---|---|
| view_schedule | Safe schedule and own requests; own change/withdraw/confirm | Joining, other requests, management |
| join_gathering | Verified access within configured window | Attendance recording, source recordings |
| volunteer_host | Submit requests, with separately checked host eligibility | Immediate assignment or approval |
| review_requests | Review assigned-series requests, limited private reasons and candidate names | General schedule or PWP editing |
| manage_schedule | Assign eligible hosts, verify/move/cancel occurrences | Request approval or source publishing |
| view_materials | Current published readings and PWP | Drafting or publication |
| edit_materials | Source-checked draft revisions | Publication or schedule changes |
| publish_materials | Publish checked revisions | Editing or hosting decisions |

No grant-administration UI or bootstrap administrator is provided. Real granting/revocation ownership must be approved separately.

## Database and production boundaries

`schema-review.sql` is an **UNAPPLIED review candidate**, not an automatic migration. Fourteen private RLS tables, direct-table denial, fixed public invoker RPCs with private verified-session operations, series-level locks, compare-and-swap versions, atomic request batches, immutable history/material versions, safe projections and private access/source references. Material replacement records current/previous version IDs in the audit, never credentials or arbitrary source text.

`/api/morning-prayer` requires a member session and otherwise returns 401; authenticated live operations are still disabled (503). It does not read or log submitted data. The fictional frontend is NOT wired to hosted RPCs. The SQL proposal needs complete hosted/session/API, contention, role-revocation, asset broker, retention and deployment review before activation. Read projections do not yet implement complete editor draft/catalog/eligibility administration.

The sync planner is pure comparison: no fetch, credentials, name matching, automatic new date creation, Sheet writes or silent override replacement. Source mismatches, unmapped hosts and changed revisions require review. Recording/PWP official-site links in the preview simulate actions only. No live provider, scheduled job, email/message, new paid account or production deployment.

## Review gates still open

Named accountable owner and grants; current time zone and authoritative occurrence schedule; permitted host rules; holiday/app-day handling; approved PWP/readings sources and publishing authority; cross-group host visibility; reasons/retention/deletion; canonical source-of-truth and reconciliation; verified meeting access and joining window; no offline sensitive-cache policy; independently reviewed RLS/authentication, two-connection races and actual mobile devices; explicit pilot/cutover approval.

Technical references, not lesson sources: Supabase RLS guide, PostgreSQL explicit locking documentation, Next.js data-security guide. Existing dependencies and lockfile remain unchanged. No GitHub Actions workflow was added or dispatched.
