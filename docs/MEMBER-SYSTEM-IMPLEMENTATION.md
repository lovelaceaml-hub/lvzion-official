# Member system implementation

Development branch: `feature/member-system-secure-r1`; draft PR #2, stacked on draft mobile PR #1. This is a tested development increment, not a production release.

## Canonical schema

Apply `supabase/migrations/20261014020617_member_system_foundation.sql`, then `supabase/migrations/20261014043055_member_command_hardening.sql` to an approved isolated database. Both names were created by Supabase CLI 2.120.0. The earlier database proposal and the separate docs/sql proposal are superseded, not additive. No hosted migration has been applied.

Sixteen application tables represent configurable Age Category → Group → Unit, durable members, intake/active/inactive status, one current primary placement for active members, placement history, independent department memberships, scoped leadership appointments, private contacts and account links, invitations, access requests, transfers, audit events, idempotency receipts, and shared authentication-rate buckets. Every application table has RLS and explicit privileges.

## Member experience

`/member-preview` uses nine fictional people and switchable test identities. Changes are in-memory only, never saved to Supabase or localStorage. Reset restores sample records. The selector is never used as authentication.

The interface includes personalized My Week, own-group names-only directory, scoped Manage, profile contacts, member creation/name corrections, primary placement changes, receiving-group transfer review, active/inactive changes, independent department rosters, hierarchy creation, organizational appointments and manual ending, and authorized change history. No application-specific schedules or official modules are connected.

`/members` uses the same interface with authenticated server API calls. Real member access is disabled until the isolated target is explicitly configured. The existing home prototype remains intact.

## Authorization and writes

Member-management calls use the caller's Supabase session, not an administrative bypass key. The database derives the actor from Auth, rechecks active membership, enabled account, a matching session and session expiry/cutoff, and enforces scope inside PostgreSQL.

All client writes enter `member_command`. A transaction-level advisory lock serializes consequential operations for this small organization. The authorized mutation, audit entry and idempotency receipt commit together. Retrying the same request does not duplicate an operation. Changing the payload for a used request identifier is rejected.

The second migration validates allowed fields and payload size even for direct database RPC requests. It prevents caller-controlled unrelated department identifiers from changing audit scope. The unchecked internal command is not executable by authenticated or anonymous clients. Private SECURITY DEFINER helpers have an empty search path and explicit EXECUTE grants; exposed RPC wrappers use SECURITY INVOKER. Never expose `app_private` through the Data API.

Ordinary directory reads expose only member identifiers and display names within the caller's own group. Private contacts stay separate, with only the caller's contacts in the workspace. Unit/group leaders manage current authorized scope. A department manager may read their separately assigned department roster across groups but receives no organizational edit authority. Pastoral/member administrators do not automatically receive department authority. Technical administration confers neither ministry-member access nor department management.

Transfers require source authority and receiving-group acceptance, except for an explicitly authorized organizational administrator's direct transfer. Pending requests do not grant destination directory access. Finalization closes the old placement, creates the new one and changes effective access atomically. Old unit/group leadership ceases to confer departed-scope access even though the appointment remains in history until manually ended. Unrelated department memberships remain.

Suspension preserves history and advances an account session cutoff. Reactivation does not revive sessions created before suspension. Expired or missing Auth sessions are denied. No normal client hard-delete operation exists.

## Authentication architecture

`/sign-in` accepts username or email plus password. The trusted server resolves approved linked identities, enforces shared IP and identifier limits, authenticates with Supabase, verifies the linked member, and uses secure HttpOnly SameSite cookies. Generic failures avoid disclosing the resolved email or whether an account exists. The failure-response floor is not a constant-time guarantee.

State-changing browser requests require an exact configured Origin, JSON content and a bounded streamed body. Member responses are private/no-store. User-editable JWT metadata never determines authorization. No request bodies, passwords or tokens are logged.

Recovery uses the verified account email, generic responses, and the delivery feature flag. Verified recovery sessions can set a password and sign out globally. OTP and PKCE callbacks restrict redirect destinations. Invitation activation requires an unexpired, unconsumed digest bound to the signed-in identity's verified mailbox and links the existing member rather than inserting a duplicate.

The member API gate requires `LVZ_MEMBER_SYSTEM_ENABLED=true`, `LVZ_DATABASE_ENV=isolated`, a matching expected Supabase reference and HTTPS origin. The known production reference `otecqlkqirncotytbfns` is explicitly blocked. Login additionally needs the server-only Supabase secret and a 32+-character HMAC secret for rate limits. No such live configuration was installed. Do not remove the production block as a shortcut.

## Verification and remaining work

See MEMBER-SYSTEM-VERIFICATION.md for executed tests. The native/PGlite bootstrap uses Auth schema shims, not a running GoTrue or PostgREST service.

Before real use: independent review; approved isolated hosted environment; genuine password/refresh/recovery/invitation/REST tests; hosted advisors; controlled first administrator bootstrap; approved verification for members without email; access-request review UI and approved invitation delivery; broader concurrency/load and real-device accessibility checks; hosted backup/PITR rehearsal; explicit approval for any real-data pilot/import.

The invitation storage/activation boundary and access-request storage are implemented, but the complete invitation-delivery and request-review operating flow is not. App-specific modules remain unselected. Domain work remains paused. Production and original applications remain untouched.
