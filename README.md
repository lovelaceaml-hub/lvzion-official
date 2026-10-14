# LV Zion Official

## Quick links

- **Actual app:** [lvz.app](https://lvz.app)
- **Documentation index:** [Current guides, module releases and runbooks](docs/INDEX.md)
- **Contacts (authorized owner):** [Open module](https://lvz.app/modules/contacts) · [User guide](docs/contacts/USER-GUIDE.md) · [Current status](docs/contacts/README.md)
- **Status:** Actual app and confirmed-email signup are live. The requested organization has 4 age categories, 8 groups and 16 empty units. Hierarchy management and member placement are live and verified.
- **Member guide:** [Organization and member placement](docs/USER-MANUAL.md)
- **Current workflow:** [Organization completion](docs/ORGANIZATION-WORKFLOW.md)
- **Repository:** [Private GitHub repository](https://github.com/lovelaceaml-hub/lvzion-official)
- **Handoff:** [Current status](docs/HANDOFF.md)
- **Setup:** [Behavior, validation and rollback](docs/ACTUAL-APP-SETUP.md)

Independent phone-first Next.js application, using its own Supabase project. Original LV Zion apps and databases are outside scope. No new previews are published without Anthony's explicit request.

Confirmed email signup creates an Unassigned member profile. Age category, group and unit stay unset until an authorized leader verifies membership and assigns placement. Unassigned members can view only their own records. The designated first owner can configure the actual organization while still Unassigned. No fictitious hierarchy or imported real records are seeded.

The actual routes are [signup](https://lvz.app/sign-up), /sign-in, /sign-up, /members, /members/manage, /request-access, /reset-password and /install. Fictional development routes redirect on production. The first private Contacts module is live for the verified owner at [lvz.app/modules/contacts](https://lvz.app/modules/contacts). Contact sharing, leader access, exports, and messaging remain disabled; see [Contacts release evidence](docs/contacts/LIVE-OWNER-RELEASE.md).

## Development

Use Node 24 and the exact dependency lockfile.

```sh
npm ci --ignore-scripts
npm run build
npm run test:browser
```

Build checks types, application behavior and disposable PostgreSQL permissions. Browser tests run locally with fictional data. See AGENTS.md for isolated Auth/SMTP integration commands. Production requires explicit activation for the exact backend and https://lvz.app. Credentials belong in Keychain or provider stores, never Git. Automatic Git deployments are disabled; production release is deliberate.
