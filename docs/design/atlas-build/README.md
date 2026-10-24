# Atlas side-by-side gallery

Every rebuilt screen in the shared Liquid Opal design language, captured from fictional fixtures (loopback servers, activation disabled). Each phone image shows: rebuilt Light | rebuilt Dark | the matching Atlas screen in Liquid Opal | the Study Rooms Liquid Opal reference. Wide images (1280px) show rebuilt Light | rebuilt Dark | the Atlas desktop screen.

Regenerate: `npm run build`, then `LVZ_SWEEP_SPEC=atlas node scripts/design-sweep.mjs <shots>` and `node scripts/atlas-gallery.mjs <shots>`.

## Home, My Week, Apps, notifications, sign in and sign up (base palette)

### Apps sheet

Atlas screen: `main-apps`. Tiles come from the authorized module feed, with a pin toggle for favorites; "Recently used" is omitted because no usage history is recorded.

![Apps sheet, 390px](main-apps-390.jpg)

### Home

Atlas screen: `main-home`. Fictional example activities and notices stand in for real module data; real members see only their authorized records.

![Home, 390px](main-home-390.jpg)

![Home, 1280px](main-home-1280.jpg)

### Home (nothing scheduled)

Atlas screen: `main-home`. Empty data: the fictional feed has no activities, so the hero and agenda show their neutral empty states.

![Home (nothing scheduled), 390px](main-home-empty-390.jpg)

### Notifications

Atlas screen: `main-inbox`. A fictional manager: Needs action holds scope-derived review items, Recent holds module notices. No "Mark all as read": there is no bulk read API. Fictional example activities and notices stand in for real module data; real members see only their authorized records.

![Notifications, 390px](main-inbox-390.jpg)

### Sign in

Atlas screen: `main-signin`. Signed out: no dock or avatar, by contract.

![Sign in, 390px](main-signin-390.jpg)

### Sign up

Atlas screen: `main-signup`. Signup is closed on the loopback server, so the closed notice shows and the button is disabled. The heading keeps "Create your account."

![Sign up, 390px](main-signup-390.jpg)

### My Week (Home, Week view)

Atlas screen: `main-week`. Week and Calendar live in the Home segmented control (Today, Week, Calendar) with swipe; the dock Calendar action opens Calendar. Fictional example activities and notices stand in for real module data; real members see only their authorized records.

![My Week (Home, Week view), 390px](main-week-390.jpg)

## Study Rooms

### Study Rooms availability

Atlas screen: `study-availability`. Four bookable dates with previous/next arrows (the real booking window) instead of five chips; the full service day scrolls inside the planner card with the Las Vegas time marker. The tray button keeps the name Reserve. Fictional fixtures: the demo inventory (4 rooms, 5 boards, 3 TVs) and one "Example contact" reservation stand in for real records.

![Study Rooms availability, 390px](study-availability-390.jpg)

![Study Rooms availability, 1280px](study-availability-1280.jpg)

### My reservations

Atlas screen: `study-bookings`. Reservations are read per date, so the date chips replace the Upcoming/Past/Canceled tabs; past and cancelled records live in History. The callout states the real privacy rule. Fictional fixtures: the demo inventory (4 rooms, 5 boards, 3 TVs) and one "Example contact" reservation stand in for real records.

![My reservations, 390px](study-bookings-390.jpg)

### Review reservation

Atlas screen: `study-confirm`. Review is step 2 of the reservation sheet, opened from the tray; the purpose is chosen on step 1 because a purpose and its private detail are required.

![Review reservation, 390px](study-confirm-390.jpg)

### Reservation history

Atlas screen: `study-history`. The history API pages by a 31-day date range, so the range fields replace the search box and state tabs; each row keeps its state tag and private details on demand. Fictional fixtures: the demo inventory (4 rooms, 5 boards, 3 TVs) and one "Example contact" reservation stand in for real records.

![Reservation history, 390px](study-history-390.jpg)

### Who can book (group leaders)

Atlas screen: `organization-access`. No Atlas Study Rooms screen covers group access; matched to the access review composition (heading, glass list card, callout). Fictional "Example" members.

![Who can book (group leaders), 390px](study-members-390.jpg)

### Resource inventory (manager)

Atlas screen: `study-resources`. Manager only. Cards come from the real inventory with Available or Unavailable; capacity is not recorded, so it is not shown. Holds, renames and closures sit in the same Manage view. Fictional fixtures: the demo inventory (4 rooms, 5 boards, 3 TVs) and one "Example contact" reservation stand in for real records.

