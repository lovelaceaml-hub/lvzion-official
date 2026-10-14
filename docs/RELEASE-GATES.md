# Release gates

## Completed development work

Member schema, scoped commands, own-group directory, history-preserving transfers/status, independent departments and technical controls, request review, invitation flow, recovery, one-time operator bootstrap, phone management UI, pinned dependencies and repeatable automated tests are implemented. See `ONBOARDING-COMPLETION.md` and `MEMBER-SYSTEM-VERIFICATION.md` for actual results.

## Hosted activation gate

The new Supabase schema is applied, but there are zero hosted members or Auth accounts. Tool safety checks blocked hosted test-account provisioning. The temporary identity function is closed, unused bridge/fixture credentials were cleared, and hosted login/email remain off. Complete the approved hosted identity and mail setup, reconcile migration versions, and verify a designated test sign-in before enabling. This block was not bypassed through another tool or database writes.

## Before real people

Independent code/security review; physical iPhone/Safari and Android checks; hosted backup/PITR rehearsal; reviewed recovery procedure for members without personal email; approved organization labels; explicit authorization for any real-member pilot/import. Keep public production unchanged until a reviewed release. The official app lineup and `lvz.app` remain outside this milestone.

Neither PR #1 nor PR #2 should be merged automatically. No new GitHub Actions workflow was enabled; Vercel's build command runs the lightweight reproducible checks before building this review branch.
