# LV Zion Official — Member System Design v0.1

**Status:** Detailed engineering proposal for review. **No SQL has been executed; no account or member has been created.** This builds on confirmed interview choices 61A, 62C, 63C, 64C, 65A and 66B and the existing PRODUCT-DECISIONS document.

## 1. Data model: one person, independently assigned access

A person exists as one durable member record whether or not they use the app.

    age_categories ──< church_groups ──< church_units ──< member_placements >── members
                                                                           │
                                               member_accounts ────────────┤ (optional Auth account)
                                               member_private_contacts ────┤ (restricted)
                                               department_memberships ─────┤ >── departments
                                               role_assignments ───────────┘

- Each active, fully placed member belongs to **one active unit**, from which their group and age category are derived. Do not store duplicate active group/category values on the member.
- An unplaced intake/import candidate may temporarily have no active placement; activation for a fully enrolled member must validate a complete placement.
- A member may join several departments and hold several independent responsibility assignments.
- A member may exist before they are invited to activate a sign-in account.
- Preserve historical placements, department associations and leadership appointments rather than overwriting them.

## 2. Proposed database entities and fields

The accompanying file docs/sql/member-schema-proposal.sql is **an unexecuted proposal**, not a deployable authorization layer or migration.

| Table | Core fields | Cardinality and integrity |
| --- | --- | --- |
| age_categories | id, code, label, is_active | Editable labels; unique code. Real category names are not yet confirmed. |
| church_groups | id, age_category_id, code, name, is_active | One parent category; group codes unique within category. |
| church_units | id, group_id, code, name, is_active | One parent group; unit codes unique within group. |
| members | id, display_name, status, created_at, updated_at | Non-confidential identity only; no email or phone in this table. |
| member_placements | id, member_id, unit_id, started_at, ended_at, recorded_by_member_id | One **open** placement maximum per person via partial unique index. No historical row deleted. |
| member_private_contacts | member_id, email, phone_e164, contact_preferences, updated_at | One protected record per member, not in normal group directory. |
| member_accounts | auth_user_id, member_id, username, account_status, created_at | Optional account linked to one approved member, unique username and member ID; references Supabase Auth users. |
| departments | id, code, name, is_active | Configurable independent of group/unit tree. |
| department_memberships | id, member_id, department_id, started_at, ended_at | Multiple active departments per member; prevent duplicate active same-department entry. |
| role_assignments | id, member_id, role_code, unit_id/group_id/department_id, started_at, ended_at, granted_by_member_id | Explicit scope; distinct technical and ministry roles; appointment remains active until manually ended. |
| invitations | id, member_id, invited_by_member_id, delivery_channel/address, state, expires_at | A reviewed invitation points to an existing person, never creates a second person implicitly. No plaintext auth tokens. |
| access_requests | id, requested_name, contact details, claimed_member_id, state, reviewed_by_member_id | Request access without exposing roster lookup; staff must match/approve. |
| transfer_requests | id, member_id, from_unit_id, to_unit_id, requested_by_member_id, accepted_by_member_id, state, rationale | Enforces request/receiving acceptance for cross-group moves or explicitly authorized pastoral override. |
| audit_events | id, actor_member_id, target_type/id, action, rationale, safe_metadata, created_at | Append-only, restricted access; never record passwords, token material, or private contact values. |

All IDs are UUIDs, foreign keys protect parent relationships, and relevant timestamps use UTC-aware PostgreSQL timestamptz. Age labels and precise unit names remain configurable, not hard-coded.

## 3. Responsibilities and access matrix

| Position | Own details | Directory | Member management | Department data | Administration |
| --- | --- | --- | --- | --- | --- |
| Member | Approved profile/preferences | **Names only, own group** | None | Only explicitly granted department views | None |
| Unit Leader | Same | Own group, names only | Approved fields in **assigned unit** | No additional rights | None |
| Group Leader | Same | Own group, names only | Approved fields in **assigned group** | No additional rights | None |
| Pastoral Staff | Same | Explicitly authorized congregation-wide scope | Broader scoped authority | Only where independently authorized | Church-management actions |
| Department Manager | Same | Own group, names only | No group management by default | Assign/manage **authorized department(s)** | Only that department's functions |
| App Administrator | Same | Own group, names only | **None automatically** | **None automatically** | Technical settings and account operations only |

One person may be both a group leader and department manager; permissions are the union of **separately approved scoped assignments**, not permissions inferred from the job title or from the mobile role selector.

**Important:** Technical administrators may troubleshoot authentication and service health but cannot grant themselves ministry permissions. Leadership appointment, transfer override and confidential access require independently authorized and audited church-management actions.

## 4. Identity and account flow

1. **Create or import person:** a leader enters a member within their authorized unit/group, or an administrator reviews a controlled import. Search for possible duplicates before creating another person.
2. **Invite/link existing person:** leader requests invitation, eligible authority approves if needed; the invitation references that member ID.
3. **Activate account:** Supabase Auth creates the login identity; a trusted server operation binds it to the **existing** member ID, confirms unique link, and records activation. Never trust a member ID supplied directly by the browser.
4. **Sign in with email or username:** Supabase Auth supports email/password. Username login must use a server-side, rate-limited identifier resolution/authentication path. Do not expose the registered email or whether the username exists; use generic errors.
5. **Recovery:** require a verified recovery channel or a separately audited, identity-verified staff-assisted recovery process. Username-only accounts without a recoverable email/phone need a deliberate workflow before production; do not create invented shared email addresses.
6. **Suspend:** suspend account authorization immediately, enforce suspension on each protected request, revoke/shorten sessions as the provider allows, and preserve the membership history. Restoring account access must be an authorized operation.

