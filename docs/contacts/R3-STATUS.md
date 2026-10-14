# Contacts R3 — real-data implementation and launch status

**October 14, 2026. The real application has NOT been launched.**

The user requested completion through real launch. Development proceeded, but release was not claimed or forced through the outstanding identity, privacy and verification boundaries. Production, original apps, other branches and hosted data remain unchanged.

## Source and review target

Application revision: `0fbc1707a59edd946187b262c62894f153923b43` on `feature/contacts-r1`, draft PR #6, stacked on foundation PR #2 at `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`.

Verified Vercel preview: `https://lvzion-official-nwekywg0k-lvzion.vercel.app/contacts-preview`.
Deployment: `dpl_BQGBP9wRToJvFWM7hfNmXHVeR8uC`, READY, preview environment; optimized build duration reported 19 seconds. Subsequent documentation-only commits do not change this application revision.

The public review route is still explicitly fictional. It is NOT the real-data workspace. Do not confuse a successful preview deployment with a member-authorized production release.

## Defects addressed

- **UI-01 resolved and browser-tested:** Follow-Up no longer renders the literal `task.due`; it renders the correct attention/upcoming label.
- **A11Y-01 resolved for the tested case:** explicit forward/backward Tab containment, focus redirection and focus restoration keep keyboard navigation within an open dialog. The repeated-key browser regression passed; this is not a full accessibility certification.
- **IDEMPOTENCY-01 resolved and unit-tested:** restore retries reauthorize current ownership before consulting the canonical receipt, then evaluate mutable archived state. Eight regressions cover identical/reordered retries, changed payloads, lost module access, inactivity, changed placement and handoff.
- **RACE-01 implementation candidate added, NOT verified closed:** `runtime-entrypoint-review.sql` prepares a guarded command entrypoint that locks actual task assignees, both duplicate-review owners, collaborators, hierarchy rows and timed capability rows, in addition to the session/grant/contact rows. The lower-level R2 command remains private and revoked. Native contention acceptance did not complete.

## Real-data path added

`components/contacts/live-workspace.tsx` is a separate implementation, not a renamed fictional preview. It contains real contact/detail/note/follow-up forms and no fixture imports or persona selection. It is mounted only by `/modules/contacts`, behind both `requireMember()` and the still-closed Contacts release gate.

It supports proposed personal contact creation, name/preference editing, author-only notes, scheduling, completion, rescheduling, cancellation, closure, DNC, archival and restoration. It uses POST requests to the Contacts service, UUID request IDs, optimistic versions and stable retry packets. Pending private UI state is cleared when the page becomes hidden; stale responses are discarded, requests are aborted, and visibility restoration reloads current authorization. No offline storage or background delivery is implemented.

The initial live workspace is intentionally limited: sharing/leadership management controls remain in the fictional review, not released operational UI. Its Apps entry currently provides Contacts and a link back to the member Home, not a fully reconciled cross-workstream Apps selector. Its Follow-Up view currently provides generic assigned-activity counts and navigation to contacts rather than the full date-grouped task worklist. These are not claims of final feature parity.

`lib/contacts/http-service.ts`, `server-contract.ts`, and `lib/server/contacts.ts` implement the authenticated HTTP boundary. The actual route is connected to that adapter but exits before body/session/database access while `contactsReleaseEnabled()` is false.

The adapter uses the existing verified-member client, not a privileged service key. It rejects client-selected actor/owner fields, unknown operations, invalid IDs/versions, unexpected URLs/query strings, wrong origin, cross-site requests, invalid UTF-8/JSON and oversized/compressed bodies. Request parsing is bounded to 8 KiB and five seconds. Each request revalidates membership. Responses are explicitly projected, private/no-store and generic on errors; arbitrary RPC fields and exception messages are not forwarded.

`http-rpc-review.sql` prepares five SECURITY INVOKER public RPC contracts over the private runtime: workspace, detail, command, duplicates and generic agenda. Workspace uses an authorized-record-only 100-item keyset page. All execution grants remain revoked and the underlying SQL approval function is still literal false. These files are outside migrations and UNAPPLIED.

