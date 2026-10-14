# LV Zion Official

A **new, independent LV Zion application**. The former LV Zion project and the existing church apps remain untouched and serve only as references.

## Current milestone

The [phone-first interactive UI preview](https://lvzion-official.vercel.app) is deployed on the new [Vercel project](https://vercel.com/lvzion/lvzion-official). It has *no* real accounts, member data, schedules, or backend integration. Every sample app, member role and activity is fictional. The production domain currently shows this design prototype, **not** a church-ready product.

Source on `feature/mobile-foundation-v1` matches the successfully built Vercel preview. Integration with Vercel Git is pending; the previous deployment was supplied through Vercel's deployment API.

## Run locally

```bash
npm install
npm run dev
```

Use Node.js 22+; `npm run build` builds production output. A lockfile and automated tests must be added before promoting the branch as the deployment source.

## Proposed stack

- Next.js 16, React 19, TypeScript planned for production. This initial UI preview is JavaScript/JSX.
- Vercel project `lvzion-official` in team `lvzion`.
- Supabase Pro organization **Las Vegas Zion** (distinct from the existing personal Free organization); new project provisioning remains pending cost confirmation.
- Supabase Auth, Postgres with RLS, Realtime and Storage for the real application.

## Product principles

- Phone first, adaptive layouts later. The UI draws on the Study Room Reservation app's rounded, spacious appearance.
- My Week and contextual Manage; Today / Week / Calendar; central Apps sheet; up to 8 synchronized favorites; notifications with Needs Action first; separate app-specific bottom navigation and authorized Manage.
- Member, Unit leader, Group leader, Pastoral Staff, Admin; independent department management permissions.
- The official app lineup has **not been selected**. All app slots in the preview are placeholders.

Read [the mobile product brief](docs/PRODUCT-DECISIONS.md) and [release gates](docs/RELEASE-GATES.md) before adding functionality.
