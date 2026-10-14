# LV Zion Official documentation

Start with the actual app at [lvz.app](https://lvz.app). Current documentation describes implemented behavior and explicit module limits. Historical test and preview records retain their original milestone scope and do not authorize further preview publication.

## Current guides and operational records

- [Current handoff and deployed source](HANDOFF.md)
- [Member and organization guide](USER-MANUAL.md)
- [Actual-app setup and chronological receipts](ACTUAL-APP-SETUP.md)
- [Release controls](RELEASE-GATES.md)
- [Domain and authentication email](DOMAIN-SETUP.md)
- [Hosted migration ledger](HOSTED-MIGRATION-LEDGER.json)
- [Completed organization workflow and Build log](ORGANIZATION-WORKFLOW.md)
- [Organization run index](runs/organization-workflow/INDEX.md)
- [Documentation audit and validation](DOCUMENTATION-AUDIT.md)
- [Product decisions, with later implementation updates](PRODUCT-DECISIONS.md)

## Module contracts and evidence

| Module | Latest guide or release record | Limits |
|---|---|---|
| Contacts | [R5 owner experience](contacts/OWNER-EXPERIENCE-R5.md), [initial owner release](contacts/LIVE-OWNER-RELEASE.md) | Private owner scope; sharing/export/messages off; real owner save/reload acceptance outstanding |
| Study Rooms | [Current status](study-rooms/README.md), [cutover runbook](study-rooms/CUTOVER-RUNBOOK.md), [R4 controls](STUDY-ROOM-R4-LIVE.md) | Booking gate closed; legacy scheduler remains authoritative |
| Continuous Display | [R2 operations](continuous-display/OPERATIONS-R2.md), [initial contract](continuous-display/LIVE-RELEASE.md), [initial verification](continuous-display/LIVE-VERIFICATION.md) | No published content/paired TV; R2 operations deployed; physical TV acceptance outstanding |
| Work Mission Morning Prayer | [Live setup](morning-prayer/LIVE-SETUP.md) | Empty schedules/materials; member meeting access and outgoing distribution gated |
| Worship Duty (integration **not live**) | [Status](worship-duty/README.md), [Work handoff](worship-duty/WORK-HANDOFF.md), [release checklist](worship-duty/PRODUCTION-RELEASE-CHECKLIST.md) | Draft PR #25; owner setup UI/API unfinished; four migrations unapplied; original Firebase app unchanged |

These module records contain historical test receipts and release prerequisites. Use the current handoff for the observed hosted snapshot. SQL review/activation files are references, never instructions to rerun completed migrations or broaden grants.

## Complete file catalog

The catalog includes guides, historical plans, run records, JSON evidence, screenshots and SQL references. Files under design/ and older verification reports are historical, not representations of the current live app. Source code and tests remain in their normal repository directories.

- [ACTUAL-APP-SETUP.md](ACTUAL-APP-SETUP.md)
- [APP-INTEGRATION-FRAMEWORK.md](APP-INTEGRATION-FRAMEWORK.md)
- [AUTONOMOUS-FOUNDATION-R6.md](AUTONOMOUS-FOUNDATION-R6.md)
- [DOCUMENTATION-AUDIT.md](DOCUMENTATION-AUDIT.md)
- [DOMAIN-SETUP.md](DOMAIN-SETUP.md)
- [HANDOFF.md](HANDOFF.md)
- [HOSTED-MIGRATION-LEDGER.json](HOSTED-MIGRATION-LEDGER.json)
- [MEMBER-SYSTEM-IMPLEMENTATION.md](MEMBER-SYSTEM-IMPLEMENTATION.md)
- [MEMBER-SYSTEM-VERIFICATION.md](MEMBER-SYSTEM-VERIFICATION.md)
- [MOBILE-HOME-IMPLEMENTATION.md](MOBILE-HOME-IMPLEMENTATION.md)
- [ONBOARDING-COMPLETION.md](ONBOARDING-COMPLETION.md)
- [ORGANIZATION-WORKFLOW.md](ORGANIZATION-WORKFLOW.md)
- [PLAN-SELF-SERVICE-SIGNUP.md](PLAN-SELF-SERVICE-SIGNUP.md)
- [PRODUCT-DECISIONS.md](PRODUCT-DECISIONS.md)
- [RELEASE-GATES.md](RELEASE-GATES.md)
- [STUDY-ROOM-LAUNCH-READINESS.md](STUDY-ROOM-LAUNCH-READINESS.md)
- [STUDY-ROOM-LIVE-RELEASE.md](STUDY-ROOM-LIVE-RELEASE.md)
- [STUDY-ROOM-R2.md](STUDY-ROOM-R2.md)
- [STUDY-ROOM-R3-VERIFICATION.md](STUDY-ROOM-R3-VERIFICATION.md)
- [STUDY-ROOM-R3.md](STUDY-ROOM-R3.md)
- [STUDY-ROOM-R4-LIVE.md](STUDY-ROOM-R4-LIVE.md)
- [STUDY-ROOM-VERIFICATION.md](STUDY-ROOM-VERIFICATION.md)
- [UI-SIGNUP-VERIFICATION.md](UI-SIGNUP-VERIFICATION.md)
- [USER-MANUAL.md](USER-MANUAL.md)
- [contacts/LIVE-OWNER-RELEASE.md](contacts/LIVE-OWNER-RELEASE.md)
- [contacts/OWNER-EXPERIENCE-R5.md](contacts/OWNER-EXPERIENCE-R5.md)
- [contacts/owner-pilot-schema.sql](contacts/owner-pilot-schema.sql)
- [continuous-display/LIVE-RELEASE.md](continuous-display/LIVE-RELEASE.md)
- [continuous-display/LIVE-VERIFICATION.md](continuous-display/LIVE-VERIFICATION.md)
- [continuous-display/OPERATIONS-R2-SCHEMA-REVIEW.sql](continuous-display/OPERATIONS-R2-SCHEMA-REVIEW.sql)
- [continuous-display/OPERATIONS-R2.md](continuous-display/OPERATIONS-R2.md)
- [continuous-display/live-activation.sql](continuous-display/live-activation.sql)
- [continuous-display/live-schema-review.sql](continuous-display/live-schema-review.sql)
- [design/signup/signup-desktop.png](design/signup/signup-desktop.png)
- [design/signup/signup-phone.png](design/signup/signup-phone.png)
- [design/signup/unassigned-phone.png](design/signup/unassigned-phone.png)
- [evidence/ORGANIZATION-LIVE.json](evidence/ORGANIZATION-LIVE.json)
- [evidence/R6-VERIFICATION.json](evidence/R6-VERIFICATION.json)
- [evidence/SELF-SERVICE-SIGNUP.json](evidence/SELF-SERVICE-SIGNUP.json)
- [morning-prayer/LIVE-SETUP.md](morning-prayer/LIVE-SETUP.md)
- [morning-prayer/README.md](morning-prayer/README.md)
- [morning-prayer/VERIFICATION.md](morning-prayer/VERIFICATION.md)
- [morning-prayer/schema-review.sql](morning-prayer/schema-review.sql)
- [runs/organization-workflow/INDEX.md](runs/organization-workflow/INDEX.md)
- [runs/organization-workflow/lanes/ST1.md](runs/organization-workflow/lanes/ST1.md)
- [runs/organization-workflow/lanes/ST2.md](runs/organization-workflow/lanes/ST2.md)
- [runs/organization-workflow/lanes/ST3.md](runs/organization-workflow/lanes/ST3.md)
- [runs/self-service-signup/INDEX.md](runs/self-service-signup/INDEX.md)
- [runs/self-service-signup/lanes/S1.md](runs/self-service-signup/lanes/S1.md)
- [screenshots/actual-app-sign-in.jpg](screenshots/actual-app-sign-in.jpg)
- [screenshots/actual-app-signup.jpg](screenshots/actual-app-signup.jpg)
- [screenshots/organization-live.jpg](screenshots/organization-live.jpg)
- [study-rooms/CUTOVER-RUNBOOK.md](study-rooms/CUTOVER-RUNBOOK.md)
- [study-rooms/README.md](study-rooms/README.md)
- [worship-duty/DATA-MODEL.md](worship-duty/DATA-MODEL.md)
- [worship-duty/IMPLEMENTATION-STATUS.md](worship-duty/IMPLEMENTATION-STATUS.md)
- [worship-duty/MIGRATION-STATUS.md](worship-duty/MIGRATION-STATUS.md)
- [worship-duty/PRODUCTION-RELEASE-CHECKLIST.md](worship-duty/PRODUCTION-RELEASE-CHECKLIST.md)
- [worship-duty/README.md](worship-duty/README.md)
- [worship-duty/REFERENCE-AUDIT.md](worship-duty/REFERENCE-AUDIT.md)
- [worship-duty/STATUS-EVIDENCE.json](worship-duty/STATUS-EVIDENCE.json)
- [worship-duty/VERIFICATION-PLAN.md](worship-duty/VERIFICATION-PLAN.md)
- [worship-duty/WORK-HANDOFF.md](worship-duty/WORK-HANDOFF.md)
