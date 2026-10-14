# LV Zion Official

**Real application:** [https://lvz.app](https://lvz.app) · [Sign up](https://lvz.app/sign-up) · [Sign in](https://lvz.app/sign-in)

**Documentation:** [Index](docs/INDEX.md) · [Verified production status](docs/CURRENT-STATUS.md) · [Member guide](docs/USER-MANUAL.md) · [Developer/operations handoff](docs/HANDOFF.md) · [Release gates](docs/RELEASE-GATES.md) · [Hosted migration ledger](docs/HOSTED-MIGRATION-LEDGER.json)

LV Zion Official is an independent, phone-first Next.js/Supabase/Vercel member application. The legacy LV Zion Firebase apps and their databases are references only and remain independent. The permanent canonical domain is `lvz.app`; do **not** register another domain or mistake an old fictional preview for production.

## Current member-system behavior

- Personal email or existing invited username plus password; confirmed personal email signup with **separate required first and last names** and a manual confirmation-email resend. The user-requested password minimum is **6 characters**.
- New signups begin **Unassigned** for age category, group and unit and can see only their own profile. Verified organizational administrators assign members only after independent identity/membership review. Existing history is retained.
- Four age categories, eight groups and sixteen units are configured on the real database. At the October 14 snapshot, there is **one verified owner/member and zero current placements**; this is a starting point, **not a broadly rolled-out roster**.
- Organizational leadership, department authority, technical administration and module access are independently permissioned. A module's database approval does not grant access to every member.
- Owner-only administration can operate while the designated verified owner remains Unassigned; this exception is **not** applied to new ordinary signups.

## Integrated modules and release boundaries

| Module | Real route | Current boundary |
| --- | --- | --- |
| Contacts | [My Contacts](https://lvz.app/modules/contacts) | Owner-only private pilot; sharing/exports/messages disabled |
| Study Room Reservation | [Study Rooms](https://lvz.app/modules/study-rooms) | Owner setup available; **new bookings are closed** pending reconciliation with original Firebase scheduler |
| Continuous Church Display | [Manage displays](https://lvz.app/modules/continuous-display) / [TV player](https://lvz.app/display) | Real owner text/animated content and R2 screen controls; no approved slides or paired TVs in initial snapshot |
| Work Mission Morning Prayer | [Morning Prayer](https://lvz.app/modules/work-mission-prayer) | Owner setup integrated; no verified actual dates/occurrences or automatic old-app sync |
| Worship Duty | [Launch-gated PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25) | **Not released**; original Firebase app unchanged |
| Groups & Gospel Planning | [Development PR #11](https://github.com/lovelaceaml-hub/lvzion-official/pull/11) | **Not released**; older branch is not a live substitute |

For current verified counts, operational restrictions and dependencies see [Current production status](docs/CURRENT-STATUS.md). Historical architecture, R1/R2 preview screenshots and old rollout notes are indexed in [docs/INDEX.md](docs/INDEX.md), not authoritative for today's release.

## Development and production release

Use Node **24** and the committed lockfile:

```sh
npm ci --ignore-scripts
npm run build
npm run test:browser
```

The build runs strict TypeScript, application tests and disposable PostgreSQL assertions. Browser tests use fictional data and a loopback-only server. The separately documented real local Auth/SMTP integration exercises only fictional addresses and temporary infrastructure. See [AGENTS.md](AGENTS.md) for safe execution and exact project boundaries.

**Git pushes do not automatically deploy**; `vercel.json` disables Git deployment and the user did not authorize arbitrary new Vercel previews. Test and deliberately deploy reviewed application commits to the existing production project. A documentation-only Git commit should **not** change the live website. Reconcile [hosted migration versions](docs/HOSTED-MIGRATION-LEDGER.json) before any schema change. Never commit secrets, actual member identities or real outreach data.