**Selected permanent domain:** lvz.app, **registration deferred**. Continue on the existing Vercel preview, using a development-only callback URL until the domain is owned and configured. No real sign-in emails will be sent before approved sender/SMTP setup.

## 5. Transfers, placements and historical integrity

- The unit is the single source of current group/category placement. When a transfer is complete, one transaction closes the old placement and creates the new one; it must never result in two simultaneously active placements.
- A cross-group transfer progresses from request to destination acceptance and completion. Until acceptance, the destination has no access to that member.
- Pastoral Staff with specifically assigned transfer authority may override the usual workflow with a recorded reason. Technical app administrators cannot override church membership decisions.
- On completion, the old group/unit access ends; independent department memberships are unchanged unless separately updated.
- Inactive members remain in historical data while their account and directory visibility are appropriately restricted.

## 6. Database security design

- **Deny-by-default RLS** on every application table in the exposed public schema; no anonymous roster queries or blanket "all signed-in users can read everything" policies.
- Authenticate with Supabase Auth and bind auth.uid() to a verified member_accounts row. Use server checks and RLS to enforce row and column access; a client-selectable preview role is never authority.
- Keep private contacts and login identifiers outside ordinary directory results. Ordinary group directory returns **only allowed member id and display name**, and only for the viewer's currently assigned group. Use an explicitly limited server response or carefully permissioned database interface; never expose all columns and rely on frontend filtering.
- Member edit rights: self may update allowed preferences/contact after verification; leaders may change authorized member fields within scope; neither may update role_assignments, placement/unit, account binding or another person's private contact through generic table UPDATE.
- Ministry changes flow through trusted, transactionally checked operations with an audit event. No service-role/secret keys in browser, source files, or public environment variables.
- Validate against direct API requests, forged group IDs, stale role assignments, role self-grants, suspended accounts and concurrent transfer requests.
- Sensitive profile data must not appear in public notifications, search indexing, or permissive offline caches. For production, define retention, export, breach response, and backup/restore procedures.

The accompanying SQL proposal intentionally defines **no permissive RLS policies**. It is not safe to turn on application member queries until narrowly scoped policies/functions and denial tests are built.

## 7. Fictional pilot dataset (for preview/tests only)

Use synthetic categories **Category A** and **Category B**; the actual church naming convention is not decided.

| Fictional persona | Placement | Assignment | Expected behavior |
| --- | --- | --- | --- |
| Ava Brooks | A / Group 1 / Unit 1 | Member | Sees own profile and Group 1 names, not contacts. |
| Eli Rowan | A / Group 1 / Unit 1 | Unit Leader | Can update allowed fields for Unit 1, not Unit 2. |
| Noor Ellis | A / Group 1 / Unit 2 | Group Leader | Can manage Group 1 members, not Group 2. |
| Priya Wells | B / Group 2 / Unit 1 | Department Manager | Can manage only explicitly assigned department; no Group 2 leader rights. |
| Felix Stone | B / Group 2 / Unit 1 | App Administrator | Can see technical settings but not ministry data. |
| Mira Quinn | A / Group 1 / Unit 1 | Pastoral Staff | Sees only church-wide scopes explicitly granted by authority. |

Synthetic fixtures should be distinguishable from any real imported records. Fictional preview role switching is a **visual exercise, never authentication**.

## 8. First implementation slices and acceptance criteria

**Slice A — Member structure:** validate draft DDL and proposed indexes; implement deny-by-default schema and reviewed RLS on the new Supabase project, then synthetic fixture creation and test cleanup. Do not import real members.

**Slice B — Profile preview:** build a mobile profile and group directory against a fictional repository adapter; show category/group/unit, department badges and management entry points only for granted roles; distinguish visual mock from a logged-in account.

**Slice C — Identity and secure access:** configure test-only accounts, email/username sign-in, verified invitation/member linking, generic failure messages, lockout/rate limiting, and recovery. No real invitations.

**Slice D — Leader actions:** scoped create/edit, department assignments, group transfer request/acceptance, role appointment audit and suspension.

**Release-blocking tests:** Group A cannot enumerate Group B by direct API; no one sees another's private contact through directory; Unit Leader cannot edit another unit; Department Manager cannot grant church roles; App Administrator cannot inspect ministry data; transfers revoke former access; duplicate imports do not create duplicate people; suspension denies protected requests even while an old token exists; unknown username and wrong password have comparable public responses.

## 9. Unresolved decisions (not blockers for fictional UI)

- Actual age-category labels, group/unit names, and organization import roster format.
- Approved contact fields and staff recovery/identity-verification policy, especially for members without personal email.
- Which real church applications launch first and which department roles each requires.
- Who is authorized to issue overrides/role appointments and inspect audit history.
- Registration of lvz.app, email provider/SMTP, and support inbox are paused until the owner returns to the screen.

**Implementation boundary:** Previous LV Zion apps/databases and the live inline-source deployment remain untouched. This design does not by itself give any account access to member data.
