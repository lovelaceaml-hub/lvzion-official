# LV Zion Official

A **fresh, independent LV Zion application**, designed from scratch. The former LV Zion project and other church apps remain operational and untouched; they are references only.

## Status
- **Live design prototype:** https://lvzion-official.vercel.app (Vercel deployment built from inline source)
- **Git-backed development preview:** https://lvzion-official-git-feature-mobile-foundation-v1-lvzion.vercel.app
- **Repository:** https://github.com/lovelaceaml-hub/lvzion-official (private)
- **Draft review:** https://github.com/lovelaceaml-hub/lvzion-official/pull/1
- **Vercel project:** `lvzion-official`, team `lvzion` (independent of previous project).
- **Supabase Pro organization:** Las Vegas Zion, ID `ypidsvtopuiqvbvvucbp`
- **Supabase project:** `lvzion-official`, ID `otecqlkqirncotytbfns`, US West (Northern California), healthy with no public application tables.
- **Supabase public configuration:** project URL and publishable key set in Vercel environment settings for development, preview, and production. No service-role key or database password stored in the repository.

Both previews use **fictional sample content only**. Neither is ready for members. There is no real login, membership data, imported schedule, or database interaction.

The development branch has a successful Vercel build and has not been merged to `main`. The release should await a reproducible dependency lockfile and reviews.

## Local development
Use Node.js 22+.

```bash
npm install
npm run dev
npm run build
```

A dependency lockfile, TypeScript migration, and automated checks are planned. The starting preview is JavaScript/JSX. Official runtime and data-layer code will use TypeScript.

## Product direction
- Phone-first hybrid personalized home with **My Week / Manage**, Today / Week / Calendar.
- Raised center Apps switcher, up to eight favorites, Notifications and app-specific management views.
- Organizational leadership and department management are **independent** roles.
- Ordinary member directory: own group names only, without other members' phone/email details.
- **No official app lineup has been confirmed.** The numbered spaces are deliberately generic.

Read [product decisions](docs/PRODUCT-DECISIONS.md) and [release gates](docs/RELEASE-GATES.md). Do not treat the demo position switcher as authorization.
