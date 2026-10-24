# Worship Duty: duty rules reference

> **Rules reference, not a live-release report.** The catalog and scheduling rules below are the approved requirements for this module. The current integration is [draft PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25) against the live `lvz.app` codebase; read [Worship Duty status](README.md), [implementation status](IMPLEMENTATION-STATUS.md) and [Work handoff](WORK-HANDOFF.md) before using this page.

Written October 14, 2026; revised October 16, 2026 for the fresh-start boundary. Nothing here is imported data. Services, people, qualifications, preferences and song lists start empty and are configured in this app.

## Core experiences

**My Duties.** Personalized assigned duties, upcoming service schedule, change requests and withdrawal, and availability. Asking for a change does not release the duty. A leader must answer; the UI explains that the member remains assigned.

**Presider.** Exact-service preparation songs, Glory, conditional Thanks and Choir, prayer/service coordination, and save/confirmation. The assigned presider may edit that service's song list; song editors have separately granted authority. A list already counted as sung is history and not editable through the ordinary planner. An empty Choir value belongs to the selected service; a preceding service's selection must not leak into it.

**Manage.** Department-scoped scheduling and rosters, qualifications, availability flags, change requests, service details, conflict checks and month planning. Administrative capabilities do not become technical-administrator powers.

## Catalog

Eight departments, 27 slots: Worship (Presider, Opening Prayer, Thanks Prayer, Closing Prayer); Usher Sisters (Door, Front, Back); Usher Brothers (#1, #2, Lobby Security); Lobby (Desk #1 and #2); Translation (#1 and #2); Media (Booth #1 and #2); Parking Lot (#1 to #5); Offering (#1 to #6).

The model uses stable snake-case keys rather than name strings as identities. No named default person, leader identity, phone number, PIN, credential or roster is seeded.

## Scheduling invariants

1. Normally one duty per person per SERVICE, not one per day.
2. Exactly two are allowed for Thanks Prayer OR Closing Prayer plus one of Usher Door, Front, Back, #1 or #2.
3. Lobby Security is NOT an usher for this exception. Opening Prayer is NEVER paired; the person delivering the sermon holds no other duty.
4. More than two duties is invalid even if each pair was separately approved. Replacing a slot excludes the old value of that same slot when checking conflicts.
5. The module starts with ONLY the built-in prayer/usher rule. The schema may support explicitly approved, reasoned extra pairs (never Opening Prayer), but none are seeded or inferred.
6. A one-service conflict acknowledgement is different from an always-OK pair. Acknowledgements expire when the exact combination changes. Neither concept grants ordinary members override power.
7. Active department membership, duty qualification, availability and conflict checks all matter. Unset weekly availability counts as available. A day off blocks that local date; an explicit per-service exception is narrower. Evening availability covers Saturday, Tuesday and feast evenings.
8. Manual-only is a department preference. These members may be assigned manually but are excluded from automatic proposals.
9. Started/cancelled services and historical song plans are protected from normal edits. Candidate selection never silently moves a saved assignment. Stale requests cannot reassign a different person's duty.
10. Each service's explicit start time is authoritative. Use America/Los_Angeles, including daylight saving; do not calculate using the viewer's timezone.

## Service applicability

Every service has a Glory song. Sabbath Day and Third Day have Choir and Closing Prayer. Thanks Prayer occurs at Morning on Sabbath Day or a feast, not Third Day, Prayer Week or Preaching Week. Other nonempty worship labels are treated as feast labels. Whitespace and case are normalized. Missing worship type defaults to Sabbath Day for duty applicability. Which services exist is decided only by services created in this app; none are generated automatically.

## Automatic fill: not implemented

Automatic fill strategies (workload, recency, rotation or random proposals) are not part of this module. **Historical fictional R3 only:** a prototype offered bounded, reviewed suggestions using prayer pairing, fixture-month workload and stable name ordering. This is **not** persisted in PR #25 or operational on `lvz.app`. Any future automatic fill, saved batch repair, year generation or acknowledgement UI needs its own approved requirements, isolated fixtures and review.

There is no external connector, synchronization, import or PIN authentication. LV Zion Official's existing username/email and password session design is the only sign-in.

## Preserve, improve, redesign, defer

**Preserve now:** core three sections; exact catalog/applicability and built-in pairing; own duties and requests; scoped manual assignments; manual-only awareness; per-service song lists; explicit availability conflicts; no silent reassignment; history protection.

**Improve now:** phone-first next-duty focus; clear empty/denied/stale states; explicit save/approve outcomes; visible paired-duty explanation; no persistent browser storage or outbound messages; private-by-default name projection.

**Redesign:** reuse foundation identity and primary hierarchy, UUID foreign keys and append-only history, independent department and song-editor authorization, private SQL command boundaries, versioned changes, deny-by-default module activation. Unit/group, pastoral and technical appointments are not implicit duty-management grants.

**Defer behind explicit verification:** automatic fill; broad service lifecycle editor and year generation; durable weekly availability UI and leader keep-available overrides; song-library administration and history analytics; push/email/calendar delivery; configurable-pair/override administration; accountable owner assignment; hosted end-to-end Auth/database activation; backups/restore; physical iPhone/Android acceptance.

## Prototype review: archived R1/R3 work, not included in the real integration branch

The historical `/worship-duty-preview` routes (Focus cards and a compact agenda layout, with a fictional role switcher) existed only in PR #5. They were a design/testing control, never an authentication mechanism, and reset on reload.

**Current integration (PR #48, which contains PR #25):** `/modules/worship-duty` and `/api/worship-duty` are implemented behind the actual member session and explicit server-side module flag; they remain unmerged and not activated. No production toggle or role selector is exposed in the browser. See [production release checklist](PRODUCTION-RELEASE-CHECKLIST.md).
