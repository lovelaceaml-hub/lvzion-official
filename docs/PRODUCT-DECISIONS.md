# LV Zion Mobile Product Decisions

Recorded 2026-10-13 from the design interview. This is a new application, *not* a migration of the old app architecture. The previous six app concepts and demo slots are not an approved official app lineup.

## Mobile experience
- Personalized hybrid home with **My Week** and **Manage** tabs; default is My Week.
- Today, Week and Calendar inside My Week; prominently show next activity, then smaller upcoming items. Tapping an activity opens a bottom sheet with context and quick actions.
- Main bottom navigation: Home, raised center Apps button, Notifications. Profile from header.
- Apps button opens a nearly full-height sheet. Members see only authorized apps, with up to eight user-chosen compact icon favorites; pin and reorder by Edit or long-press, synced between home and Apps sheet.
- Enter each app at its own landing screen; apps have contextual bottom navigation, central Apps switcher and role-restricted Manage tab. Top-left LV Zion button returns home.
- Main Manage is a needs-attention overview with grouped responsibilities. Specific department tools belong inside each app, not on the main dashboard.
- Notification center groups Needs Action above Recent. Per-app optional push settings. The user requested detailed previews; sensitive content still requires explicit review before enabling pushes.
- A short skippable initial setup; English launch with localization-ready architecture; no universal search; approved nonsensitive offline views may be read-only.
- Overall visual system: elegant/spacious/rounded, restrained motion, distinct app accent colors.

## People, governance and data
- Membership records distinct from sign-in accounts; leaders invite members; people may request account access. Member group directory is group-limited and names-only; ordinary members do not see others' phones/emails.
- Member profiles show organizational position, group/unit, department memberships and authorized management access. Members may edit personal contact/preferences; official data changes require authorized action.
- Member, Unit leader, Group leader, Pastoral Staff, App administrator are organizational positions; department membership and app-level management rights are independently assigned. Department leaders can assign members within authorized departments; broader oversight is explicitly granted.
- Cross-group move requires request and receiving acceptance; authorized staff/admin can transfer directly. Group-related access ends on departure, unrelated department rights continue until changed.
- Inactive member accounts are suspended while historical records remain. Leadership assignments last until manually ended by authorized personnel; maintain appointment audit history, no automatic expiry.
- Administrative activity log includes actor, time and consequential-change rationale.
- Confidential details are protected server-side with role/department authorization, not merely hidden in UI.

## Implementation guardrails
- Initial target 150 active people from a 400-member congregation; design to scale to all 400.
- Use efficient queries, incremental changes and realtime subscriptions where warranted; do not full-poll every few seconds.
- Supabase PostgreSQL/RLS/Auth/Realtimes/Storage, Vercel Next.js, private GitHub repository.
- No real personal data in prototype or repository; no permanent deletion, migration, purchase, or bulk invitation without explicit authorization.
