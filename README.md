# LV Zion Official

## Quick links

- **Actual app:** [lvz.app](https://lvz.app)
- **Status:** Actual app and confirmed-email signup are live. The requested organization has 4 age categories, 8 groups and 16 empty units. Hierarchy management and member placement are live and verified.
- **Member guide:** [Organization and member placement](docs/USER-MANUAL.md)
- **Study Room module:** [Current status](docs/study-rooms/README.md) and [cutover runbook](docs/study-rooms/CUTOVER-RUNBOOK.md)
- **Completed workflow:** [Organization completion](docs/ORGANIZATION-WORKFLOW.md)
- **All documentation:** [Guides, release evidence and historical records](docs/README.md)
- **Contacts owner instructions:** [How to use Contacts](docs/contacts/USER-GUIDE.md) · [Privacy and operational scope](docs/contacts/README.md)
- **Repository:** [Private GitHub repository](https://github.com/lovelaceaml-hub/lvzion-official)
- **Handoff:** [Current status](docs/HANDOFF.md)
- **Setup:** [Behavior, validation and rollback](docs/ACTUAL-APP-SETUP.md)

Independent phone-first Next.js application, using its own Supabase project. Original LV Zion apps and databases are outside scope. No new previews are published without Anthony's explicit request.

Confirmed email signup creates an Unassigned member profile. Age category, group and unit stay unset until an authorized leader verifies membership and assigns placement. Unassigned members can view only their own records. The designated first owner can configure the actual organization while still Unassigned. The four categories and empty Group 1/Group 2 and Unit 1/Unit 2 placeholders were created from Anthony's instructions. No real member roster was imported.

The actual routes include [signup](https://lvz.app/sign-up), [sign-in](https://lvz.app/sign-in), [members](https://lvz.app/members), [member management](https://lvz.app/members/manage), /request-access, /reset-password and /install. Fictional development routes redirect on production.

## Current module boundaries

Read-only hosted verification on October 14, 2026 at 23:26 UTC found four approved modules, each with one active grant. These setup grants do not grant access to every signup.

| Module | Available scope and remaining limits | Evidence |
|---|---|---|
| [Contacts](https://lvz.app/modules/contacts) | Private owner workspace; sharing, exports and messages disabled. Real owner save/reload acceptance remains outstanding. | [R5 release](docs/contacts/OWNER-EXPERIENCE-R5.md) |
| [Study Rooms](https://lvz.app/modules/study-rooms) | Manager setup; booking gate closed. Original scheduler remains booking authority until an approved cutover. | [R4 controls and cutover gates](docs/STUDY-ROOM-R4-LIVE.md) |
| [Continuous Display](https://lvz.app/modules/continuous-display) | Owner setup; one disabled screen, zero publications and zero active devices at verification. Physical TV pilot remains outstanding. | [R2 operations and release](docs/continuous-display/OPERATIONS-R2.md) |
| [Work Mission Morning Prayer](https://lvz.app/modules/work-mission-prayer) | Live scheduling, host management, source revisions and protected meeting broker. One owner grant, zero real occurrences/materials/links. Distribution remains off. | [Completion and release](docs/morning-prayer/COMPLETION-R5.md) |

The production snapshot and repository main are distinct: documentation pushes do not deploy code. See the [handoff](docs/HANDOFF.md) and [documentation audit](docs/DOCUMENTATION-AUDIT.md) for exact source, hosted migration reconciliation and open work.

## Development

Worship Duty integration is being completed in PR #25 for the actual [Worship Duty route](https://lvz.app/modules/worship-duty). Hosted activation remains pending. See [implementation and launch evidence](docs/worship-duty/LAUNCH.md).

Use Node 24 and the exact dependency lockfile.

```sh
npm ci --ignore-scripts
npm run build
npm run test:browser
```

Build checks types, application behavior and disposable PostgreSQL permissions. Browser tests run locally with fictional data. See AGENTS.md for isolated Auth/SMTP integration commands. Production requires explicit activation for the exact backend and https://lvz.app. Credentials belong in Keychain or provider stores, never Git. Automatic Git deployments are disabled; production release is deliberate.

Work Mission operations and completion evidence: [Morning Prayer R5](docs/morning-prayer/COMPLETION-R5.md). Actual-app release is verified at `caf5ba8`; real owner setup remains explicit.

Simpler Morning Prayer interface work: [R6](docs/morning-prayer/SIMPLER-R6.md), existing operational foundations and privacy controls retained.
