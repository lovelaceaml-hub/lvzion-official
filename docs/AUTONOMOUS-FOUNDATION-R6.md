# Autonomous foundation increment R6

**Completed as a tested development increment on October 14, 2026. Not a production release.**

## Verified review build

- Tested source commit: `4f9b452d8cc562c3bca677c50be97f48de7507c3`.
- Branch: `feature/member-system-secure-r1`.
- Vercel deployment: `dpl_12Q35Py4ddw7gay1R1LsW5Fhdcsw`, target preview, status **READY**.
- Immutable preview: https://lvzion-official-gxvla6c4w-lvzion.vercel.app
- Stable branch: https://lvzion-official-git-feature-member-system-secure-r1-lvzion.vercel.app
- Review: https://github.com/lovelaceaml-hub/lvzion-official/pull/2

The domain-documentation changes from the mobile foundation branch were reconciled into this branch. GitHub subsequently reports PR #2 mergeable. Both PRs remain draft and unmerged; no production promotion was performed.

## Added in this increment

### Controlled roster rehearsal

`/roster-preview` is a phone-first, fixed fictional example showing a clean roster, possible duplicates, and incorrect or unauthorized placements. It deliberately accepts no uploads or editable personal information. The displayed record-write count stays zero.

The underlying pure preflight library validates an eight-column CSV, bounded size and row counts, malformed quotes, member identity fields, statuses, optional contact formats, complete category/group/unit references and the reviewer's permitted units. Duplicate source IDs block affected rows; possible existing people, repeated names and shared contacts require review rather than automatic merging. Formula-like spreadsheet fields are rejected. The optional offline CLI reports counts, row numbers and issue codes without printing names, contact values or source IDs.

No member record, account, invitation or database change can be created by this preflight. A future actual import still requires approved source data, current scoped authorization, duplicate resolution, backup verification, a transaction and an audit event.

### Phone installation and privacy-safe offline fallback

The branch now has a Next.js web manifest, standalone launch configuration, generic placeholder icons and `/install`. Installation does not create an account or bypass `/members` access checks. These icons are temporary interface assets, not a newly approved final brand.

The service worker is opt-in from the installation page. It caches exactly four public assets: `/offline.html` and three generic icons. It never caches member pages, API responses, Auth responses, contact information, tokens or management records. Member navigation remains network-first, with a generic offline notice if the network fails. API/Auth, non-GET requests and cross-origin requests bypass its cache handling. No background mutation queue, push delivery or synchronization was enabled.

Private/no-store response headers were added for member, account, API and Auth routes. The service-worker script itself is no-store. An actual browser offline-navigation test confirmed the generic notice and the four-item cache allowlist.

### Supporting foundations

A tested Las Vegas-local clock/upcoming-activity utility was added for later integration. This does not claim that the existing My Week component has been rewritten to use it. Existing favorites, calendar, notification and management navigation were regression-tested and preserved.

## Executed verification

| Check | Result | Actual environment |
| --- | --- | --- |
| Strict route and TypeScript checks | PASS | Git-backed Vercel build |
| Node application and policy tests | 110 passed, 0 failed | Git-backed Vercel build |
| PostgreSQL permission/invariant assertions | 111 passed | Disposable PGlite database in Vercel build |
| Next.js production compilation | PASS / READY | Preview deployment above |
| Phone-browser regression suite | 25 passed, 0 failed | Playwright Chromium against the immutable hosted preview |
| Offline navigation and cache allowlist | PASS | Actual service worker in the browser suite |
| Hosted member/authentication/invitation data counts | All zero | Read-only Supabase query |
| Hosted RLS coverage | 17 protected tables; 0 unprotected | Read-only Supabase query |
| Three migration definition fingerprints | Match after documented normalization | Hosted read-only SQL and repository source comparison |

The 25 browser cases include the existing 20 member/home/module checks and five new roster/installation/offline checks. A phone-sized Chromium viewport is not physical iPhone/Safari validation. PGlite permission tests are not a hosted authenticated Supabase session test.

Earlier 47 local Auth/PostgREST/SMTP assertions remain historical evidence from the preceding milestone. They were not rerun as hosted sign-in in this increment. No real external mail was sent.

Machine-readable observations are recorded in `docs/evidence/R6-VERIFICATION.json`.

## Hosted database and migration reconciliation

Read-only inspection found three applied foundation migrations, seventeen RLS-protected application tables, zero members, zero Auth users, zero linked accounts and zero invitations. The fourth module-runtime migration remains unapplied. No hosted schema was changed in this increment.

Raw migration hashes initially differed. The hosted records omit comments and the outer transaction wrappers present in the repository files. Removing comments, whitespace and outer BEGIN/COMMIT from repository files, and removing whitespace from the already stripped hosted statements, produced matching fingerprints for all three definitions. This explains the raw text discrepancy; it is not a substitute for a full independent schema/security review.

Hosted migration version IDs still differ from repository filenames. Their existing mapping and fingerprint evidence are preserved in `docs/HOSTED-MIGRATION-LEDGER.json`. No migration ledger was rewritten and no duplicate CREATE migration was replayed. Do not run an automatic `db push` until the mapping is deliberately reconciled with the chosen deployment process.

## Deliberate remaining gates

The known hosted-project guard and disabled account/email delivery remain. Hosted test-identity provisioning was previously blocked by tool safety checks and was not retried through another mechanism. Approved hosted test accounts, reviewed server identity/mail configuration and exact callback settings must be verified before enabling sign-in.

The first official application and its accountable owner/access rules remain unselected. No brainstorming app was silently made official. Real imports, bulk invitations, a member pilot, physical-device validation, independent security review and hosted backup/restore verification remain separate gates.

`lvz.app` is registered and connected, not paused. It still serves the earlier public prototype. No production merge, live member import, real invitation, new paid provider or original-system change occurred in this increment.

## Local roster rehearsal command

```sh
node --experimental-strip-types scripts/roster-preflight.mjs roster.csv authorized-context.json
```

Exit 0 means ready for review, exit 2 means at least one review/blocked row, and exit 1 means invalid input. This command never imports a member. Never commit a real roster or real context export.
