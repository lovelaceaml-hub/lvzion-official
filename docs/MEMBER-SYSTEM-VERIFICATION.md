# Member-system verification

> **Historical member-foundation review; not current production status.** This file preserves the original branch, test results and launch gates **at the time they were recorded**. The real platform and verified signup are now live at `lvz.app`; for current owner scope, module access, migration state and remaining tests read [CURRENT-STATUS.md](CURRENT-STATUS.md) and [RELEASE-GATES.md](RELEASE-GATES.md). Do not replay historic migrations or treat a past preview status as today's production state.

Current completion record: [ONBOARDING-COMPLETION.md](ONBOARDING-COMPLETION.md).

| Current check | Result |
| --- | --- |
| Clean npm install, strict TypeScript, Next.js build | Passed |
| Node contracts, config guards and fictional UI logic | 42 passed |
| Disposable PostgreSQL/PGlite permissions and bootstrap | 75 assertions passed |
| Real local Supabase Auth + PostgREST + Next.js + SMTP | 42 assertions passed |
| Real bearer-session revocation and concurrent retries | 5 assertions passed |
| Chromium phone-viewport browser workflows | 8 passed |

The 47 real-service assertions were rerun from a fresh local stack. Test mail was accepted by a loopback-only SMTP sink, never a real mailbox. Hosted sign-in remains unverified and disabled after a tool block on hosted test-account provisioning. The new hosted database has schema only: 17 RLS-protected tables, zero members/accounts/invitations. No real data was imported.

The previous milestone separately passed 53 native PostgreSQL assertions and the same suite after a local dump/restore. That historical restore check is not a new-onboarding or hosted PITR verification. Likewise, browser phone emulation is not physical Safari testing. New code is TypeScript; the original JSX prototype is retained.
