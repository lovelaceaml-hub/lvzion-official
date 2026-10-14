# LV Zion Official — app integration framework (historical development review)

> **Historical platform design, not the current launch status.** The member application at [lvz.app](https://lvz.app) and the module registry were subsequently deployed. Study Room Reservation is now an approved owner-only module with R4 manager tools on the real site, but its independent booking gate remains **closed**. The current source of truth is [Study Room status](study-rooms/README.md), [R4 evidence](STUDY-ROOM-R4-LIVE.md) and [cutover runbook](study-rooms/CUTOVER-RUNBOOK.md). The dated review rules below describe the initial unlaunched phase.

This is an infrastructure milestone, **not selection, approval, launch, or publication of an official LV Zion application**. Previous LV Zion apps remain separate and read-only. No real member data, official activity feed, push campaign, app permission, mail delivery, or production rollout is implied.

## Review branch architecture

- A proposed Supabase CLI-generated migration defines an unexposed private module registry, explicit per-member access grants, private member-targeted activities, generic notification events, favorites with optimistic versioning, and opt-in request storage (push is not enabled).
- app_private tables have RLS enabled and deny direct browser reads/writes. Public read and write RPC wrappers are security invoker and only callable by authenticated roles. The reviewed private security-definer functions always derive the acting member from the verified, current authenticated session.
- Module registration is **draft by default** and invisible until an explicit approved status and approved_at timestamp are present. An approved module is also invisible to members lacking an active individual grant. Organizational, pastoral, department and technical appointments do not automatically grant any new app access.
- Activity visibility requires three conditions: the signed-in member is the recipient, the module is approved, and that member has active module access. Cancelled events are omitted. A bounded 90-day window returns only relevant activity details. Time labels are localized to Las Vegas.
- Notifications are **generic by schema design**; the database stores no arbitrary notice body or private email. A member can mark only their own currently authorized module notices as read.
- Favorites accept up to eight distinct authorized module IDs. The server uses a per-member advisory transaction lock and compare-and-swap version to reject stale device updates rather than overwrite them. Revoked app access removes modules, activities, notifications and favorites from the returned projection immediately.
- User-facing API routes live under /api/members/experience, with validated server-only membership checks. Module landing /modules/[key] independently authorizes the signed-in member before rendering a generic placeholder. Unauthorized or unpublished modules return not-found or sign-in.
- The authenticated Home loads module data only after successfully loading the scoped member workspace. If the new RPC is missing or unavailable, the experience fails closed to **no apps, activities, or module alerts**; fictional preview fixtures never enter the real member feed.

## What requires approval before any official app

1. Exact first official app, its accountable owner, allowed module users/managers, and department/group relationships.
2. Real per-module activity and notification contracts; no assumptions about worship duty, room reservations, attendance, or other previous applications.
3. Audited publishing and grant workflows with owner authorization and migration/rollback procedures. These privileged mutation paths are intentionally **not** added to the general member API.
4. Personalization and notification policies: title confidentiality, opt-in push content, retention, timezone and reminder behavior.
5. Independent application security review, database advisors, hosted migration ledger reconciliation, test accounts, backup/restore, real browser/device testing and an authorized limited pilot.

**Historical review warning (superseded):** This warning originally prohibited automatic promotion of the initial module-runtime proposal; at that time the hosted login/domain were inactive. They were subsequently activated through approved releases. The modern rule is still to apply only approved, pending, tested migrations and to avoid confusing an integrated module with authorization to activate its booking backend.

## Tests

- supabase/tests/module_runtime.sql: rollback-only fixtures for three synthetic modules, cross-group and leader denial, draft rejection, member-specific activities/notices, direct-table denial, favorite uniqueness/versioning, revocation and anonymous denial.
- tests/app-runtime.test.ts: strict contract parsing, URL/hex color validation, cross-app injection denial, per-member favorites, arbitrary field stripping and notice validation.
- tests/browser/app-runtime.spec.ts: anonymous route denial, POST validation, disallowed module route denial and fictional preview independence.
- Existing member-foundation/onboarding tests remain unchanged in behavior. npm run build runs typecheck and unit/database suites; npm run test:browser verifies phone interaction.

The real local GoTrue/PostgREST suite was previously exercised for onboarding; this module migration's security assertions run in disposable PostgreSQL/PGlite only. At the time of this earlier review, hosted module migrations and live module integration **had not** been executed. The module runtime and Study Room R1–R4 migrations were subsequently installed; current hosted IDs are in [the ledger](HOSTED-MIGRATION-LEDGER.json).
