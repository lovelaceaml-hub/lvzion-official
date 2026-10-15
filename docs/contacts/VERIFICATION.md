# Contacts — verification and acceptance ledger

**Verified Contacts R5 snapshot: October 14, 2026 (Pacific).** This document distinguishes observed results from unexecuted acceptance. The R5 application artifact is `dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv`; subsequent READY production deployment `dpl_FFquRhvQkTW1xv1gRVz1SuKBg66S` includes it. This is not a claim that the entire Shared Contact Tracker has launched.

## Current owner-only production evidence

| Area | Result | Important boundary |
| --- | --- | --- |
| Tested Contacts R5 feature release | **READY** — `dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv`, SHA `87c5a8573ca01f7216f2c78df1da5b827b7380d2` | Documentation-only commits after this SHA do not imply a fresh deployment |
| Optimized production build / TypeScript | **Passed** | Deployed R5 app build |
| Automated application tests | **322 passed, 0 failed** | Includes unrelated member-module regressions; do not call these 322 Contacts-only |
| Foundation/disposable PostgreSQL checks | **198 assertions passed** | Synthetic PGlite, not a hosted real-member transaction |
| R4 owner-only Contacts database test | **43 assertions passed** | Synthetic verified-member fixture; different-member and revoked-grant denials, note/follow-up lifecycle, DNC and archive |
| Additional R5 presentation tests | **5 passed** | Filters, loaded names, counts, Las Vegas dates, missing-owner-ID denial |
| Local Chromium R5 UI rehearsal | **Passed five widths:** 320, 390, 430, 768 and 1280px | Synthetic API fixtures, not authenticated production browser; no overflow/page errors |
| Live unauthenticated GET `/modules/contacts` | **307 → `/sign-in`** | Does not prove successful owner login |
| Live public GET `/sign-in` | **200** | Auth shell only |
| Live GET `/api/contacts/workspace` | **405** | POST-only service |
| Live unsigned POST with approved origin | **401** | `Cache-Control: private, no-store, max-age=0` |
| Live cross-origin POST | **403** | `Cache-Control: private, no-store, max-age=0` |
| Read-only hosted Contacts inventory | **0 contact records, 1 active grant, 6 protected tables, 5 public RPCs** | Counts at checked time; no real contacts read |
| Vercel grouped error/fatal check | No groups returned in the sampled 30-minute window | Not a guarantee of zero later errors |

Evidence sources: [initial owner release](LIVE-OWNER-RELEASE.md), [R5 owner UI release](OWNER-EXPERIENCE-R5.md), the committed `tests/contacts-owner-pilot.test.ts`, `tests/contacts-http.test.ts`, `tests/contacts-presentation.test.ts`, and the release deployment metadata. Contact field values in the repository's tests are fictional.

## Explicitly NOT verified / NOT enabled

- A real, owner-authenticated Contacts add/save/reload through **lvz.app** in the owner browser session. The connector cannot substitute simulated authentication for that check.
- Full physical iPhone/Android, screen-reader and accessible touch-device acceptance.
- Independent native two-session PostgreSQL race tests and a fresh production backup/restore exercise for the expanded shared feature.
- Full database-wide search, complete name/due-dated task worklist across all contacts and paginated interaction history at scale.
- Phone detail editing/clearing after creation, append-only corrections of existing notes, contact exports or communication delivery.
- Individual sharing, group-wide/leader oversight, cross-group access, owner reassignments, broad contact merges or private notification contents. They remain **disabled**, not merely missing from the current UI.
- Complete retention/deletion and DNC reversal policy approval for multi-member use.

## Code cleanup, October 14, 2026 (not deployed)

A no-behavior-change cleanup on branch `claude/refactor-contacts-ce28c3`: the three Contacts stylesheets were merged into `components/contacts/contacts.css` with unused rules removed, the workspace screen was reformatted with shared helpers, the filter and count logic now share one predicate, the unused `dateLabel` helper was removed, and the server adapter uses one route table. No database, migration, permission, privacy or wire-contract change. Evidence: a scratch harness rendered the screen with fictional data at 340, 390 and 800 px before and after the change; all 20 captured screens were byte-identical in markup and pixel-identical, and all 10 save requests sent were identical. `npm run build` (typecheck, unit tests, disposable PGlite database tests) and `npm run test:browser` passed. Not released to lvz.app.

## Re-verification checklist

For future changes, record the exact Vercel deployment ID, Git SHA, target, passing test counts, hosted migration versions and any RLS/permission changes. Confirm anonymous and wrong-origin requests cannot read details. Confirm a disabled/revoked member cannot continue using stale client state. For UI work, test responsive widths and browser errors with fictional fixtures only, then separate owner-session acceptance. Never manufacture login success, imported records or permission approvals for a green checklist.

**Status summary:** The private owner-only module is deployed; the wider multi-member Shared Contact Tracker is not approved or complete. See [README.md](README.md) and [OPERATIONS.md](OPERATIONS.md).
