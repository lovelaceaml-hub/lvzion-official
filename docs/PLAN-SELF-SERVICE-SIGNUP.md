# LV Zion Official self-service signup

> **Historical development snapshot — not current production status.** Statements below that `lvz.app` is paused, hosts only a prototype, has inactive sign-in or has no official modules describe the earlier phase when this page was written. The actual platform and owner-only Contacts app are live. See [current documentation](INDEX.md), [handoff](HANDOFF.md) and [Contacts scope](contacts/README.md). Keep this record for design decisions and test history; do not replay its superseded activation instructions.

Anthony requested implementation in this continuing chat, with autonomous execution. This is a bounded development increment, with no production release or hosted activation.

## Section 1: Email signup and verified Unassigned member lifecycle

Setup: current Codex controller, high; solo implementation; controller review (external review waived by Anthony on 2026-10-14). No implementation helpers.

Baseline: clean member development branch at 5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b. No pre-existing dirty changes. Branch: feature/self-service-signup-r1, based on feature/member-system-secure-r1.

Acceptance:

- Verify Vercel production and exact member preview, GitHub PR state and hosted schema without changing them.
- Email/password signup with email ownership confirmation, provider CAPTCHA, origin/body limits, durable IP/identifier rate buckets and generic responses. Preserve existing-record invitations and username sign-in.
- No age category/group/unit at signup. Store intake without synthetic hierarchy entries. Expose only the person's own profile/history while Unassigned.
- Keep active membership and organizational/module authorization independent of own-record authentication.
- Authorized pastoral/member administration can independently verify membership and atomically choose an active unit, deriving its group/category. Reject stale or spoofed commands; record reason, actor and history; retry safely.
- Allow authorized signup decline without deleting history. Invalidate member access immediately.
- Reuse existing visual style, show Unassigned clearly, cover disabled/loading/error/success and phone keyboard/focus states.
- Verify application, PostgreSQL/RLS, phone-browser and real local Auth/SMTP paths. No hosted or external mail tests.
- Commit after controller review; Anthony waived the external security review. Privately back up after approval for the Git-triggered preview publication. Ask before any Git-triggered preview publication. Keep PRs draft.

Verification commands are in AGENTS.md. The branch's migration and activation switches are reviewed candidates only; rollback before activation is discard of this branch, with no hosted data impact. A later migration deployment needs its own approved rollout and rollback plan.

## Build log

2026-10-14: inspected the referenced conversation and current private GitHub repository. Restored the absent project checkout and created an isolated worktree. PRs #1 and #2 are draft/open and CLEAN; nine additional module PRs also remain draft/open. No merges performed.

2026-10-14: Vercel production dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk is READY at lvzion-official-1jnh1hs8m-lvzion.vercel.app with lvzion-official.vercel.app alias. It was a manual deployment, with no Git SHA in returned metadata. Production HTML identifies the earlier fictional design prototype. Main is only the initial repository scaffold. Member preview dpl_9iz6ExF6evSnWifseZqydvMyXxEr is READY at 5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b. No production changes.

2026-10-14: read-only Supabase inspection confirmed three applied foundation migrations, seventeen application tables, zero Auth users. Hosted enrollment and account settings were not changed. Auth SMTP/CAPTCHA settings were not exposed by the connected tools and remain unverified. Runtime source rejects the known hosted ref and disables access by default. New enrollment migration is local only.

2026-10-14: implemented email signup, explicit confirmation, own-account intake projection, independent leader verification/assignment/rejection, minimal private pending queue and fictional lifecycle review. Added local Mac Auth/PostgREST test support using pinned, checksum-verified official binaries and existing PostgreSQL libraries. No hosted identity-provisioning operation was retried.

2026-10-14: build and strict types passed with 119 application tests and 155 disposable PostgreSQL assertions. Real local signup integration passed 33 assertions. Existing invitation/recovery integration passed 42 assertions in a fresh disposable stack; a prior run against the signup-populated stack failed its fixed five-member fixture count and was replaced by the clean regression run. No production data was involved. Phone-browser verification and independent review are being completed.

2026-10-14: final build passed strict types, 120 application tests and 156 PostgreSQL assertions. All 31 phone-browser checks passed. Final local signup integration passed 37 assertions, including fragment confirmation, PKCE confirmation, email sign-in while Unassigned, duplicate account behavior, concurrent initial placement, refusal of stale changes, decline, rate buckets and replay prevention. The legacy invitation/recovery suite passed 42 assertions in its own fresh stack. All local Auth services stopped after tests.

2026-10-14: controller inspected the cumulative changes, default switches, public/private grants, own-account versus active-member authorization, direct RPC allowlist, preserved technical suspension, private pending queue, replay/history behavior, UI and test evidence. No secrets or real records enter the change set. Automatic approval review rejected an external Claude source review for missing destination-specific disclosure consent. Anthony replied that the security skill is not needed, so the external review was waived and was not run. No external review verdict is claimed. Publishing a private review branch/preview remains an approval step.

2026-10-14: Anthony approved publishing the tested development branch, creating its draft PR and verifying the fictional Vercel preview. This authorizes development publication only. Production promotion, migrations, hosted enrollment and account/provider settings remain outside scope.

2026-10-14: published private branch and created draft PR #12, stacked on the member foundation. Vercel preview dpl_BxXd5MdDLM1Fyj93AYiqjWoB27n2 reached READY at f8b4f8d. Fourteen hosted phone/browser/API assertions passed using an in-memory, origin-scoped Vercel authentication header. No token was printed or saved. The published signup API returned 503; the member API denied anonymous access. Production remained dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk. No hosted migration, Auth identity or account-setting changes. Development increment complete; real signup remains a separate activation milestone.
