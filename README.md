# LV Zion Official

A self-contained, phone-first Next.js application at [lvz.app](https://lvz.app), using its own Supabase database, authentication, records and scheduling.

## Product boundary

Build only explicitly approved requirements for this application. Schedules and events start empty and are created deliberately within LV Zion Official. Design references do not supply data, recurring times or operational dependencies. Empty calendars are valid. Preserve existing accounts, permissions and intentionally entered records.

The authoritative development instructions are in [AGENTS.md](AGENTS.md). Compact module headers and a prominent center Apps launcher remain required. Production release is deliberate; automatic Git deployment and unrequested previews remain disabled.

## Current application

Confirmed-email signup creates an Unassigned member profile. Age category, group and unit stay unset until an authorized leader verifies membership and assigns placement. Unassigned members see only their own records. Organization, department and technical authority remain independent; a leadership title does not confer module access.

The organization workflow provides four owner-requested age categories, two groups per category and two units per group, with placement history and auditing. No roster was imported. See the [member guide](docs/USER-MANUAL.md) and [organization workflow](docs/ORGANIZATION-WORKFLOW.md).

| Module | Operational boundary |
|---|---|
| [Study Rooms](https://lvz.app/modules/study-rooms) | Booking enabled for the existing authorized audience. Weekly and special-date restrictions start empty. Inventory, reservation history, concurrency and privacy controls retained. [Current guide](docs/study-rooms/README.md). |
| [Contacts](https://lvz.app/modules/contacts) | A private workspace for each signed-in member once the October 24 migration is applied (owner-only before). Sharing, export and outbound messaging remain disabled. [Owner guide](docs/contacts/USER-GUIDE.md). |
| [Continuous Display](https://lvz.app/modules/continuous-display) | Authorized management, reviewed publication and explicitly paired devices. Physical TV acceptance remains separate. [Operations](docs/continuous-display/OPERATIONS-R2.md). |
| [Work Mission Prayer](https://lvz.app/modules/work-mission-prayer) | Explicit scheduling, host/material management and protected meeting access. No invented dates, meeting credentials or lesson content. Distribution remains separately controlled. [Guide](docs/morning-prayer/COMPLETION-R5.md). |
| [Healing Concert](https://lvz.app/modules/concert) | Live since 2026-11-12; no concert set up yet. RSVP with QR tickets by email, member invite links for guests without accounts, door scanning and the guest list. [Guide and release steps](docs/concert/README.md). |

Since Anthony's October 24, 2026 decision, every approved app is open to every signed-in member (including Unassigned members) for ordinary use; managing needs an explicit manager grant, and the owner manages every app. Members can be placed in a group without a unit, and leaders can lead groups or units outside their own placement. See the [handoff](docs/HANDOFF.md#access-and-placement-decisions--october-24-2026-applied). Migration `20261024170000_open_access_group_placement.sql` was applied to the hosted database on October 24, 2026.

## Documentation

- [Current handoff](docs/HANDOFF.md) and [documentation index](docs/README.md)
- [Fresh-start correction and verification](docs/FRESH-START-2026-10-16.md)
- [Release and security controls](docs/RELEASE-GATES.md)
- [Database migration ledger](docs/HOSTED-MIGRATION-LEDGER.json)
- [Design contract](docs/design/LVZ-DESIGN-CONTRACT.md)
- [Authentication and setup evidence](docs/ACTUAL-APP-SETUP.md)
- [Contacts confidentiality and verification](docs/contacts/README.md)

Current instructions take precedence over milestone-specific historical installation records. Documentation commits do not themselves redeploy application code; release records distinguish repository and deployed source.

## Development

Worship Duty ([route](https://lvz.app/modules/worship-duty)) stays switched off until its database steps are applied and Anthony approves the release. See [implementation and launch evidence](docs/worship-duty/LAUNCH.md).

Project connectors: `.mcp.json` gives every Claude Code session in this folder a Supabase connector locked to this app's database (`supabase-lvz`) and a Vercel connector locked to this project (`vercel-lvz`). Both sign in through the provider (no keys in the repository). `.claude/settings.json` lets agents read without asking and always asks before database changes, deployments or environment changes.

Use Node 24 and the exact dependency lockfile.

```sh
npm ci --ignore-scripts
npm run build
npm run test:browser
```

Build checks types, application behavior and disposable PostgreSQL permissions. Browser fixtures must never become production fallback data. Fictional development routes redirect in production. AGENTS.md contains isolated Auth/SMTP integration commands.

Use only the approved production project and https://lvz.app origin. Keep credentials in Keychain or provider stores, never Git. Preserve confirmed-email signup, signup abuse protection, strict server authorization, private records and auditing. Apply only pending tested schema changes; never blindly replay the hosted ledger.
