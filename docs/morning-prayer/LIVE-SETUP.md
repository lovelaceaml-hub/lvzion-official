> Current implementation and release evidence: [Completion R5](COMPLETION-R5.md). R3 meeting-access-disabled wording below records the earlier release, superseded by the explicit Vault-backed R4/R5 broker. No actual meeting links or member rollout are seeded.

# Work Mission Morning Prayer — live LV Zion integration

> **Superseded in part (October 24, 2026):** every signed-in member can now use this app; managing it needs a manager grant. Owner-only wording below is historical. See [HANDOFF](../HANDOFF.md).

> Live setup contract. The [current handoff](../HANDOFF.md) confirms the applied schema, approved module, one active module grant and enabled series with no occurrences or published materials. Historical R2 verification is separate; broader member activation remains gated.

## Production target
This module is part of the actual LV Zion Official member application, **https://lvz.app**, at `/modules/work-mission-prayer`. It is based on the legacy `lovelaceaml-hub/morning-prayer-app` workflow and **not** the Zoom meeting-recap/educational-graphic prototype. The earlier recap PR #7 remains on hold. The old Firebase site and its GroupMe companion are neither migrated nor modified.

## Release contract (2026-10-14)
- GitHub integration branch: `feature/morning-prayer-live-r3`, based on the ACTUAL production `main` and rebased/reconciled with any main work committed before release. No parallel workstream is overwritten.
- Authenticated route: `/modules/work-mission-prayer`. The existing `member_module_home` registry authorizes the module. Owner-only authorization is applied independently of group/department/technical roles.
- API: `GET /api/morning-prayer?from=YYYY-MM-DD&to=YYYY-MM-DD` returns authorized schedule, own requests, published PWP/readings and explicitly permitted management data; `POST /api/morning-prayer/command` performs verified-session, versioned changes; `POST /api/morning-prayer/setup` handles controlled setup. Anonymous requests fail with 401 and private/no-store.
- Schema: `supabase/migrations/20261014224129_morning_prayer_live_core.sql` (generated with Supabase CLI). Adds fourteen `mpg_private` RLS-protected tables and public invoker wrappers. Original first-party member/module foundations are reused. No legacy database connection, roster import or credentials.
- Bootstrap: exactly one previously verified production owner receives the generic manager grant and independent WM capabilities for setup. The owner may be Unassigned/intake while holding the original bootstrap receipt; ordinary intake signups do not get app access. No other member grants are made by default.
- All real schedules are initially **empty**. Owners must enter, verify and publish dates/materials manually. The module must not pretend the old recurring Zoom time/link applies today. Creating a new occurrence does not enable joining. Meeting-link access is deliberately disabled until private verified access is implemented and explicitly authorized.
- No automatic Google Sheet synchronization, GroupMe/Signal posting, Gmail ingestion, source recording exposure, attendance, prayer journal, PWP-completion tracking, real notification or recurring job. The old `lv-wm-prayer` Firebase app remains untouched.

## Owner setup process
1. Sign in at `lvz.app` using the existing confirmed owner account.
2. Open **Apps → Work Mission · Morning Prayer** (an explicit module grant is required).
3. In **Manage**, add the correct future date, exact Las Vegas local start/end, and occurrence type. Each record starts **Unverified**; verify the schedule only after checking the authoritative event.
4. Separately create a PWP/reading draft from approved source wording; confirm the source and publish it with the dedicated publisher permission. Unchecked drafts cannot be published.
5. Members must receive approved individual grants and host eligibility before volunteering; no inherited department or unit grant is assumed. Real member-facing join access cannot be activated by this setup screen.
6. Once an authorized occurrence and account are permitted, members can view schedules, submit pending hosting requests, withdraw them, and have their changes reviewed. Pending requests never immediately replace hosts.

## Security and source-of-truth
The legacy Google Sheet remains a **reference only**. The isolated source-comparison planner does not sync or overwrite real app schedules; any future migration requires explicit conflict review and stable person matching. Named member permissions, independent manager/editor/publisher capabilities and current verified sessions are checked in SQL, not just hidden buttons. Public projections do not contain raw emails, protected meeting URLs, original source tokens or other-group names. Rescheduling invalidates meeting access/confirmation, with histories retained. The client never receives a service key.

## Verification / remaining gates
The core schema was tested against the main member/module foundations and isolated PostgreSQL, in addition to the existing Morning Prayer domain tests. Production endpoint health, module visibility, hosted RLS state, code deployment SHA, test counts and any restrictions must be recorded after the actual release.

For broader member activation: verify actual schedules/timezone, sources, host eligibility, permission owners, retention policy, physical phones, meeting access broker and first approved group. Do not activate the independent GroupMe automation or import the original Firebase data automatically.
