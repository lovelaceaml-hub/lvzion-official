# Worship Duty — real LV Zion Official integration

**Status as inspected October 14, 2026 (Las Vegas): IN DEVELOPMENT; NOT DEPLOYED OR ENABLED.**

This workstream targets the **existing** [lvz.app](https://lvz.app) member platform, with its shared Supabase project, not a new website or a copy of the original Firebase system. The real intended module route is **[/modules/worship-duty](https://lvz.app/modules/worship-duty)**, but do not treat that link as operational until the launch checklist is complete.

## Source of truth

| Item | Reference |
| --- | --- |
| Current development | [Draft production-integration PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25), branch `feature/worship-duty-live` |
| Live app repository | `lovelaceaml-hub/lvzion-official`, `main`; changes in concurrent workstreams must be preserved |
| Vercel | `lvzion` team / `lvzion-official` project; production domain `lvz.app` |
| Supabase | Las Vegas Zion organization; project `otecqlkqirncotytbfns` |
| Historical Worship development | [PR #5](https://github.com/lovelaceaml-hub/lvzion-official/pull/5), a draft stacked on an outdated member-foundation branch — **do not merge it directly** |
| Original operational Worship app | [lv-zion-duties.web.app](https://lv-zion-duties.web.app) — **unchanged and independent** |

### Current production evidence, not a release claim

Read-only hosted inspection during this documentation update found **zero** registered Worship modules, Worship private tables, public Worship RPCs, or active Worship module grants. The current real site is deployed with member signup, organization administration and other modules, but the Worship integration has **not** been merged, migrated, activated or released. Other modules' schema and deployments are outside this workstream.

The new PR #25 contains the scoped R1/R2 module UI/API and **four unapplied Worship-specific SQL files**. The owner-only setup SQL is still a **draft**, with the setup API/UI and corresponding verification unfinished. Historical R3 month planner and Fill suggestions used fictional in-memory state, and **are not production functionality**. There is no verified hosted Worship Duty session/write test.

## Read next

- [Work-mode continuation handoff](WORK-HANDOFF.md) — autonomous continuation instructions, exact projects, pending work, and safe release sequence.
- [Current implementation and feature inventory](IMPLEMENTATION-STATUS.md) — code map, identity model, feature boundaries.
- [Production release gates](PRODUCTION-RELEASE-CHECKLIST.md) — verifiable acceptance criteria, cutover and rollback.
- [Pending migrations and environment gating](MIGRATION-STATUS.md) — intended order, untested assumptions, never blindly replay historical migrations.
- [Test and verification plan](VERIFICATION-PLAN.md) — mandatory checks and distinction between historical fictional tests and real service verification.
- [Machine-readable snapshot](STATUS-EVIDENCE.json) — a **point-in-time** evidence record, not live telemetry.
- [Historical reference audit](REFERENCE-AUDIT.md) — legacy 27-duty source review and parity boundaries.
- [Data model audit](DATA-MODEL.md) — R1 schema and R2 authenticated query intent; annotate its original historical scope.

## Non-negotiable boundaries

No alternate authentication, separate member table, Firebase/Google Sheet dependency, automatic legacy import, fabricated hierarchy, unapproved notifications, or new spending. Preserve the original app and database. New member accounts start Unassigned until authorized placement; department memberships and appointments are independent of group/unit placement. Module grants and approved status are checked server-side.

**Pushing this documentation does not deploy, enable or approve Worship Duty.** The feature branch remains for review and eventual verified integration.
