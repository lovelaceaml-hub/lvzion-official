# Worship Duty — reference audit and implementation boundaries

> **Historical source audit, not a live-release report.** The original reference commit and legacy duty rules below remain valid audit inputs. The CURRENT real integration is [draft PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25) against the live `lvz.app` codebase; read [Worship Duty status](README.md), [implementation status](IMPLEMENTATION-STATUS.md), and [Work handoff](WORK-HANDOFF.md) before using this audit. The former prototype-only routes described below are **not** committed production routes in PR #25.

Audit date: October 14, 2026. This is an independent application inside LV Zion Official, not a replacement deployment of the original app.

## Sources and reproducibility

Reference repository: `lovelaceaml-hub/worship-duty-app`, pinned to `b2d2f9c52a2d20c7cef833a18b1a0f46c837b911`.

Inspected source files: `README.md`, `app/config/duties.js`, `app/lib/conflicts.js`, `app/lib/worship.js`, `permissions.js` (configuration and pairing implementation), and `app/presider/access.js`. The public shell at `https://lv-zion-duties.web.app` was read without authentication or writes. Repository source is not proof of the exact deployed build. Runtime settings, real schedules, member records, Google Sheets and the original database were not queried or imported.

**Historical audit foundation:** draft PR #2, `feature/member-system-secure-r1`, commit `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`. That describes the **old** PR #5 audit, **not** the current live integration. PR #25 has cherry-picked Worship-only R1/R2 files on the actual production `main` and is being reconciled with concurrent module work; no member foundation or original Firebase repository is replaced.

## Actual core experiences

**My Duties.** Personalized assigned duties, upcoming service schedule, change requests and withdrawal, availability, reminders/notifications and calendar subscription. Asking for a change does not release the duty. A leader must answer; the UI explains that the member remains assigned.

**Presider.** Exact-service preparation songs, Glory, conditional Thanks and Choir, prayer/service coordination, save/confirmation, song-library/history/statistics workflows, and copying a plan for sharing. The assigned presider may edit that service's song list; song editors have separately granted authority. A list already counted as sung is history and not editable through the ordinary planner. An empty Choir value belongs to the selected service; a preceding service's selection must not leak into it.

**Manage.** Department-scoped scheduling and rosters, qualifications, availability flags, change requests, service details, conflict checks, month planning and historical Fill strategies. Administrative experiences additionally include service creation/deletion/year generation, default Opening Prayer assignee, exceptional conflicts, role management, name repair, data checks, Sheet integration and feature configuration. These administrative capabilities do not become technical-administrator powers in the new system.

## Exact catalog

