# Documentation index — LV Zion Official

**Start here for the real application:** [Current verified production snapshot](CURRENT-STATUS.md). Updated October 14, 2026. **Actual site:** [lvz.app](https://lvz.app).

This index distinguishes **current production guidance** from **historical development evidence**. A statement that a feature was "unapplied", "preview-only" or "not deployed" in a dated R1/R2 planning document is a statement about **that earlier branch at that time**, not necessarily the present production application. Likewise, a module may be **approved in Supabase** without permission for every member, real content, physical TV use or booking cutover.

## Current operational sources

| Document | Use |
| --- | --- |
| [CURRENT-STATUS.md](CURRENT-STATUS.md) | Dated live GitHub/Vercel/Supabase audit, member counts, module availability, remaining gates |
| [HOSTED-MIGRATION-LEDGER.json](HOSTED-MIGRATION-LEDGER.json) | Hosted name/version mapping to all migrations on production `main`; **never blindly replay** |
| [HANDOFF.md](HANDOFF.md) | Long-form history and implementation handoff; older deploy IDs are milestone evidence |
| [ACTUAL-APP-SETUP.md](ACTUAL-APP-SETUP.md) | Live platform signup/Auth foundation, real owner/bootstrap, delivery and rollback |
| [RELEASE-GATES.md](RELEASE-GATES.md) | Current release guardrails and per-module operational restrictions |
| [USER-MANUAL.md](USER-MANUAL.md) | Current member-facing signup, organization, placement and admin procedures |
| [ORGANIZATION-WORKFLOW.md](ORGANIZATION-WORKFLOW.md) | Implemented 4 / 8 / 16 hierarchy and audited assignment workflow |
| [DOMAIN-SETUP.md](DOMAIN-SETUP.md) | Domain history and current canonical application domain |
| [../AGENTS.md](../AGENTS.md) | Repository work rules, Node 24 verification and exact production/privacy boundaries |
| [../README.md](../README.md) | Product home and fast navigation |

## Individual module workstreams

| Module | Most applicable current document | Critical release distinction |
| --- | --- | --- |
| Study Room Reservation | [R4 production controls](STUDY-ROOM-R4-LIVE.md), [Live release](STUDY-ROOM-LIVE-RELEASE.md) | Management live, **new reservations closed** until Firebase cutover |
| Contacts | [Owner workspace R5](contacts/OWNER-EXPERIENCE-R5.md), [Owner pilot release](contacts/LIVE-OWNER-RELEASE.md) | **Owner-only** verified module; not shared outreach |
| Continuous Church Display | [R2 operations](continuous-display/OPERATIONS-R2.md), [R1 live release](continuous-display/LIVE-RELEASE.md), [R1 verification](continuous-display/LIVE-VERIFICATION.md) | Backend and UI integrated; no published church content or physically paired TV |
| Morning Prayer / Work Mission | [Actual live setup](morning-prayer/LIVE-SETUP.md) | Integrated module, **no verified current occurrences or automatic legacy sync** |
| Worship Duty | [PR #25 — launch gated](https://github.com/lovelaceaml-hub/lvzion-official/pull/25) | Not released to real app; must not modify old Firebase system |
| Groups / Gospel Planning | [PR #11 — development](https://github.com/lovelaceaml-hub/lvzion-official/pull/11) | Not promoted from older review branch |

## Historical design and test records (not current launch instructions)

The following files are intentionally retained as immutable-style *dated historical reference*; their old branch/preview/activation status is not the live state.

| Topic | Records |
| --- | --- |
| Member-system development | [AUTONOMOUS-FOUNDATION-R6.md](AUTONOMOUS-FOUNDATION-R6.md), [MEMBER-SYSTEM-IMPLEMENTATION.md](MEMBER-SYSTEM-IMPLEMENTATION.md), [MEMBER-SYSTEM-VERIFICATION.md](MEMBER-SYSTEM-VERIFICATION.md), [ONBOARDING-COMPLETION.md](ONBOARDING-COMPLETION.md) |
| Signup early design | [PLAN-SELF-SERVICE-SIGNUP.md](PLAN-SELF-SERVICE-SIGNUP.md), [UI-SIGNUP-VERIFICATION.md](UI-SIGNUP-VERIFICATION.md), [Original signup evidence](evidence/SELF-SERVICE-SIGNUP.json), [Signup run index](runs/self-service-signup/INDEX.md) |
| Mobile and app architecture | [PRODUCT-DECISIONS.md](PRODUCT-DECISIONS.md) (historical interview choices; still useful for design intent), [MOBILE-HOME-IMPLEMENTATION.md](MOBILE-HOME-IMPLEMENTATION.md), [APP-INTEGRATION-FRAMEWORK.md](APP-INTEGRATION-FRAMEWORK.md), [R6 evidence](evidence/R6-VERIFICATION.json) |
| Study Room prior phases | [First module](STUDY-ROOM-VERIFICATION.md), [R2](STUDY-ROOM-R2.md), [R3](STUDY-ROOM-R3.md), [R3 verification](STUDY-ROOM-R3-VERIFICATION.md), [R3 launch-readiness record](STUDY-ROOM-LAUNCH-READINESS.md) |
| Morning Prayer prior review | [R2 proposal](morning-prayer/README.md), [R2 verification](morning-prayer/VERIFICATION.md) |
| Organization development evidence | [Organization run index](runs/organization-workflow/INDEX.md), [Organization evidence](evidence/ORGANIZATION-LIVE.json) |
| SQL review and source designs | [Contacts owner-pilot candidate](contacts/owner-pilot-schema.sql), [Display R1 review](continuous-display/live-schema-review.sql), [Display R1 activation review](continuous-display/live-activation.sql), [Display R2 schema review](continuous-display/OPERATIONS-R2-SCHEMA-REVIEW.sql), [Morning Prayer SQL review](morning-prayer/schema-review.sql) |

Subdirectory run-lane notes in `docs/runs/**/lanes/` and visual evidence in `docs/design/` and `docs/screenshots/` retain their original provenance. Their presence is **not proof of a current production release**.

## Safe update process

1. Read this index and [CURRENT-STATUS.md](CURRENT-STATUS.md); inspect latest production branch/deployment, hosted migration list and per-module owner flags directly.
2. Prefer a new documentation-only branch from the latest `main` and a reviewed PR. Reconcile other branches without rewriting their historical work.
3. For migration metadata, add **only confirmed hosted version/name/source mappings**, explicitly noting when a byte-level equivalence review was **not** performed. Never run an unapplied SQL file merely to make the ledger match.
4. Mark historical documents clearly rather than rewriting former test results as if they were performed against the current version.
5. **Do not deploy application code for documentation-only changes.** Verify the merged commit and the new links on `main`; preserve the real domain and existing production alias.
