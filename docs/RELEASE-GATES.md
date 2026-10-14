# LV Zion Official release gates

## Completed development checks

The isolated member foundation includes pinned dependencies and lockfile, strict TypeScript for new member runtime code, 25 Node tests, 53 database permission assertions, five Chromium phone-viewport tests, a local production build and a fictional PostgreSQL dump/restore rehearsal. See MEMBER-SYSTEM-VERIFICATION.md for scope and limitations.

The interactive original home remains a concept. `/member-preview` is a fictional in-memory management preview. Real member APIs stay off by default and reject the known production Supabase reference.

## Required before any real-member launch

1. Independent code/security review and approved merge/release sequence for draft PRs #1 and #2. Confirm protected branch rules and exact tested production commit.
2. Approved isolated Supabase deployment; actual Auth/REST/refresh/recovery/invitation tests; hosted security/performance advisors. Test direct APIs as every role, not only UI controls.
3. Verified first-admin/account bootstrap, no-email recovery procedure, access-request review and approved invitation delivery. No fake shared email identities.
4. Broader mobile/Safari accessibility, concurrent-transfer and permission-revocation tests, operational monitoring, and hosted backup/PITR restore rehearsal.
5. Confirm actual organization labels, department boundaries, allowed sensitive fields and the official app lineup. Prototype tiles are not approved modules.
6. Explicit permission, duplicate review, backup and dry-run before importing real people or inviting a pilot cohort.

## Safety boundary

No production migrations, real data, bulk invitations, domain purchases/configuration, or previous-application changes are authorized by a development preview. `lvz.app` is selected but remains paused. Original LV Zion applications are references only.

Use only the two versioned migrations in `supabase/migrations`, in timestamp order. The superseded database/docs proposals must not be applied. Test bootstrap and fixture files are never production migrations.
