# Verification evidence — Continuous Church Display R1

## Executed evidence (October 14, 2026)

The actual Git-backed Vercel preview for commit `583d03b5786130b7eae8a27c9edcaa782a288265` reached READY as deployment `dpl_F2MUdktCSKmY55DLSLBarQopt1rR` (`lvzion-official-ednoi81g9-lvzion.vercel.app`). Its unchanged platform build pipeline ran type generation/TypeScript, Node tests and the existing database suite before Next compilation.

| Check | Observed result | Qualification |
|---|---|---|
| Platform + display Node suite | 166 passed; zero failed/skipped | Includes the isolated display SQL foundation test; not 166 browser tests |
| Existing member-foundation PostgreSQL assertions | 111 passed | Disposable PGlite only; not hosted Supabase |
| Display engine repeated rotation | 10,000 transitions passed | Accelerated deterministic policy test, not a multi-day physical TV soak |
| Deployed Chromium browser suite | 19 checks passed; zero uncaught page errors | 1920×1080 TV viewport and 390×844 phone viewport |
| Extended Chromium failure/restart suite | 8 checks passed | Includes full browser-process restart with persistent profile, then offline/online recovery |

The subsequent management-only now/next summary and adapter boundary tests are tracked in the later commit/build evidence in PR #8. The table above identifies the exact tested baseline rather than retroactively attributing results to an untested commit.

## 19 deployed browser checks

1. Clean TV startup at 1920×1080; no navigation, form fields or buttons.
2. Announcement layout fits its content and rotates.
3. Date-specific Sunday layout fits and rotates.
4. Event layout fits and rotates.
5. Fictional campaign layout fits and rotates.
6. Service-worker cache excludes editor, authentication and API resources.
7. Prolonged network outage ends the content lease and shows neutral fallback.
8. Offline page restart loads the neutral shell rather than a white screen.
9. Connectivity recovery resumes playback without manually refreshing.
10. Normal TV requests do not fetch member endpoints or the editor module.
11. 390-pixel management library has no horizontal overflow.
12. Playlist reorder changes the draft order.
13. Editing a published sample makes a revision that requires new approval.
14. Device-only operator cannot approve or publish.
15. Simulated device revocation purges the player.
16. Reset creates one active handler set; Next advances once.
17. Empty playlist shows neutral fallback.
18. Deployed real publication API returns 403 / DISPLAY_NOT_ACTIVATED.
19. No uncaught application page errors during the run.

Four separate full-resolution TV screenshots and four separate phone workflow screenshots were captured in the isolated test session as evidence. They are not approved campaign assets and were not uploaded to any live content library. Do not infer a repository file or public download URL from their names.

## 8 extended checks

- Paused slide holds position.
- An authorized fictional override preempts pause and ends within the next 250 ms eligibility tick after its window.
- A failed image is attempted and skipped; it does not stop or repeatedly restart the loop.
- Outside operating periods shows neutral fallback.
- Failed video releases its media element and advances.
- An unavailable heartbeat starts neutral, without an indefinite connecting state.
- Full Chromium process shutdown/relaunch while offline loads the cached neutral shell from a temporary persistent profile.
- That restarted browser resumes only after verified connectivity returns. The test profile is then deleted.

The first override browser assertion sampled before the next 250 ms tick and failed. The rerun checked at 20.3 seconds, consistent with the player’s explicit 250 ms evaluation cadence, and passed. The pure engine separately tests exclusive expiration at the exact supplied instant. This is not a claim of sub-frame or hard real-time expiry.

## Security scope actually tested

The display SQL review artifact was executed only in a disposable PGlite instance with a fixture shim for the member-identity helper. Checks included unauthorized publication, independent device scope, inactive members, immutable revisions/publications, exact-window approvals, optimistic publication generation, quarantined media, single-use pairing, disabled-by-default displays, bounded projection leases, approval revocation, device revocation, direct authenticated/anonymous denial, RLS coverage and audit creation.

The pre-existing foundation suite separately verifies the underlying member/session logic. These tests do NOT prove the new module’s complete hosted GoTrue/PostgREST/Storage path, because that path is deliberately not exposed or activated. No production service-role credential entered the player.

## Not yet verified / launch blockers

Actual iPad/iPadOS Safari, Windows kiosk/TV browser, display cables/casting, 70-inch readability at the intended viewing distance, OS/browser sleep and wake, autoplay policy on the intended hardware, multi-day physical memory/thermal behavior, service-worker updates across multiple release versions, maximum-asset interrupted downloads, media re-encoding/metadata removal, hosted login and device pairing, private Storage signed-URL lifetime, real multi-screen reassignment and live source adapters remain launch gates.

Persistent offline content-package playback is NOT implemented: only the approved fictional shell is cached. Phone edits and publication are in-page rehearsals; they are not persisted server-side or synchronized to a separately opened TV page. A separately opened player starts its own sample rotation. Server media uploads are disabled. No real screen has been connected.

## Safe next verification sequence

Use the intended existing hardware, not a speculative purchase. Review actual draft assets and the TV authority matrix, finish the guarded server/private-storage/pairing adapters, test against an approved isolated backend, run the configured operating-period and loss/restart scenarios, then obtain explicit limited-pilot authorization. A pilot must still be separate from production promotion or general church publication.