**The real frontend and the new RPC path are compiled/prepared but have NOT been exercised together against authenticated hosted Supabase.** The existing detail/agenda response limits also need full history paging and scale verification; an oversized result fails closed rather than silently exposing or accepting arbitrary JSON.

## Executed verification

| Check | Actual result |
|---|---|
| Strict TypeScript and optimized Next.js build | PASS, Git-backed Vercel deployment |
| Full Node test suite | **201 passed, 0 failed, 0 skipped** |
| New HTTP/contract tests included in that total | **27 passed**, using explicit dependency doubles, not hosted authentication |
| New restore retry tests included in that total | **8 passed** |
| Existing foundation PostgreSQL assertions | **111 passed** in disposable PGlite |
| Existing R2 Contacts runtime test | Included in the passing suite; its 58 assertions are not R3 native-lock or hosted-RPC proof |
| Final deployed fictional-preview browser regression | **27/27 passed**, exit code 0 |
| Direct Contacts API probes included in browser suite | **21/21 generic 403/no-store**, 3 paths × 7 methods |
| Responsive regression | 320, 390, 430, 768 and 1280 px across four views |
| Browser page errors / preview Contacts or Supabase data calls | Zero / zero in the passing run |

The final browser run was `cmd_46be99f57ac5472e81caf3d45591`, started `2026-10-14T14:05:23.235Z`, against the exact deployment above. The unchanged committed `scripts/verify-contacts-r2.mjs` was used so the two formerly failing cases were not removed or weakened.

### Native-test limitation

A fresh local PostgreSQL runner was attempted. It first failed on an empty PGSERVICE setting; the second attempt reached fixture setup and failed the foundation's active-member/primary-placement constraint. The corrective fixture-setup command was then blocked by a tool safety check. It was not retried through another mechanism. **No native contention scenario or backup/restore scenario completed successfully in R3.** The guard candidate must not be called race-safe based on compilation or the older PGlite tests.

One HTTP test compilation failure caused by TypeScript inferring an optional undefined header was corrected with an explicit test-case type before the successful build. No permission or assertion was relaxed.

## Hosted and foundation state rechecked

Read-only inspection of `otecqlkqirncotytbfns` still found:

- Auth users: **0**.
- Member records: **0**.
- Contacts tables: **0**.
- Applied migrations: only `20261014051733`, `20261014051804`, `20261014051924`.

Foundation PR #2 remains draft at the same pinned base. Its `lib/runtime-config.ts` explicitly excludes the known hosted project reference from activated runtime settings. This is an existing safety boundary, not a Contacts bug to bypass. Approved identity/server/mail configuration, current hosted authentication verification, hierarchy linkage, migration-ledger reconciliation and foundation release review are still needed. Do not blindly replay repository migration filenames against the differently numbered hosted ledger.

## Human decision still pending

The user was asked whether the first live release should be limited to their account, with sharing, leader oversight, exports and messaging disabled. No answer was received during this implementation. Therefore, this document does NOT record approval of that scope.

The original individual-sharing, field/history access, cross-group, leadership, reassignment, DNC reversal and retention decisions remain proposals. A broad request to finish launching is not recorded as approval of a particular confidential-data audience. No real account, app grant or contact audience was invented.

## Required before opening real access

1. Resolve the first live audience and approved contact-handling rules; identify the first verified account and its valid member placement. No real address-book imports or automatic member creation.
2. Complete the foundation's authorized hosted identity/session/callback and configuration verification, reconcile its migration ledger, and coordinate the shared foundation release without overwriting other workstreams.
3. Independently review and test the new guarded SQL and RPC contracts, true concurrent revocation/reassignment/edit cases, public/direct RPC denials, actual frontend-to-Supabase persistence, privacy on sign-out/revocation, and backup restoration. Complete full history/worklist/app-selector integration and physical-device/accessibility checks appropriate to the release scope.
4. Generate reviewed migration files with the Supabase CLI, apply only the approved new-project changes, issue only the approved account/module/capability grants, stage and verify the intended production build, and then perform the authorized cutover. No preview-only build should be relabeled as the real app.

No production deployment, alias/domain change, hosted schema write, user provisioning, import, export, external message, invitation or production grant was performed in R3.
