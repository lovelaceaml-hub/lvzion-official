# Contacts R1 — backend, integration and release boundary

## What exists versus what is prepared

The interactive `/contacts-preview` is a React page with component-memory fixtures and a tested **simulation** policy. Direct Contacts API methods always return a generic 403 with private/no-store headers. `/modules/contacts` preserves the foundation verified-member check and then returns not-found. The preview itself returns not-found in Vercel's production environment. There is no environment toggle that enables live Contacts mutations.

`schema-review.sql` is executable in a disposable test database after the foundation, but is deliberately **outside `supabase/migrations`**. It is not automatically deployed. Its release gate accepts only `draft`. Every one of its 12 private tables has enabled+forced RLS, a restrictive deny-all policy, and no grants to anonymous, authenticated or service-role clients. No public RPC, module registration, real grant, email provider or hosted database is changed.

| Table | Purpose |
|---|---|
| release_gate | Unapproved decision revision; cannot be switched to approved by editing one flag |
| capabilities | Independently appointed creator, aggregate overseer, handoff steward and placement scope |
| records | Separate contact UUID, exactly one responsible member/placement, fixed origin scope, lifecycle, preferences, DNC, archive, optimistic version |
| identities | Contact name separate from member identity and operational metadata |
| methods | Optional contact methods, deliberately non-unique between people |
| shares | Named individual, placement binding, methods opt-in, grant/revocation times |
| interactions | Bounded append-only author or collaboration entries and same-contact corrections |
| follow_ups | One open next action, explicit assignee, due date, completion/cancellation history |
| ownership_events | Append-only responsibility changes and reason codes |
| duplicate_reviews | Two explicit source records and human review outcome; no automatic merge |
| audit_events | Actor, operation, contact ID, request ID, time and before/after version; no PII snapshots |
| command_receipts | Request digest and resulting version; never arbitrary command bodies or note text |

A contact is **not** a `public.members` row and has no Auth identity or account-activation endpoint. Only responsible/collaborating members reference the existing foundation. Category/group/unit authority and app-specific grants remain separate. The proposed schema is structural and deny-all, not a complete permitted transactional backend.

## Required live server/database command contract (not yet enabled)

Derive actor from `requireMember` and the database's verified current-member/session helper, never a request actor ID, persona selector or user-editable JWT metadata. Check approved module and current app grant. Re-read current placement, explicit permission, DNC and record state on every operation. A missing deployment flag/RPC/grant fails closed.

Commands use a validated allowlist, bounded strings, `request_id` and `expected_version`. Authorization must precede idempotency lookup. On one database transaction: lock authorization rows in a consistent order with the contact row; revalidate all access after locks; compare-and-swap the version; update the contact/assignment/share/task; write append-only audit and hash receipt; invalidate private activity projections; commit together. Identical retries return the existing authorized result. A reused key with a different payload conflicts. Do not silently last-write-wins.

Handoff/revocation and edits must serialize on the same lock discipline so a concurrent revoked collaborator cannot commit afterward. Owner inactivity/placement changes require the same protected coordination or an epoch check, not an eventual browser refresh. Duplicate operations lock both sorted IDs and require access to both without leaking which denied record exists. Hosted two-connection tests are a release gate; the preview's optimistic-version tests are not a substitute.

Only reviewed narrow private RPC functions should write after approval. RLS must independently mirror the approved record and field model; private field separation and explicit projection prevent a generic `select *` response. If privileged functions are necessary, pin search_path, revoke default execution, validate the actual session, and audit calls. Operators remain subject to infrastructure governance. Do not enable a blanket authenticated SELECT policy.

## Integration contracts

**Apps:** reserve key `contacts`, route `/modules/contacts`, draft only. Do not mutate the foundation registry or fake member grants. Center Apps opens the preview's shared-pattern app sheet; Contacts management remains in Contacts. Actual registry publication requires the foundation's approved status plus explicit member grant and a named accountable owner.

**My Week:** future server projection may deliver a generic `Private Contacts activity` item to an authorized assignee. No contact names/methods/notes/action text in the shared activity store. Prefer an opaque activity token resolved only after current Contacts authorization, with generic route and no contact name in URLs. Revocation, handoff, inactivity, DNC, completion and module suspension must remove or invalidate it in the same transaction. R1 returns contract metadata only; it does not insert a live activity.

**Notifications:** disabled. A future opted-in reminder can say `Open LV Zion Official`, never contact identity or follow-up details. Recheck authorization at delivery and open time; suppress after cancellation/revocation; no preview SMS/email/push/Signal posting. Do not store private content in notification queues, logs or analytics. Whether even counts/time-based notices are acceptable requires approval.

**Caching and display:** never render contacts on TV/public displays, generic directory views or offline fallback. No service-worker API/private-page caches, persisted React stores, localStorage/IndexedDB, offline mutation queues, exported debug traces or PII telemetry. All live responses must be private/no-store, including errors. Do not put identities or search terms in URLs. Consider immediate tab hiding/clearing and response version checks after sign-out/revocation; already disclosed information cannot be recalled from a screenshot or memory.

## Verification and release gates

Review only on a distinct preview deployment and draft PR stacked on foundation PR #2. Do not merge or promote. Existing `lvz.app`, original applications, unmerged Study Rooms/Worship work and all hosted member provisioning guards remain unchanged.

Before live implementation/activation: approve the workflow/privacy matrix, settle small-cohort oversight and retention, implement permitted RPCs and field projections, reconcile the hosted migration ledger, generate a reviewed migration via CLI, independent security review and advisors, isolated authenticated Auth/PostgREST tests, two-connection edit/revocation/reassignment races, backup/restore proof, physical iPhone/Android and full accessibility review, then explicit limited pilot approval. No real contact data is required to complete those development tests.

References consulted: existing foundation integration and session code; Supabase current row-level and column-level security documentation; current Supabase changelog. The draft does not change installed SDK versions or need unrelated .NET/TLS migration work.
