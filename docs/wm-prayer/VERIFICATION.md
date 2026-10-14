# WM Prayer Gatherings R1 — verification ledger

This branch is a fictional preview and an **unapplied** SQL review candidate. A successful build is not approval of an editorial policy, a live integration, hosted data access or production release.

## Automated checks included

- `tests/wm-prayer.test.ts`: grant isolation, per-occurrence scopes, revoked/inactive denial, source completeness, evidence references, privacy warnings, export allowlists, separate review/publication, independent reviewer, stale source/revision rejection, duplicate and forwarded notifications, delayed occurrence identity, source updates, schedule verification, cancellation/rescheduling, three safe SVG layouts and hard-disabled live API.
- `tests/wm-prayer-database.test.ts`: actual foundation migrations plus the SQL proposal in disposable PGlite; fourteen RLS tables, direct-table and anonymous denial, explicit capabilities, role non-inheritance, private-source separation, author/reviewer separation, review/publish split, stale revisions, constraints, immutable approved content and audit history, duplicate source/receipt prevention, partial/updated sources, publication preservation, restricted external export, rescheduling invalidation, module/member/session revocation.
- Existing foundation checks remain unchanged. No GitHub Actions workflow is added or automatically dispatched.

## Browser review procedure

Use `/wm-prayer-preview` on a development deployment. All personal-looking labels are marked fictional. Preview state exists only in React memory; reload resets it.

1. At 320, 390 and 430 px widths, inspect Home, Lessons, Lesson Details and Manage. Check for horizontal overflow, clipped card copy, keyboard/focus labels and 44 px touch controls. Review each educational card direction separately.
2. Use Preview controls → scenario to verify upcoming join, completed lesson-first, pending source, cancelled, rescheduled and unverified access. Simulated Join must not navigate or request credentials.
3. Switch to Draft editor, open Manage, submit the October 14 fictional draft. Switch to Reviewer, verify source and all proposed wording; approve with both checks. Confirm member publication remains empty until switching to Publisher and publishing in the fictional preview.
4. For October 13, create a corrected draft and verify the archive still shows revision 1. Test duplicate notification, updated summary, incomplete transcript and failed import. Updated/missing assets must not overwrite a publication or produce a new full lesson.
5. The Member role must not have Manage or external exports. Technical administrator only must receive no WM access. Publisher must not see the protected source panel. Reviewer must not publish. Schedule coordinator must not edit recaps.
6. As Sharing editor, prepare the approved October 13 outputs; copy text and save one fictional PNG at a time. No native messaging or direct Signal integration is called. Exports must contain no source link, mailbox ID, attendee/contact/prayer information or credential. Fixed fictional content only; arbitrary personal text cannot be submitted in this preview.
7. Anonymous `/api/wm-prayer` must return 401, private/no-store, and no data. The member module landing redirects to sign-in or fails closed; it never substitutes fictional data for authenticated live data.

## Release work still required

Owner-approved schedule, timezone, recurrence/exceptions and per-occurrence access. Named grants and source retention/deletion policy. Graphical and wording approval. SQL review and migration-ledger reconciliation, disposable full Supabase/PostgREST auth tests, deploy-independent RLS/advisor review, real iPhone/iPad/Android readability and accessibility checks, storage broker/asset expiry, trusted Gmail OAuth/scoped consent, source-extraction quarantine, semantically evaluated generation adapter, transactional ingestion retries/outbox, threat-model and concurrency testing, correction withdrawal policy, approved notification/export policies, and explicit pilot/production authorization.

The proposal intentionally has no live mailbox adapter, raw recording broker, grant administration UI, recurring job or generation provider. It must not be represented as a completed production application.
