# Worship Duty — independent data model

> **Source migration review, not an installed schema.** This R1 model now forms the base of the real [draft integration PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25), which also contains R2 query, proposed owner-registration and unfinished owner-setup migrations. The real LV Zion **member + module runtime is already live**, but there were **zero Worship tables/RPCs** in hosted Supabase at the October 14, 2026 inspection. Read [MIGRATION-STATUS.md](MIGRATION-STATUS.md) for current intended order and [README.md](README.md) for launch status. Historical lines below describe R1 only unless qualified.

Status: **unapplied review migration**. Created with `supabase migration new worship_duty_review` in a disposable workspace; filename `20261014103007_worship_duty_review.sql`. The hosted project `otecqlkqirncotytbfns` was read only for its migration ledger. No hosted migration, branch database, test Auth account, production member or original-app data was created by this work.

## Dependencies and isolation

Requires the **already deployed** member-foundation migrations and generic module-runtime schema on live `main`. Its original R1 draft was stacked on member foundation PR #2 (now superseded by live integration). The Worship module itself remains unapplied; do not depend on or overwrite Study Rooms/Contacts/other modules. Reconcile local filenames with actual hosted versions; never blindly push repository SQL.

New records use `public.members` UUIDs and existing primary placements and department memberships. There is no duplicate login system, parallel member directory, Firebase dependency, legacy PIN/name identity, original database connection, Sheet connector or imported roster. Only duty/department labels are seeded. The department mappings initially have null IDs and must be mapped by an explicitly authorized operator. No module registry approval, module grants, song editors or custom conflict pairs are seeded.

## Relations

All 17 new tables are in `app_private`, have row-level security enabled, and deny raw access to PUBLIC, anon and authenticated.

- `worship_departments` maps the eight duty departments onto existing foundation departments.
- `worship_duties` is the 27-slot catalog with stable keys, labels, pairing kinds and display order.
- `worship_services` stores an explicit UTC start/end, worship type, service period, lifecycle state and optimistic version. Local displays use America/Los_Angeles.
- `worship_qualifications` authorizes a member for individual slots; `worship_roster_preferences` stores per-department manual-only preferences. These are not organizational leadership appointments.
- `worship_weekly_unavailable`, `worship_days_off`, `worship_service_availability` and `worship_availability_versions` represent weekly exclusions, local dates off, explicit single-service exceptions and optimistic update versions.
- `worship_approved_pairs` supports explicitly approved, reasoned custom pairs. Opening Prayer is prohibited by a CHECK constraint. This review has no client API for changing pair approvals.
- `worship_assignments` has one versioned cell per service/duty and a restrictive member foreign key. Clearing a duty retains its cell and increases its version.
- `worship_requests` references that cell and its assignment version. A same-member remove/reassign cycle cannot make an old request valid again.
- `worship_song_editor_grants` contains independent, manually ended appointments with an actor and reason.
- `worship_songs`, `worship_programs` and `worship_program_items` hold approved catalog entries and exact-service song lists. A missing Choir row is genuinely blank, not inherited.
- `worship_audit` retains command actor, before/after state and time. API callers cannot read or alter this table directly.

No member or assignment history is cascade-deleted. Availability edits do not silently remove duties. Service cancellation/history editing and qualification/grant administration are intentionally outside this initial command API.

## Authorization boundary

**In the historical R1 migration**, public `SECURITY INVOKER` wrappers are `worship_workspace()` and `worship_command(jsonb)`. R2 additionally proposes `worship_workspace_v2()` and `worship_lookup(jsonb)`. The current draft owner-setup SQL proposes two more `worship_setup_*` wrappers, which remain **unverified**. Each approved wrapper must delegate to audited private `SECURITY DEFINER` code with an empty search_path. Helpers and raw tables are not directly executable/readable by browser roles. No service-role credential is involved in member operations.

Each call resolves the current member through the existing verified Auth user + session linkage and active-member status, then checks an approved module with a current access grant. Assignments additionally require BOTH a module-manager grant and a current foundation department-manager/department-administrator permission for that duty's mapped department. Unit/group/pastoral/technical or module-manager-only access is insufficient. Song editing requires the service's actual assigned Presider or a separate current song-editor grant; scheduling authority alone is insufficient.

Workspace output is a bounded, whitelisted projection. Ordinary members see own/group names only; department managers see the names relevant to their authorized duty departments. Hidden identities return neither UUID nor name. Foreign availability details are hidden. Song plans and change requests have independent access checks.

Commands accept strict operation-specific fields; browser-supplied actor or role fields are rejected. Supported operations are assign/clear, request, withdraw, resolve (replacement/open/decline/stale closure), own day-off availability, and exact-service song-plan replacement. The schema is not a claim that the production frontend is activated or that every original administrator capability is ported.

## Integrity and concurrency design

Worship writes take the same transaction advisory lock (`741085`) as the foundation's authority mutations before checking identity/scope. The selected service row is also locked, preventing competing slot changes from validating against the same old service. Assignment writes compare the expected service version; requests additionally compare their recorded assignment-cell version. Program and availability changes have their own version checks. Transactions roll back the complete command on invalid candidates, duplicate song positions or a stale request.

A database trigger checks service applicability, active department membership, qualification, availability, the prayer/usher exception, the Opening Prayer prohibition and the maximum of two duties. These do not rely on disabled browser options. Embedded PostgreSQL tests cover authorization and sequential stale-write invariants; this is not a claim of a two-connection hosted race test.

Published assignment changes project personal activities and generic in-app notices into the foundation's module framework. No email, push, calendar, Signal or other external delivery runs. Production subscriptions and actual hosted cross-session execution remain release gates.

## Activation sequence — NOT performed for Worship Duty

Reconcile and review the migration ledger; test on an empty disposable hosted development database; use the now-verified application owner only for **explicit Worship setup grants**, not inferred scheduling authority; finish missing setup UI/API; validate real Auth sessions using existing production guard without bypass; connect the authenticated frontend to tested scope projections/commands; test two independent sessions, races and revocation; complete backup/restore and device review; then run the requested deliberate, fully tested real production release. The user already requested the live integration; engineering gates remain. Fictional fixtures must never be installed in production.
