# Contacts R2 — implemented review milestone, not release-ready

Verified October 14, 2026. Contacts-only branch `feature/contacts-r1`, draft PR #6.

## Open the deployed implementation

Inspected source: `21cfef98daeb45f4927ab77d606bdb1521fdea5c`.
Vercel deployment: `dpl_EJeZX6QGSToaSzVB8vbNnJUAcqR4`, READY, preview target.

- Main: https://lvzion-official-ov8hcborr-lvzion.vercel.app/contacts-preview
- Shared: same path with `?view=shared`
- Contact details: same path with `?view=detail`
- Authorized aggregate overseer: same path with `?view=leader`

Vercel protection is retained. Use an authorized team session or separately supplied short-lived review link. No access URL, cookie, token or authentication secret is stored here.

## Implemented since R1

The integrated fictional workspace now includes accessible-record search; Open / Needs attention / Closed / Archived filtering; editing fixed sample identity and communication preferences; task rescheduling with the former due time retained; explicit cancellation; archive retrieval and restoration without clearing DNC; append-only author corrections; generic change history; an actual stale-form conflict/reload/review flow; member-inactivity and changed-placement handoff scenarios; and authorization-derived generic My Week examples. The center Apps entry stays shared and management stays inside Contacts.

The core synthetic flow was exercised end to end: add Taylor, assign one responsible member, explicitly share with Leo, record a collaboration interaction, assign and schedule Leo's follow-up, switch fictional persona, complete the action, return to the owner, revoke sharing, and verify the former collaborator no longer sees the record. These are page-memory simulations, not authenticated live accounts or persistence.

## Backend development

`docs/contacts/runtime-review.sql` extends the existing 12-table schema review with a proposed transactional command runtime and narrowly projected read, duplicate-review and personal-agenda functions. This code is outside migrations and was not applied to Supabase. All entry-point grants remain revoked; `review_is_approved()` is literally false. The public Contacts API remains a generic no-store 403, and the authenticated module remains unavailable.

The isolated SQL test explicitly overrides that gate only inside a disposable PGlite test process. It exercises actual PostgreSQL functions, verified-session fixture checks, independent creator/steward scopes, hidden methods/notes/history, ownership and sharing, follow-ups, DNC/archive/restore, inaccessible duplicate non-disclosure, idempotency, optimistic versions, and atomic rollback when audit insertion is intentionally failed. Those tests do not approve the proposed policy and do not authorize a hosted gate override.

No Contacts record becomes a `public.members` record. The fixture verifies that creating contacts does not add members. No external messaging, address-book sync, import/export, automatic merge, real account invitation or public display integration exists.

## Executed results

| Check | Result |
| --- | --- |
| Git-backed TypeScript and Next.js build | PASS; deployment READY |
| Full Node application/database suite | 166 passed, 0 failed, 0 skipped |
| New transactional runtime suite, rerun in isolated sandbox | 58 assertions passed in disposable PGlite |
| Deployed Chromium R2 browser sweep | 25 of 27 checks passed; two failures retained below |
| Direct API probes | All 21 probes returned generic 403 with no-store |
| Responsive widths | 320, 390, 430, 768 and 1280 px; four views; no horizontal overflow |
| Fictional UI backend calls | 0 Contacts/Supabase data calls observed |
| Uncaught browser page errors | 0 |

A successful build is not an all-green acceptance result. The browser sweep failed and must remain a release blocker until corrected and rerun.

## Open defects and technical gates

1. **UI-01:** Follow-Up cards render the literal `task.due` as a small heading. Replace it with a derived overdue/upcoming label, then rerun the browser check.
2. **A11Y-01:** Repeated Tab navigation can move focus outside the open native dialog. Add explicit forward/backward focus wrapping and verify Escape and trigger restoration. R1's simple Escape/focus-return result did not test the full wrap-around case.
3. **IDEMPOTENCY-01 (source review):** In `lib/contacts/workflow.ts`, extended-action archive-state validation precedes receipt lookup. An identical restore retry after a successful restore can therefore be denied rather than return its prior result. Reauthorize first, consult the canonical request receipt, then apply state/version preconditions for genuinely new commands. Add a restore-retry regression.
4. **RACE-01 (source review):** The proposed SQL command locks actor/owner/target member IDs. For task commands, `target` is a task UUID, not necessarily its assignee. Participant locking must include actual relevant task assignees and the hierarchy rows used by authorization. Exercise this against simultaneous inactivity, grant revocation and placement changes before considering activation.
5. Genuine two-connection PostgreSQL races were **not executed in R2**. PGlite checks and the browser's simulated second device are not substitutes. Same-record edit, share revocation, handoff, membership/module suspension, idempotency-key reuse and task-assignee races need deterministic contention tests and reviewed lock ordering.
6. The current frontend remains a memory-only adapter. The candidate runtime is not wired to authenticated allowed-access HTTP/RPC operations. That wiring must follow approved ownership/sharing/privacy decisions and include independent direct-API tests, not merely UI controls.

A combined source-download/correction step was blocked by a tool safety check. That blocked step was not rerun through another mechanism; no correction from it is included in this revision. The tested source and these outstanding items are preserved for review.

## Approval and live operation gates

Before installing allowed permissions, approve the accountable Contacts owner, creator eligibility, individual sharing fields/history, oversight and stewardship appointments, cross-group policy, author-only notes, reassignment/inactivity behavior, DNC reversal, retention/deletion and small-cohort aggregate privacy. Cross-group sharing, export, merging and external delivery stay disabled unless separately approved.

Then complete allowed server/RPC/RLS integration and independent security review, hosted test-identity approval and Auth/PostgREST tests, hosted migration-ledger reconciliation, backup/restore verification, physical iOS/Android and complete accessibility checks, and an explicitly authorized limited pilot. Do not promote this review merely because its build is READY.

## Preservation

Compared with the foundation commit `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`, inspected application source adds 20 Contacts-scoped files and changes no existing foundation file. Study Rooms, Worship Duty and other unmerged workstreams are not merged or overwritten. No production domain/alias or deployment setting was changed.

The read-only hosted inspection in this work session found zero Contacts tables, zero Auth users and only the three original foundation migration versions: `20261014051733`, `20261014051804`, `20261014051924`. The existing account-provisioning restrictions remain intact.

R1 documentation and verification are historical evidence. This document records the newer R2 implementation and supersedes any implication that only structural schema review exists or that R2 has passed every browser check.
