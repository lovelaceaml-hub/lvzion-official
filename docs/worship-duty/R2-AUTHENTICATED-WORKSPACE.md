# Worship Duty R2 — authenticated workspace and verified rehearsal

October 14, 2026. This continues draft PR #5 on `feature/worship-duty-r1`. It does not merge the PR, activate production, change the original Worship Duty application, or include another application workstream.

## Implemented since R1

The authenticated module page now renders a real data-driven workspace when explicitly enabled in an approved isolated test environment. The code path is:

`/modules/worship-duty` → existing verified member session → `ConnectedWorkspace` → same-origin `/api/worship-duty` → caller-scoped Supabase RPCs.

The live interface does not import fictional fixtures or accept a role/persona selector. Its My Duties, Presider, and Manage sections are derived from the server projection. The existing username/email/password account system, primary member hierarchy and independent department appointments remain unchanged.

### Server and client contracts

- `api-contract.ts`: strict UUID, field, date, item-position, size and version validation; bounded, whitelisted output projections; sanitized error categories. Browser-provided actor/role fields are rejected.
- `http-handler.ts`: testable GET/POST boundary. Production authorization is supplied only by `requireMember`; writes use the existing same-origin streaming JSON reader with its 8,192-byte cap. Successful writes return `{ok:true}`, not raw audit data.
- `client-transport.ts`: same-origin cookies, no-store fetches, redirect rejection, timeout, response validation and no automatic mutation retries. Wrong-service lookup responses are rejected.
- Every API response is private/no-store and varies on Cookie. No service-role key or privileged administrator client is used for member operations.

### Scoped database queries

New migration: `20261014112521_worship_duty_authenticated_queries.sql`, generated with the Supabase CLI and **UNAPPLIED** to hosted databases.

`worship_workspace_v2` retains the R1 privacy projection, adds server time, and normalizes an empty assignment's `isMine` from SQL null to false.

`worship_lookup` provides narrowly scoped candidate and song queries. Candidates require both module-manager and the relevant mapped department authority. Only active, qualified department members with module access can appear. Availability/conflict explanations do not reveal unrelated duty names. Manual-only members remain available for manual selection but are excluded from suggestions. Songs require the assigned Presider or an independently granted song-editor role. Department leadership alone is insufficient.

Both query functions use private SECURITY DEFINER implementations with an empty search path and authorized SECURITY INVOKER public wrappers. Anonymous execution is denied. No roster, role, department mapping, module approval or song catalog is seeded by this migration.

Candidate and catalog lists are bounded at 500 and explicitly report truncation. The SQL song query supports literal substring search; the initial UI warns about an incomplete catalog but does not yet provide catalog search/pagination controls. Missing catalog entries are not silently deleted from an existing plan.

### Save and recovery behavior

The workspace permits one outstanding write at a time. It saves using the expected service/program/availability version, then separately reloads authoritative state. A stale write becomes read-only until reload. When a connection is lost after a possible commit, the UI does not automatically retry; it tells the member to reload and verify the result. When a write is accepted but refresh fails, it says the save was accepted rather than falsely reporting a failed write.

A 401/403 clears prior identity data, selections and privileged navigation, invalidates late responses, and leaves recovery usable. Browser testing caught an initial bug where the data cleared but Reload remained disabled; the fix explicitly ends loading when access is revoked. That regression now passes.

Song edits stay tied to the exact service and program version. Preparation ordering and conditional Thanks/Choir fields are preserved. Normal editing cannot change sung history or an already-started service. Editing a confirmed plan labels the local selection as an **Unsaved draft**, including copied text, until saved/confirmed again. Copying never sends a message.

## Review without live data

`/worship-duty-preview/connected` uses the SAME workspace component with an explicitly separate in-memory transport. Fictional review controls select member/Presider/department-leader/technical-only personas and simulate stale saves, lost responses and revoked access. They never change actual permissions or authentication. A full browser-page reload resets the fictional state; the workspace's Reload button rereads that same in-memory state, which is useful for testing uncertain saves.

