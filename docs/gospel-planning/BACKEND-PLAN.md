# Gospel Planning — secure backend design, not migration DDL

Status: next-slice proposal only. No schema has been created or applied by this workstream. `lib/gospel-planning/domain.ts` is a testable fictional behavior specification, not a trusted server implementation. The live API remains unavailable.

## Ownership

Reuse authoritative platform member, placement, unit/group and appointment identifiers. Do not promote the fixture Person/Group collections into another production roster. Reuse the existing authenticated session and explicit app grant. A title, technical credential, client-supplied actor/scope, or debug role selector grants no Gospel authority.

The private module model should separate: availability templates and dated exceptions/confirmations; stable sessions and immutable material revisions; participants and placement snapshots; version-specific responses; committed time intervals; canonical session reports and append-only corrections; group/week plans and published safe versions; restricted unit/group review items with assigned actions; individually assigned oversight requests and response history; authorized retry receipts and minimal audit metadata.

Contacts owns identity, methods, notes, interactions, DNC, sharing and follow-up. Gospel Planning may provide an opaque origin-session reference only after an independent authorized Contacts action. A session never creates a share. Rooms owns actual bookings. Display needs a separately approved public projection. A private plan is not a broadcast source.

## Trusted operations

Each request derives the active verified member from the existing platform session, verifies the module's approved status and current app grant, resolves current dated placement/appointments and evaluates the operation's explicit scope. Recheck current authority before returning an idempotency receipt, not just before initial mutation. Return the same generic denial for inaccessible and nonexistent resources.

For mutations, enforce strict server request parsing, allowlisted lengths/enums, exact expected versions and content-type/origin policy consistent with the foundation. Reject client actor IDs as authority. The browser's TypeScript types and date validation do not substitute for this server parser.

Use private, deny-by-default tables inaccessible to browser roles. Trusted functions must use a fixed search path and minimal execution privileges, derive identity internally and expose only purpose-specific projections. Review the current foundation schema/ledger before designing migration names or foreign keys. Do not replay repository migration history against the hosted ledger.

## Transactional commitments and revisions

Acquire locks for all affected member IDs in a deterministic order, then the session/version row; lock the relevant availability revisions and scope/placement/grant records needed to serialize authorization changes. Revalidate current eligibility, availability and conflicts inside the same transaction. Keep a database-enforced half-open interval exclusion (member ID plus committed time range) as the final overlap guard, where supported by the reviewed schema/extensions. Pending proposals do not manufacture another person's consent.

On revision, record old details/responses, increment the material version, preserve current publication history and require explicit new responses. The R1 prototype conservatively holds an existing participant's prior committed interval while the revision awaits response. Confirm this policy before live use. Accepting the new version must atomically release/replace that participant's old interval; declining or explicit cancellation releases the applicable hold. Removed participants need an explicit removal audit/notification event, not a silent roster rewrite.

Never infer cancellation, attendance or completed activity from a missing response. Lock/CAS the canonical report per session and append corrections; compute session totals from the current report, not the number of authors, events or revisions. Store dated group attribution separately from current membership and never migrate old totals when a member moves.

## Publication and confidentiality

Store the reviewed safe group projection independently from restricted support notes and assigned oversight requests. Publish only the exact expected draft version. Keep the existing published version while a replacement is drafted. A stale publish requires another review; no last-write-wins overwrite.

Restricted history policy remains unresolved: current scope must not silently grant confidential predecessor notes or new-group access. A group move or ended appointment must not preserve access merely because the actor can replay an old URL/receipt. Design transfer holds and authorized review before releasing any old confidential history.

Persist no arbitrary private content in notifications, logs, URL parameters or public offline caches. Use generic notice events and one stable logical event ID/revision for safe integration retries. Missing adapters fail closed; a failed Contacts/Rooms operation must not be marked completed or broaden access.

## Required verification before any live deployment

1. Isolated SQL/schema tests: direct-table/anonymous denial, own-group names-only projection, unit/group/publisher boundaries, technical-only denial, inactive/revoked actors and ended roles, expected-version failures, safe publication, historical attribution, report corrections and receipt authorization.
2. Two independent database connections with synchronized starts: competing commitments for the same member/time; concurrent report writes; publication versus draft changes; response versus material revision; app/placement revocation versus an in-flight protected write. Demonstrate at most one valid result and no private response after serialized revocation. Sequential reducer tests are not this evidence.
3. Real service integration with disposable auth users: foundation session/CSRF/cookie behavior, server-derived scopes, Contacts denied/existing/nonexistent indistinguishability, no inferred grants, room/notification failure recovery, stable My Week identity and no private payload logging.
4. Hosted migration mapping/fingerprints, reviewed rollback and backup/restore; independent security review; normal/failed-save device journeys at 320px and actual Safari/Android; explicit owner/publisher and confidentiality policy approval; then an authorized limited pilot.

No hosted migrations, real accounts, messages, imports, providers, credentials, domain changes or production promotion are authorized by this design file. Keep the old systems untouched.
