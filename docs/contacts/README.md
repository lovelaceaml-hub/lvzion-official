# Contacts — official LV Zion module

**October 24, 2026 decision (draft, not applied):** migration `20261024170000_open_access_group_placement.sql` opens Contacts to every signed-in member. Each member gets a **private workspace of their own records** and can create contacts in it; every query stays `owner_member_id = the signed-in member`, so nobody (including leaders and the owner) reads another member's contacts or notes. Sharing, export and messaging stay disabled. Production still needs `LVZ_CONTACTS_OWNER_PILOT=true` for the page and API; the owner-only description below applies until the migration is applied.

**Current supported scope:** a **private, owner-only** Contacts application integrated with **[lvz.app/modules/contacts](https://lvz.app/modules/contacts)**. It uses the regular verified LV Zion sign-in and appears in Apps only for an individually authorized member. It is **not** a public contact directory or the fully launched multi-member Shared Contact Tracker.

**Contacts R5 feature-release evidence (historical artifact):** Vercel `dpl_35kWj2cAcYYNjHq2fhc5XpAcofrv`, application commit `87c5a8573ca01f7216f2c78df1da5b827b7380d2`, **READY**, October 14, 2026. The newer READY production deployment `dpl_FFquRhvQkTW1xv1gRVz1SuKBg66S` (source `de5dcdede5fc740873fddfa36467d9d47f318fd6`) retains the Contacts UI; check [the current handoff](../HANDOFF.md) for any later deployment. GitHub documentation commits do not automatically redeploy.

## What works today

- Add a personal outreach contact with name, optional phone number, and a preferred communication method; edit the contact's **name and preferred method** after creation. **Editing or clearing an existing phone number is not yet implemented.**
- See your own accessible records with Open/New/Active/Paused/Closed/Archived/All filters. Search matches only **names already loaded into the authorized browser session**. More pages must be loaded to include further contacts; this is not global search.
- See counts of *loaded* private contacts on Overview. Counts may be incomplete until every page is loaded.
- Record **author-only interaction notes**. Existing notes cannot be rewritten; append-only corrections are not yet enabled in the live module.
- Schedule a next action, complete it, reschedule or cancel it; retain previous actions in record history. One active next action per contact.
- Review **generic** authorized follow-up activity counts. The Follow-Ups tab is **not** a complete, date-grouped task worklist and does not reveal contact details through the shared activity projection.
- Mark do-not-contact, close, archive and restore contacts; restoring does **not** clear a do-not-contact request.
- Check **possible duplicate candidates among individually accessible records**, without automatic merging or sharing.
- Open the real shared Apps selector, populated only from the member's authorized modules.

## Access and data boundaries

The hosted migration `20261014224708_contacts_private_owner_pilot_v1` created six `contacts_private` tables with row-level security enabled and forced. They are not directly readable/writable by browser roles. The five authenticated RPC entry points check the verified account, live session, explicit Contacts module grant and owner of each contact.

Only the **verified bootstrap owner** received the initial Contacts module grant. An Unassigned owner does not need a fabricated group or unit. Membership in a church group, department or technical/leadership role alone does **not** grant Contacts access. No real contacts were imported in the release; the read-only verification on October 14 showed **0 records, 1 active Contacts module grant, 6 private tables and 5 public RPCs**.

**Not active:** sharing/reassignment to another member, unit/group visibility, leader oversight, bulk import, export, member account creation, merging, external calls/messages, automatic follow-up reminders or notification pushes. These require separate documented privacy and workflow decisions.

## Documentation

- [How to use Contacts](USER-GUIDE.md)
- [Operations, access configuration and rollback](OPERATIONS.md)
- [Executed tests and outstanding checks](VERIFICATION.md)
- [R4 initial owner-only production release (historical)](LIVE-OWNER-RELEASE.md)
- [R5 expanded live owner workspace and release evidence](OWNER-EXPERIENCE-R5.md)
- [Supabase hosted/repository migration ledger](../HOSTED-MIGRATION-LEDGER.json)
- [Overall LV Zion documentation](../README.md)

**Still unverified:** an authenticated owner-browser create/save/reload on the real production session, complete physical-device/accessibility acceptance, and the expanded multi-member permission model. These must not be represented as completed because isolated tests passed.
