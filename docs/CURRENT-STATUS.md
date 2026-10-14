# LV Zion Official — current production status

**Verified snapshot:** October 14, 2026 (Las Vegas/Pacific time). This is a dated **read-only** audit of GitHub, Vercel and Supabase, not a continuously updating dashboard. Recheck the live sources before a deployment, migration, permission grant or operational decision.

**Production:** [lvz.app](https://lvz.app) · **Repository:** [lovelaceaml-hub/lvzion-official](https://github.com/lovelaceaml-hub/lvzion-official) · **Supabase project:** `otecqlkqirncotytbfns` (Las Vegas Zion organization) · **Vercel project/team:** `lvzion-official` / `lvzion`.

The most recently **verified production READY deployment in this audit** was `dpl_FFquRhvQkTW1xv1gRVz1SuKBg66S`, source commit `de5dcdede5fc740873fddfa36467d9d47f318fd6`, with `lvz.app` and `www.lvz.app` aliases. The repository can move independently of the currently deployed build. Treat older commit/deployment IDs in implementation notes as historical evidence, not as the current release.

## Verified organization and enrollment

| Production database measure | Count / state |
| --- | --- |
| Age categories | 4 |
| Groups | 8 |
| Units | 16 (two under each group) |
| Auth identities / member records | 1 / 1 |
| Pending self-service enrollment | 1 |
| Active member placements | **0** |
| Original verified owner bootstrap receipts | 1 |
| Independently recorded signup-name rows | 0 (historical owner not guessed/backfilled) |

A confirmed new registration collects **required first and last names** separately, verifies personal email, saves structured name parts for newly completed enrollment, and starts with age category/group/unit **Unassigned**. The combined display name remains for existing screen compatibility. The owner can administer while Unassigned through the private, one-time owner bootstrap; ordinary intake accounts cannot infer that authority. Only independently authorized administrators can verify church membership and assign the first unit. **Email confirmation is not membership verification.**

Signup and sign-in are real production routes at `/sign-up` and `/sign-in`. The confirmed-account flows include a manual **Resend confirmation** action, no email-sending GET/refresh, a privacy-preserving generic response for existing account identities, same-tab confirmation-refresh recovery, and the user-requested **six-character minimum**. The previous sending-only `auth.lvz.app` SMTP setup was verified; an end-to-end *new* hosted-member signup and physical iPhone/Android acceptance run after the structured-name release is **not** claimed.

## Modules: actual approval is not broad member access

The database contains **four approved modules with one active owner-specific module grant each**; no ordinary member has an automatic app grant.

| Module | Real route | Verified scope | Important limit |
| --- | --- | --- | --- |
| Contacts | [Contacts](https://lvz.app/modules/contacts) | Live private owner-only pilot; author notes, next-action/follow-up, DNC, archive, owner-only search/overview | No cross-member sharing, export, messaging or full owner-browser save/reload acceptance claim; 0 contact records |
| Study Room Reservation | [Study Rooms](https://lvz.app/modules/study-rooms) | Live owner setup/administrative controls, 12 resources (4 rooms, 5 whiteboards, 3 TVs) | **`bookings_open=false`; 0 new-system bookings.** Original [Firebase scheduler](https://lvrooms.web.app) remains reservation authority until reviewed export/reconciliation and separately approved cutover |
| Continuous Church Display | [Display management](https://lvz.app/modules/continuous-display) / [TV player](https://lvz.app/display) | Live owner-only R2 text/animation, independent screen controls, per-slide windows, limited overrides, immutable restore; Supabase operations schema installed | One screen, **0 publications**, **0 paired devices**. No approved content imported; no real TV pilot, media/video, Mother’s Love/live-rooms feed |
| Work Mission Morning Prayer | [Morning Prayer](https://lvz.app/modules/work-mission-prayer) | Live integrated module with owner-managed schedule/material/host capabilities; original legacy app untouched | One configured series, **0 occurrences**; no verified real schedule, enabled meeting links or automatic old-app/Google Sheet/GroupMe/Signal sync |

**Not launched:** Worship Duty is still a separate launch-gated development workstream ([PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25)); its code does **not** establish a production module. Gospel Planning remains a separate, older development workstream ([PR #11](https://github.com/lovelaceaml-hub/lvzion-official/pull/11)). Old stacked foundation and UI PRs are historical and must not be mistaken for the production `main` branch.

## Migration reconciliation

Read [HOSTED-MIGRATION-LEDGER.json](HOSTED-MIGRATION-LEDGER.json) before any `db push`, schema migration or release. **16 applied hosted migrations** were returned by Supabase in this audit. All 16 names have source migration files in `main` after the Continuous Display R2 merge. Historical hosted version IDs do **not** always match source migration filename IDs. Three entries were missing from the prior documentation and were added by this audit:

- `continuous_display_live_schema` — hosted `20261014224840`, repository `20261014223341`.
- `morning_prayer_live_core` — hosted `20261014225825`, repository `20261014224129`.
- `continuous_display_operations` — hosted `20261014232519`, repository `20261014230147`.

This mapping is confirmed by **migration name/version presence and source-file existence**, **not** by a newly calculated SQL text digest or a fresh full security review. No historical migrations were replayed during the documentation audit. The fact that a migration was applied does not authorize publishing content, opening bookings or granting other members access.

## Acceptance and open release gates

1. **Real self-service enrollment:** with a consenting trusted person, register, receive and confirm the email, recover after refreshing/cross-browser opening, sign out/in, check first/last name persistence and the Unassigned page. Confirm an authorized leader alone can place them after independent identity/member verification. Do not create a throwaway real account without consent.
2. **Membership:** review the actual existing owner placement if desired, then add real members in small controlled groups. Preserve all historical records and do not auto-import a roster.
3. **Study Rooms:** obtain an authorized complete export of original Firebase reservations; reconcile conflict-free, validate private access/owner commands, then separately approve and activate a single booking authority.
4. **Display:** approve actual cards and physical pairing for a specific TV, verify long-running unattended playback, reduced-motion and device revoke behavior, then consider independent media/feed permissions.
5. **Morning Prayer:** validate real dates, authoritative lesson/PWP text, approved host eligibility and source/meeting-link policy before scheduling actual gatherings or granting users access.
6. **Contacts:** owner-authenticated save/reload acceptance and separate governance of sharing, retention, consent and future notifications before any multi-member rollout.
7. **Worship Duty / Gospel Planning:** keep unmerged feature branches gated until product/security review and actual current-main integration tests.
8. **Across modules:** physical Safari/Android/TV acceptance, backup/restore rehearsal, independent security review where not waived, and explicit permissions before broad rollout. Automated, fictional, preview or synthetic transport tests must not be described as a verified real-person end-to-end test.

## Release and safety rules

- The **real** app is `lvz.app`, not the old Firebase applications or a fictional mobile preview.
- No new Vercel preview unless the user explicitly authorizes that exact preview. Git automatic deployment is disabled in `vercel.json`; make an intentional production deploy only after testing. Documentation commits **do not require a production deploy**.
- Preserve original apps, hosted credentials, owner identity, member PII, all private audit history and unrelated module branches. Do not paste secrets or real identities into Git.
- Existing feature and older verification documents remain useful evidence at their **original dates**. Do not retroactively change past “not yet live” findings; use [INDEX.md](INDEX.md) to distinguish historical reviews from current production state.

**Sources of detailed workstream evidence:** [Actual app setup](ACTUAL-APP-SETUP.md), [Handoff](HANDOFF.md), [Release gates](RELEASE-GATES.md), [Organization](ORGANIZATION-WORKFLOW.md), [Study Room R4](STUDY-ROOM-R4-LIVE.md), [Contacts R5](contacts/OWNER-EXPERIENCE-R5.md), [Continuous Display R2](continuous-display/OPERATIONS-R2.md), [Morning Prayer live setup](morning-prayer/LIVE-SETUP.md).
