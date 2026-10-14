# Contacts — first live owner-only release

> **Owner-only scope remains current.** The original Contacts launch documented here has since gained the [R5 owner workspace](OWNER-EXPERIENCE-R5.md). Read-only audit on October 14, 2026 found **zero contact records** and one owner module grant. No sharing/export/outbound messages are enabled. Signed-in owner save-and-reload on the actual browser remains an acceptance check. [Current production snapshot](../CURRENT-STATUS.md).

**Status: production deployed, private owner pilot.** Date: October 14, 2026.

## Canonical entry point

`https://lvz.app/modules/contacts` is a module inside LV Zion Official, not a separate website. Members sign in with their existing verified LV Zion accounts. The shared Apps menu receives the Contacts card only through the current app-module permission projection.

## Deployment

- Vercel project: `lvzion-official`, team `lvzion`.
- Production deployment: `dpl_2qdE7XJTTJjvG2V6p8sXkQqTG6VZ`.
- Deployed commit: `7aec7b5c1a777828ddace44c498ac90e2c9a5995`.
- Deployment: **READY**, custom aliases include `lvz.app` and `www.lvz.app`.
- Explicit production flag: `LVZ_CONTACTS_OWNER_PILOT=true`. It is scoped to Production only; runtime additionally requires the existing verified production settings.
- Git-driven automatic deployments remain disabled. No extra development preview was published for this release.

## Database

- Supabase project: `otecqlkqirncotytbfns` (Las Vegas Zion).
- Applied migration: `20261014224708_contacts_private_owner_pilot_v1`.
- Repository file: `supabase/migrations/20261014224708_contacts_private_owner_pilot_v1.sql` (same SQL submitted to the migration endpoint).
- Six independent Contacts tables in `contacts_private`, all with enabled and forced RLS. No browser table grants. All five callable Contacts RPCs are explicitly granted only to authenticated role, not anonymous role, and must revalidate the current verified member and app grant.
- Exactly one owner-only Contacts `manager` module grant. The verified bootstrap owner may remain Unassigned to age category, group, and unit. No other member receives inherited Contacts access through group/department/technical status.
- At post-migration verification: **0 Contacts records; 0 unprotected Contacts tables; 0 anonymous Contacts function grants; 0 direct authenticated Contacts table reads**.
- Contact records are independent of `public.members`. No address-book import, contact auto-merge, account creation, member placement, export, SMS/email/Signal, or notifications.

## Available first-release operations

The authorized account can add and edit a private contact, specify a preferred communication method, record author-only interactions, schedule and complete one next action, reschedule/cancel with retained history, apply do-not-contact, close, archive, restore, and review record history. API mutations use expected record version, idempotency request UUID, transactional audit and restricted server-side projections.

This is intentionally **not** a shared outreach release: individual sharing, group/unit sharing, cross-group access, leader-level detailed or aggregate access, duplicate merge, exports, external delivery and live reminder pushes are not enabled. These require privacy decisions and independent approvals.

## Test and verification evidence

- Full release build: **241 application tests passed, 0 failed; 182 existing foundation PostgreSQL permission assertions passed**. Next.js compilation and TypeScript checks passed; release build completed.
- Dedicated owner-only disposable PGlite suite: **43 assertions**, covering account authorization, one owner grant, six private tables, direct access denial, contact creation, note/follow-up state, version checks, retries, do-not-contact, archive/restore, unrelated-account isolation and revoked grant behavior.
- `/api/contacts/workspace` anonymous GET -> HTTP **405** (the live API route is enabled but accepts POST only).
- `/modules/contacts` signed-out GET -> **307** redirect to `https://lvz.app/sign-in`.
- `/sign-in` public GET -> HTTP **200**.
- `/api/contacts/workspace` unsigned POST with trusted origin -> **401** and `private, no-store`; cross-origin POST -> **403** and `private, no-store`.
- Post-release database inspection confirmed one Contacts module/grant, 6 RLS/FORCE RLS tables, no public anonymous RPC privileges and zero Contacts rows.

**Boundary of verification:** The owner’s authenticated add/save/reload interaction with a browser session has not been personally exercised during this tool run because no owner session was available. Production route/session enforcement, isolated database operations, and public denial paths were verified. Physical iPhone/Android and full assistive technology usability are not claimed. Avoid entering real outreach contacts until the owner has confirmed the first private form save/reload in their own authenticated session.

## Safety and rollback

Immediate safe shutdown: change `LVZ_CONTACTS_OWNER_PILOT` to `false` for Production and redeploy. Hide the Apps entry by changing only the Contacts row in `app_private.app_modules` to draft and clearing `approved_at` (or end the current module grant); do not delete tables or audit records. Previous pre-Contacts production deployment `dpl_55PmPZx62xXWY8KTjCWvJV8iQn27` remained READY and can be restored through Vercel production rollback if necessary. Database schema is additive, separate from original systems, and should remain for audited recovery.

## Continuing beyond the pilot

Approve explicit sharing and oversight field categories and audience, consent/preferred communication, DNC reversal, retention/removal, steward handoff, cross-group rules, and small-cohort aggregate privacy. Then implement and independently test the wider permission model, authorized sharing UI, duplicate-review/merge controls (if ever needed), and generic My Week notification delivery. No automatic extension of the current owner-only permission model is authorized.
