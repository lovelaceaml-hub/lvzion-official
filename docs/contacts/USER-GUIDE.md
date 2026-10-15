# Using Contacts in LV Zion Official

**Web app:** [lvz.app/modules/contacts](https://lvz.app/modules/contacts). Sign in with your normal LV Zion Official account. The initial Contacts module is available only to the account with its explicit owner grant; general signup and church membership do not create access.

## Find a record

On a phone, the list and an open record take turns: open a contact to see it, and use **Back to contacts** to return. You can also swipe left or right on the list area to change tabs. On a computer, the list stays on the left and the open record shows beside it.

Open **Apps → Contacts**, then **My contacts**. Choose Open, New, Active, Paused, Closed, Archived or All in the status menu beside the search box. The search field checks **loaded contact names only**; it does not search every record or phone number in the database. If the page offers **Load next 100 contacts**, select it to load more names. A missing search result is not proof that no record exists on another page.

**Overview** shows totals for the *currently loaded* private contacts only. The displayed numbers can increase when you load more records. The app intentionally excludes other members' contacts from search and counts.

## Add and edit

1. Select **Add contact** at the top of My contacts.
2. Enter the person's name. An optional phone number may be entered during creation. Choose the preferred method only if you know it; `Not confirmed` is available.
3. Select **Save**, then review the record.

Open a record and use **Edit name or preferred method** to change the **name or preferred method**. Existing phone numbers cannot currently be changed or removed through the live interface. Choosing a preferred method does **not** establish consent to send a text, email or call. Contacts never sends communications automatically.

Only record information relevant to an authorized outreach purpose. There is no automatic personal-address-book import, member-account creation or roster matching.

## Record interactions and follow-ups

Open the contact and choose **Add note** under **Private notes** to record a private interaction. Only you can see these notes. Notes are append-only; editing, deleting or adding a formal correction to an existing note is not implemented. Do not use this as an unrestricted document store.

Under **Next step**, select **Schedule follow-up**. Enter the next action and a future date/time. Input uses the device's local timezone; dates displayed on the contact record use **Las Vegas (America/Los_Angeles) time**. A contact supports one currently scheduled action. You can **Mark done**, **Reschedule** or **Cancel follow-up** for the active step; history remains attached to that contact.

The **Follow-ups** tab deliberately shows generic counts of privately authorized activities, not a detailed calendar or a full list of named contacts and due dates. Open individual contacts to review their action and due date.

## Status, do-not-contact and archive

New, Active and Paused distinguish the contact's current outreach state. Close a contact when outreach has ended. **Do not contact** (under Record status) closes the record and prevents further scheduled outreach. The app cannot clear that restriction.

An **archived** record retains history; the archive action is available after a record is closed. **Restore as closed** restores access to the record without reactivating outreach and without clearing do-not-contact. There is no permanent delete button.

**Possible duplicates** only suggests similar records you are individually authorized to access; review them before acting. The app does not merge contacts.

## Switch apps and protect access

The **Apps** button at the top right opens a list of only the apps currently authorized for your account. Tapping **LV Zion** at the top left returns home. Do not share the account or use another member's credentials. Contact records are separate from the member directory.

If a save reports a network issue, review the record before submitting a new, different action. The current form's unchanged retry is designed to preserve its request ID; if you change the information or reload, review the latest record version before saving. A 401 requires signing in again, a 403 indicates unavailable authorization, and a 409 indicates a conflict that needs a fresh review. In all cases, avoid repeatedly entering the same contact without checking for an existing record.

## Not yet supported

Contacts is currently **owner-only**. You cannot share confidential contact records with coworkers, unit/group leaders, departments or other members; there is no export, messaging, automated reminder, merge, full database-wide search or detailed cross-contact task calendar.

**Production owner acceptance is outstanding:** the owner has not yet completed an independently witnessed authenticated save-and-reload of a legitimate contact in the live browser. This guide describes implemented functionality, not an assertion that that particular acceptance check has passed. See [Contacts verification](VERIFICATION.md).
