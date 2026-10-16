# LV Zion Official — current handoff

Updated October 16, 2026. This handoff and `AGENTS.md` describe the application to build and operate now. Milestone-specific release records are evidence, not additional product requirements.

## Authoritative requirements

LV Zion Official is a self-contained, phone-first application at https://lvz.app. Only explicitly approved requirements govern its modules. All schedules, assignments and events are deliberately configured within this application; empty calendars are valid. A design reference supplies appearance or interaction, not data or scheduling policy. Preserve existing accounts, grants, organizational history and intentionally entered records.

Keep compact module headers and the prominent center Apps launcher. The launcher shows only server-authorized modules. Continue the approved [Day Sheet design contract](design/LVZ-DESIGN-CONTRACT.md), shared tokens, accessible controls and phone-first layouts.

## Infrastructure and verified release

- Repository: `lovelaceaml-hub/lvzion-official`.
- Vercel: `lvzion-official`, project `prj_4icc6S1jw8OVKWD9AOI1oiB5fwYe`, team `lvzion`.
- Supabase: `otecqlkqirncotytbfns`, Las Vegas Zion organization.
- Production source: `dfad3817911f2ba195a21762986f54cceed46d78`.
- Production deployment: `dpl_HxTFTX6mRCn4JAUH3Mv4mSsuj7ZC`, READY, `lvz.app` and `www.lvz.app` aliases verified.
- Fresh calendar correction: repository migration `20261016180000_study_rooms_fresh_calendar.sql`, applied hosted version `20261016173939`.

Documentation-only commits after the runtime source do not require another deployment. Read current provider state rather than assuming a recorded snapshot cannot change. Automatic Git deployments remain disabled; no unrequested previews are authorized.

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

Work Mission uses owner-supplied dates, hosts, materials and meeting links. Schedule/material/people management and the protected meeting broker remain intact. Do not infer dates or enable outbound distribution. Real owner save/member join and physical-device acceptance remain distinct checks. [Completion](morning-prayer/COMPLETION-R5.md), [interface](morning-prayer/SIMPLER-R6.md).

## Development and recovery

Follow [release controls](RELEASE-GATES.md). Reconcile the [hosted ledger](HOSTED-MIGRATION-LEDGER.json), including the October 16 correction, before applying SQL. Do not replay applied migrations or use a blind database push. Never use fictional fixtures against production; the fixture seed now explicitly refuses hosted Auth schemas.

Keep secrets in provider stores or personal Keychain. Preserve all existing authorization boundaries. Test the changed workflow and its denial paths, then verify exact deployed source and aliases. Choose a schema-compatible verified deployment for recovery; do not delete history, restore unapproved defaults or widen permissions as a rollback shortcut.
