# LV Zion Official

## Full-suite testing requires Anthony's explicit approval (2026-10-17)

This rule applies to every agent and project, including delegated agents, CI,
release wrappers and scheduled jobs. It supersedes any older instruction below
that says to run a full suite by default.

- Run a full repository or project test suite only when Anthony's current prompt
  explicitly requests full-suite testing, or after recommending the exact suite
  and receiving his explicit approval immediately before executing it.
- Approval covers only the named project, suite and run. A generic request to
  test, verify, finish, release or deploy is not approval for a full suite.
- Keep focused checks tied to the change: selected test files or cases, syntax,
  types, lint, guards and limited smoke checks. Do not recreate a full suite by
  splitting it into several supposedly focused commands.
- Full suites must not start automatically on pushes, pull-request updates,
  merges or schedules. In workflows, use a manual dispatch and an explicit
  `full_suite_approved` input that defaults to false. Agents may set it true only
  for the current user-authorized run; a release request alone does not qualify.
- Pass this rule and the precise approved scope to every helper. Before invoking
  a script, package command, deploy hook or workflow, inspect what it runs. Report
  focused evidence and any full suite left unrun without claiming a full pass.

Self-contained, phone-first Next.js application at https://lvz.app, with its own Supabase database.

## Authoritative product boundary — October 16, 2026

Anthony requires a genuine fresh start. This applies to every module and supersedes conflicting historical documents, handoffs, tests and implementation assumptions.

- Implement only requirements explicitly approved for LV Zion Official. A design reference approves appearance or interaction only, not data, schedules, operational policies or dependencies.
- The product must have no knowledge of a separate application. Do not add references, links, imports, synchronization, fallback endpoints, migration prerequisites or handover gates involving another application. Two exceptions are approved: see "Church Display: approved outside sources" below.
- Production schedules, service restrictions, assignments and events come only from records deliberately configured for this application. Start empty. Do not infer recurring schedules from conversation history or populate them from examples.
- Empty schedules and configuration are valid. Show useful neutral empty states. Test fixtures remain isolated from production handlers and must never become fallback data.
- Application rollout depends only on this application's own configuration, authorization, data integrity and verification. Do not require changes to another system before a module can function.
- Preserve existing accounts, permissions, member history and intentionally entered records. Remove only positively identified unapproved defaults; audit any production correction.
- Retain compact module headers and a prominent center Apps launcher in module bottom navigation.

## Church Display: approved outside sources (Anthony, 2026-11-13)

Anthony approved exceptions to the no-other-app boundary. First: the Church Display TV may read the public study-room lobby feed at https://lvrooms.web.app/api/lobby-schedule, read only, server side, to show today's bookings as room and time. Who booked a room never reaches the TV or the browser. No other link, import, sync or dependency on another app is approved beyond the two sources here; if a feed is down, the rooms slide shows a neutral "not available" line and nothing else changes. Second approved source (Anthony, 2026-11-13: "real mother's love. and when a new submission happens it auto shows that even if on another screen display"): a Mother's Love slide plays the public TV at https://mothers-love.vercel.app/display during its turn, and the server reads https://mothers-love.vercel.app/api/display/color-polish only for the newest recognition's id and time, to jump to that slide when one is published. Display pictures and videos live in the private `display-media` bucket on this app's own Supabase project. See docs/continuous-display/MEDIA-ROOMS.md.

## Access and placement decisions — October 24, 2026

Anthony's 2026-10-24 decisions supersede the earlier "module access only by explicit grant" rule and the rule that leadership follows the leader's own placement. Migration `20261024170000_open_access_group_placement.sql` implements them (draft PR, not applied to the hosted database).