![Resource inventory (manager), 390px](study-resources-390.jpg)

### Service calendar (manager)

Atlas screen: `study-rules`. Manager only. The real policy is the weekly restriction calendar and special dates (no duration or advance-booking selects exist); booking pause is shown as status because it is not a member-editable switch.

![Service calendar (manager), 390px](study-rules-390.jpg)

## Contacts

### Add contact form

Atlas screen: `contacts-notes`. No Atlas form screen: the form follows the contacts-notes composer (title above, fields in one glass card, gradient Save pill).

![Add contact form, 390px](contacts-add-390.jpg)

### Contact record

Atlas screen: `contacts-detail`. Fictional contacts, notes and follow-ups stand in for the owner's private records. The pairs show the preferred method, the phone and email available to the owner and who is responsible ("Last updated" is not in the record). Mark done is the secondary pill, as in the Atlas; status actions and duplicate review follow below.

![Contact record, 390px](contacts-detail-390.jpg)

![Contact record, 1280px](contacts-detail-1280.jpg)

### Follow-ups

Atlas screen: `contacts-followups`. The follow-up count comes from the private agenda, which carries no dates, so "Due today" and the Today/Upcoming/Completed segments cannot be shown; the tiles show scheduled follow-ups and open contacts instead. By privacy rule the agenda never shows names, phone numbers or times, so each row reads "Private Contacts activity".

![Follow-ups, 390px](contacts-followups-390.jpg)

### My contacts

Atlas screen: `contacts-list`. Fictional contacts, notes and follow-ups stand in for the owner's private records. The follow-up count comes from the private agenda, which carries no dates, so "Due today" and the Today/Upcoming/Completed segments cannot be shown; the tiles show scheduled follow-ups and open contacts instead. Rows show initials, a next-step summary and the status tag: the list has no due dates, so there is no per-row "Today" tag. Segments are Open, Closed, Archived and All; New, Active and Paused open from Overview.

![My contacts, 390px](contacts-list-390.jpg)

![My contacts, 1280px](contacts-list-1280.jpg)

### My contacts (no contacts yet)

Atlas screen: `contacts-list`. Empty data: the workspace has no contacts and no follow-ups, so the tiles read 0 and the card shows its empty state.

![My contacts (no contacts yet), 390px](contacts-list-empty-390.jpg)

### Private notes

Atlas screen: `contacts-notes`. Fictional contacts, notes and follow-ups stand in for the owner's private records. The composer saves an author-only note directly ("Save note"); notes cannot be edited after saving.

![Private notes, 390px](contacts-notes-390.jpg)

### Overview

Atlas screen: `contacts-list`. No Atlas screen: Overview reuses the contacts-list composition (tiles and a glass card of rows). Each count opens that status in My contacts. Fictional contacts, notes and follow-ups stand in for the owner's private records.

![Overview, 390px](contacts-overview-390.jpg)

## Work Mission Prayer

### Work Mission home

Atlas screen: `mission-home`. The filled hero is the weekly focus only because a published PWP exists for the month (Week pills choose the week); the next gathering is the glass card. The week strip shows the next seven days. Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Work Mission home, 390px](mission-home-390.jpg)

### Work Mission home (nothing scheduled)

Atlas screen: `mission-home`. Empty data: no focus and no gathering, so a neutral empty state replaces the hero and the week strip has no dots.

![Work Mission home (nothing scheduled), 390px](mission-home-empty-390.jpg)

### Work Mission home (no weekly focus)

Atlas screen: `mission-home`. No PWP is published for the month, so the next real gathering becomes the filled hero instead of an invented focus. Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Work Mission home (no weekly focus), 390px](mission-home-next-390.jpg)

### Manage (schedule)

Atlas screen: `mission-manage`. A fictional manager. Forms stay closed until opened (one is opened here); host, reading and meeting link are assigned per confirmed date below, as the existing rules require. Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Manage (schedule), 390px](mission-manage-390.jpg)

### Manage (materials)

Atlas screen: `mission-manage`. Drafts waiting for publication are glass rows with tags; review and publish stay separate steps. Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Manage (materials), 390px](mission-manage-materials-390.jpg)

### Materials

Atlas screen: `mission-materials`. Published PWP and readings only, filtered by All, PWP or Readings (there are no songs or references in the data). Rows open to the full wording and source. Reached from More and the wide top tabs. Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Materials, 390px](mission-materials-390.jpg)

### Me (hosting and requests)

