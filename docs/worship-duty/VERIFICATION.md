# Worship Duty R1 — verification and release gates

October 14, 2026. Status: **verified fictional development preview; not an activated live application**.

## Tested source and deployment

Application commit: `1a2be25c6ccb744be52280af04124e39e9604b3e`, branch `feature/worship-duty-r1`, draft PR #5. Foundation base: `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`, not the Study Room branch.

Preview: `https://lvzion-official-lo1bhlip1-lvzion.vercel.app/worship-duty-preview`. Deployment `dpl_Awo3PAYDDBzF9HUcvLpdRtErMcNK` verified READY. This evidence commit adds the reproducible browser runner and this document; application and database-test files are unchanged from that tested commit. The PR conversation records later deployment checks. Protection stays enabled; no temporary review-link credentials are committed.

## Results

| Layer | Result | Scope |
|---|---|---|
| Type checking and Next.js build | PASS | Existing foundation plus Worship Duty routes/components |
| Node test run | **155 passed, zero failed/skipped** | Existing tests plus Worship policies and embedded PostgreSQL commands/projections |
| Existing foundation database suite | **111 permission assertions passed** | Member/access regression suite |
| Deployed browser review | **23 passed, zero failed** | Chromium; completed `2026-10-14T10:51:54.381Z` |

Both TypeScript and PostgreSQL enumerate all **729 ordered duty pairs** and reject all **19,683 ordered triples**. These are exhaustive combinations of the 27-slot catalog, not proof of every possible workflow.

Database coverage: private-table/anonymous denial; forged actor/role rejection; department, qualification and active-member scope; prayer/usher exception and Opening Prayer prohibition; stale saves; availability flags without silent removal; request ownership, withdrawal, replacement/open/decline and stale closure; assignment-cell version protection; per-service song lists, invalid-song transaction rollback and historical-plan immutability; immediate session, appointment and module-grant revocation.

Browser coverage: own upcoming pair, other-group name masking, request/withdrawal, leader replacement, disabled and programmatically selected conflicting candidates, technical-only navigation, Presider song save/reorder/confirmation, service-specific blank Choir and conditional Thanks, copy-without-send, day-off flags and sign-in protection. Both Focus and Agenda passed no-horizontal-overflow checks at **320, 390, 430, 768 and 1,280 pixels**. No JavaScript page exceptions or blocked backend requests occurred during the passing run.

## Reproduce

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
# Set the authorized URL locally; never commit a temporary share token.
WORSHIP_PREVIEW_URL="$AUTHORIZED_WORSHIP_PREVIEW_URL" node scripts/verify-worship-preview.mjs
```

The browser script accepts only the fictional preview route on a development host. It blocks hosted backend data calls and mutating app API calls, produces screenshots and `browser-results.json`, and exits nonzero on assertion failure. A partial JSON after failure is not a passing run: verify successful process exit and all 23 checks. Use the existing authorized Vercel temporary-link flow, not disabled protection.

Database tests create and discard an in-memory PGlite database with synthetic Auth/session rows and fictional assignments. They use no hosted database connection or service-role secret. The default Vercel build already runs the suites. No extra GitHub Actions workflow or scheduled job was added.

## Verification fixes

Initial integration tests caught invalid/ambiguous PL/pgSQL local-variable references. Command and projection variables were changed to explicit `v_` names and rerun. The date-alias in one test query was quoted without reducing its availability assertions. Browser label selectors were corrected for labels wrapping native selects; disabled options are checked using the actual HTML attribute, followed by a programmatic selection that still must fail the domain guard. No application guard was weakened to pass a test.

## Operational boundaries

The public preview is a **fictional in-memory prototype**. Edits reset on reload. Demo role selectors are not authentication. The separate `/modules/worship-duty` route reuses the foundation's verified session and displays **Not activated**.

The migration is **unapplied**: 17 private RLS-enabled tables, scoped projections, atomic commands, audit history and personal module-activity integration. No module approval, production access grants, real members, assignments or song catalog are installed. No writes were made to the original app/repository/Firebase/Sheets. No real data import, outgoing notification, production domain or environment change, merge or promotion occurred.

## Remaining release gates

This is not yet a live end-to-end Supabase application. Remaining work: authenticated frontend-to-RPC wiring and a narrow candidate/catalog projection; reviewed hosted development database setup and migration-ledger reconciliation; real-session and two-connection concurrency tests; physical iPhone/Android and complete accessibility review; explicit accountable ownership and scoped access approval. The foundation's hosted identity-provisioning guard remains intact.

Further feature parity is not claimed: historical Usual/Auto/Rotation/Random Fill algorithms; complete service/month/year administration; qualification and conflict-pair administration; per-service availability overrides; real song catalog/history workflows; calendar subscriptions and external notifications. Current suggestions require manual review and are not renamed versions of the legacy historical algorithms.

Resolve these gates before requesting real-data import or production activation. The original live Worship Duty application remains operational meanwhile.
