# Before Any Real Member Launch

## Present status
- Working mobile-only synthetic visual preview is deployed independently on Vercel.
- Production login, database project, notification sending, live directory, admin access and app integrations are **not implemented**.
- This feature branch is awaiting code review and Git-link setup; do not represent the preview as a production church service.

## Gates
1. Verify paid Las Vegas Zion Supabase organization and create the independently billed project only after provider cost confirmation; use US West region.
2. Connect the new private GitHub repo to the new Vercel project; review PR on a protected, nonproduction preview before changing default production source.
3. Establish TypeScript, reproducible lockfile, lint/typecheck, unit and integration tests, a mobile browser acceptance test and CI on changed code only. Avoid excessive GitHub Actions minutes.
4. Define and test member/account provisioning, verified Auth flows, session recovery and role/department permissions. Enforce RLS plus server-side authorization with adversarial role tests.
5. Implement member directory restrictions (own group, names only), contact-data privacy, audited changes, and explicit appointment terminations.
6. Back up the new database independently with encryption and restore verification; record retention and recovery objectives before real use.
7. Confirm official app list/features and data ownership before implementing or importing an existing application's data.
8. Review detailed push preview privacy; verify offline data cache excludes sensitive records; accessibility, reduced-motion, iOS PWA and device testing.
9. Pilot with synthetic data first, then a small opted-in member cohort, with written go/no-go before general invitation.

## Do not touch
Do not change the existing LV Zion app, its database, any old member data, or independent church apps under this new project.
