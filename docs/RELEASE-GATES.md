# Release gates

## Completed development work

Member schema, scoped commands, own-group directory, history-preserving transfers/status, independent departments and technical controls, request review, invitation flow, recovery, one-time operator bootstrap, phone management UI, pinned dependencies and repeatable automated tests are implemented. See `ONBOARDING-COMPLETION.md` and `MEMBER-SYSTEM-VERIFICATION.md` for actual results.

## Hosted activation gate

The new Supabase schema is applied, but there are zero hosted members or Auth accounts. Tool safety checks blocked hosted test-account provisioning. The temporary identity function is closed, unused bridge/fixture credentials were cleared, and hosted login/email remain off. Complete the approved hosted identity and mail setup, reconcile migration versions, and verify a designated test sign-in before enabling. This block was not bypassed through another tool or database writes.

## Before real people

Independent code/security review; physical iPhone/Safari and Android checks; hosted backup/PITR rehearsal; reviewed recovery procedure for members without personal email; approved organization labels; explicit authorization for any real-member pilot/import. Keep public production unchanged until a reviewed release. The official app lineup and `lvz.app` remain outside this milestone.

Neither PR #1 nor PR #2 should be merged automatically. No new GitHub Actions workflow was enabled; Vercel's build command runs the lightweight reproducible checks before building this review branch.

## Self-service signup candidate

The new enrollment migration and UI remain development-only. Both `LVZ_SELF_SERVICE_SIGNUP_ENABLED` and the private database enrollment switch default disabled. The known hosted-reference guard remains. Before an isolated hosted test, verify Supabase email confirmation, personal-email SMTP delivery, CAPTCHA enforcement, exact redirect origins and a token-hash confirmation email template. The template should link to the fragment-based `/auth/continue` path, with type signup; never consume email tokens on a GET. The standard PKCE redirect path `/signup/confirm` also requires a deliberate button action and the originating browser. Signup and mail remain restricted to approved test addresses until a separate reviewed release. Do not enable anonymous Auth or auto-confirm email.

Bootstrap an explicitly authorized operator before opening signup: the existing one-time foundation bootstrap requires an empty member table. Do not alter it or create real accounts as a workaround. No costs, original-app changes, domain changes or roster import are needed for this candidate.

The database independently checks verified email against its operator-configured enrollment allowlist, so direct Auth/RPC callers cannot bypass the application's isolated-test recipient list. Defaults permit no addresses. The local fictional stack explicitly permits only example.invalid. A future real signup release must explicitly approve broader database scope and application recipient handling. Provider CAPTCHA applies to signup and sign-in, so both forms pass a bounded token to Supabase. Recovery uses the existing server-controlled, rate-limited mail workflow.