R1 Focus and Compact Agenda routes are preserved. The R2 interface currently demonstrates the connected workflows; it is not a claim that every original administrative feature or visual detail has been ported.

## Executed verification

Tested application commit: `a7de9d92166e11455f7077360f408bdc5825b957`.

Immutable preview: `https://lvzion-official-msynhg9xr-lvzion.vercel.app/worship-duty-preview/connected`.

Vercel deployment: `dpl_6GwvkkeydscjsK6xaG4RUui7uqby`, READY, preview environment. This evidence commit changes only documentation and the reproducible browser runner, not application behavior. Temporary share-link credentials are not committed.

| Layer | Result | Meaning |
|---|---|---|
| Next.js / TypeScript | PASS | Both existing and newly connected routes compile |
| Combined Node suite | 171 passed, zero failed/skipped | Includes 16 additional R2 tests/subtests |
| Existing foundation SQL regression | 111 permission assertions passed | Existing member and module controls retained |
| Deployed Chromium review | 29 checks passed, exit code 0 | Completed 2026-10-14T11:44:32.312Z |

R2 tests exercise strict input/response contracts, authorization before SQL, sanitized error responses, no-retry transport, uncertain-save recovery, actual embedded PostgreSQL candidate/catalog permissions, a 502-song truncation/search fixture, no hidden identity leakage, and HTTP-handler consumption of real SQL projections.

The browser suite covers requests and withdrawal, lost-response recovery without duplication, scoped candidate suggestions/manual-only choices, stale saves, technical-only access, exact-service song persistence/order/confirmation/copy, day-off flags, revoked-access clearing/recovery, and member/manager/Presider widths of 320, 390, 430, 768 and 1,280 pixels. No client exceptions or unexpected backend requests arose during fictional workflows. Separate explicit HTTP probes confirmed both GET and POST to the hosted operational endpoint return 503/disabled with no-store headers. The integrated module route redirects an unsigned-in visitor to the existing sign-in page.

R1's entry screen received a smoke check; its entire 23-check browser suite was NOT rerun in R2. R1's Node and database tests were included in the 171/111 rerun.

## Reproduce

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
WORSHIP_PREVIEW_URL="$AUTHORIZED_CONNECTED_PREVIEW_URL" node scripts/verify-worship-connected.mjs
```

Use the exact fictional `/worship-duty-preview/connected` route with authorized Vercel preview access. Do not disable Deployment Protection. The script emits screenshots and `artifacts/worship-r2/results.json`; require exit code zero, `succeeded:true` and all 29 checks. Partial reports from failed runs are not passing evidence.

The database suite uses disposable PGlite and synthetic Auth/session rows. The browser uses the in-memory rehearsal. These are **not** proof of an actual hosted member login, a real-cookie-to-hosted-PostgREST end-to-end transaction, physical-device behavior, or two-connection concurrency. The code wiring is implemented; those deployment-level proofs remain open.

## Activation remains off

`LVZ_WORSHIP_DUTY_ENABLED` is off by default and was not configured on Vercel. The review gate refuses Vercel production even when that flag is set. The unchanged foundation configuration independently requires a loopback test stack or an approved isolated Supabase project and continues to reject `otecqlkqirncotytbfns` as an activated account target.

Read-only recheck of that hosted project's ledger still found exactly the three original foundation migrations. Neither Worship migration nor the module-runtime migration was applied. No hosted accounts, real-member data, outgoing notifications, original Firebase/Sheet writes, domain changes or production deployments were performed.

## Remaining gates and next work

Complete isolated real-Auth/PostgREST integration and concurrent two-session saves/revocation; reconcile the hosted migration ledger; obtain accountable module-owner/scoped grant approval; verify backups/restore and physical iPhone/Android/accessibility. Then consider an explicitly authorized fictional hosted pilot—not production activation by default.

Feature-parity work remains: historical Usual/Auto/Rotation/Random Fill; full month/service/year administration; qualification and pair-approval administration; weekly and per-service availability administration; catalog search/pagination and history management; calendar subscriptions and external notifications. Navigation away from unsaved local song edits does not yet offer a discard-confirmation dialog. None of these is silently represented as complete.
