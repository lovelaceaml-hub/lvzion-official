# Guidance Teachers

Released October 31, 2026 as a separate app in LV Zion, not a replacement for Worship Duty.
Route: `/modules/guidance-teachers`. Shared identity and persistent app frame; independent services, assignments, permissions and audit history. No new hosting or database project.

## Approved design decisions

1. Schedule worship duties / volunteer shifts.
2. Coordinators assign; members cannot self-sign up.
3. Coordinators and assigned members use the schedule.
4. Show the full selected-date schedule with the current member's duties highlighted.
5. Stack one card per worship service.
6. Schedule Guidance Teachers only.
7. Simple icons and slim persistent bottom navigation with the center Apps launcher.
8. White surfaces with lavender accents.
9. Tap a slot, search members, select and confirm the assignment.
10. A date selector at the top chooses the services to display.

Every service has exactly four slots: Main Sanctuary 1–2 and Small Sanctuary 1–2. Both locations appear inside the same service card. Service times and real assignments are not inferred from prototype examples. The live calendar starts empty.

## Use

Open LV Zion → Apps → Guidance Teachers. Schedule is the default view. My duties filters the selected date; the full schedule is one tap away. The existing application owner and deliberately granted module managers see Manage. Manage adds a named service with its date/start/end time; tapping a slot opens the member picker. Assigned slots can be replaced or cleared. Future service details can be edited or cancelled. Past services are read-only; cancellation retains history. Times are explicitly Las Vegas local time.

The app tile follows the shared signed-in-member Apps registry. Schedule names are stricter: only a module manager or a member assigned to at least one non-cancelled Guidance Teachers service receives the schedule. Other signed-in members see a neutral access notice, not names. Candidate search is manager-only and returns active members' names, IDs and availability only. It never returns contact details or organizational placement. Coordinators require a current explicit `manager` grant on this module; other-app management does not confer it. The existing bootstrap owner manages through the central owner-everywhere rule. No new coordinator grants are seeded.

## Integrity and privacy

Four fixed rows are created transactionally with each service. A member cannot occupy multiple slots in one service or overlapping Guidance Teachers services. A shared module-level transaction lock protects assignment and service-time changes against races. Every edit carries an expected service version; stale devices cannot silently overwrite. Request receipts make identical retries idempotent, and altered payloads cannot reuse a request ID. Every successful change has an audit row.

The API uses the existing verified-member session and bounded same-origin JSON body reader. It accepts no caller-selected actor or role. Public RPC wrappers use SECURITY INVOKER; private implementations explicitly check `auth.uid()`, member identity and module authority before accessing private RLS-enabled tables. Direct table permissions are revoked. Responses are private/no-store. There is no local-storage roster, polling loop, public demo route, sample schedule, email/push side effect or service-role browser key. The app updates only its own My Week activity rows.

## Verification and release

Focused commands, not the repository-wide suite:

```
node --experimental-strip-types --test tests/guidance-teachers.test.ts tests/guidance-teachers-database.test.ts
npm run build
```

The domain/HTTP checks cover Las Vegas dates/DST, strict contracts, four slots, unauthorized requests, origin failure, stale writes and fail-closed responses. The PGlite test applies the actual member foundation with fictional local identities and verifies permissions, duplicate/overlap checks, receipt replay, cancellation/history, activity sync and private-table access. It never contacts production.

The tested SQL is recorded as `supabase/migrations/20261031155741_guidance_teachers.sql`, matching the hosted migration version. It has already been applied; do not replay it. See [release evidence and limitations](RELEASE-2026-10-31.md). Synthetic tests do not prove a real signed-in hosted member transaction.