Eight departments, 27 slots: Worship (Presider, Opening Prayer, Thanks Prayer, Closing Prayer); Usher Sisters (Door, Front, Back); Usher Brothers (#1, #2, Lobby Security); Lobby (Desk #1–2); Translation (#1–2); Media (Booth #1–2); Parking Lot (#1–5); Offering (#1–6).

Legacy storage calls Opening Prayer `Sermon`, and Thanks Prayer `Prayer of Thanks`. The independent model uses stable snake-case keys rather than name strings as identities. No named legacy default, leader identity, phone number, PIN, credential or real roster is copied.

## Scheduling invariants

1. Normally one duty per person per SERVICE, not one per day.
2. Exactly two are allowed for Thanks Prayer OR Closing Prayer plus one of Usher Door, Front, Back, #1 or #2.
3. Lobby Security is NOT an usher for this exception. Opening Prayer is NEVER paired; the person delivering the sermon holds no other duty.
4. More than two duties is invalid even if each pair was separately approved. Replacing a slot excludes the old value of that same slot when checking conflicts.
5. Legacy leaders can configure auditable 'always OK' pairs (neither Opening Prayer). These live values were not read. The new preview starts with ONLY the built-in prayer/usher rule. A review schema may support explicit approved pairs but must not silently invent/import approvals.
6. A one-service conflict acknowledgement is different from an always-OK pair. Acknowledgements expire when the exact combination changes. Neither concept grants ordinary members override power.
7. Active department membership, duty qualification, availability and conflict checks all matter. Unset weekly availability counts as available. A day off blocks that local date; an explicit per-service exception is narrower. Evening availability covers Saturday, Tuesday and feast evenings.
8. Manual-only is a department preference. These members may be assigned manually but are excluded from automatic proposals. The reference's default Opening Prayer assignee is configured, not a general pool to rotate automatically.
9. Started/cancelled services and historical song plans are protected from normal edits. Candidate selection never silently moves a saved assignment. Stale requests cannot reassign a different person's duty.
10. Explicit service times are authoritative. Fallback source times are Early Morning 05:00, Morning 10:00, Afternoon 14:30, Evening 19:30. Use America/Los_Angeles, including daylight saving; do not calculate using the viewer's timezone.

## Service applicability

Every service has a Glory song. Sabbath Day and Third Day have Choir and Closing Prayer. Thanks/Thanks Prayer occurs at Morning on Sabbath Day or a feast, not Third Day, Prayer Week or Preaching Week. Other nonempty worship labels are treated as feast labels by the source helper. Whitespace/case are normalized. Missing worship type defaults to Sabbath Day for duty applicability. Regular services are three each Saturday and Tuesday evening; special/feast services are explicit.

## Fill and integrations: do not falsely claim parity

The original's Usual, Auto, Rotation and Random have historical workload/recency rules, manual-only exclusions, default assignees, prayer-first usher pairing, draft batch review and limited proposal rearrangement. **Historical fictional R3 only:** that prototype offered bounded, reviewed suggestions using prayer pairing, fixture-month workload and stable name ordering. This is **not** persisted in PR #25 or operational on `lvz.app`. Neither PR implements the four historical Fill methods, verified saved batch repair, year generation or import-time acknowledgement UI. These require isolated parity fixtures and a separate review, not fabricated historical data.

The original uses Firebase name/PIN authentication and a Google Sheet master with read/write synchronization, name mapping and cell-level conflict handling. The README has inconsistent timed-import descriptions (10 minutes vs a later older two-hour bullet); no runtime cadence was verified. No such connector, credential, synchronization, import, PIN authentication or migration of real identities is included here. LV Zion Official's existing username/email + password session design remains authoritative.

## Preserve, improve, redesign, defer

**Preserve now:** core three sections; exact catalog/applicability and built-in pairing; own duties and requests; scoped manual assignments; manual-only awareness; per-service song lists; explicit availability conflicts; no silent reassignment; history protection.

**Improve now:** phone-first next-duty focus; two layout prototypes; clear empty/denied/stale states; explicit save/approve outcomes; visible paired-duty explanation; role-switchable FICTIONAL review without authentication spoofing; no persistent browser storage or outbound messages; private-by-default name projection.

**Redesign:** reuse foundation identity and primary hierarchy, UUID foreign keys and append-only history, independent department and song-editor authorization, private SQL command boundaries, versioned changes, deny-by-default module activation. Unit/group, pastoral and technical appointments are not implicit duty-management grants.

**Defer behind explicit verification:** source historical Fill parity; broad service lifecycle editor and year generation; durable weekly availability UI and leader keep-available overrides; song-library administration/history analytics and actual catalog import; push/email/calendar delivery; configurable-pair/override administration; accountable owner assignment; hosted end-to-end Auth/database activation; backups/restore; physical iPhone/Android acceptance. These are not claimed complete by the fictional preview.

## Prototype review — archived R1/R3 work, not included in the real integration branch

`/worship-duty-preview`: Focus cards, led by the next service.

`/worship-duty-preview?layout=agenda`: Compact agenda, less visual emphasis and denser upcoming rows.

View options switches between fictional member, assigned presider, Worship leader with a separate song-editor grant, Usher leader, and technical-administrator-only views. It is a design/testing control, never an authentication mechanism. Both variants retain neutral sage/cream styling, readable touch controls, and My Duties / Presider / Manage only where authorized. Reload resets every fictional edit.

**Current integration (PR #25):** `/modules/worship-duty` and `/api/worship-duty` are implemented behind the actual member session and explicit server-side module flag; they remain unmerged and not activated. The historical `/worship-duty-preview` routes are not part of this branch. No production toggle or role selector is exposed in the browser. See [production release checklist](PRODUCTION-RELEASE-CHECKLIST.md).