Atlas screen: `mission-schedule`. Me has no Atlas screen; it uses the host-schedule list composition for your hosting dates and requests. Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Me (hosting and requests), 390px](mission-me-390.jpg)

### Host schedule (week)

Atlas screen: `mission-schedule`. Week chips cover the selected week within the loaded month (with previous and next week controls); tags come from each date's real state. A volunteer card and tray appear only with the hosting permission. Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Host schedule (week), 390px](mission-schedule-390.jpg)

### Host schedule (month)

Atlas screen: `mission-schedule`. Month is the second view of the same pill control; it keeps the existing calendar with its key. Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Host schedule (month), 390px](mission-schedule-month-390.jpg)

### Host schedule (volunteering)

Atlas screen: `mission-schedule`. With the hosting permission, open confirmed dates can be chosen; the floating tray carries the count and the request (each request still waits for a coordinator). Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Host schedule (volunteering), 390px](mission-schedule-volunteer-390.jpg)

### Gathering detail

Atlas screen: `mission-session`. Pairs show real times, host and the meeting state (joining opens only through the server window; the link is never displayed). There is no song data, so the Atlas "Preparation song" row is omitted. Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.

![Gathering detail, 390px](mission-session-390.jpg)

## Members and organization

### My Week tab

Atlas screen: `main-week`. Day chips for this week, the selected day's authorized activities from the same module feed as Home, and a week note. No Week/Month/Agenda control: the full calendar is Home (Calendar link). Fictional example records stand in for real data; real members see only their authorized records.

![My Week tab, 390px](members-week-390.jpg)

### Manage: access review

Atlas screen: `organization-access`. Pending account requests with requested date, decision, record match, identity verification and reason; reviewed requests follow, then the "Access is deliberate" note, invitations and account controls. No Pending/Reviewed toggle: both lists stay visible so a decision is seen landing. Fictional example records stand in for real data; real members see only their authorized records.

![Manage: access review, 390px](organization-access-390.jpg)

### Manage: departments

Atlas screen: `organization-departments`. A fictional department manager and administrator: one card per managed department with its real member count and members; membership changes open below. No per-department workspace exists, so there is no "View department" link. Fictional example records stand in for real data; real members see only their authorized records.

![Manage: departments, 390px](organization-departments-390.jpg)

### My Group (ordinary member)

Atlas screen: `organization-members`. An ordinary member sees names in their own group only, with no Unassigned view and no placement button.

![My Group (ordinary member), 390px](organization-directory-member-390.jpg)

### Manage: members you manage

Atlas screen: `organization-members`. Manage opens on the areas this person is authorized for (Members, Placement, Departments, Access) as rounded tiles; Members lists the managed directory with status tags and opens the member editor sheet. Fictional example records stand in for real data; real members see only their authorized records.

![Manage: members you manage, 390px](organization-manage-390.jpg)

### Manage: member editor sheet

Atlas screen: `organization-placement`. Tapping a managed member opens the editor as a bottom sheet: rename, change primary placement (the placement fields and gradient primary, as on the Atlas placement screen) and, with organization access, active status. Fictional example records stand in for real data; real members see only their authorized records.

![Manage: member editor sheet, 390px](organization-member-editor-390.jpg)

### Member directory (My Group, leader)

Atlas screen: `organization-members`. The My Group tab: search, pill segmented My group / Departments / Unassigned (Unassigned only with organization access), initials rows and the placement button. Rows show names only; leaders can open a member they manage. The workspace tab rail (My Week, My Group, Manage, Profile) sits under the heading. Fictional example records stand in for real data; real members see only their authorized records.

![Member directory (My Group, leader), 390px](organization-members-390.jpg)

### Manage: placement

Atlas screen: `organization-placement`. A fictional unassigned signup: the member summary card, the age category, group and unit fields with the verification choice and reason, and one gradient primary. The age category, group and unit structure follows below. Fictional example records stand in for real data; real members see only their authorized records.

![Manage: placement, 390px](organization-placement-390.jpg)

## Profile

### Profile (assigned member)

Atlas screen: `main-profile`. Base palette. Identity card with initials, real placement and status; rows for placement, contact information (opens the private contacts form) and Appearance; roles and departments; Sign out. No notification or motion toggles: those settings do not exist.

![Profile (assigned member), 390px](main-profile-390.jpg)

### Profile (unassigned member)

Atlas screen: `main-profile`. Base palette. A new member waiting for placement: identity card with an Unassigned tag, the placement card, submitted names, Appearance and history.

![Profile (unassigned member), 390px](main-profile-unassigned-390.jpg)

## Worship Duty

### Service calendar

