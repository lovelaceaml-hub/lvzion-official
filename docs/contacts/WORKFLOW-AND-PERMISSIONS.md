# Contacts R1 — workflow and permission proposal

**Status: fictional development preview. No live sharing policy is approved.**

## Source inspection — October 14, 2026

The authorized repository is `lovelaceaml-hub/lvzion-official`. The new work is additive to member foundation PR #2, `feature/member-system-secure-r1` at `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`. The independent Contacts branch must not overwrite that branch or merge the other workstreams.

Reviewed PRs #1–5. Study Rooms PR #4 at `5b9a28f3fea2ba7db5a0162ace6715fbf2dde482` supplies the visual reference: cream and sage, spacious rounded cards, quiet hierarchy and large phone controls. Worship Duty PR #5 and the alternate Study Rooms PR #3 remain untouched. Read the foundation integration framework, authentication adapter and member schema. Some historical docs still describe the domain as paused; the current user brief and later foundation PR establish that `lvz.app` is registered and connected. This work does not change it.

No Contacts-specific implementation or confirmed reference repository was located in the inspected foundation/PR sources or current Project file search. This is a bounded finding, not an assertion that no historical implementation exists anywhere. No unrelated repository, personal address book or real contact store was read.

Hosted Supabase `otecqlkqirncotytbfns` was inspected read-only: 17 application tables, all RLS-enabled, zero Auth users, and three foundation migrations (`20261014051733`, `20261014051804`, `20261014051924`). No Contacts tables or live module registry exist. Do not replay repository migrations against this ledger.

## Preserve, improve, newly propose

Preserve the shared account/session architecture, hierarchy, independent authority, center Apps button, private module boundary and production activation guards. Preserve other applications and unmerged files exactly.

Improve clarity with one primary responsible member, one explicit next action, visibility labels, retained task history and a reversible handoff review. Do not equate follow-up completion with a person's progress.

New proposals, not previously approved features: My Contacts, Shared, Follow-Up, scoped aggregate Manage, handoff steward, restricted notes and optional communication-method sharing. The preview uses fixed synthetic people and actions; it is not authentication and cannot prove hosted authorization. Every mutation resets on reload. There are no free-form contact/import fields, messages, calls, exports, invitations, browser storage writes or network persistence.

## Proposed workflow

`New → Active → Paused or Closed`. New can also pause/close. Paused can resume Active or close. Closed can reopen Active only when not do-not-contact. These are neutral administrative labels, not a finalized outreach or religious participation process.

Follow-ups have independent `Scheduled → Completed` or `Cancelled` states; “overdue” is derived from due time, not another stored state. Completing a task retains it and does not advance contact status. R1 proposes one open next action per contact; multiple simultaneous tasks need a separate decision.

Preferred method: Not confirmed, Text, Phone or Email. A preference is **not consent to send messages**. Do-not-contact is a separate overriding restriction: close the record, cancel outstanding outreach, refuse new outreach and new sharing. Authorized collaborators can record a DNC request as a safety action. R1 has no operation to clear it. Closed records may be archived without deleting history; archival is not a permanent-retention approval. Retention duration, deletion requests, backup expiry and any DNC reversal process remain approval gates.

## Proposed permissions — each requires independent app access and an active verified member

| Actor | Read fields | Permitted operations in proposal | Not implied |
|---|---|---|---|
| Approved creator / responsible member | Name, status, preferences, methods, collaboration log, task history; own author-only notes | Create own contact; edit agreed fields; share explicitly; revoke; schedule/complete; same-group handoff; close/archive | Export, merge, external communications, other members' author-only notes |
| Explicit individual collaborator | Name, preferences/status, collaboration entries recorded since their grant, own assigned tasks; methods only if separately shared | Add interaction; maintain own assigned next action; record DNC request | Reshare, reassign, archive, read earlier history or others' author-only notes |
| Aggregate overseer | Approved-scope aggregate counts only | Review overdue/upcoming/held work totals | Names, phone/email, task text/dates, interaction bodies, record drilldown, reassignment |
| Handoff steward | Approved-scope opaque record reference, responsible member, review-needed flag | Authorize same-group reassignment with audit | Contact name/methods, notes, normal record editing, sharing or exporting |
| Organizational/department leader only | Nothing beyond separately granted permissions | None merely because of appointment | App management or confidential contact access |
| Technical administrator only | No Contacts application data | Technical maintenance outside contact workflows | Contact read, oversight or stewardship |
| Other member / anonymous / inactive / revoked app grant | Nothing | None | Group membership is not a share |

Identity/method/log/author-note field categories are independently projected, not hidden with CSS. Author-only notes require both current record authorization and original authorship; former owners lose record access after handoff. They are not copied to the successor. Collaboration log retention through ownership handoff is a proposal requiring approval. A newly added collaborator sees only entries since their grant; earlier-history sharing needs a separate reviewed operation.

“Technical admin has no application read privilege” is not a cryptographic guarantee against a database superuser, service owner or operator who can deploy code. Production requires restricted infrastructure credentials, audited operational access and, where necessary, an independently governed encryption strategy. No service-role key is used in this preview.

## Sharing scope and cross-group decisions

R1 demonstrates named individual collaborators only. Entire-unit/group shares and inherited leader access are intentionally absent. A responsible member must explicitly choose the collaborator and separately opt in to sharing phone/email. Sharing never changes primary responsibility.

Cross-group shares and handoffs are blocked pending a policy establishing purpose, consent, destination identity resolution, approving authority, expiry/review and accessible fields. A group leader's approval alone is not assumed sufficient. The actual member directory must remain names-only within a member's own group; do not add a cross-group member search as a shortcut.

Grants bind to the recipient's current placement record, not a dynamic group audience. If a collaborator changes placement, their old grant no longer authorizes access. If the responsible member becomes inactive, loses module access or changes placement, all ordinary access to that contact is suspended pending a scoped handoff review. Original organizational scope stays fixed, rather than moving the contact into a newly joined group. History is retained; no new group inherits it.

Handoff proposal: validate the new active same-group owner; explicitly confirm; update exactly one owner; revoke all former shares; cancel unfinished next actions for re-planning; retain completed work and append-only history; remove prior owner access. No implicit access survives. Sensitive author-only notes never transfer. The accountable person permitted to appoint handoff stewards remains unresolved.

## Duplicate review

Search only records and fields the actor is already permitted to see. No inaccessible match counts, names, hints, owner identity, global uniqueness error or “another group already has this person” message. Matching names/phone values are suggestions only. Shared phones are explicitly permitted. The preview offers Keep separate / manual review, not merge. Any future merge needs authority over both records, explicit evidence and review, deterministic version locks, a preserved source history and a reversible mapping; never transfer Contacts history to a member record.

## Decisions required before live permission implementation

1. App owner, creator eligibility and who may appoint scoped overseers/stewards; exactly who can edit identity/method fields.
2. Individual-only sharing, which fields/history it includes, and whether author-only notes are permitted at all.
3. Cross-group approvers and scopes; whole-unit/group shares remain off unless specifically authorized.
4. Handoff hold/review behavior and whether collaboration history passes to the successor.
5. Contact consent/preferences, DNC reversal, retention/deletion and archival rules.
6. Oversight aggregation thresholds, scope size and suppression against identifying small cohorts or difference attacks; raw fictional counts are not a production privacy design.
7. Export and duplicate-merge authority, if these capabilities are ever approved. Both remain absent.

No answer is necessary to continue reviewing this fictional preview. None of these proposals has been silently installed as a live policy.
