# Concert release and review

## One-minute Register and registration design review

Register hops in pairs for six ten-second cycles. Registration uses the original breeze, canopy fall, rising curl, crossing leaves, diagonal drift and opening fan across question changes, with the original effect on opening and ticket arrival. Playable examples use the application motion code and existing concert artwork.

The production build, 11 concert unit checks and 21 focused concert browser checks passed. The six playable examples were checked at 320 × 568 and 390 × 844 for distinct paths, screen coverage, Back, the one-minute cycle, Stop and Reduce Motion. A local production build with fictional invitation data verified a named link with a saved email, a named link without email, and a reusable link with only the inviter prefilled. The named-link check also verified that edits and the second attendee's name reached the synthetic submission. Physical phone and full repository checks remain open. Anthony approved the playable examples and requested the final design alignment and release.

The final alignment review used the production build with fictional data. Shared, named and reusable invitations, the signed invitation status screen, and the direct ticket wallet fit at widths of 320, 390 and 768 px. The wallet, its actions and enlarged scan screen also fit in 568 × 320 landscape. QR codes from the on-screen ticket, saved pass and both email attachments decoded to their intended ticket URLs. The invitation, sender receipt, guest receipt, host receipt, verification and registration notice emails fit at all three check widths. Email layout was rendered in a browser with fictional attachment images. No live email or registration was submitted.

## iPhone keyboard stability follow-up

The phone layout reserves space for text entry before focus. While the keyboard is visible, the form scrolls inside the card, page boundaries stay fixed and transition effects pause. Back and valid form navigation dismiss the keyboard while the viewport catches up. The poster and motion resume on the appropriate steps after the viewport recovers.

