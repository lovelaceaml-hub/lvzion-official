# Event Invitation and Registration

[Open the shared concert invitation](https://lvz.app/concert/rsvp) · [Open the member module](https://lvz.app/modules/concert)

**The Words of Mother’s Love That Bring Peace** runs Sunday, December 6, 2026, from **4:30 to 6:00 p.m. Pacific** at World Mission Society Church of God, 6720 W Sahara Ave, Las Vegas, NV 89146. Use the flyer’s end time. Invitation copy reads “Experience the healing power of Mother’s love through heartfelt messages, uplifting music, and inspiring performances.”

## Invitation and registration

- At normal text size the opening view fits one phone screen. Keep the countdown (days, hours, minutes and seconds), playable film, event details and prominent Register action in view. The public landing omits the program list. The promo starts muted. Guests can enable audio themselves.
- Use the supplied event artwork and its poster palette. The heart and musical lines move while the phone is still. Keep controls usable under Reduce Motion. Keep the top-right corner clear of a Pause button.
- Register opens the form over the invitation with two hops, a gold glow and the original sunrise. The original ten leaves sweep across the card while leaves, hearts and sparkles cross the screen. On alternating questions the leaves end a little higher. Back mirrors the path for the question being revisited. Opening and completion keep their original paths.
- The registration uses the supplied greeting wave at opening, inclusiveness with coral and lilac hearts on the guest form, consideration with hearts following in pairs on invitation steps, and gratitude with honey and champagne hearts when registration or invitations succeed. Small gold glints accompany each expression. Completion opens the glints in a wider fan.
- Form fields stay in place during the sweep. Keep the ornaments click-through, stop them on field or keyboard interaction, and respect Reduce Motion. The greeting, consideration and gratitude illustrations follow the [official Daily Check](https://heavenlymotherslove.org/en/checklist).
- The card fits the visible phone screen. On phones, text-entry steps start at the top with the campaign emblem and leave the poster for other steps. The form groups fields into pages when space is tight. While the on-screen keyboard is visible, the current page stays put and the card scrolls internally to keep the focused field reachable. A valid Next or Continue closes the keyboard so the new fields stay in view. If a field needs correction, focus stays on the field. Additional party names stay together in their own list. Keep Help outside the card with a muted 28 × 28 px circle, a 44 × 44 px touch target and a visible keyboard focus ring. Returning from Help or Back preserves the draft. Closing a completed registration clears its ticket details.
- On the shared page the first question is **Are you a member of the Church of God?** The equally prominent choices are **I am a member.** and **I am a guest.** On an invitation link the host appears inside **Tap here to register**. Named guests go directly to editable name, email and party size. A reusable host link starts with empty guest details.
- Members choose to register themselves, send invitations or do both. Self-registration collects name, email and group leader. Collect the invitation count, each recipient’s name and relationship, optional email, and first-visit and VIP flags. Selecting VIP reveals title, organization and category. Members register and create invitations without an email code. An optional recipient email enables automatic delivery. A new batch shows only its own invitations. Without an address the sender can share the personal link.
- Guests can register from the shared invitation. Require who invited them. Show extra attendees’ names together on the same form. Each attendee receives a distinct QR. The guest and linked host receive every QR in their receipts. The lead ticket opens the party wallet. Swipe or tap a number to change attendees. Save image and Save all share labeled PNG images. Options includes receipt resend, image saving and calendar links. Reopening a confirmed personal invitation goes straight to its ticket. Separate invitations can use the same receipt email and still have independent party tickets. The host’s creation receipt opens a read-only status list for all invitations from their email for this concert. Ticket recovery and invitation management use email verification. Keep email, QR and on-screen ticket branding recognizable at check-in. Event mail uses the events@lvz.app identity when the dedicated transport is configured.
- Door staff use the existing scanner or manual check-in. A repeat scan reports the earlier check-in. In Guest list, Attendance spreadsheet opens the private Google Sheet configured for the active event. The scanner records attendance immediately in LV Zion. The Google receiver needs its owner-authorized Apps Script web app URL before live delivery can start. The event-driven receiver copies attendee names, registration times, attendance status and check-in times to the sheet in Pacific time after registration and attendance changes. See the [Google Sheet connection guide](google-sheets/README.md). The server setting LVZ_CONCERT_ATTENDANCE_SHEET binds the event UUID and spreadsheet ID, separated by a slash. Use fictional tickets on a local stack for acceptance tests.

## Implementation and operating notes

| Area | Start here |
| --- | --- |
| Shared, host and named invitation entry | `app/concert/rsvp/`, `app/concert/i/`, `app/concert/invitation/`, `components/concert/rsvp-page.tsx` |
| Landing, film and countdown | `motion-invitation.tsx`, `motion-invitation.css`, `promo.tsx` and `film-palette.ts` in `components/concert/` |
| Register button, registration window, motion and help | `concert-dialog.tsx`, `registration.tsx`, `form-layout.tsx`, `answer-motion.ts`, `festival-sky.ts`, `register-attention.css` and the festival styles in `components/concert/` |
| Validation, tickets, email and attendance | `lib/concert/`, `app/api/concert/`, `app/modules/concert/` and `app/concert/ticket/` |
| Hosted schema history | [Migration ledger](../HOSTED-MIGRATION-LEDGER.json) |

The approved 66-second **Film 10 – Nine Colours – Revision 3** and its extracted poster are private media. The public playback route issues 15-minute signed URLs for those two assets. Keep both binaries, signed URLs, private Drive links, service credentials, attendee records and live ticket tokens outside Git. The supplied event artwork is a separate public asset. Preserve ticket signing keys so issued tickets continue to scan.

### Ticket operations

An open event can enforce a seat limit. The server checks capacity and registration status before issuing tickets. Managers use the guest list for manual check-in, undo, ticket recovery and attendance export. Public ticket links expose the ticket needed for the door. Inviter information and staff-only details belong in the authorized management view. See the [original November 12 operations record](https://github.com/lovelaceaml-hub/lvzion-official/blob/d1aca29/docs/concert/README.md) for the launch history.

## Handoff for the next review

The original leaf sweep and its four expression combinations are live from `dbea0dc7e5eae6d61dd4fc2a43578c80661eb7f6` in Vercel deployment `dpl_7jymMSmvLs8Ms5JV9NSci1ChZscS`. [Live invitation](https://lvz.app/concert/rsvp) · [Release checks](VERIFICATION.md#heart-expression-and-gold-sparkle-release)

The earlier page-specific scenes and stationary form fields shipped from `48892292421ac9ce78849abf2268a2206fcc43aa` in Vercel deployment `dpl_AuooTFSa66S2cjB8AUgEUJmZ37Xp`. Register still hops and Help returns to the same draft. [Live invitation](https://lvz.app/concert/rsvp) · [Scene verification](VERIFICATION.md#distinct-scene-update)

The hopping Register button, full-screen effects and smaller Help circle first shipped from `674ddda945d6dda538ed87753b3f2e6a40a4960d` in Vercel deployment `dpl_AwrcaQJzMznqy2AbfSE7eUdGrdCN`. [Full-screen motion checks](VERIFICATION.md#full-screen-registration-motion)

The preceding celestial redesign and Next.js 16.4.5 patch shipped from `1229bb57e8df0319e2a047f9ca5a3ac7a3e9e8b7` in Vercel deployment `dpl_G2GnCMuDSwsizqG1q6G35eeAXsRr`. [Celestial redesign verification](VERIFICATION.md#celestial-registration-redesign)

The earlier festival redesign shipped from `7a8911b760699d69928c8cfcf1ad02627ce661c6` on `main`. Its release checks covered the centered ribbon, greeting, guest form, return from Help and opening leaves. [Earlier release checks](VERIFICATION.md#festival-registration-redesign) · [Earlier synthetic phone walkthrough](qa/mobile-registration.mp4)

**Pick up with a physical iPhone and Android phone.** Open the shared invitation in Safari and Chrome. Rotate the phone and try both the guest and invitation sender forms. Switch between name and email, dismiss the keyboard with Done, and repeat using Back while the keyboard is open. Check that the form stays steady, the focused field and actions stay reachable above the keyboard, and the poster and leaves wait until the keyboard is gone. Open Help and return to confirm the draft is still there. Repeat with Reduce Motion. Profile the first tap and question changes on-device. The largest observed transition frame in the four-times CPU slowdown test was 153 ms.

Use disposable registrations and a test mailbox for submission, receipt, photo saving, calendar and door-scanning checks. Follow a named invitation directly to editable guest details, confirm a party, swipe and decode each QR, then verify the guest and host receipts. Verify self-registration and invitation creation without an email code. Record the phone, OS, browser, viewport and observed result in the verification record. Keep live smoke checks read-only.

### Repeat the focused checks

From the repository root, use Node 24 and the committed lockfile. Install the Playwright Chromium build if it is missing. The browser spec starts its own loopback server and uses fictional attendees.

```sh
npm ci --ignore-scripts
npm run build
node --experimental-strip-types --test tests/concert.test.ts
npm run test:browser -- tests/browser/concert-registration.spec.ts tests/browser/concert.spec.ts --workers=2
```

The attendance spreadsheet is a separate follow-up. Door check-in records attendance in LV Zion. Resume the receiver setup with the sheet owner, then verify that one synthetic registration and scan update the sheet without polling. [Google Sheets setup and verification](google-sheets/README.md)
