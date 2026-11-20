# November 20 concert release and review

The saved production baseline is commit `e86461e`, taken from the source shipped in `dpl_AffVBs3CUcqnjoNyMRuwMhcHGpnk`. That release was verified on the shared live invitation with a 66-second muted promo, a ticking four-unit countdown, a moving ticket outline and working member and guest entry points. Local Chromium and WebKit checks covered 320 × 460 and 390 × 844 portrait and 667 × 320 landscape, ribbon hit testing, reduced motion, keyboard-height simulation and draft restoration. The earlier end-to-end local fixture issued QR tickets, sent invitations to a fictional mail sink and exercised named-invitation verification.

The annotated release tag [concert-rsvp-2026-11-20](https://github.com/lovelaceaml-hub/lvzion-official/tree/concert-rsvp-2026-11-20) identifies the deployed commit. Its annotation records the Vercel deployment ID and the production smoke check.

## Independent review

The review found two registration state defects. Ticket lookup from a duplicate registration shared state with registration itself. A removed recipient’s VIP fields could also carry over to a replacement recipient at the same index. The refactor isolates verified ticket lookup from the in-progress registration and keeps VIP details with the recipient draft. The public request includes VIP details only for recipients marked VIP. The same review found that completed ticket links remained visible on reopening the sheet. Completed results are cleared on dismissal, including a response arriving after dismissal. Unfinished drafts are retained. Closed and full events offer ticket recovery from the member landing, and guests can retry an interrupted film in place. Regression coverage lives in `tests/browser/concert-registration.spec.ts`.

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
