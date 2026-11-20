# Event Invitation and Registration

[Open the shared concert invitation](https://lvz.app/concert/rsvp) · [Open the member module](https://lvz.app/modules/concert)

**The Words of Mother’s Love That Bring Peace** runs Sunday, December 6, 2026, from **4:30 to 6:00 p.m. Pacific** at World Mission Society Church of God, 6720 W Sahara Ave, Las Vegas, NV 89146. Use the flyer’s end time. Invitation copy reads “Experience the healing power of Mother’s love through heartfelt messages, uplifting music, and inspiring performances.”

## Invitation and registration

- At normal text size the opening view fits one phone screen. Keep the countdown (days, hours, minutes and seconds), playable film, event details and prominent Register action in view. The public landing omits the program list. The promo starts muted. Guests can enable audio themselves.
- Use the supplied event artwork and its poster palette. The heart and musical lines move while the phone is still. Keep controls usable under Reduce Motion. Keep the top-right corner clear of a Pause button.
- Register opens the existing form over the invitation. The poster stays at the top. The popup has a gilded ticket silhouette with a heart cleft, side cutouts, travelling lights and fork-ended ribbon choices. Opening, answering and going back should feel continuous. Put Tickets & help at the lower right. Preserve focus, readable labels, progress and entered values when navigating back. Closing a finished registration clears its result before the next person opens the sheet. Longer forms can scroll within the window.
- On the shared page the first question is **Are you a member of the Church of God?** The equally prominent choices are **I am a member.** and **I am a guest.** On an invitation link the host appears inside **Tap here to register**. Named guests go directly to editable name, email and party size. A reusable host link starts with empty guest details.
- Members choose to register themselves, send invitations or do both. Self-registration collects name, email and group leader. Collect the invitation count, each recipient’s name and relationship, optional email, and first-visit and VIP flags. Selecting VIP reveals title, organization and category. Members register and create invitations without an email code. An optional recipient email enables automatic delivery. A new batch shows only its own invitations. Without an address the sender can share the personal link.
- Guests can register from the shared invitation. Require who invited them. Show extra attendees’ names together on the same form. Confirming a party issues one downloadable, shareable QR for the whole party. The guest and host receive the same QR. The host’s creation receipt opens a read-only status list for all invitations from their email for this concert. Ticket recovery and invitation management use email verification. Keep email, QR and on-screen ticket branding recognizable at check-in. Event mail uses the events@lvz.app identity when the dedicated transport is configured.
- Door staff use the existing scanner or manual check-in. A repeat scan reports the earlier check-in. Use fictional tickets on a local stack for acceptance tests.

## Implementation and operating notes

| Area | Start here |
| --- | --- |
| Shared, host and named invitation entry | `app/concert/rsvp/`, `app/concert/i/`, `app/concert/invitation/`, `components/concert/rsvp-page.tsx` |
| Landing, film and countdown | `motion-invitation.tsx`, `motion-invitation.css`, `promo.tsx` and `film-palette.ts` in `components/concert/` |
| Registration window and transitions | `concert-dialog.tsx`, `invitation-frame.tsx`, `popup-heart.tsx`, `answer-motion.ts`, `registration.tsx` and `registration-stage.css` in the same directory |
| Validation, tickets, email and attendance | `lib/concert/`, `app/api/concert/`, `app/modules/concert/` and `app/concert/ticket/` |
| Hosted schema history | [Migration ledger](../HOSTED-MIGRATION-LEDGER.json) |

The approved 66-second **Film 10 – Nine Colours – Revision 3** and its extracted poster are private media. The public playback route issues 15-minute signed URLs for those two assets. Keep both binaries, signed URLs, private Drive links, service credentials, attendee records and live ticket tokens outside Git. The supplied event artwork is a separate public asset. Preserve ticket signing keys so issued tickets continue to scan.

### Ticket operations

An open event can enforce a seat limit. The server checks capacity and registration status before issuing tickets. Managers use the guest list for manual check-in, undo, ticket recovery and attendance export. Public ticket links expose the ticket needed for the door. Inviter information and staff-only details belong in the authorized management view. See the [original November 12 operations record](https://github.com/lovelaceaml-hub/lvzion-official/blob/d1aca29/docs/concert/README.md) for the launch history.

## Handoff for the next review

The November 20 live design baseline is Vercel deployment `dpl_AffVBs3CUcqnjoNyMRuwMhcHGpnk` in `lvzion/lvzion-official`. Git-based release and test results are recorded in [the verification record](VERIFICATION.md). The release target is the existing shared route. Keep the current registration backend and public plus personal entry points.

1. Start with repository instructions and the verification record. Use Node 24 and the lockfile. Review the shipped source against both the shared invitation and a fictional host link.
2. Exercise short portrait, landscape, an open keyboard, enlarged type, keyboard-only input and Reduce Motion. Watch the opening and answer transitions while the phone is still. Verify the ribbon cutouts, hit targets, focus restoration, help and draft retention. Also check private playback failure and the countdown boundary in Pacific time.
3. Trace member, guest, both, and invitation-only paths through verification, optional email, first visits, VIP details, multi-attendee tickets and retrieval. Check duplication, capacity and repeated door scans with disposable data. Live smoke tests should be read-only.
4. Refactor where a reproducible defect or duplicated behavior warrants a change. Keep interactive geometry, registration state and email delivery semantics covered with focused regressions. Follow the repository’s per-run authorization for a full suite.
5. A physical iPhone playback, keyboard and camera scan remain separate device checks. Record observed results and distinguish local browser emulation, hosted smoke checks and real-device acceptance.
