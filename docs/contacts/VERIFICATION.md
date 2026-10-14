# Contacts R1 — verification evidence

Verified October 14, 2026. **Draft development only. Not approval for live contact processing.**

## Verified application revision

Application source: `7cea2ba73710558b5a05343d73d4989ceec23fac` on `feature/contacts-r1`, stacked on foundation PR #2. Draft Contacts PR #6. Subsequent addition of this report and the manual browser verifier does not change the verified application code.

Vercel deployment `dpl_2RRfKxExbuJ5WufwGipwvQKjpJEq` is a READY preview:

`https://lvzion-official-ekcs558a3-lvzion.vercel.app/contacts-preview`

Individual prototype routes are the same URL with no query (ordinary member), `?view=shared`, `?view=detail`, or `?view=leader`. View options switches between fictional member, collaborator, aggregate overseer, handoff steward and technical administrator. All preview data resets on reload. No app registration or real member grants were created.

## Automated results

- Git-backed Vercel build passed TypeScript, all 141 Node tests, all 111 existing foundation PostgreSQL permission assertions, and the Next.js optimized build. Tests use disposable PGlite, not hosted data.
- The 141 tests include 30 new Contacts policy-simulation tests plus a new Contacts disposable-database suite. That suite verifies the 12-table draft, RLS/FORCE RLS and denied client grants, structural constraints, append-only history, independent contact identity, shared phone numbers and compare-and-swap versions.
- The deployed application passed **19/19 manual-run Playwright browser checks** against the exact preview above, using Chromium at a 390×844 baseline. There were zero uncaught page errors and zero Contacts API requests made by the fictional UI.
- Browser checks exercised 320, 390, 430, 768 and 1280-pixel widths across the four prototype routes without horizontal overflow.
- Explicit server probes tested three Contacts API paths with GET, POST, PATCH, PUT, DELETE, OPTIONS and HEAD: all 21 responses were generic 403 with no-store. Unsigned live-module access did not serve Contacts data.

## Browser scenarios

Ordinary member navigation and center Apps; shared-contact responsibility and hidden phone; contact detail and retained completion history; fixed sample creation; individual sharing plus interaction and assigned follow-up; collaborator completion; revocation; owner handoff with revoked old access and no transferred author-only note; blocked cross-group sharing; accessible-only duplicate review without merge; DNC and archival; aggregate leader view without private identities; separate steward handoff without identity access; technical administrator denial; dialog Escape and focus restoration; responsive widths; no offline sample persistence or backend mutations; API release lock; unsigned live-module boundary.

## Issues found and corrected

The first build failed because two disposable-database result rows lacked explicit TypeScript types. The next build passed. Browser testing found missing focus restoration after closing a native dialog; the final application revision restores the trigger (or a safe fallback) and gives panels an accessible name. The 19-check browser rerun passed after that fix. Two test selectors were corrected to distinguish wrapped select labels and the framework route-announcement region from application errors; no policy was relaxed to make tests pass.

## Reproduce

Run `npm run check` for foundation and Contacts unit/database checks. On the exact inspected preview deployment, run:

```sh
CONTACTS_PREVIEW_URL='https://<verified-preview>.vercel.app/contacts-preview' node scripts/verify-contacts-preview.mjs
```

An authorized temporary Vercel access URL can be passed in `CONTACTS_ACCESS_URL` where deployment protection is enabled. Never commit that URL or cookies. The script produces a JSON report and four separate PNG screenshots under `test-results/contacts/`. It does not enable GitHub Actions, send communications or mutate hosted Contacts data.

## Limits / release gates

These results prove the tested fictional simulation, current server denial and disposable structural database checks. They do **not** prove an approved allowed-access RLS policy, authenticated hosted PostgREST behavior, a two-connection database race, production-scale performance, physical iOS/Android usability or a complete screen-reader/accessibility audit. The queued PGlite version test is not a hosted concurrent-session test.

Live RPC implementations, transaction/audit atomicity, same-lock revocation/handoff races, integration projection invalidation, privacy decisions, small-cohort aggregate protections, retention/deletion, independent security review, backup/restore and explicit pilot approval remain gates. No real Contacts records, notifications, exports, invites, account provisioning, hosted migrations or production promotion were performed.
