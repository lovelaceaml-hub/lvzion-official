# LV Zion Official — current handoff

Updated October 25, 2026. This handoff and `AGENTS.md` describe the application to build and operate now. Milestone-specific release records are evidence, not additional product requirements.

## Authoritative requirements

LV Zion Official is a self-contained, phone-first application at https://lvz.app. Only explicitly approved requirements govern its modules. All schedules, assignments and events are deliberately configured within this application; empty calendars are valid. A design reference supplies appearance or interaction, not data or scheduling policy. Preserve existing accounts, grants, organizational history and intentionally entered records.

Keep compact module headers and the prominent center Apps launcher. The launcher shows only server-authorized modules (after the October 24 decisions: every approved module for every signed-in member). Continue the approved [Day Sheet design contract](design/LVZ-DESIGN-CONTRACT.md), shared tokens, accessible controls and phone-first layouts.

## Church Display: pictures, videos and study rooms (built November 13, 2026, not live)

The Church Display TV (lvz.app/display) can now play four kinds of slide: text (as before), pictures, videos and a live "Study rooms today" board. Each slide is added with one tap, removed with one tap, and can have its own show-from and stop-showing dates inside the playlist's dates. Videos play without sound and move on when they end. The rooms board reads lvrooms.web.app's public lobby feed (Anthony's approved exception, 2026-11-13) and shows room and time only. Uploads go to a new private `display-media` bucket (50 MB per file).

Waiting for Anthony: apply migration `20261113220000_display_media_rooms` (not applied to the hosted database), merge, deploy, then upload "Shake Nevada 60s (cinematic, widescreen, smaller file).mp4" from Drive. Focused checks only: display unit and database tests, display browser tests, build. No full suite, no live upload, no real TV. Details: [docs/continuous-display/MEDIA-ROOMS.md](continuous-display/MEDIA-ROOMS.md).

## Healing Concert tickets: released November 12, 2026

Live on lvz.app (Apps, Healing Concert). Members RSVP and get a QR ticket on screen and by email, share a personal invite link so guests without an account can RSVP, and concert managers scan tickets at the door. No participation score (Anthony's choice). Migration `20261112180000_healing_concert` applied and the app approved; `LVZ_CONCERT_TOKEN_SECRET` added to Vercel production (never rotate after tickets go out). Deployment `dpl_4kDkqdkxAN5sxMc29eg4HYMu7b4V` from `dc520a4`. Signed-out live checks passed; no concert is set up yet, so a signed-in RSVP, email delivery and a phone scan are still unverified. [Guide, checks and next steps](concert/README.md).

Concert details and program entered on 2026-11-12 from Anthony's flyer and song sheet: The Words of Mother's Love Healing Concert, Sunday December 6, 2026, 4:30 PM, World Mission Society Church of God, 6720 W Sahara Ave; no seat limit; 11-song program. The program shows everywhere with order, title and performers (migration `20261112210000_concert_program`, deployment `dpl_3JbMGy63YUKfwSsK3zKBwEqcgFtB`). A signed-in RSVP, email delivery and a phone scan are still unverified.

## Access and placement decisions — October 24, 2026 (applied)

Anthony decided on 2026-10-24, superseding "module access only by explicit grant" and "leadership follows the leader's placement". One migration, `supabase/migrations/20261024170000_open_access_group_placement.sql`, implements all of it. It was merged in #71, applied to the hosted database on October 24 (hosted version `20261024170000`) and deployed with main `d6a5a2c`; pre-checks and readback are in the [ledger](HOSTED-MIGRATION-LEDGER.json).

1. **Every approved app is open to every signed-in member** (confirmed account, enabled account link, active or Unassigned). Use access is automatic; managing still needs an explicit `manager` grant. Implemented centrally: `app_private.current_member_id()` now means the signed-in member (the former meaning is `organization_member_id()`, still used by member administration), `module_allowed` (use), `module_manager` (manage) and `member_module_home` (the Apps list).
   - Contacts: each member gets a private workspace of their own records and can create in it; nobody, including the owner, reads another member's records. Production also needs `LVZ_CONTACTS_OWNER_PILOT=true` (the page and API are off without it).
   - Continuous Display: members open the app and see a "cannot manage" notice; only managers (explicit grant or owner) reach management, publishing and pairing, and per-screen permissions still apply.
   - Study Rooms: members book under the existing rules; holds, administration and other members' details stay with managers. "Who can book" now shows everyone with an account as on automatically.
   - Work Mission Prayer: member view only (schedule, materials, joining a gathering); hosting, reviewing and management still need explicit capabilities.
   - Worship Duty: My Duties for members; Manage (department manager plus manager grant), Presider/song planning and Setup stay role-gated. Setup's switch is now the explicit "participation grant" needed before department scheduling.
   - Groups & Gospel Planning: approved by the migration (recorded against the bootstrap owner). Members open it; Unassigned members see the neutral unplaced view and cannot write. No places or Gospel roles are configured yet.
2. **The owner manages every approved app automatically**, including future ones, with no grant rows: `app_private.is_owner()` = bootstrap receipt + usable account + a current member, technical or department administrator appointment.
3. **Group-only placement.** `member_placements.unit_id` (and transfer destinations) may be null; the (unit, group) foreign key still applies when a unit is given. Commands accept `groupId` with an optional `unitId`. Group leaders see and place group-only members; unit leaders see only their unit.
4. **Leadership is independent of placement** (added the same day). `actor_has` no longer requires a leader to be placed in the group or unit they lead, and appointments name any active group or unit. Gospel Planning lets a leader open any group they lead (group switcher, optional `groupId`); in their own group they act only per their own roles there.

Tests: `tests/open-access-group-placement-database.test.ts` (111 SQL assertions in the hosted order) plus updated module DB tests.

The same day the owner-supplied organization was imported (not in Git): 18 groups, 3 units and 75 active members, 72 of them group-only, with 17 group leaders, 2 unit leaders and 4 pastoral staff. The original placeholder groups were deactivated, not deleted. See `organization_import` in the ledger.

## Design repair: one base, a style per app (released October 24, 2026)

Anthony's October 24 decision replaces the competing Day Sheet, glass and 24-theme layers with one shared base (Atlas Layered Tabs) and an Atlas style per app, plus a System, Light or Dark appearance choice. Branch `claude/lvz-repair-design-31a05d` also fixes the signed-out frame, header Home link, duplicate wordmarks and several module states. Read the [design contract](design/LVZ-DESIGN-CONTRACT.md) and the [audit](audit/2026-10-24/README.md). Merged in #67 and released October 24; the Liquid Opal release below has since replaced its visual layer.

## Groups & Gospel Planning — October 24, 2026

My Preaching (availability, proposed sessions, partner confirmation, one shared result) and My Group (Member Updates, Gospel Review, Gospel Plan, Request for Overseer) are built on the member foundation with migration `20261024150000_gospel_planning_core.sql`, applied October 24. The open-access migration then approved the module, so every signed-in member can open it; no places or Gospel roles are configured yet. Tested locally with fictional data only; no signed-in live check yet. [Status and the approval list](gospel-planning/README.md).

## Liquid Opal design — released October 24, 2026

Every app now uses the Liquid Opal design language (Anthony's Study Rooms Atlas reference) with its own palette: shared kit `components/ui-kit.tsx` and `styles/lvz-ui.css`, frosted header with app tile, floating dock with an unlabelled round Apps button (accessible name "Open apps"). Light scheme is about 99% white with white surfaces; colour is used for accents. Contract: [design/LVZ-DESIGN-CONTRACT.md](design/LVZ-DESIGN-CONTRACT.md); gallery: [design/atlas-build/README.md](design/atlas-build/README.md). Focused checks only (build, design-token tests, frame spec); no full suite.

## October 24, 2026 release

Anthony approved and released four changes, deployed from clean checkouts with the Vercel CLI (automatic Git deploys stay off):

- **Security (#69):** Next.js 16.4.3 and nodemailer 10.2.1 close critical Next.js advisories (remote code execution, Server Actions denial of service) and the nodemailer address-parsing advisories.
- **Design and function repair (#67):** one shared base (Atlas Layered Tabs) and an Atlas style per app; Appearance is System, Light or Dark; signed-out pages no longer show the member dock on sign-in and sign-up; clearer access and empty states; a Page not found page. [Audit](audit/2026-10-24/README.md), [design contract](design/LVZ-DESIGN-CONTRACT.md).
- **Worship Duty (#48):** live for the owner only (`LVZ_WORSHIP_DUTY_ENABLED=true`). Its database objects were already applied on October 15 and verified identical; nothing was reapplied. See [migration status](worship-duty/MIGRATION-STATUS.md) and the [owner setup steps](worship-duty/README.md).
- **Groups & Gospel Planning (#68):** migration `20261024150000_gospel_planning_core` applied; module registered as **draft with no grants**. Later that day the open-access migration (#71) approved it and opened it to signed-in members; places and roles are still to be added. See [Gospel Planning](gospel-planning/README.md).

Verified live, signed out: sign-in, sign-up, Appearance, Study Rooms and Gospel Planning render; other modules redirect to sign-in; every module API returns 401; `www` redirects to `lvz.app`. Focused checks only, no full suite. Not yet verified: any signed-in screen, a real owner Worship setup, physical phones and the TV.

## Device appearance — released October 19, 2026

**More → Appearance** now offers 24 optional device themes on the [real app](https://lvz.app/appearance). **Current app design** restores the existing module defaults, including Study Rooms’ Lavender Softform. Source `0197e83f1ee5fd28ceaaea3cc339b1a9ab800580`, deployment `dpl_HVSBqrSGcvVaTQupPhwaAkU7FDVk`, READY with both production aliases verified. Type checking, 9 selected unit checks, 13 selected browser checks, optimized compilation and 7 compiled-app browser checks passed. Live theme persistence/reset and anonymous denials were verified; no full suite or real hosted booking was run. See [scope and verification](design/APPEARANCE.md) and the [release receipt](design/APPEARANCE-RELEASE.json).

## Current Study Rooms design — Lavender Softform

The owner selected prototype 06, refined its layout, and requested implementation in the real app. Resource tabs attach to the shared header, dates sit below them, and the continuous half-hour grid fills the viewport beneath a transparent floating selection/Reserve tray and the shared dock. Lavender/plum styling is scoped to Study Rooms, including its raised Apps rounded square. This supersedes earlier Study Rooms color, time-tile and date/resource ordering descriptions. [Current scope, verification and release record](study-rooms/LAVENDER-SOFTFORM-2026-10-19.md).

Local release gates passed: 387 application tests, 198 additional PostgreSQL permission assertions, TypeScript/production build, and the complete 131-case browser suite with no exclusions. The older sign-in/resend, time-dependent Display and midnight-sensitive Work Mission fixture failures were repaired in tests only. Responsive screenshots and real-route synthetic bookings were checked at 320, 390 and 1280 px; this is not physical-phone or real hosted booking acceptance.

Released October 19 at 07:09 UTC from `2f80bbd773e61cda59eaf9d01b12337fba766496`. Deployment `dpl_J9vTBQ2woZQ8a6abcCKicnUBxzVj` is READY with `lvz.app` and `www.lvz.app` aliases. The live Study Rooms page returns HTTP 200 and identifies this exact deployment; its three loaded CSS chunks include the lavender/plum tokens, attached tabs, viewport layout and standard 6 px / 12 px glass blur. The canonical `www` redirect returns 308 to `lvz.app`.

Read-only live GET checks of Study Rooms availability and administration returned HTTP 401 without an application member session. No production booking transaction was used for this verification.

## Infrastructure and verified release

- Repository: `lovelaceaml-hub/lvzion-official`.
- Vercel: `lvzion-official`, project `prj_4icc6S1jw8OVKWD9AOI1oiB5fwYe`, team `lvzion`.
- Supabase: `otecqlkqirncotytbfns`, Las Vegas Zion organization.
- Production source: `a366893` (main after #73, the Liquid Opal redesign).
- Production deployment: `dpl_9wXhdto85MgFf13vJjMZeHn2icCJ`, READY on `lvz.app` and `www.lvz.app`. Rollback: `dpl_44xMWbaPe2D4RyyhuBAbYir87Wwu` (open access, previous design).
- Fresh calendar correction: repository migration `20261016180000_study_rooms_fresh_calendar.sql`, applied hosted version `20261016173939`.

Documentation-only commits after the runtime source do not require another deployment. Read current provider state rather than assuming a recorded snapshot cannot change. Automatic Git deployments remain disabled; no unrequested previews are authorized.

## Study Rooms leader access and service times (released October 16, 2026)

Owner decisions from Anthony on 2026-10-16, released through [PR #53](https://github.com/lovelaceaml-hub/lvzion-official/pull/53) at main `10703aba00f092ebe7105cef1b1e3ba7626a8431`:

- Active unit leaders, group leaders and pastoral staff use Study Rooms automatically while appointed (Study Rooms only).
- Group leaders turn booking on or off for current members of a group they lead at [Who can book](https://lvz.app/modules/study-rooms/members), with grant history and audit events. Manager grants and other groups cannot be changed by them.
- Weekly service times: Tuesday 7:30 to 8:30 PM; Saturday 10 to 11 AM, 2:30 to 3:30 PM and 7:30 to 8:30 PM (owner data step, calendar version 3, audited).
- The application stays independent of any other scheduler.

Production deployment `dpl_99bVq58phv1XR6dKcpvkruaXsQ21` is READY on `lvz.app`; rollback is `dpl_HxTFTX6mRCn4JAUH3Mv4mSsuj7ZC` (schema compatible: the new database function is additive and unused by the older code). Hosted migration `20261016200000_study_rooms_leader_access` was applied after confirming the live `module_allowed` and `member_module_home` definitions matched the repository exactly; see the [ledger](HOSTED-MIGRATION-LEDGER.json). The Vercel build passed 386 tests including 33 leader-access SQL assertions, plus 198 permission assertions. Signed-out live checks were unchanged and the new access endpoint returns 401 signed out.

At release the live database had zero active leader appointments and zero placed members, so nobody gained access yet. Access starts as leaders are appointed and members are placed.

Not verified: a real signed-in group leader turning a member on, and physical phones. At that release, six existing Study Rooms browser tests failed independently of the change (they also failed on `d44e6cc`). The current Lavender Softform release supersedes that browser-test status with a complete 131-case pass.

## Study Rooms — correction completed

The application now accepts deliberately empty weekly restrictions and has no implicit weekday service blocks. The owner-directed cleanup removed the exact four never-edited installation restrictions, retained existing records and wrote one audit event. Hosted readback: weekly list empty, special dates empty, policy version 2, booking enabled, zero reservations.

Booking uses the existing explicitly authorized audience only; no grants were broadened. Manager configuration preserves version checks, idempotent receipts, overlap protection and auditing. A maintenance pause is local to this application. The compact header, center Apps launcher, reservation dialogs and existing inventory remain intact.

Production build: 382 tests, 198 additional PostgreSQL permission assertions, TypeScript and Next.js build passed. Nine deployed-browser checks passed: empty calendar behavior, intercepted save payload, final-interval removal, reservation dialog, local pause, manager visibility, responsive widths and four real anonymous API denials. The browser fixtures are synthetic; this is not a claim of a real signed-in owner booking or physical-device acceptance.

Read [Study Rooms operations](study-rooms/README.md) and [the correction record](FRESH-START-2026-10-16.md). Do not reintroduce unapproved defaults.

## Preserved platform behavior

Self-service signup collects first and last names separately, requires confirmation and uses the owner-approved six-character password minimum. New accounts remain Unassigned to age category, group and unit until independent verification and authorized placement. Organizational, department and technical permissions are independent. Member placement and leadership appointments retain history; technical status does not imply module access.

The organization was replaced on October 24 by the owner-supplied import: Brothers/Sisters, Student Brothers, Student Sisters and Pastoral Staff categories, 18 leader-named groups and 3 units (the earlier placeholder groups were deactivated, not deleted). Existing verified organization workflows and signup safeguards are unchanged by the calendar correction. See [member instructions](USER-MANUAL.md), [organization workflow](ORGANIZATION-WORKFLOW.md) and the authentication-specific setup records for implementation details.

## Other module boundaries

Since the October 24 open-access migration, every signed-in member has a private workspace of their own Contacts records (the page and API also need `LVZ_CONTACTS_OWNER_PILOT=true` in Production). Preserve forced RLS, author-only notes, do-not-contact and audit controls. Sharing, export and communications remain separately controlled. [Owner guide](contacts/USER-GUIDE.md), [operations](contacts/OPERATIONS.md), [verification](contacts/VERIFICATION.md).

Continuous Display uses approved publications and explicitly paired devices. Do not confuse a browser test with physical TV acceptance. [Operations](continuous-display/OPERATIONS-R2.md).

Work Mission uses owner-supplied dates, hosts, materials and meeting links. Schedule/material/people management and the protected meeting broker remain intact. Do not infer dates or enable outbound distribution. Real owner save/member join and physical-device acceptance remain distinct checks. [Completion](morning-prayer/COMPLETION-R5.md), [historical R6 interface and October 18 focused verification](morning-prayer/SIMPLER-R6.md), [release receipt](morning-prayer/RELEASE-R6.json). The October 18 read-only check still found one module grant, seven capabilities and zero gatherings/publications/meeting references. Eight live signed-out/origin checks passed on the newer READY shared-frame release; no full suite was rerun.

## Development and recovery

Follow [release controls](RELEASE-GATES.md). Reconcile the [hosted ledger](HOSTED-MIGRATION-LEDGER.json), including the October 16 correction, before applying SQL. Do not replay applied migrations or use a blind database push. Never use fictional fixtures against production; the fixture seed now explicitly refuses hosted Auth schemas.

Keep secrets in provider stores or personal Keychain. Preserve all existing authorization boundaries. Test the changed workflow and its denial paths, then verify exact deployed source and aliases. Choose a schema-compatible verified deployment for recovery; do not delete history, restore unapproved defaults or widen permissions as a rollback shortcut.

## Study Rooms Soft Panels — October 18, 2026

Anthony selected Soft Panels as the main Study Rooms interface with glass accents only, superseding the earlier Day Sheet visual rules for this module. The implementation preserves the compact header and authorized center Apps launcher; date navigation, the availability grid and Continue form the main flow. Manager tools and history are under More. See [design and verification](study-rooms/SOFT-PANELS-2026-10-18.md) for scope and test evidence.

### Later Study Rooms layout correction

Anthony supplied a second October 18 layout reference. Study Rooms now uses separate rounded time tiles, an hourly rail, resource tabs at the top and a full-width Reserve action above the bottom Apps navigation. See [implementation and verification](study-rooms/TILE-LAYOUT-2026-10-18.md). This supersedes the continuous raised columns described in the earlier Soft Panels release.

## Shared application frame — October 18 request

The root frame now provides a persistent compact module header, circular profile avatar and matching bottom navigation, with a raised center Apps button. `FrameControls` registers each module’s neighboring actions. This supersedes separate module bars and the older wordmark-only header. See [shared frame details and release evidence](SHARED-APP-FRAME-2026-10-19.md). Profile photos are not yet a stored feature; the circle uses authenticated initials. No grants, operational records or schema changes are included.

### Glass/date refinement

The subsequent October 18 request puts four glass date buttons above slimmer resource tabs, strengthens Reserve/Apps depth, adds today shimmer and Tuesday/Saturday decoration, and makes the shared header edge-to-edge. See [current refinement and verification](GLASS-REFINEMENT-2026-10-19.md). Booking policy and data remain server-sourced.
