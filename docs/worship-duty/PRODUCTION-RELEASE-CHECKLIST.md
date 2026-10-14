# Worship Duty — production release checklist

**Target:** `https://lvz.app/modules/worship-duty` inside the existing authenticated LV Zion Official app. **Current result: NOT RELEASED.** Do not check an item merely because a SQL file or UI component exists.

For current workstreams and evidence, start at [README.md](README.md) and [WORK-HANDOFF.md](WORK-HANDOFF.md). The integration branch is [draft PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25), not the historical PR #5.

## A. Establish the correct source and boundary

- [ ] Read current `main`, the latest PR #25 head, all unrelated merged modules, `AGENTS.md`, this project's active migration ledger and actual production deployment.
- [ ] Merge/reconcile current `main` **without** undoing signup, organization, Study Rooms, Contacts, Morning Prayer or Continuous Display features.
- [ ] Audit every Worship-specific file for dependencies on retired draft branches, preview personas or old Firebase/Sheets/PIN authentication; no alternate member identity.
- [ ] Confirm no unapproved hosted identity, real roster, imported assignment, third-party messaging, paid provider or old-app write is required.

## B. Complete minimal owner-only operational setup

- [ ] Implement `/modules/worship-duty/setup` (phone-friendly screen) and `/api/worship-duty/setup` (session-bound GET/POST).
- [ ] Validate strict payload shape/size, trusted origin, confirmed same-origin member session and current bootstrap owner + explicit module manager appointment server-side. Reject actor/role fields supplied by browsers.
- [ ] Provide reviewable service create/edit/publish/cancel and exact Las Vegas times; preserve assignment/song/service histories and reconcile in-app activities/notices on any change.
- [ ] Allow owner to enter authorized song catalog metadata, choose approved participants and duty qualifications based on **existing** department/member records; do not invent real people or age/group/unit placement.
- [ ] Owner-only setup remains useful with zero eligible workers; no user is scheduled automatically.
- [ ] Connect R1/R2 My Duties, Presider and Manage to the live Supabase RPCs. The owner must see the module from the real My Week/Apps navigation after approval.

**Owner-only setup and broad member scheduling are distinct gates.** The user wants real usage, but enabling access to one owner does not imply all members may see or edit every duty.

## C. Database review and safe migration

- [ ] Read four pending migrations in [MIGRATION-STATUS.md](MIGRATION-STATUS.md); fix setup SQL issues found during tests.
- [ ] Confirm existing hosted schema and exact migration versions at time of change (the earlier foundation filenames differ from hosted versions). No blanket `db push`.
- [ ] Run all four SQL changes successfully on a disposable current-foundation database; test RLS, private function invoker/definer boundaries and direct-access denial.
- [ ] Validate transaction rollback on invalid edits, same transaction lock as account/permission revocation, stale versions and two independent sessions.
- [ ] Run security advisors. Prefer private RLS + deny direct table access and limited public `SECURITY INVOKER` RPC wrappers. Review role-specific scope and search-path handling.
- [ ] Establish a backup/restore plan before real schema writes.
- [ ] Apply only individually verified additive migrations to **Supabase project `otecqlkqirncotytbfns`**, and record actual hosted versions in the root ledger and module evidence. Verify there are no unexpected new accounts, placements or legacy records.
- [ ] Check exact registered module status, owner grant, song setup grant, all required functions and underlying table RLS after installation.

## D. Behavioral/security acceptance

- [ ] Actual authorized account can load the module through existing `requireMember`, server module registry and browser cookies.
- [ ] Anonymous, disabled, unlinked, unrelated group, ordinary member and technical-only users are denied unnecessary information and writes.
- [ ] Explicit department manager + current Worship module manager grant required for assignment changes; Presider or separate song-editor authority for songs.
- [ ] 27-duty catalog and correct service applicability. Normal one duty; permitted Thanks/Closing Prayer plus one actual Usher only. Opening Prayer paired with anything, Lobby Security masquerading as Usher, and all triples are rejected in SQL.
- [ ] Availability change never silently removes assignment; own request/withdraw/leader resolution behave correctly, stale requests cannot reassign another member.
- [ ] Unsaved song changes require explicit discard, canceled navigation preserves draft, uncertain write triggers reload not blind retry; lost access clears private screen.
- [ ] Published service creates correct personal activity, cancellation retains history and closes pending requests, rescheduling preserves exact song and past service state.
- [ ] Mobile browser 320/390/430px, tablet 768px and desktop checks; keyboard and screen-reader semantics; physical-device acceptance status explicitly noted.
- [ ] Tested separate authenticated sessions, denied cross-scope calls, and post-revocation denial.

## E. Platform regressions, rollout and proof

- [ ] Run `npm ci --ignore-scripts`, `npm run build`, `npm run test:browser` and the Worship-specific SQL/HTTP tests on the exact current combined source; capture pass totals and SHA.
- [ ] Verify signup/confirmation/resend, Unassigned own-record privacy, member admin/organization hierarchy, Study Rooms and Contacts and other concurrent module regressions.
- [ ] Confirm production Vercel environment still uses exact `https://lvz.app` and `otecqlkqirncotytbfns` with existing secrets; only then enable `LVZ_WORSHIP_DUTY_ENABLED=true`.
- [ ] Perform a **deliberate production build/deploy**, since automatic Git deployments and unsolicited previews are disabled. Use a tested production build; verify the immutable deployment ID before attaching `lvz.app`.
- [ ] On the actual domain, verify module appears in authorized user's Apps/My Week, owner can complete a real safe setup write and reload persistent state, and an unauthenticated request gets 401/403 or 503 as intended. Do not expose owner records on anonymous pages.
- [ ] Verify old `lv-zion-duties.web.app` still works independently and the original Firebase records are untouched.
- [ ] Update docs, PR review/merge state, screenshots and machine-readable evidence with final Git SHA, hosted SQL ledger and verified Vercel deployment. **Only then claim launched.**

## Scope limits for later phases

Full persistent month planner, source-accurate `Usual/Auto/Rotation/Random` Fill, full member recurring/exception availability, song-history analytics, export/calendar subscriptions and external reminders are **not present as production-proven behavior** in PR #25. Any initial owner-only launch must clearly disclose deferred features rather than claim historical parity.

## Rollback without data loss

If validation fails **before deployment**, keep Worship disabled, stop migrations and leave production unchanged. If a production release fails **after additive migrations**, disable the **Worship-only** runtime flag/registration as appropriate and restore the last verified production deployment. Keep migrated Worship tables, audit, existing member history and all unrelated modules; no destructive schema rollback. The legacy Firebase app remains the operational backup until an explicitly approved future cutover.
