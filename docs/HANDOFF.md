# LV Zion Official handoff

## Quick links

- [Production design prototype](https://lvzion-official.vercel.app)
- [Existing member development preview](https://lvzion-official-qqvc5dbh2-lvzion.vercel.app/experience-preview)
- [Member foundation draft PR #2](https://github.com/lovelaceaml-hub/lvzion-official/pull/2)
- [Current bounded signup plan](PLAN-SELF-SERVICE-SIGNUP.md)
- [Release gates](RELEASE-GATES.md)

## Current work

Self-service signup work is on feature/self-service-signup-r1, stacked on feature/member-system-secure-r1. Email/password registration creates an Unassigned profile only after confirmation. Age category, group and unit stay null until pastoral/member administration independently verifies membership and assigns an active unit. The person's own profile is available while Unassigned; no group directory, department/module access or leadership follows email confirmation. Existing-record emails are directed to verified invitation/access resolution rather than automatically linked.

The independent own-account helper requires confirmed email, enabled account and a live Auth session. Existing active-member authority remains separate. Leaders receive an explicit pending queue and audited, serialized, idempotent assignment/decline operations. Declining retains the record and denies member access. Technical suspension remains independent.

Review locally at `/sign-up` and `/enrollment-preview`. The signup form is disabled by default; the lifecycle preview uses fictional records and sends no requests to the database.

## Live facts and boundaries

Production remains the earlier manual design prototype, deployment dpl_6xjt1qTmgXggJvQUNoeJAhvnwLCk. Vercel returned no source SHA for that manual deployment. Existing member preview remains commit 5a0d435. All open PRs remain drafts and no production promotion is authorized.

Supabase otecqlkqirncotytbfns has three foundation migrations and no Auth accounts at this inspection. Module/enrollment migrations are unapplied. The known hosted-reference runtime guard stays intact. Hosted Auth provider signup/SMTP/CAPTCHA settings are unverified, and no settings were changed. Previous hosted test-user provisioning was blocked and was not retried.

Before real enrollment: approved isolated hosted Auth tests, actual SMTP/CAPTCHA/redirect verification, first authorized operator bootstrap, hosted migration reconciliation, backup/rollback review, physical Safari/Android testing and explicit release approval. Personal-email recovery stays available. Members without personal email need an approved leader verification process.

Original applications, real member imports and domain work are outside this increment.

## Verification and publication

Strict types/build, 120 application tests, 156 disposable PostgreSQL permission assertions, 31 phone-browser checks, 37 real local signup assertions and 42 existing invitation/recovery assertions passed. The controller inspected the complete diff. Anthony waived the external security review, and no code was sent to Claude. The local source is prepared for commit; Git-triggered preview publication still needs approval. Hosted email/CAPTCHA/delivery, physical devices and production activation are not claimed verified.
