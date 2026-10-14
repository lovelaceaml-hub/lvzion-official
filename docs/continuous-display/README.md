# Continuous Church Display / Digital Billboard — R1

**Development rehearsal, not a live church display.** Workstream branch `feature/continuous-display-r1`; draft PR #8 stacked on foundation PR #2. No hosted SQL has been applied. Live command routes deny all access. No actual device has been paired, member account opened, private transcript imported, source feed connected, real poster uploaded or production deployment promoted.

## Open the preview

On the development deployment:
- `/billboard-preview/manage`: phone-first content library, draft editor, playlist order and duration, exact-version approval rehearsal, publication/history, and simulated screen status.
- `/billboard-preview/lab`: real looping player plus isolated failure and timing controls.
- `/billboard-preview/player`: clean 16:9 TV surface, no administrative navigation, controls or persistent clock.

All rehearsal mutations are in memory and affect the player in the SAME page. A separately opened clean player starts its own fictional rehearsal. This is explicitly not cross-device publishing. The real management APIs and module route remain unavailable. Preview HTML and heartbeat routes return 404 in a Vercel production environment; bundled fictional static assets are not private source content.

## Inspection and boundaries

Inspected the actual repository and open drafts before branching from member-foundation commit `5a0d435dc7dbf18401d0a77af89543bf9d9d9c4b`. Reservation PRs #3/#4, Worship Duty #5, Contacts #6 and other app workstreams remain independent. This branch adds display-specific paths only; it does not replace the home dashboard.

Read-only hosted Supabase inspection found the member foundation, command-hardening and onboarding migration records, with 17 RLS-protected application tables and no display schema. Hosted migration timestamps differ from source migration filenames; this work does not repair or replay that ledger. `schema-review.sql` is intentionally outside `supabase/migrations/`.

Read-only references:
- Mother’s Love `64f2e0d46564d9f076444b3db75079bc932487c3`: `docs/source-handoff/05_PHASE_2_DISPLAY.md`, `src/lib/server/public-display.ts`, and the Joy/Peace asset-readiness search. The reference has a bounded, validated public display projection; its Living Wall specifies reading-space priority, a bottom-left QR and a single presentation coordinator. These are reference contracts, not copied campaign assets or permission to publish campaign messages here.
- The Joy/Peace `tv-hosts.ts` search exposed a gated placeholder path, not verified final character assets. No placeholder or substitute characters are imported.
- Study Room Scheduler `3f9f2dfd9d17ba42397f109ff63cfdb5d8931f26`: lobby documentation specifies a separate live `/tv.html` and offline last-known schedules. The new app will not label a stale room record as current. Its production Firebase files, data and settings were not changed.
- Supabase private storage access-control and MDN service-worker/autoplay documentation were reviewed. RLS, narrow cache scope, silent video and explicit rejection recovery inform this scaffold.

Reusable platform boundaries: phone typography/spacing, plain Next route handlers, session-derived `app_private.current_member_id()`, independent explicit grants and unavailable-module behavior. The TV uses a separate minimal HTML/ES-module shell, not the React member workspace or a private-page iframe.

Known devices: approximately 70-inch landscape TV from the brief; earlier iPad/TV white screens and repeated connecting states; Mother’s Love documentation mentions a Windows-connected TV. Exact intended player/browser/OS, HDMI/AirPlay path and kiosk controls are NOT verified. No hardware purchase is proposed.

## Four distinct visual directions

1. Editorial announcement: sage/ivory, oversized serif type, asymmetrical organic forms.
2. Sunday October 18 schedule: cobalt with a large date rail and two activity rows, not an entire monthly calendar. Activity names/times use the supplied project-context Sunday plan. The decorative headline and presentation remain preview-only; no common-area TV approval is inferred.
3. Fictional community event: terracotta and warm cream, bold modern type and a concentrated date/time/location block.
4. Fictional Kind Words Week: lavender and peach, centered editorial type and a distinct campaign composition. This is NOT Mother’s Love, has no invented religious quotation and uses no Joy/Peace, real campaign branding or fake operational QR.

All prototype slides visibly say DESIGN PREVIEW / NOT PUBLISHED. The schedule date is deliberately pinned to October 18 in this first layout; a general date editor is a subsequent enhancement. No crosses, saints, angels, crowns, individual rankings, spiritual-performance tracker, advertisements or unrelated feeds are introduced.

## Implemented rehearsal

The pure engine accepts an allowlisted, strictly fictional display contract with bounded strings, up to 40 items, three schedule rows, 5–60-second dwell, up to three repetitions and a maximum five-minute verification lease. Images and muted inline videos have bounded failure watchdogs and are skipped on error. A basic neutral welcome replaces empty, quiet, expired, clock-untrusted and revoked states.

Entry eligibility is evaluated every tick, even while paused: assigned screen AND approved package membership AND start <= now < end AND (online OR explicit cache permission). The engine applies operating windows in America/Los_Angeles. Overnight periods are represented as two day-specific windows, not an ambiguous reversed interval. Date-time parsing requires an explicit offset and validates it against the church timezone; nonexistent DST times are rejected.

