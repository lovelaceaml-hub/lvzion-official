# Autonomous development increment R6

Status: development work only. No production merge, real-member import, real email, new paid provider, or hosted Auth activation is authorized by these files.

## Added

- Bounded eight-column CSV roster preflight with stable source ID, name/status/contact-format, full hierarchy match, authorized-scope, duplicate-ID, shared-contact and possible-existing-person checks.
- Duplicate people are never automatically merged. Matching requires authorized identity review before any future import.
- Pure offline preflight CLI emits only row numbers, issue codes and counts. No names, contact values or credential data are logged. It performs no database/network writes.
- `/roster-preview` is a fixed fictional rehearsal. It deliberately has no file upload or editable personal-data input.
- Installable PWA manifest and generic placeholder icons, with an optional public-only offline service worker.
- `/install` explains browser installation and account gating. `/offline.html` contains no personal records, forms, tokens, or pending mutations.
- Service-worker tests assert network-first member navigation and bypass for API/Auth/mutations/cross-origin requests. Only four public assets can enter its named cache. No push notification or background synchronization is enabled.
- Private/no-store headers for account pages, APIs and Auth; service-worker scripts are never served stale from an HTTP cache.

## Deployment boundary

The registered domain `lvz.app` remains connected to the existing public design prototype. These new routes belong to the member-system development branch and are not a production release.

Hosted test identity provisioning was previously blocked by tool safety checks. That operation is not retried or routed through another mechanism. The known hosted database guard stays enabled, and account/email endpoints stay closed until a separately reviewed hosted test setup is approved and works.

The current three hosted foundation migrations are present with all seventeen tables RLS protected. No module runtime migration or new schema is applied in this increment. The official app lineup is still unselected.

## Verification

New pure preflight, time and offline policy tests passed locally (43 tests before integration). Full branch typecheck, database suites, browser checks and Vercel build must be recorded after the complete patch is committed. Historical local Auth tests do not prove hosted sign-in.

## Local roster rehearsal

`node --experimental-strip-types scripts/roster-preflight.mjs roster.csv authorized-context.json`

Exit 0 means ready for review, exit 2 means at least one reviewed/blocked row, and exit 1 means invalid input. This command never imports a member. A real import still needs approved source files, current scoped authorization, duplicate resolution, backup verification, a transaction and an audit event. Never commit real roster files or real context exports.
