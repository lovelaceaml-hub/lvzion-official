# LV Zion Official — Phone-first Home and My Week

Development-only implementation. Matches the recorded mobile decisions in docs/PRODUCT-DECISIONS.md and does **not** approve any individual application module.

## Routes and behavior

- /experience-preview — standalone fictional Home prototype with role switcher; no hosted data.
- /member-preview — existing fictional member management, plus a link to the new Home.
- /members — real authenticated entry point. The server-authorized member projection is loaded, but scheduled activities and official modules are **empty** until approved integrations exist; never inject demo fixtures.
- /members/manage — existing authenticated scoped member and department tools. Supports profile, people, and manage deep links. Navigation cannot grant permissions.

Home starts in **My Week / Today**, with Week and Calendar alternatives, six-row Monday-start calendar, day selection, previous/next week/month, and an activity details sheet. **Up Next** uses only activities from the provided authorized feed. Four sample activities, relative to Las Vegas local time, appear only in the fictional prototype.

Main navigation is Home / raised central Apps / Notifications. Main Manage is a role-scoped overview linking to authorized member tools. Notifications show action-needed items from already authorized transfer and account-request projections using generic text, never member email or contact information. Push notifications and a Recent history feed are not enabled until approved.

The nearly full-height Apps switcher uses four explicitly fictional concept tiles (Example Module A–D), working pin/unpin, ordering and a cap of eight favorites. Favorite selections synchronize between Home and Apps sheet **in that preview session only**, not across accounts or devices. Concept landing screens have no app functions. Real member screens correctly show **no official apps published**.

## Data and security boundaries

lib/member-experience.ts defines the future typed module/activity projections and calendar/favorites helpers. Real activities and module catalogs must be scoped **server-side** to authenticated memberships and independently assigned departmental or organizational rights; client filtering alone is never authorization. The confirmed official app lineup and app owners remain unselected. No original applications are automatically imported.

Do not seed fictitious activities into hosted databases; do not create cross-device favorite storage, unreviewed offline caches, app permissions, or notifications before related modules are approved. Permission-scoped incremental realtime is preferable to frequent full polling when module integrations are later selected.

## Verification

tests/member-experience.test.ts checks Las Vegas dates and daylight-saving boundaries; Monday weeks and calendar day validity; fictional-only activity provenance; favorites cap, order and authorized catalog filtering; and privacy-safe notifications.
tests/browser/experience.spec.ts exercises Today / Week / Calendar, 42 calendar cells, event details, pin/reorder and app-concept landing, scoped notifications, disabled real login and legacy member-profile deep linking in the phone viewport. Existing member/onboarding tests remain.

Commands: npm ci --ignore-scripts, npm run check, npm run build, npm run test:browser.
No production website, real member record, existing app, email account, domain registration or production authorization was changed for this milestone.

## Deferred approvals

Official individual app lineup, owner-permissions/activity adapters, per-member favorites sync, notification preferences and push, genuine hosted login activation, exact hierarchy labels, physical iPhone/Android QA and an authorized pilot. lvz.app remains paused.
