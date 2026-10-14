# WM Prayer Gatherings R1 — verification ledger

Fictional preview and **unapplied** SQL review candidate. Successful tests do not approve editorial policy, live integration, hosted data access or production release.

## Checks included

- `tests/wm-prayer.test.ts`: explicit grant isolation, per-occurrence scopes, revoked/inactive denial, evidence references, incomplete assets, privacy warnings/export allowlists, separate review/publication, independent reviewer, revision conflicts, forwarded/duplicate notifications, delayed occurrence identity, source updates, schedule verification, cancellation/rescheduling, safe SVG layouts and disabled live API.
- `tests/wm-prayer-database.test.ts`: actual member/module foundation plus the SQL proposal in disposable PGlite. Thirteen named tables with RLS, anonymous and direct-table denial, role non-inheritance, protected-source separation, author/reviewer separation, review/publish split, stale revisions, immutable approved content and audit history, duplicate constraints, partial/updated sources, publication preservation, restricted exports, rescheduling invalidation and session/module/member revocation.
- `scripts/verify-wm-preview.mjs`: requires an explicit authorized development origin. Tests the four screens at 320/390/430 px; gathering scenarios; role isolation; draft-review-publish/correction flow; duplicate and incomplete sources; three separate PNG exports; safe explanation outputs; anonymous API denial/no-store; and absence of sensitive provider calls or browser exceptions. Optional temporary authentication URL stays in the test process only, never reports/source control.
- Existing foundation checks remain unchanged. No GitHub Actions workflow or automatic dispatch is added.

## Review the fictional preview

Open `/wm-prayer-preview` on its development deployment. Preview controls change fictional roles and gathering states, not authentication or real configuration. Reload resets all local changes. No arbitrary personal text is collected.

Use Home and Lessons as Member. In Manage, use Draft editor to submit October 14, Reviewer to inspect source and proposed wording and approve with both checks, then Publisher for the separate publication step. Create a correction for October 13 and verify revision 1 remains published. Updated, missing, partial or failed sources must block full recap approval/export without silently replacing publication. Sharing editor can prepare separate fictional PNG/text outputs; there is no Signal connection or automatic sending.

Technical administration grants no WM access. Publisher cannot read protected source content. Reviewer cannot publish. Schedule coordinator cannot edit lessons. Anonymous live operations return 401 with private/no-store; authenticated operations remain disabled. The real module route never substitutes fictional fixtures for member data.

## Remaining release requirements

Verified owner-approved timezone, recurrence/exceptions and per-occurrence access; named editorial and sharing grants; source retention/deletion and withdrawal policies; approved graphical direction and source wording; reviewed migration-ledger mapping and disposable full Supabase/PostgREST authentication testing; real iPhone/iPad/Android accessibility/readability testing; private asset broker/expiry; consented trusted Gmail integration and extraction quarantine; evaluated source-grounded generation adapter; transactional ingestion retries; concurrency/threat review; explicit pilot and production authorization.

There is no live mailbox adapter, recording broker, grant administration UI, recurring job or generation provider. This must not be presented as a completed production application. Executed results and verified deployment details belong in `RESULTS.md` when available.
