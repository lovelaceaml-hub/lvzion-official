# Morning Prayer R4 — Production Operations & Release Gate

**Target**: https://lvz.app/modules/work-mission-prayer  
**Repository**: lovelaceaml-hub/lvzion-official  
**Project**: Las Vegas Zion · Supabase `otecqlkqirncotytbfns` · Vercel `lvzion-official`  
**Legacy original**: `lovelaceaml-hub/morning-prayer-app`, `https://lv-wm-prayer.web.app` — reference only, unchanged.

## Shipped architecture

This completes the *functional tooling* for Morning Prayer inside the existing signed-in member system, rather than another dashboard, Firebase installation or email-recap product.

- Home: next verified/entered gathering from a rolling 62-day horizon, personalized host, approved PWP week, daily readings, time-limited Join action.
- Schedule: responsive monthly seven-day calendar, independent occurrence status, single and batch volunteering, source-supported linked daily reading, current assignment and pending-state integrity.
- Me: own hosting dates, requests, host confirmation, change request/withdrawal. Pending requests do not silently remove the incumbent.
- Manage: create and verify exact dates, manual bounded weekday recurrence preview (1–62 dates, 180 days max, **no background job**), reschedule existing occurrences while invalidating prior meeting access/host confirmation, cancel/app-day, review competing requests, assign eligible hosts, create and revise source-grounded PWP/readings, separate material publishing, member permission/hosting-eligibility management, per-occurrence Zoom link setup and revocation.
- Authorized Zoom URLs are stored by Supabase Vault encrypted-at-rest; raw URL is excluded from schedules, history, application logs and member exports. The signed-in Join POST only returns the link for an active member with an explicit join grant when the date, encrypted link, secret epoch, and configured time window are valid. No unattended meeting join or recordings.
- Private schema: R3 fourteen private RLS tables + R4 `mpg_private.access_events` append-only table; new invoker public RPC wrappers, explicit capability checks derived from verified member sessions, owner-only access grant/revoke, separate volunteer eligibility, series row lock/version CAS/idempotency, source integrity and audit.

## User setup without fabricated data

The platform intentionally contains **no real recurring gathering schedule, volunteer roster, PWP lesson text, or Zoom credentials** until an authorized coordinator enters the correct values and approves material. If the approved series is empty, members get an informative empty state; no imaginary default 7:00 AM joining times or reused passwords. Current timezone is America/Los_Angeles. A proposed start/end is only applied after owner selects weekdays and confirms the exact generated dates.

The **designated confirmed app owner** is permitted to configure Morning Prayer even while Unassigned/intake. Everyone else must finish real LV Zion enrollment/placement and receive explicit Morning Prayer capability grants. Organizational, technical and department titles alone do not grant anything. Member schedule view is a separate permission from hosting, reviewing requests, editing/publishing material, and seeing protected links. Access can be revoked immediately without deleting audit history. Host eligibility requires both `volunteer_host` and a separate owner decision. Private request notes remain owner/reviewer-only. 

When authorizing the first real meeting:
1. Sign in through lvz.app, open **Apps → Morning Prayer → Manage**.
2. Enter actual dates individually or preview approved weekdays and submit the bounded schedule. New dates are unverified; check details and select **Verify date/time** after inspecting the authoritative source.
3. Configure joining window (0–30 minutes), select the **specific occurrence**, paste its permitted official Zoom join URL and attest verification. The link is never listed again, but access can be revoked.
4. Create/PWP readings from official approved source wording. New materials are **drafts** until checked and published. Use the revision editor for corrections; previously published versions stay unchanged until a newer approved replacement is published.
5. In **Member access**, assign actual active members appropriate preset/custom permissions. Explicitly enable **hosting eligibility** for those who may volunteer. Do not grant host-review/publishing merely for a member's department/group position.
6. Members with `join_gathering` see the Join button only inside the configured window for a correctly verified occurrence. The server rechecks membership before returning the Vault URL.

## Release safety

No automatic recurrence creation, member import, old sheet synchronization, GroupMe/Signal/email posting, PWP participation ranking, attendance tracking, private prayer journaling, AI-generated lessons, or unrelated subscriptions. The retired Firebase app, its underlying data and automation are not modified. No new real member or source content is seeded.

### Verification

R4 security tests: synthetic confirmed owner who remains Unassigned, forbidden cross-member access, explicit grants and retries, separate hosting eligibility, RLS on 15 private tables, atomic future date creation, same-date conflicts, Vault encrypted URL nonleakage in all member projections/audit, permitted in-window Zoom join, revoked access denial, and member revocation. Date/DST tests cover nonexistent and repeated local times. Real browser tests exercise Home/Schedule/Me/Manage at multiple phone and desktop widths with fictional server responses, without modifying production members.

**Final deployment, Supabase hosted migration ID, tests, SHA and alias are to be recorded on the release PR after actual deployment.** Automated browser tests are not physical iPhone/Safari certification. Real meeting schedule, content approval and member grant assignment remain owner-supplied operational steps, not engineering defaults.

For rollback, use the preceding Vercel deployment (production alias only) and revoke member app grants or meeting secrets; preserve additive private tables and audit. Do not drop data or reset signup/other app modules. No write to production beyond the release additive migration should occur without verifying migration ledger and current main branch. 
