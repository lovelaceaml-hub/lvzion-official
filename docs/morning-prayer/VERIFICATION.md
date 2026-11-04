# Morning Prayer R2 — verification and release record

> Historical R2 development record. Current actual-app setup is in [LIVE-SETUP](LIVE-SETUP.md), with the verified hosted snapshot in the [handoff](../HANDOFF.md). Preview links and unapplied-schema statements below describe the older milestone only.

## Verified initial implementation, October 14, 2026

Initial application commit: `82def5050bce5dfed0f3c38bd8f8376d0b56ff67`.
Initial Vercel preview: `dpl_8LkbSyn2gUwbsqcA8NRAHiDXjpBz`, READY, preview environment.
Route: https://lvzion-official-mh1u10bqc-lvzion.vercel.app/morning-prayer-preview
Draft PR: https://github.com/lovelaceaml-hub/lvzion-official/pull/10

- Repository-wide Node tests: 169 passed, 0 failed or skipped, including the new domain and foundation-linked disposable SQL tests.
- Existing foundation PostgreSQL permissions: 111 assertions passed in disposable PGlite.
- Strict TypeScript and optimized Next.js build passed.
- Actual hosted-preview Chromium run: 41 checks passed, zero browser exceptions, no observed calls to Firebase, Firestore, Supabase, Google APIs, GroupMe, Signal or Zoom.
- Home / Schedule / Me / Manage each checked at 320, 390, 430 and 768 px for document overflow. Four separate 390 px screenshots captured.
- Real browser interactions verified conditional joining, completed/weekend selection, weekly PWP changes, dialog/Escape behavior, single/multiple volunteer dates, independent approval, competing request supersession, own hosting changes, withdrawals, role separation, moved-date verification, source conflict preservation, PWP draft/publication separation, reading access, simulated access loss and GET/POST live API 401/no-store.

## Follow-on parity fix

An additional regression covers publishing an older still-open PWP draft after a newer version was published. The SQL candidate already rejected downgrades; the TypeScript preview now rejects them too with `MATERIAL_REVISION_CONFLICT` and leaves the newer publication unchanged. The final exact commit, deployment and rerun counts are recorded in the draft PR after verification.

## Reproduce

- `npm run build`: original foundation typecheck, Node and database checks followed by Next.js build. No package/lockfile or Actions changes.
- `MPG_PREVIEW_URL=<verified preview origin> node scripts/verify-morning-prayer.mjs` (historical: this script is no longer in the repository).
- A Vercel-authenticated temporary review URL may be supplied through `MPG_AUTH_URL`; never commit it or save browser authentication state. The script writes only fictional screenshots and a redacted check report to `.artifacts/morning-prayer` (or `MPG_EVIDENCE_DIR`).

## What these results do not establish

The browser is automated Chromium, not physical iPhone/Safari/iPad/Android certification. Overflow checks do not establish final visual approval or complete accessibility conformance. Screenshot transfer to this conversation's image viewer was unavailable; no manual screenshot inspection is claimed. The preview can be reviewed directly through the protected deployment.

Database tests use disposable PGlite with the actual member/module migrations, not a hosted authenticated PostgREST session or simultaneous two-connection contention test. Series locking, idempotency and stale-version rejection are implemented; real concurrency and grant-revocation-under-contention remain review gates. The schema is an unapplied review candidate outside `supabase/migrations` and must not be auto-applied.

The real frontend-to-RPC, complete coordinator/editor read projections, named grant management, meeting-access broker, sources, retention/deletion, backups and pilot approval are not activated. Real timezone/recurrence/host eligibility and source/link authorization still require confirmation from the accountable owner. No real source/PWP content, member records, credential or outgoing distribution is included.

This is a tested fictional development module for the correct older app scope, not a production-ready replacement. The old app, its Firebase database, source Sheets, GroupMe jobs and LV Zion production remain untouched.
