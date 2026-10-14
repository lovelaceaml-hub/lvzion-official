# Organization and member placement completion

> **Live hierarchy reconfirmed October 14, 2026:** four age categories, eight groups, sixteen units; one member (original owner) remains Unassigned, and **zero active placements**. This is a verified live structure, not imported church roster data. The test counts and deployment IDs below are historical release evidence. [Current status](CURRENT-STATUS.md) · [Member guide](USER-MANUAL.md).

## Scope and authority

Anthony requested four named age categories, two empty placeholder groups in each, then two empty placeholder units in each group, and authorized autonomous completion of the organization and member-assignment workflow in the actual app. No preview is authorized. Full replacement is the established release mode.

The starting repository was clean at 9f3911d66a12224fb710d217b278f1adcef8bbdb. No pre-existing changed or untracked non-ignored files were present. Existing ignored secrets and disposable integration evidence are untouched. The private Git remote and disabled automatic Git deployments were verified. Work is scoped to organization and placement controls, their tests and documentation. No schema, RLS or authorization expansion is required.

## Step 1: Establish the actual hierarchy

Acceptance: four user-named age categories, eight groups and sixteen units, each under its correct parent. No automatic member placements or appointments.

The structure was created through the existing signed-in, authorized application commands. Read-only verification confirmed two named placeholder units per group, zero member placements in every group, and sixteen audited unit creations. The earlier category/group creations have twelve audit entries. Names repeat only beneath different parents.

## Step 2: Complete management and placement controls

Acceptance: a visible hierarchy; contextual creation, rename and protected archival; unambiguous placement choices for signup verification, existing-member creation and moves; placement-scoped leadership; own-record and technical-only access boundaries retained. Failed creates must support safe unchanged retries.

The existing visual language is retained. This is a functional correction of the flat hierarchy and ambiguous menus, with no new design system or hosted preview. Contextual forms bind the parent to the open branch. A shared placement picker clears dependent choices and displays the entire destination path. The server remains the authority for every command and permission. Existing database guards protect occupied entries and retain audit/history.

## Step 3: Verify and release

Acceptance: required build and phone-browser suites pass, repeated-name and stale-choice regressions pass, the private diff is reviewed, documentation is current, and actual production serves the verified commit. The real signed-in owner sees 4/8/16 and can select the complete placement without changing any member as a test.

Rollback: the previous actual deployment dpl_HPHS62hL45xLa65yELUNNLt2gzRK remains compatible. Website rollback must preserve the user-requested hierarchy and audit records. No backend rollback or destructive cleanup is needed.

## Build log

- Confirmed the private repository, clean baseline, actual deployment boundary and existing authorized organization commands.
- Created and verified all sixteen empty placeholder units through the actual app. No hosted test members or test invitations were created.
- Replaced ambiguous flat organization controls with a hierarchy, contextual parent-bound create forms, rename and protected archival.
- Added shared dependent placement choices for verification, member creation and moves, plus full-path transfer labels and member-placement-based leadership scopes.
- Added stable retry receipts for uncertain organization and member commands. No new dependencies, permissions, database schema or service credentials were added.
- Earlier integrated checks passed 244 application tests and 182 disposable PostgreSQL assertions. All 75 browser checks passed, including ten organization/placement regressions. One label association was corrected after the first browser run exposed a strict-label test failure; the final complete browser run passed.
- Controller review covered scope, permissions, stale selections, repeated names, retry receipts, responsive layout, labels, documented commands and secret handling. External security review remains waived. Production release and signed-in verification are the remaining release checks.

- Integrated the concurrently merged app updates from main at 2eabebe. Both signup and organization style additions were retained. The combined build exposed three Study Room test fixtures loading the identity-bound Contacts migration without its required owner fixture. Those generic fixture loaders now follow the existing core-loader exclusion; the dedicated Contacts verified-owner suite still applies and tests the exact migration. No production migration or application behavior was changed by this test integration repair.

- The same database fixture correction also landed upstream in main at 9d30a20; the final change keeps that upstream version. Existing browser checks for removed preview pages were migrated to /modules/study-rooms using synthetic transport and the real UI. No preview route or product permission toggle was added. The final combined suite passed 244 application tests, 198 core SQL assertions and all 77 browser checks. The local browser server now binds only to loopback.

- Preserved the newly merged signup first/last-name details beside the shared placement picker. The final release build passed 244 application tests and 198 core SQL assertions; all 77 browser tests passed. The signup alert check now selects the actual error rather than the empty framework route announcer. Hosted migration metadata confirms the signup-name schema is already applied.

- Completed actual release: PR #24 merged at ce41310e3ef932af58d51e7c4c66af985146c23f. Vercel dpl_URciYVcPXdq5cJTURF9DpfAaSFZU became READY and served lvz.app. The subsequent READY production source 87c5a8573ca01f7216f2c78df1da5b827b7380d2 was checked by Git ancestry and retains this release. Live native-browser verification confirmed 4/8/16, the nested Adult Male groups/units and the full Adult Female / Group 2 / Unit 2 placement path. The selection was cleared without an assignment. Read-only hosted verification confirmed zero current member placements and sixteen audited unit creations. Public pages returned 200 and anonymous private API access returned 401/no-store.
- Final evidence: local preflight passed 244 application tests, 198 core SQL assertions and 77 browser checks. Vercel built the merged production source including other concurrently approved modules. Phone layout was checked in Chromium; the live desktop screenshot contains no contact details. The user guide and private backup are complete. Temporary browser test services exited and the temporary proof tab was closed. There is no remaining setup action for Anthony.
