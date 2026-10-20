# LV Zion Official — current handoff

Updated October 19, 2026. This handoff and `AGENTS.md` describe the application to build and operate now. Milestone-specific release records are evidence, not additional product requirements.

## Authoritative requirements

LV Zion Official is a self-contained, phone-first application at https://lvz.app. Only explicitly approved requirements govern its modules. All schedules, assignments and events are deliberately configured within this application; empty calendars are valid. A design reference supplies appearance or interaction, not data or scheduling policy. Preserve existing accounts, grants, organizational history and intentionally entered records.

Keep compact module headers and the prominent center Apps launcher. The launcher shows only server-authorized modules. Continue the approved [Day Sheet design contract](design/LVZ-DESIGN-CONTRACT.md), shared tokens, accessible controls and phone-first layouts.

## Current Study Rooms design — Lavender Softform

The October 19 [device appearance implementation](design/APPEARANCE.md) adds **More → Appearance** with 24 optional themes. **Current app design** retains the default styles described here. Its implementation and focused checks are separate from the Lavender production receipt below; the new picker is not live until its own deployment receipt is recorded.

The owner selected prototype 06, refined its layout, and requested implementation in the real app. Resource tabs attach to the shared header, dates sit below them, and the continuous half-hour grid fills the viewport beneath a transparent floating selection/Reserve tray and the shared dock. Lavender/plum styling is scoped to Study Rooms, including its raised Apps rounded square. This supersedes earlier Study Rooms color, time-tile and date/resource ordering descriptions. [Current scope, verification and release record](study-rooms/LAVENDER-SOFTFORM-2026-10-19.md).

Local release gates passed: 387 application tests, 198 additional PostgreSQL permission assertions, TypeScript/production build, and the complete 131-case browser suite with no exclusions. The older sign-in/resend, time-dependent Display and midnight-sensitive Work Mission fixture failures were repaired in tests only. Responsive screenshots and real-route synthetic bookings were checked at 320, 390 and 1280 px; this is not physical-phone or real hosted booking acceptance.

Released October 19 at 07:09 UTC from `2f80bbd773e61cda59eaf9d01b12337fba766496`. Deployment `dpl_J9vTBQ2woZQ8a6abcCKicnUBxzVj` is READY with `lvz.app` and `www.lvz.app` aliases. The live Study Rooms page returns HTTP 200 and identifies this exact deployment; its three loaded CSS chunks include the lavender/plum tokens, attached tabs, viewport layout and standard 6 px / 12 px glass blur. The canonical `www` redirect returns 308 to `lvz.app`.

Read-only live GET checks of Study Rooms availability and administration returned HTTP 401 without an application member session. No production booking transaction was used for this verification.

## Infrastructure and verified release

- Repository: `lovelaceaml-hub/lvzion-official`.
- Vercel: `lvzion-official`, project `prj_4icc6S1jw8OVKWD9AOI1oiB5fwYe`, team `lvzion`.
- Supabase: `otecqlkqirncotytbfns`, Las Vegas Zion organization.
- Production source: `2f80bbd773e61cda59eaf9d01b12337fba766496`.
- Production deployment: `dpl_J9vTBQ2woZQ8a6abcCKicnUBxzVj`, READY, `lvz.app` and `www.lvz.app` aliases verified.
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

The owner-requested organization has four age categories, two groups per category and two units per group. Existing verified organization workflows and signup safeguards are unchanged by the calendar correction. See [member instructions](USER-MANUAL.md), [organization workflow](ORGANIZATION-WORKFLOW.md) and the authentication-specific setup records for implementation details.

## Other module boundaries

Contacts remains an explicitly granted private owner workspace. Preserve forced RLS, author-only notes, do-not-contact and audit controls. Sharing, export and communications remain separately controlled. [Owner guide](contacts/USER-GUIDE.md), [operations](contacts/OPERATIONS.md), [verification](contacts/VERIFICATION.md).

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
