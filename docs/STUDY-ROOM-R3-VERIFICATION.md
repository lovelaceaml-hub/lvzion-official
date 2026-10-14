# R3 Git-backed and deployed verification — October 14, 2026

> **Historical checkpoint — not the current production state.** This page captures the earlier development checkpoint; its 'unapplied', 'draft', 'not implemented' and 'not deployed' statements reflect that past date, not the current R4 state. Booking is still closed pending Firebase migration. See the [current Study Room status](study-rooms/README.md), [R4 production evidence](STUDY-ROOM-R4-LIVE.md) and [cutover runbook](study-rooms/CUTOVER-RUNBOOK.md).


This supplements `STUDY-ROOM-R3.md` with results inspected after the complete UI commit. It does not authorize production activation.

## Pinned implementation and preview

- Runtime implementation commit: `8aa90576801aa8c500fefec90ba9738a75270457`.
- Tested implementation plus regression/evidence commit: `19dec2ffcffe80461b7782db6e1e3768556ce589`. Application runtime is unchanged from the implementation commit.
- Draft reconciliation PR: https://github.com/lovelaceaml-hub/lvzion-official/pull/9.
- Latest verified deployment: `dpl_8aTAUW62RxLgMY63AziAZza9XF6u`, Git SHA `19dec2ffcffe80461b7782db6e1e3768556ce589`.
- Exact verified preview: https://lvzion-official-aepf9a6am-lvzion.vercel.app/study-rooms-preview.
- Actual branch alias returned by Vercel: https://lvzion-official-git-feature-study-rooms-reconcili-c76302-lvzion.vercel.app/study-rooms-preview.
- Verified deployment source: Git; state READY; not a production-target deployment.

The earlier implementation deployment `dpl_Hf318Sss8K86cL99MXMDbSGrrF7K` at https://lvzion-official-4crid1urd-lvzion.vercel.app/study-rooms-preview was also verified. The structured JSON evidence pins that initial implementation milestone. The latest deployment above independently passed the same full build and all 27 selected browser checks. The previous long-form branch URL was corrected to Vercel's actual shortened alias; do not construct branch aliases from the branch name.

## Actual Git-backed checks

Vercel build logs for both pinned deployments report **156 application tests passed, zero failures/skips**, followed by **111 PostgreSQL foundation permission assertions passed** and successful optimized Next.js compilation/TypeScript/page generation. These are results from the full repository at the pinned Git commits, not from the older sandbox snapshot.

Reservation SQL regression is R1 **41**, R2 **42**, R3 **57** assertions. The R3 migration and regression SQL in the native workspace were checked against their committed Git blob hashes. The new R3 assertions cover entire-bundle rollback, one identity/activity/receipt, access boundaries, private history, stale editors, accessory closure/disable conflicts and all-resource release.

Native PostgreSQL additionally passed **243 recorded SQL assertions**, three real competing-transaction scenarios and a local fictional backup/restore drill. That count includes the reservation SQL assertions; it is not additive to the same assertions executed under PGlite. The native harness's separate bootstrap setup runs before the six counted scripts, so its recorded total is not the same counting boundary as the 111-assertion foundation runner.

## Deployed browser checks

**27 passed, zero failed/skipped/flaky**, against each pinned Vercel deployment in Chromium with iPhone-sized emulation. The selected suite comprises 22 Study Room checks and five generic module-runtime checks. It reruns the earlier reservation flows and adds combined-resource booking/edit/cancel, private history, explicit manager separation, responsive layout, keyboard focus and history-endpoint denial.

Three refresh checks deliberately use browser-intercepted synthetic API responses to verify focus/access-loss clearing, BroadcastChannel invalidation and stale-cancellation feedback. They test the deployed client implementation, not hosted authentication or real cross-device persistence. The other preview interactions use fictional in-memory records. Unauthenticated endpoint denial tests reached the actual deployed application endpoints after authorized Vercel preview access.

The earlier anonymous malformed-command assertion was changed from 400 to 401 because authentication now precedes payload validation. This preserves denial and avoids processing anonymous commands; it does not relax authorization.

Protected preview access was obtained through the connected Vercel authorization flow. Temporary access material and browser storage state were kept out of Git and this evidence record. No protection policy was disabled or broadened.

## Release boundary remains closed

A final read-only hosted migration check still returned only:

```
20261014051733 member_system_foundation
20261014051804 member_command_hardening
20261014051924 member_onboarding
```

No module-runtime or Study Room migration was applied. No member grants, invitations, real notifications, imports or production aliases were changed. No original scheduler or concurrent workstream branch was modified.

Still required: hosted-ledger reconciliation; authorized isolated genuine Auth/PostgREST and hosted restore verification; real iPhone/Safari and multi-device checks; comprehensive accessibility/security review; weekly service-rule editing and policy-specific exceptions where needed; confirmed inventory/hours/restrictions; approved managers/pilot participants; explicit production release approval.