Atlas screen: `worship-calendar`. Month grid in a glass card: a dot marks days with services, a ring marks days you serve, the filled pill is the chosen day. The chosen day lists its services as rows (opening the service detail) under a "You serve" strip when you have a duty. Only days with services can be chosen. Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![Service calendar, 390px](worship-calendar-390.jpg)

![Service calendar, 1280px](worship-calendar-1280.jpg)

### Worship Duty (not granted)

Atlas screen: `worship-calendar`. A 403 clears the workspace and shows the access state in a glass card.

![Worship Duty (not granted), 390px](worship-denied-390.jpg)

### My Duties

Atlas screen: `worship-duties`. Stat tiles count real published duties; the next duty is the large glass card with the service time strip and its actions (View service, Request change), later duties are compact cards with a date box and their own status tag. The Atlas Upcoming/Completed pill is replaced by the section pill shared by every view (Schedule, My Duties and, with permission, Presider and Manage). Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![My Duties, 390px](worship-duties-390.jpg)

![My Duties, 1280px](worship-duties-1280.jpg)

### My Duties (nothing assigned)

Atlas screen: `worship-duties`. Empty data: zero tiles and a neutral empty state; nothing is invented.

![My Duties (nothing assigned), 390px](worship-duties-empty-390.jpg)

### Assignment management

Atlas screen: `worship-manage`. Round chips are the month's real service days; the department pill switches duty groups the manager schedules; the glass card carries the service strip (status tag) and the assignment selects; the open-assignment card counts real unfilled duties. On phones a callout at the top links to waiting change requests (listed after the planner); on wide screens they sit in the right column. Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![Assignment management, 390px](worship-manage-390.jpg)

![Assignment management, 1280px](worship-manage-1280.jpg)

### Assignment management (staged changes)

Atlas screen: `worship-manage`. Staged changes ride in the floating tray (count, Discard, Review); saving still needs the visible batch review. Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![Assignment management (staged changes), 390px](worship-manage-batch-390.jpg)

### Assignment management (calendar)

Atlas screen: `worship-calendar`. The planner's calendar view reuses the Schedule month card. Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![Assignment management (calendar), 390px](worship-manage-calendar-390.jpg)

### Assignment management (one service)

Atlas screen: `worship-manage`. Edit one service keeps per-duty editors; an open editor sits on a tinted panel inside the glass list. Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![Assignment management (one service), 390px](worship-manage-edit-390.jpg)

### Presider preparation

Atlas screen: `worship-presider`. The service card chooses among services the member presides. "Before the service" is a read-only readiness list derived from the plan itself (songs chosen, saved, confirmed), not an invented checklist; the song plan follows in glass cards with Save plan as the one gradient action. Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![Presider preparation, 390px](worship-presider-390.jpg)

### Presider preparation (song plan)

Atlas screen: `worship-presider`. Lower part of the same screen: preparation songs with reorder controls, the section songs and Save plan as the gradient pill. Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![Presider preparation (song plan), 390px](worship-presider-plan-390.jpg)

### Service detail