Precedence: invalid/revoked screen or untrusted clock -> expired verification lease -> outside operating period -> highest eligible override (priority descending, newest start, stable ID) -> normal weighted rotation -> neutral fallback. An override resumes at the next eligible regular slot. Expiration, loss of cache eligibility and override boundaries take precedence over a pause. A normal update waits for a safe slide boundary; an eligible override can preempt it. Same-version heartbeats may extend a lease but cannot change content.

The demo clock starts October 14, 2026 at 6 PM Los Angeles and advances monotonically. An actual same-origin heartbeat verifies reachability before initial playback and renewal; browser `navigator.onLine` alone is not trusted. The heartbeat is NOT a production package signature, device authorization or real publishing endpoint. Network controls in the lab allow deterministic failure rehearsal.

The player and studio are separate JS modules. Normal TV playback does not import the editor module. One tick interval is disposed on navigation; media elements, watchdogs and stall timers are cleaned up. Reset replaces the rehearsal mount rather than accumulating event handlers. Back/forward-cache restoration rechecks reachability. No repeated whole-page refresh recovery is used.

## Publication and permissions

The demo role picker is explicitly fictional and NOT an authentication boundary. It illustrates separate create/review/approve/publish/playlist/assign/device/override permissions. Device administrators have no approval or publishing grant. Review alone does not publish. Exact slide revision, screen assignment, time window and cache choice are part of the approval signature. Editing makes a new draft; it does not replace the currently published snapshot. A known-good version restores as a new version after current approval/eligibility checks.

`schema-review.sql` independently models displays, explicit member grants, templates, quarantined media, immutable revisions, immutable publication windows/approvals, revocations, playlists/entries, published versions and atomic current pointers, pairing challenges, hashed sessions, health and overrides. All tables have RLS and no direct browser privileges; all functions are revoked from PUBLIC. Guarded commands derive the actor from the member foundation, not a caller-supplied user ID. Publication locks the display and rejects a stale expected generation. Device pairing cannot implicitly enable a screen or publish content. Approval revocation is checked again in the server projection.

The SQL artifact is an executable REVIEW FOUNDATION, not a completed server application. There are intentionally no public RPC wrappers, grant-management API, hosted storage policy, pairing-code exchange/poll API, digest generation/delivery, assignment/reordering command, live health ingestion, override command or real management UI binding. Those adapters require the approved authority matrix and isolated GoTrue/PostgREST tests before activation. The schema is not sufficient by itself to claim those workflows are live or production-secure.

## Offline and privacy policy

This R1 caches only a small, fixed, non-sensitive fictional PLAYER SHELL. It does not persist content packages, drafts, media, member data, private transcripts, auth links or credentials. A loaded player can finish explicitly cache-permitted fictional entries until its five-minute lease expires. An offline browser restart shows the neutral shell until verified connectivity returns. Full persistent offline published-package playback is deliberately deferred until a signed, screen-scoped production package/lease implementation is reviewed.

A future real package must be server-generated, signature-verified before caching, keyed to one screen, lease-limited, and independently expire each item while offline. Offline revocation cannot be immediate: the maximum valid lease is the upper bound, after which the player shows a neutral approved fallback. Device credentials belong in an HttpOnly Secure narrowly scoped session flow, never localStorage or URL query strings; the database stores only digests. Asset links must never outlive the package, publication window or device eligibility. Restart without trusted server time must not extend a lease.

Text allowlisting does not detect every sensitive statement inside an otherwise valid headline. Human TV-specific review is still required for wording, names, QR destinations, image pixels/metadata, credentials and source accuracy. Approval for private Signal is not approval for TV. No source transcript or ordinary member API is ever a display feed.

## Disabled integration contracts

Each future adapter needs an explicit owner approval, allowlisted output, destination-specific approval, freshness maximum and failure behavior. All are OFF in R1:
- Rooms: room label, current available/busy/unknown state, observation timestamp only. No reserver/member name, reason, phone or meeting credentials. Stale -> unknown, never available.
- Worship Duty: only a separately approved public service summary. No inferred permission to show assigned member names.
- Work Mission: separately approved short lesson card only. No source recording/transcript, private recap or Zoom credentials.
- Mother’s Love: approved export or purpose-built read-only feed; approved artwork and wording only, required fixed bottom-left QR from a verified address, no substitute characters. A failing segment yields to the next regular slide. No blind iframe.

## Validation and release

Run `node --experimental-strip-types --test tests/continuous-display*.test.ts` for policy and disposable PGlite checks. Full platform checks remain unchanged. Browser evidence and actual results are recorded in `VERIFICATION.md`; a passing desktop build does not certify unattended TV use.

Release gates: review all source/text assets and authority choices; independently review SQL and threat model; finish guarded server APIs and private media sanitization; reconcile migration ledger and apply only to an approved isolated environment; test real Auth/session/RLS/Storage and device leases; run the intended iPad/Windows/browser output path with offline/restart tests and an extended soak; verify actual 70-inch readability and QR scan distances; obtain explicit limited-pilot authorization. Production promotion, real publication and live device pairing remain separate decisions.
