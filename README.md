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
| [Contacts](https://lvz.app/modules/contacts) | Private owner workspace. Sharing, export and outbound messaging remain disabled. [Owner guide](docs/contacts/USER-GUIDE.md). |
| [Continuous Display](https://lvz.app/modules/continuous-display) | Authorized management, reviewed publication and explicitly paired devices. Physical TV acceptance remains separate. [Operations](docs/continuous-display/OPERATIONS-R2.md). |
| [Work Mission Prayer](https://lvz.app/modules/work-mission-prayer) | Explicit scheduling, host/material management and protected meeting access. No invented dates, meeting credentials or lesson content. Distribution remains separately controlled. [Guide](docs/morning-prayer/COMPLETION-R5.md). |

Module access is explicitly granted and is not automatically provided to every signup. This correction does not broaden any audience.

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

Worship Duty integration is being completed in PR #25 for the actual [Worship Duty route](https://lvz.app/modules/worship-duty). Hosted activation remains pending. See [implementation and launch evidence](docs/worship-duty/LAUNCH.md).

Use Node 24 and the exact dependency lockfile.

```sh
npm ci --ignore-scripts
npm run build
npm run test:browser
```

Build checks types, application behavior and disposable PostgreSQL permissions. Browser fixtures must never become production fallback data. Fictional development routes redirect in production. AGENTS.md contains isolated Auth/SMTP integration commands.

Use only the approved production project and https://lvz.app origin. Keep credentials in Keychain or provider stores, never Git. Preserve confirmed-email signup, signup abuse protection, strict server authorization, private records and auditing. Apply only pending tested schema changes; never blindly replay the hosted ledger.