Atlas screen: `worship-service`. Opened from a duty card or a calendar row. The strip shows the real start and end time and the service status; your duty and your Las Vegas day availability follow, then every duty by department ("Assigned member" where another group's name is hidden, "Not filled" when open). There is no choir song data in a service, so the Atlas "Choir selection" row is omitted. Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![Service detail, 390px](worship-service-390.jpg)

### Setup

Atlas screen: `worship-manage`. Owner setup in the same material: section pill, the create form as a glass card, services as rows with a date box and status tag. Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.

![Setup, 390px](worship-setup-390.jpg)

## Church Display management

### Screens (paired TVs)

Atlas screen: `display-devices`. Stat tiles and tags come from real check-ins (online within 45 seconds). TVs have no names, so they are numbered. Fictional "Example" displays, slides and devices with dates relative to now stand in for owner-sourced records.

![Screens (paired TVs), 390px](display-devices-390.jpg)

### Screens (pairing code)

Atlas screen: `display-devices`. A one-time code appears only after the manager creates it (fictional code here); settings are glass disclosures below. Fictional "Example" displays, slides and devices with dates relative to now stand in for owner-sourced records.

![Screens (pairing code), 390px](display-devices-code-390.jpg)

### Church Display (no screens)

Atlas screen: `display-devices`. No display is assigned to the account, so a neutral empty state replaces the tabs.

![Church Display (no screens), 390px](display-devices-empty-390.jpg)

### Content (slide editor)

Atlas screen: `display-editor`. Slide tiles choose the slide; the framed preview is the real TV slide component; fields sit in glass cards and a floating tray saves the draft. Fictional "Example" displays, slides and devices with dates relative to now stand in for owner-sourced records.

![Content (slide editor), 390px](display-editor-390.jpg)

![Content (slide editor), 1280px](display-editor-1280.jpg)

### Content (fields)

Atlas screen: `display-editor`. The slide fields in their glass card, with the save tray floating above the dock. Fictional "Example" displays, slides and devices with dates relative to now stand in for owner-sourced records.

![Content (fields), 390px](display-editor-fields-390.jpg)

### Playlist

Atlas screen: `display-playlist`. Stat tiles count the real draft slides and paired TVs; rows keep the move controls; the tray saves the order. The Atlas Schedule and Published pills map to the Content and Publish tabs. Fictional "Example" displays, slides and devices with dates relative to now stand in for owner-sourced records.

![Playlist, 390px](display-playlist-390.jpg)

### Publish (framed TV preview)

Atlas screen: `display-tv`. The real TV slide in a glass frame (the TV player itself is unchanged), then the draft, approved and published versions. Fictional "Example" displays, slides and devices with dates relative to now stand in for owner-sourced records.

![Publish (framed TV preview), 390px](display-publish-390.jpg)

![Publish (framed TV preview), 1280px](display-publish-1280.jpg)

### Publish (on the TV now)

Atlas screen: `display-playlist`. Approval and publishing stay separate steps; the published playlist is listed as glass rows. Fictional "Example" displays, slides and devices with dates relative to now stand in for owner-sourced records.

![Publish (on the TV now), 390px](display-publish-live-390.jpg)

## Groups & Gospel Planning

### My Group (group leader)

Atlas screen: `organization-members`. Matched to organization-members: the four Wayfinders sections as glass cards with numbered gradient steps; Member Updates and Requests as avatar rows with status tags, Gospel Review as count tiles (real counts from the SQL), the published plan and the leader draft with the gradient Publish pill. No search or segmented filter: the four sections are always shown together, in order. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![My Group (group leader), 390px](gospel-group-leader-390.jpg)

### My Group, lower half (group leader)

Atlas screen: `organization-members`. Gospel Review counts (the first tile filled), the published plan, the leader draft with its gradient Publish pill, and the overseer request row. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![My Group, lower half (group leader), 390px](gospel-group-leader-more-390.jpg)

### My Group (member)

Atlas screen: `organization-members`. An ordinary member sees the published review and plan only; member updates, drafts and overseer requests stay private to leaders. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![My Group (member), 390px](gospel-group-member-390.jpg)

### Manage: places (module manager)

Atlas screen: `mission-manage`. Matched to mission-manage: the "Setup only" callout, a pill segmented control (Places, Roles) and glass cards for the list and the add form with one gradient pill. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![Manage: places (module manager), 390px](gospel-manage-390.jpg)

### Manage: roles (module manager)

Atlas screen: `mission-manage`. Gospel roles as avatar rows (the fixture grants Isla Publisher and Eira Overseer), then the assign form. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![Manage: roles (module manager), 390px](gospel-manage-roles-390.jpg)

### My Preaching (member)

Atlas screen: `main-week`. Matched to main-week and mission-schedule: the next session as a frosted card with its date block and one gradient action, the week as round date chips (a dot marks a day with sessions) over a glass list with status tags, a floating tray with the gradient "Plan a session" pill, later sessions and the availability card. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![My Preaching (member), 390px](gospel-preaching-390.jpg)

### My Preaching (new member, nothing planned)

Atlas screen: `main-week`. A member with access but no sessions or availability yet: neutral empty states, the week chips and the plan tray. No sample sessions are shown. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![My Preaching (new member, nothing planned), 390px](gospel-preaching-empty-390.jpg)

### My Preaching (group leader)

Atlas screen: `main-week`. A group leader sees the sessions in the shown week that they may publish or change alongside their own. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![My Preaching (group leader), 390px](gospel-preaching-leader-390.jpg)

### My Preaching, lower half (member)

Atlas screen: `main-week`. The week strip and list, the floating "Plan ahead" tray with its gradient pill, sessions after this week and the availability card. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![My Preaching, lower half (member), 390px](gospel-preaching-more-390.jpg)

### Session sheet (member)

Atlas screen: `study-confirm`. The bottom sheet for a session waiting on the member: a frosted summary with the date block, partner rows with initials and the gradient Accept pill. Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.

![Session sheet (member), 390px](gospel-session-sheet-390.jpg)
