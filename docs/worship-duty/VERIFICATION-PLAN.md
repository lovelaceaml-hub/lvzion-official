# Worship Duty: verification plan and evidence integrity

## What has *not* been verified on the live branch

As of October 14, 2026, PR #25 is **draft and unmerged**. There is no verified owner setup screen/API, no applied Worship SQL, no production module flag and no real Worship Duty account-to-database end-to-end test. **No current-branch TypeScript, Next build, SQL integration or Playwright pass is claimed in this handoff.**

The former PR #5 reported 198 combined Node tests and 111 foundation database assertions and multiple fictional-browser suites. Those are **historical development evidence** only. PGlite is useful for rules but does not prove hosted Auth/PostgREST or two-connection concurrency. The R3 month planner is fictional; it cannot be validated as a live module.

## Mandatory checks before real release

For the exact current `main` + Worship integration source, read the root `AGENTS.md`. Use Node 24, exact lockfile, and this project’s supported commands:

```sh
npm ci --ignore-scripts
npm run build
npm run test:browser
```

The build invokes type checks, Node tests and disposable foundation permission checks. Separately run/inspect appropriate Worship tests when changed:

```sh
npm test
npm run test:db
```

Before real DDL or enabling the module, also validate all of the following with recorded pass/fail evidence:

| Layer | Required proof |
| --- | --- |
| SQL | Apply in clean disposable DB against **current** schema; no error; private-table RLS and anonymous/default function denial |
| Bootstrap/access | Exactly one intended owner has initial setup right, ordinary members and technical-only admins do not inherit manager authority |
| Member eligibility | Actual member+department+qualification+module rights; Unassigned intake member cannot be accidentally scheduled |
| Assignment invariants | Thanks/Closing Prayer + one real Usher allowed; Opening Prayer/Lobby Security pairing and all triples denied **in the database** |
| Scope | Unauthorized department write, foreign service ID, revoked module grant and anonymous request all denied without leaking names |
| Atomicity | Save conflict rolls back full write; concurrent editors cannot silently overwrite; idempotent uncertainty recovery |
| Service lifecycle | Draft creation, publish, reschedule, cancel, retained histories, closed pending requests, in-app activity/notice reconciliation |
| Presider | Exact-service song lists, applicability, search/catalog, unsaved-draft warnings, restored saved plan, history immutability |
| Production route | Real authenticated member session can open the correct module; disallowed users denied; same-origin POST; private/no-store |
| Regression | Existing signup, organization/placement, Study Rooms, Contacts, display, morning-prayer modules remain functional |
| Operations | Backup + restore rehearsal, production build/alias verification, rollback target, accessibility and physical-phone review |

Do not use real production records as test fixtures, send notifications, create user identities or import rosters without explicit separate authorization.

## Evidence discipline

For each passing run, record the actual code SHA, test command, exit status, test total, environment (local/isolated/hosted), hosted migration ID, Vercel deployment ID and verification date. **Do not relabel tests against fictional transports as hosted authenticated sessions.**

The suite in `tests/worship-duty*.test.ts` is copied from historical R1/R2. There are no committed tests yet for the new owner setup SQL and missing UI/API in PR #25. Write them before release.

Documentation updates alone are not code tests, migration proof, merge approval or a production deployment. See [STATUS-EVIDENCE.json](STATUS-EVIDENCE.json) for this point-in-time audit.
