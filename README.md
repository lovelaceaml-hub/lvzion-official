# LV Zion Official

## Quick links

- **Actual app:** [lvz.app](https://lvz.app)
- **Status:** Actual app is live. Signup remains closed while the restricted Resend credential connection is pending.
- **Repository:** [Private GitHub repository](https://github.com/lovelaceaml-hub/lvzion-official)
- **Handoff:** [Current status](docs/HANDOFF.md)
- **Setup:** [Behavior, validation and rollback](docs/ACTUAL-APP-SETUP.md)

Independent phone-first Next.js application, using its own Supabase project. Original LV Zion apps and databases are outside scope. No new previews are published without Anthony's explicit request.

Confirmed email signup creates an Unassigned member profile. Age category, group and unit stay unset until an authorized leader verifies membership and assigns placement. Unassigned members can view only their own records. The designated first owner can configure the actual organization while still Unassigned. No fictitious hierarchy or imported real records are seeded.

The actual routes are /sign-in, /sign-up, /members, /members/manage, /request-access, /reset-password and /install. Fictional development routes redirect on production. No official module has been released in this main-app increment.

## Development

Use Node 24 and the exact dependency lockfile.

```sh
npm ci --ignore-scripts
npm run build
npm run test:browser
```

Build checks types, application behavior and disposable PostgreSQL permissions. Browser tests run locally with fictional data. See AGENTS.md for isolated Auth/SMTP integration commands. Production requires explicit activation for the exact backend and https://lvz.app. Credentials belong in Keychain or provider stores, never Git. Automatic Git deployments are disabled; production release is deliberate.
