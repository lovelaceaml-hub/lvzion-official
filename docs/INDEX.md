# LV Zion Official — documentation index

**Current operational navigation — October 14, 2026 (Pacific).** The permanent application is **[lvz.app](https://lvz.app)**. This is the independent `lovelaceaml-hub/lvzion-official` repository and its Las Vegas Zion Supabase project, **not** an older LV Zion app/database.

## Start here

| Need | Canonical reference |
| --- | --- |
| Current release and workstream handoff | [HANDOFF.md](HANDOFF.md) |
| General members, signup, hierarchy and placement | [USER-MANUAL.md](USER-MANUAL.md) |
| Latest verified Contacts owner-only scope | [Contacts README](contacts/README.md) |
| Instructions for using Contacts | [Contacts user guide](contacts/USER-GUIDE.md) |
| Contacts deployment, permissions and rollback | [Contacts operations](contacts/OPERATIONS.md) |
| Contacts test evidence and open acceptance checks | [Contacts verification](contacts/VERIFICATION.md) |
| Current verified application setup and email history | [ACTUAL-APP-SETUP.md](ACTUAL-APP-SETUP.md) |
| Production release controls | [RELEASE-GATES.md](RELEASE-GATES.md) |
| Reconciliation of repository versus hosted migrations | [HOSTED-MIGRATION-LEDGER.json](HOSTED-MIGRATION-LEDGER.json) |
| Maintainer/test commands | [AGENTS.md](../AGENTS.md) |

## Module records

- **Contacts:** [current owner-only module](contacts/README.md); historical initial live release [R4](contacts/LIVE-OWNER-RELEASE.md) and expanded owner UI [R5](contacts/OWNER-EXPERIENCE-R5.md). The wider Shared Contact Tracker has **not** been enabled.
- **Study Room Reservation:** [R4 live operations record](STUDY-ROOM-R4-LIVE.md). Review its separate booking gates and current runbook before changing reservations.
- **Morning Prayer:** [module setup and scope](morning-prayer/LIVE-SETUP.md), [README](morning-prayer/README.md).
- **Continuous Display:** [release record](continuous-display/LIVE-RELEASE.md), [verification](continuous-display/LIVE-VERIFICATION.md).
- **Member hierarchy:** [organization workflow](ORGANIZATION-WORKFLOW.md).

Do not assume every module has identical permissions or that a registered module has every proposed feature enabled. Always check the *specific module's* granted audience, server/database gates and release record.

## Current versus historical documentation

Documentation named `PLAN-*`, `AUTONOMOUS-*`, `*-IMPLEMENTATION.md`, early `*-VERIFICATION.md`, and `PRODUCT-DECISIONS.md` includes valuable design decisions and point-in-time evidence. Some were written **before real lvz.app signup and module releases**, so statements such as “site paused,” “prototype only,” or “no official module” are historical—not instructions to disable or recreate the current production app.

**Source-of-truth order for operational status:** live provider state and deployed commit, reconciled hosted migration ledger, current module release record, then older development notes. GitHub `main` may contain documentation commits not yet redeployed: **automatic Vercel Git deployments are disabled**, so a push alone does not modify the live application. No code release or database change is implied by documentation-only commits.

Never place real member/contact records, credentials, email addresses, secret settings or Auth tokens in documentation, Git diffs, screenshots or test fixtures.