- **Open apps.** Every approved app is open to every signed-in member: a confirmed account with an enabled account link, including Unassigned (intake) members. They get ordinary use ("viewer") access. Managing still needs an explicit `manager` grant. Each module's own privacy rules still apply: members see only their own private records (contacts, bookings, duties) and what their group or role allows. Use `app_private.module_allowed` for use and `app_private.module_manager` for management in every module, including new ones.
- **Owner everywhere.** The bootstrap owner (`bootstrap_receipts` plus a current member/technical/department administrator appointment) is manager on every approved app, including future ones, with no grant rows.
- **Group-only placement.** Placement is Age category → Group → (optional) Unit. Group leaders see and place their group-only members; unit leaders see only their unit. Unit-scoped features (for example Gospel Planning Member Updates) do not apply to group-only members.
- **Leadership is independent of placement.** A member has one primary placement and may also lead other groups or units. A `group_leader` or `unit_leader` appointment gives authority over the group or unit it names, not the leader's own placement group. The member's own group view (directory, My Group) still follows their placement.

## Read first

Read README.md, docs/README.md, docs/HANDOFF.md, docs/ACTUAL-APP-SETUP.md and docs/RELEASE-GATES.md. The boundary above takes precedence over older installation receipts. For Contacts, also read docs/contacts/README.md, docs/contacts/OPERATIONS.md and docs/contacts/VERIFICATION.md. Organization implementation and its Build log are in docs/ORGANIZATION-WORKFLOW.md. Member instructions are in docs/USER-MANUAL.md. Reconcile hosted schema changes with docs/HOSTED-MIGRATION-LEDGER.json before applying SQL. Inspect current GitHub and production state before changing either; preserve concurrent development.

For Work Mission, read docs/morning-prayer/SIMPLER-R6.md and docs/morning-prayer/COMPLETION-R5.md. Real dates, materials, links and grants are owner-sourced. Run `npm run test:morning-prayer:browser` and `npm run test:morning-prayer:races` for changes to that module (the latter requires local PostgreSQL binaries).

For Study Rooms, use docs/study-rooms/README.md. Historical installation receipts are evidence of past tests, not current scheduling requirements.

For concert invitation, registration, and ticket work, follow [the concert guide](docs/concert/README.md) and its focused check instructions. Treat the current concert release and device checks in that guide as the handoff for this feature.

For Healing Concert registration (Anthony, 2026-11-21), keep the original leaf sweep and vary it only a little. Use no generated images. Show playable examples before publishing.

## Verification

Use Node 24. Run `npm ci --ignore-scripts`, `npm run build` and `npm run test:browser`. Browser tests use a loopback-only server with activation disabled. For real local Auth signup tests, run `LVZ_SIGNUP_INTEGRATION=true node tests/integration/start-stack.mjs`, then `LVZ_INTEGRATION_DIR=/tmp/lvz-integration node scripts/test-signup-integration.mjs`, then `node tests/integration/stop-stack.mjs`. Use a new disposable integration directory containing only fictional identities and ephemeral test credentials. Never commit or publish that directory or send real addresses to local SMTP.

## Release and security boundaries

- Target the actual application at https://lvz.app. Do not publish a preview unless Anthony explicitly requests that preview.
- Automatic Git deployments remain disabled in vercel.json. Private code pushes do not authorize automatic publication. Release deliberately after validation.
- Self-service signup is authorized. New accounts start Unassigned to age category, group and unit; only authorized leaders assign placement. A placement needs a group; the unit is optional.
- Use only Supabase project otecqlkqirncotytbfns and validate the https://lvz.app origin. Do not modify unrelated projects or services.
- Apply only pending, tested schema migrations. Reconcile the hosted ledger rather than replaying applied CREATE statements.
- Module access follows the October 24, 2026 decisions above. Do not broaden management or remove authorization checks beyond them. A booking pause may be used for maintenance or local readiness, never as an external-system dependency.
- Do not place private emails, member records, credentials, Auth tokens or secrets in Git, logs, screenshots or exports. The owner chooses his password. Never invent organizational labels to activate an account.
- Keep production credentials in provider stores. Personal credentials use Apple Passwords or macOS Keychain; do not access work password stores.
- Do not purchase services or incur new costs without specific approval.
- Report exactly which tests ran and which deployment was verified. Synthetic tests do not prove a real hosted member transaction.
