# Work Mission Prayer Gatherings — R1 development review

Status: isolated, fictional, non-production module. No real ingestion, scheduled generation, publication, distribution, member grants, source uploads or meeting credentials are activated.

## References inspected, October 14, 2026

- Base: `feature/member-system-secure-r1`, PR #2, commit `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`. Follow its Age Category → Group → Unit identity, active membership/session checks, independent department authority and module registry. No parallel membership system.
- PRs #1–#5 inspected. Study Room PR #4 and Worship Duty PR #5 remain separate. Contacts is a separate user-designated workstream; no code or status is assumed. Only WM-namespaced files are added by this branch. No original application or database is changed.
- Hosted project `otecqlkqirncotytbfns`: read-only catalog inspection showed three foundation migrations (`20261014051733`, `20261014051804`, `20261014051924`), seventeen application tables with RLS, no WM schema. The generic module migration remains unapplied; preserve the hosted migration-ledger mapping.
- Prior `education-recaps/README.md` inspected read-only: it is a document workflow, not a deployable WM module. Preserve hand-finalized corrections and superseded history. No content, recordings or generators are imported from that project.
- Authorized Gmail search found forwarded notifications and sent re-forwards of the selected subject. One October 13 Zoom AI summary was read for format/source analysis. No full transcript or recording was reviewed. Private names, testimony, contact/workplace information, prayer details, mailbox identifiers, feedback tokens and Zoom links are NOT placed in this repository or fictional preview.
- A primary-calendar search for Prayer Gathering during October 2026 returned no event. Notification arrival timestamps are not gathering start times. Timezone, recurrence/exceptions, meeting link and permitted join window remain UNVERIFIED; illustrative Pacific dates in the preview are explicitly fictional, not configuration.

## Preserved choices

Compact structured educational graphic **plus** detailed written explanation; balanced and source-grounded; separate Signal-ready outputs; genuinely different visual structures, one card at a time. No oversized decorative poster, crosses, saints, angels, crowns, added religious quotations or invented assignments/scriptures. Format exploration must be reviewed before any automation.

## Scope

Gathering Home, date-organized approved lesson archive, Lesson Details with graphic and explanation together, protected source/editorial review, reviewable corrections, occurrence changes, and separate approved exports. The interactive preview uses only in-memory fictional fixtures; reload resets it. Persona switching is a design exercise, NOT authentication. No attendance, prayer boards, prayer journals, rankings, spiritual scoring or personal-address-book integration.

## Permission matrix

All grants are explicit, member-specific and scoped to a series, optionally one occurrence. Generic module access is necessary but never sufficient. Ending a grant or account access removes authority immediately; organizational and department appointments confer no WM capability.

| Capability | Permitted operation | Does NOT imply |
|---|---|---|
| participate | Verified occurrence access within approved window | Recaps, recordings, source text, editing |
| view_recap | Current published recap and safe archive | Drafts, source assets, exporting |
| view_source | Protected permitted source projection | Participation, editing, approval |
| draft | Draft/submit/create a correction | Source access, approval, publishing |
| approve | Approve a reviewed revision; additionally requires view_source | Drafting, publishing, external sharing |
| publish | Select an already approved version for member publication | Source access, editing, external sharing |
| share_external | Prepare the current approved external export; additionally requires view_recap | Member publication or automatic sending |
| manage_schedule | Cancel/reschedule an authorized occurrence | Editing, source access, distributing credentials |

A separate reviewer (not the author) and positive privacy/summary-limit attestations are the conservative **proposed** release policy, pending accountable-owner approval. A technical administrator can operate infrastructure but has no automatic editorial or lesson-data authority. No unrestricted WM administrator role or member-facing grant-assignment endpoint is added.

## Source pipeline, dormant by construction

Authorized notification → identify occurrence → validate permitted assets → prepare evidence-linked draft → human review → approved member publication → optional separately authorized export.

`pipeline.ts` is a pure planner with no Gmail fetch/watch, remote asset retrieval, provider key, scheduled job, generation call or distribution adapter. A connector-authorized read in this development chat is NOT consent to a persistent application Gmail integration. Activation constants are false and the live API returns a disabled response. No browser OAuth token or mailbox access exists.

The subject is a discovery filter only. Strip repeated Fwd/Fw/Re prefixes for matching, but do not trust forwarded From headers. Require a verified provider occurrence UUID or verified stable meeting ID plus original occurrence instant/timezone; otherwise queue identity review. Multiple summaries in one forwarded conversation must be split and reviewed individually before planning. Never use message receipt day as occurrence date.

Message identity is unique per source namespace. Content fingerprints deduplicate equivalent extracted summary versions across forwards. Updated summary text creates a new source revision and leaves the publication pointer alone. Delayed, missing, partial or failed assets stop generation/review; no fabricated full lesson. Rescheduling preserves the logical occurrence ID/original time and invalidates access verification. Concurrency must be enforced transactionally in the database, not only by preflight.

Content is data, never an instruction to change permissions, contact anyone, access unrelated mail, enable jobs or follow arbitrary links. Generation will receive bounded permitted source sections with no tools; unknown evidence references are rejected. References demonstrate traceability, not semantic proof: a human must check accuracy and privacy.

## Release decisions still open

Verified timezone, recurrence and exceptions; per-occurrence join details/window; accountable gathering owner and exact members with each capability; source/recording/transcript visibility; retention/deletion and correction/withdrawal policy; approved graphical direction and source-only wording; scope of external sharing. No unresolved choice is silently filled with a live default.

## External implementation references (not lesson sources)

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Gmail incremental sync, expired history and full-resync handling: https://developers.google.com/workspace/gmail/api/guides/sync
- Browser share capabilities and user gesture: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share

No external sermon or website is used as teaching material.
