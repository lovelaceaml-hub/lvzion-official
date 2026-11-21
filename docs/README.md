# LV Zion Official documentation

Start with [lvz.app](https://lvz.app), `AGENTS.md` and the [current handoff](HANDOFF.md). All modules are part of one self-contained application. Schedules, materials, assignments and configuration are deliberately created for this system; empty calendars are valid.

## Current guides

- [Current handoff and deployed source](HANDOFF.md)
- [Fresh-start correction and verification — October 16, 2026](FRESH-START-2026-10-16.md)
- [Member and organization guide](USER-MANUAL.md)
- [Release and privacy controls](RELEASE-GATES.md)
- [Hosted migration ledger](HOSTED-MIGRATION-LEDGER.json)
- [Organization workflow](ORGANIZATION-WORKFLOW.md)
- [Product decisions](PRODUCT-DECISIONS.md)
- [Day Sheet design contract](design/LVZ-DESIGN-CONTRACT.md)
- [Device appearance choices and focused verification](design/APPEARANCE.md)
- [Authentication and domain setup](DOMAIN-SETUP.md)

## Module guides

| Module | Guides | Boundary |
|---|---|---|
| Event Invitation and Registration | [Concert guide](concert/README.md), [motion and release checks](concert/VERIFICATION.md) | Animated public RSVP, ticket help, named invitations, private film playback and staff check-in. |
| Study Rooms | [Current operations](study-rooms/README.md) | Open to every signed-in member after the October 24 migration; booking enabled; optional, explicitly configured restrictions; private history and conflict protection. |
| Contacts | [Scope](contacts/README.md), [owner guide](contacts/USER-GUIDE.md), [operations](contacts/OPERATIONS.md), [verification](contacts/VERIFICATION.md) | Private owner workspace; sharing, export and communications remain separately controlled. |
| Groups & Gospel Planning | [Status and approvals](gospel-planning/README.md) | Live and approved for signed-in members since migration `20261024170000_open_access_group_placement` (October 24); places and Gospel roles still to be set up. |
| Continuous Display | [Operations](continuous-display/OPERATIONS-R2.md) | Reviewed publications, explicit device pairing and separate physical-TV acceptance. |
| Work Mission Prayer | [Completion](morning-prayer/COMPLETION-R5.md), [interface guide](morning-prayer/SIMPLER-R6.md) | Owner-supplied dates/materials/links; explicit host/member access and controlled distribution. |

## Evidence and historical milestones

Milestone-specific test counts, schema reviews and screenshots describe the version named in that record. They are not current product requirements and must not override AGENTS.md, the current handoff or the October 16 fresh-start correction. Documentation commits alone do not redeploy runtime code.

Authentication and organization evidence remains in [actual-app setup](ACTUAL-APP-SETUP.md), [organization run index](runs/organization-workflow/INDEX.md), [signup run index](runs/self-service-signup/INDEX.md) and module-specific release records. Review SQL files are references, never instructions to replay completed migrations or widen permissions. Fixtures and screenshots containing fictional data must never be used as live schedules or member records.
