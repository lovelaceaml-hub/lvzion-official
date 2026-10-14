# Worship Duty — launch status

**October 14, 2026: NOT LAUNCHED.** The user has requested completion through real launch. Additional blanket permission to deploy is not the missing prerequisite. Required backend implementation, account setup and end-to-end verification are still incomplete; no production promotion was performed.

## Directly verified hosted state

A read-only aggregate query against the designated Las Vegas Zion project `otecqlkqirncotytbfns` returned:

| Item | Count |
|---|---:|
| Auth users | 0 |
| Members | 0 |
| Linked member accounts | 0 |
| Current leadership appointments | 0 |
| Worship private tables | 0 |
| Public Worship workspace/query/command RPCs checked | 0 |

The Vercel alias `lvz.app` still targets deployment `dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk` (`lvzion-official-1jnh1hs8m-lvzion.vercel.app`). It was not moved to the development branch. The original Firebase Worship Duty application and its database remain unchanged.

The member foundation and Worship PRs were read live. PR #2 and PR #5 remained draft and unmerged. No other application's branch, PR, configuration or data was changed.

## Actual execution blocker

An attempted copy of the existing, committed R1 SQL into a disposable native-verification workspace was blocked by the tool's safety check before execution. It was not a successful migration or a passing native database test. It was not retried via a different tool or encoded payload. The earlier R3 migration-write block remains documented in `R3-VERIFICATION.md`.

No new SQL was installed in the hosted project. No new hosted Auth identity was provisioned. Existing hosted-reference and release guards were not removed. The fact that embedded PostgreSQL tests pass does not prove an actual hosted Auth-to-PostgREST deployment.

## Unblocked implementation completed

Commit `abfb7fc5392c115376d8df8c45e5d723624ffdc2` adds a memory-only unsaved-plan hook. Commit `dca18bcfa3fb102fc82c5108d4c5ff69f0359452` applies it to the authenticated/shared Presider workspace.

Service changes, section changes, the LV Zion back link, the layout link and manual Reload now require an explicit discard decision when a song plan has unsaved edits. Cancelling preserves the selected service and draft. Successful saves clear the warning. Best-effort browser-unload protection is installed without persisting private data. Authorization revocation still clears prior private data rather than being held open by a draft dialog. Development-only persona/reset controls remain explicit simulation controls, not member authentication.

No runtime activation setting, database migration, dependency, shared member-foundation file, domain or production environment was changed by this fix.

## Verified results for this pass

Tested application commit: `dca18bcfa3fb102fc82c5108d4c5ff69f0359452`.

Deployment: `dpl_53TsLsV6m12kMbxKugjDQRAWLx5W`, preview target, READY. URL: `https://lvzion-official-591oqkajn-lvzion.vercel.app/worship-duty-preview/connected` (protected; no temporary access token is stored in this document).

| Verification | Result |
|---|---|
| TypeScript and Next.js build | PASS |
| Existing combined Node suite | 198 passed; zero failed or skipped |
| Existing foundation PostgreSQL permission suite | 111 assertions passed |
| New deployed browser release-UI suite | 20 checks passed; exit 0 |
| Native Auth/PostgreSQL verification attempted in this pass | BLOCKED before execution; not passed |
| Hosted real-account end-to-end verification | NOT COMPLETED |
| R3 durable planning/backend verification | NOT IMPLEMENTED |

The browser run completed at `2026-10-14T13:44:27.819Z`, command `cmd_84bf75a6ec76414bb19576bdc682`. It tested service/tab/back/reload discard cancellation, explicit discard, successful save followed by navigation, uncertain-save recovery, copied draft labels, revoked-access clearing, Presider widths 320/390/430/768/1280, preserved R1/R3 route smoke checks and the disabled operational endpoint. There were no page exceptions or attempted real-backend calls during fictional workflows. The separate API GET probe returned 503 with `code: disabled` and private/no-store headers.

These 20 checks do not replace the complete earlier 29-check R2 or 40-check R3 browser suites, which were not rerun in this pass. Persisted values in this browser suite refer only to the rehearsal's in-memory transport.

Reproduce the new browser check with the committed Node 24 dependency lockfile and an authorized fictional preview URL supplied locally:

```sh
WORSHIP_PREVIEW_URL="$AUTHORIZED_WORSHIP_PREVIEW_URL" node scripts/verify-worship-release-ui.mjs
```

Require successful process exit, `succeeded: true` and all 20 checks. A partial JSON report is not a pass.

## Remaining work in dependency order

1. **Persistent planning implementation.** R3 month batching, service lifecycle, qualification/default settings and coordinator authority are still fictional-only. They need reviewed server commands, scoped queries, restrictive permissions and activity/history reconciliation before they can run the real schedule.
2. **Verified member foundation and identity setup.** Establish a verified initial administrator and that member's correct primary placement; establish independent department, song-editor and service-coordinator appointments. No real appointment has been inferred from technical ownership or copied from legacy PIN/name data.
3. **Controlled environment setup.** Reconcile repository and hosted migration ledgers and verify supported database execution. Configure account activation/recovery delivery, trusted origins and cookies securely. Secrets and passwords belong in the services' secure setup, not chat, source files or logs. Never enable an unrestricted first-user-becomes-admin mechanism.
4. **Actual integrated verification.** Prove sign-in, scoped reads/writes, refresh in separate sessions, permission revocation and simultaneous edits against a disposable real-service environment. Verify a backup restore, physical devices and remaining accessibility behavior. Only then apply the reviewed release to the designated hosted project.
5. **Real production release.** Reconcile the approved foundation dependency without including other workstreams, stage and test the actual production build/configuration, then promote and verify the permanent domain with a real authorized account. A READY fictional preview or a domain alias change alone is not launch completion.

Historical Fill algorithms, comprehensive song-history/catalog administration, weekly/per-service availability administration and external reminders/calendar subscriptions are also unfinished. Their absence must be explicit in any agreed initial-release scope. Manual scheduling does not justify claiming historical algorithm parity.

## User-specific decisions still needed

The initial operational administrator and primary age-category/group/unit placement, plus who receives each independent Worship authority, have not been established in the available instructions or live database. The user does not need to repeat the repository, domain, project IDs, or general launch authorization. These decisions are separate from the technical database execution blocker and will not by themselves make the incomplete backend launchable.

## Preserved operational boundary

No real member import, original-app modification, external message, hosted Auth creation, database migration application, runtime-guard removal, production alias/environment change, merge or production promotion was performed in this pass. The development branch contains the tested correction and an honest release handoff; the real application is not available for operational use yet.