Opus reviewed the refactor and its follow-up. Copilot identified a test gap, so the regression now measures the field, Continue and Help against a simulated keyboard viewport. The production build and all 21 tests across the two focused concert browser specs passed. The keyboard test simulates delayed dismissal, a 24 px viewport offset, slight scale variation and draft restoration. A physical iPhone check remains open. The full repository suite was not run. The exact tested tree merged in [PR #94](https://github.com/lovelaceaml-hub/lvzion-official/pull/94) as `526b31b68c26bf7569d93078bf16143461815d16`. Vercel built and promoted it as `dpl_G1FpqyZktsx9cYzTFaPJYsY3MWdk`. A live 390 × 844 Chromium check found the email field, Continue and Help above a simulated 245 px viewport boundary, verified that Back held the poster until recovery, and closed with Escape. The public check entered no personal data and made no registration submission.

## Heart, expression and gold sparkle release

The update adds four accent combinations to the restored leaf sweep. The welcoming wave, inclusion gesture, consideration gesture and gratitude bow use the existing concert illustrations. Paired rose and lavender hearts mark the invitation. The ticket reveal uses champagne hearts and five gold glints. Both leaf heights, timing and the artwork files are unchanged.

On `8f6b53a`, type checking and the three focused registration browser checks passed. The four playable examples were checked at phone width for artwork, different heart paths, gold glints, viewport coverage, Hold mid-sweep and Reduce Motion. Anthony approved publication. The exact release branch `aca7e5aafbe742385ef87d2801b5962fcb27f5ec` passed the cloud production build and all 20 tests in the two focused concert browser specs. The identical tree merged as `dbea0dc7e5eae6d61dd4fc2a43578c80661eb7f6` and went live in `dpl_7jymMSmvLs8Ms5JV9NSci1ChZscS`. [PR #93](https://github.com/lovelaceaml-hub/lvzion-official/pull/93)

A read-only 390 × 844 browser check on the public invitation showed ten opening leaves, the full-screen greeting with gold glints, guest welcome with coral and lilac hearts, the consideration accent on the invitation sender step, and the return from Help. Escape closed the form and reopening preserved the guest draft. Ticket gratitude and Reduce Motion passed the focused tests. The public invitation returned HTTP 200 and the signed-out member API returned HTTP 401. No live RSVP or invitation was submitted. [Live invitation](https://lvz.app/concert/rsvp)

## Original leaf sweep draft

The November 21 draft restores the PR 91 leaf sweep. Alternate questions raise the same leaf endpoints six percentage points. Opening and completion use the original path. Back mirrors the destination's earlier path. The original timings, colors and supplied concert artwork are preserved. Fable and Argon challenged the plan before Astra implemented and reviewed it.

The cloud built `8061e6f` and passed all 20 tests across the two focused concert browser specs. The two playable samples passed a 390 px browser comparison with identical timings, hearts and sparkles. At 320 px, Reduce Motion skipped the sweep. The restored sweep shipped with the four expression combinations on November 21.

## Distinct scene update

The registration update gives all twelve destinations individual scenes. Small form pages, recipient changes and result pages use shorter cues. The opening artwork, Help size and Reduce Motion remain as documented in the concert guide.

Cloud Chromium passed all 20 focused concert browser checks before the last field-position refinement. The final implementation in `5b73477` passed the production build and the three affected checks covering distinct scenes, adaptive form pages, alternate invitations and verification. The cloud sampled three scenes at 390 × 844. Anthony approved publishing after the checks passed. Vercel built and published merge commit `48892292421ac9ce78849abf2268a2206fcc43aa` as `dpl_AuooTFSa66S2cjB8AUgEUJmZ37Xp`. [PR #92](https://github.com/lovelaceaml-hub/lvzion-official/pull/92)

A live 390 × 844 Chromium check verified the opening sunrise, curtains, halo, reverse Back, horizon, heart arc, Help ripple and return, stationary fields and Reduce Motion. No registration was submitted. The invitation returned HTTP 200 and the signed-out member API returned HTTP 401. Physical phone checks remain open. [Live invitation](https://lvz.app/concert/rsvp)

## Full-screen registration motion

Register makes two hops with a gold halo. The form rises from the invitation, and hearts, sparkles and leaves cross the viewport on opening, question changes, Back and ticket arrival. The effects clear after the scene, when a control takes focus, or when the form closes. Reduce Motion keeps Register still and skips both layers of the scene. The muted Help circle measures 28 × 28 px inside a 44 × 44 px button on both the invitation and the form.

All 18 focused Chromium concert tests and 10 concert unit tests passed on `c40a892`. Vercel built the identical source tree from merge commit `674ddda945d6dda538ed87753b3f2e6a40a4960d` on Next.js 16.4.5 and served it on lvz.app from `dpl_AwrcaQJzMznqy2AbfSE7eUdGrdCN`. [Merged pull request](https://github.com/lovelaceaml-hub/lvzion-official/pull/91)

A read-only 390 × 844 Chromium check on the live invitation verified both Help sizes, Help return, Register motion, full-screen shapes, forward and Back sweeps, Escape and Reduce Motion. The invitation returned HTTP 200 and the signed-out member API returned HTTP 401. Physical phone checks remain open. [Live invitation](https://lvz.app/concert/rsvp)

At 390 × 844, the opening sample showed hearts, sparkles and leaves above and across the card. The member choice remained tappable and the next settled frame was clear.

## Celestial registration redesign

The design review covered `fcb6841` on the design branch. Anthony approved publication and the Next.js security patch. That release used Vercel production deployment `dpl_G2GnCMuDSwsizqG1q6G35eeAXsRr` from `1229bb57e8df0319e2a047f9ca5a3ac7a3e9e8b7`. [Live invitation](https://lvz.app/concert/rsvp)

The Register button and form share the invitation’s artwork and dawn palette. An opening bloom leads into the campaign greeting. Near, middle and far leaves travel at different speeds across question changes and reverse direction on Back. Answers give brief visual feedback, Help uses a regular step change, and a warmer arrival reveals the ticket. Opus critiqued the concept. Fable’s first review prompted the visible horizon, different leaf speeds and warm ticket reveal. Fable approved the revised design from source, and Copilot’s final review found no actionable code issues.

The motion uses staged reveals inspired by the public Apple product scripts and the interaction timing in OpenAI’s GPT-6.2 paper lamp builder. The concert uses its own artwork and the campaign’s greeting, consideration and gratitude themes. [Apple iPhone](https://www.apple.com/iphone-18-pro/) · [Apple MacBook Pro](https://www.apple.com/macbook-pro/) · [OpenAI interactive web examples](https://openai.com/index/introducing-gpt-6-2-astra-sol/#computer-use-and-interactive-web-design)

On this design revision the cloud ran the production build and both focused Chromium concert specs. TypeScript and the build passed after a retry, and all 17 browser tests passed. Coverage included the Register button’s alignment, opening, leaf speeds, forward and reverse motion, keyboard focus, Help and draft restoration, Reduce Motion, a 320 × 568 form and synthetic QR issuance. The 10 focused concert unit tests also passed. The 390 × 844 and 320 × 568 visual inspection identified a legacy ribbon cut on the form action. Follow-up commit `61546d0` removed it. The cloud built that commit and passed the short-phone retest with a computed clip path of `none` on Get tickets. Physical iPhone, Android and VoiceOver checks remain open.

Next.js 16.4.3 triggered the security guard during earlier builds. The 16.4.5 patch changes only the Next.js package, its environment package and its platform compiler packages. The cloud reproduced the lockfile exactly. TypeScript and the production build passed on the first attempt with no security guard. The patched build passed 17 focused Chromium tests and 10 concert unit tests. Vercel confirmed production was serving the approved source, and the invitation returned HTTP 200 with the new Register button and motion styles. [Next.js security release](https://github.com/vercel/next.js/releases/tag/v16.4.5)

On the live invitation at 390 × 844, Chromium opened Register, played the forward and Back sweeps, and opened the same form with the scene suppressed under Reduce Motion. The live check stopped before submission. Signed-out requests to the member API returned HTTP 401.

## Festival registration redesign

The release under review is commit `7a8911b`, Vercel deployment `dpl_9qKuBbbxNipxAL7d7sUmPwxpi3or`. The 390 × 844 walkthrough records a local guest registration from the shared entry through ticket options, using fictional details and a fixture QR. The promo player is empty in this fixture. [Phone walkthrough](qa/mobile-registration.mp4) · [Handoff and focused test commands](README.md#handoff-for-the-next-review)

The short-phone review found 297 px of overflow on the previous single-guest screen and 201 px on member registration at 320 × 568. On the revised application the focused phone tests passed on both routes. A ten-person party keeps its additional names inside a scrollable list. WebKit also kept the focused field and submit action visible in a simulated 295 px keyboard viewport. Checks included enlarged text and Reduce Motion.

The production build and TypeScript check, 16 focused Chromium browser tests and 10 concert unit tests passed. A local named invitation issued three distinct QR codes. WebKit decoded each code, checked guest and host test receipts and their attachments, switched tickets, saved images and verified both calendar formats. Ticket layouts were exercised from 320 × 460 to 844 × 390 in portrait and landscape. Synthetic registrations and email used local fixtures.

The throttled Chromium profile recorded occasional long frames on question changes, up to 153 ms at four-times CPU slowdown. Physical iPhone and Android checks and the full repository suite remain unverified. agy reviewed keyboard, overflow and motion risks. Copilot CLI authentication failed during this pass.

## Earlier release baseline

The saved production baseline is commit `e86461e`, taken from the source shipped in `dpl_AffVBs3CUcqnjoNyMRuwMhcHGpnk`. That release was verified on the shared live invitation with a 66-second muted promo, a ticking four-unit countdown, a moving ticket outline and working member and guest entry points. Local Chromium and WebKit checks covered 320 × 460 and 390 × 844 portrait and 667 × 320 landscape, ribbon hit testing, reduced motion, keyboard-height simulation and draft restoration. The earlier end-to-end local fixture issued QR tickets, sent invitations to a fictional mail sink and exercised named-invitation verification.

The annotated release tag [concert-rsvp-2026-11-20](https://github.com/lovelaceaml-hub/lvzion-official/tree/concert-rsvp-2026-11-20) identifies the deployed commit. Its annotation records the Vercel deployment ID and the production smoke check.

## Independent review

The review found two registration state defects. Ticket lookup from a duplicate registration shared state with registration itself. A removed recipient’s VIP fields could also carry over to a replacement recipient at the same index. The refactor isolates verified ticket lookup from the in-progress registration and keeps VIP details with the recipient draft. The public request includes VIP details only for recipients marked VIP. The same review found that completed ticket links remained visible on reopening the sheet. Completed results are cleared on dismissal, including a response arriving after dismissal. Unfinished drafts are retained. Closed and full events offer ticket recovery from the member landing, and guests can retry an interrupted film in place. Regression coverage lives in `tests/browser/concert-registration.spec.ts`.

## Mobile invitation and QR layout

The invitation places the heart immediately below the countdown. The register button uses a gold label and inward-moving light trails. Reduce Motion keeps the button still. The confirmation window and the emailed ticket share a compact pass with Download and Share. When a registration has several tickets, the attendee selector changes both the visible QR and the ticket actions.

The latest layout checks covered both mobile Chromium and WebKit at 320 × 460, 320 × 568, 375 × 667, 390 × 844, 568 × 320, 667 × 300 and 844 × 390. The invitation, confirmation and reopened ticket fit at normal text size in all 42 combinations. Each of the 28 QR screenshots decoded to the expected synthetic ticket URL. The ticket-switching regression also passed in both engines.

The independent registration review found and fixed draft loss during a ticket-recovery retry and stale VIP details after removing a recipient. The earlier repository-wide results are recorded below. Physical iPhone, VoiceOver, and door-camera acceptance remain open.

## Repository-wide checks

Use Node 24 and the lockfile. This release’s full-suite run was explicitly requested. Commands below report the initial result and any targeted reruns after fixes.

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts`, `npm run build` | Dependencies installed. TypeScript and the production build passed. |
| `npm test` | 500 of 502 passed initially. The palette reader missed Guidance Teachers’ separately imported stylesheet, and the fresh-start guard rejected the approved Church Display rooms feed. Updated the checks, corrected the light violet gradient endpoint for readable button text, and verified all 11 assertions in those two files. |
| `npm run test:db` | 199 disposable PostgreSQL permission assertions passed. |
| `npm run test:browser -- --workers=2` | 159 of 164 passed initially. All five failures were 320 px checks that assumed the old background. The updated checks assert the approved one-percent accent tint and horizontal fit. All eight design-contract cases passed on rerun. |
| `npm run test:morning-prayer:browser` and `npm run test:morning-prayer:races` | 16 browser cases and four two-connection PostgreSQL race checks passed. |
| Independent concert regressions | Eight scenarios passed in each of mobile Chromium and WebKit, including late responses, both branches, recovery when full or closed, and film retry. Eight focused unit tests, TypeScript and the production build also passed. |
| Public film failure before hydration | The live failure simulation found that a failed server-rendered video could miss its error event before React started. The player now reads the existing media error on mount. `node scripts/test-concert-film-hydration.mjs` holds the app scripts until the media error occurs, retries with a synthetic clip, and verifies Register stays visible. Set `LVZ_CONCERT_QA_ORIGIN` to the loopback origin of a production build serving a fictional shared concert. |
| Hook-enabled signup integration | 53 assertions passed on a fresh isolated Auth/PostgREST/SMTP stack. Confirmed Unassigned members saw ordinary approved module metadata, no management rights and none of another member’s private activity, notifications or favorites. The stack shut down with zero TCP listeners. |

For the signup check, use a fresh loopback namespace with a disposable `/tmp/lvz-integration`, PostgreSQL binaries on PATH and a production build. Set `LVZ_SIGNUP_INTEGRATION=true`, `LVZ_SIGNUP_HOOK_INTEGRATION=true` and `LVZ_INTEGRATION_DIR=/tmp/lvz-integration`. Optionally supply checksum-verified archives via `LVZ_INTEGRATION_ARCHIVE_DIR`. Start with `node tests/integration/start-stack.mjs`, run `node scripts/test-signup-integration.mjs`, and stop with `node tests/integration/stop-stack.mjs`.

There is no standalone lint script. Synthetic registration and door tests use fictional identities and ticket codes. Physical iPhone camera, VoiceOver, real keyboard behavior and real event-day attendance require separate acceptance. See the [concert guide](README.md) for the current product requirements and review checklist.

## Individual admission tickets

The lead ticket opens the party wallet. A companion’s link opens that person’s ticket. The database regression checks that the door admits each attendee separately, rejects repeat scans, and preserves historical seat totals, check-in state and cancellations. It also exercises retries and limits companion links to their own pass.

A local registration with three fictional attendees produced three different QR images. Each image decoded to its own ticket URL. The guest and inviter received matching sets of PNGs through a local mail sink, and resending from the wallet delivered the set to the registration inbox. Mobile Chromium and WebKit exercised swiping, numbered selection, labeled PNG file sharing, the combined image fallback and both calendar links. The ICS file and Google Calendar template specify December 6 from 4:30 to 6:00 p.m. Pacific. Native photo-library and calendar app interactions still need hands-on device acceptance.

Production release `040cb93` is Vercel deployment `dpl_DVTAnFJ13DWRPPWteARR4p8oD5tL`. The hosted migration preserved the active seat total and every aggregate ticket was expanded. The build, 121 concert SQL assertions, 13 focused Chromium browser scenarios and both two- and ten-attendee layout cases in WebKit passed. Both engines resent a three-pass receipt from a directly opened public ticket. The request included only the site origin and the receipt contained the expected three attachments.
