# Worship Duty: LV Zion Official module

**Status as inspected October 14, 2026 (Las Vegas): IN DEVELOPMENT; NOT DEPLOYED OR ENABLED.**

Worship Duty is a module of the [lvz.app](https://lvz.app) member platform, using its shared Supabase project, sign-in and member records. The intended route is **[/modules/worship-duty](https://lvz.app/modules/worship-duty)**, but do not treat that link as operational until the launch checklist is complete.

Under the October 16, 2026 fresh-start boundary in the root `AGENTS.md`, this module has no knowledge of any separate application. Services, assignments, qualifications and songs start empty and come only from records deliberately configured in this app. An empty schedule is a valid state.

## Source of truth

| Item | Reference |
| --- | --- |
| Current development | [Draft production-integration PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25), branch `feature/worship-duty-live`; refactor and redesign in draft PR #48 |
| Live app repository | `lovelaceaml-hub/lvzion-official`, `main`; changes in concurrent workstreams must be preserved |
| Vercel | `lvzion` team / `lvzion-official` project; production domain `lvz.app` |
| Supabase | Las Vegas Zion organization; project `otecqlkqirncotytbfns` |
| Historical Worship development | [PR #5](https://github.com/lovelaceaml-hub/lvzion-official/pull/5), a draft stacked on an outdated member-foundation branch; **do not merge it directly** |

### Current production evidence, not a release claim

Read-only hosted inspection during the October 14 documentation update found **zero** registered Worship modules, Worship private tables, public Worship RPCs, or active Worship module grants. The real site is deployed with member signup, organization administration and other modules, but the Worship integration has **not** been merged, migrated, activated or released. Other modules' schema and deployments are outside this workstream.

The integration branch contains the scoped module UI/API and **five unapplied Worship-specific SQL files** (see [MIGRATION-STATUS.md](MIGRATION-STATUS.md)). Historical R3 month planner and Fill suggestions used fictional in-memory state and **are not production functionality**. There is no verified hosted Worship Duty session/write test.

## Read next

- [Work-mode continuation handoff](WORK-HANDOFF.md): continuation instructions, exact projects, pending work, and safe release sequence.
- [Current implementation and feature inventory](IMPLEMENTATION-STATUS.md): code map, identity model, feature boundaries.
- [Production release gates](PRODUCTION-RELEASE-CHECKLIST.md): verifiable acceptance criteria and rollback.
- [Pending migrations and environment gating](MIGRATION-STATUS.md): intended order and never blindly replaying migrations.
- [Test and verification plan](VERIFICATION-PLAN.md): mandatory checks and the difference between fictional tests and real service verification.
- [Machine-readable snapshot](STATUS-EVIDENCE.json): a **point-in-time** evidence record, not live telemetry.
- [Duty rules reference](REFERENCE-AUDIT.md): the approved 27-duty catalog, pairing rules and service applicability.
- [Data model audit](DATA-MODEL.md): R1 schema and R2 authenticated query intent.

## Non-negotiable boundaries

No alternate authentication, separate member table, external data source, automatic import, fabricated hierarchy, unapproved notifications, or new spending. Schedules start empty. New member accounts start Unassigned until authorized placement; department memberships and appointments are independent of group/unit placement. Module grants and approved status are checked server-side.

**Pushing this documentation does not deploy, enable or approve Worship Duty.** The feature branch remains for review and eventual verified integration.
