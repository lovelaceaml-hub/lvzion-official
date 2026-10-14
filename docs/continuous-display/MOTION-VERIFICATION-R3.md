# Motion R3 — deployed preview verification (October 14, 2026)

The proposed real LV Zion Official Digital Billboard is **not yet activated on lvz.app**. The stacked PR #13 offers stronger animation on the existing fictional player. The branch deploys only to an SSO-protected Vercel preview.

- Commit: `374edec4616c9db065995a082cc8357501295123`.
- Vercel preview: `lvzion-official-mv7v7h6tz-lvzion.vercel.app`, deployment `dpl_5gKSa6XY43siMsWBhXzDopZD4Pyz` — **READY**.
- Tested in hosted Chromium at 1920 × 1080 (TV) and 390 × 844 (phone), with no member sign-in, external asset source or real screen.
- **12 interactive checks passed, zero uncaught page errors:** announcement scene, schedule scene, event scene, campaign scene, separate slide only, reduced-motion suppression, four manual motion modes, phone fit and bounded animation elements.
- Four individual 1080p screenshots were captured in the isolated development sandbox; these are browser evidence, not published campaign assets.
- Additional five motion unit tests are included in the normal application test suite and Vercel build, which completed successfully.
- This is motion + interface verification; it is NOT a real 70-inch device soak, iPad Safari run, authenticated cross-device publishing, or approval of religious content.

Run `DISPLAY_PREVIEW_URL='<authorized-preview-url>/billboard-preview/manage' node scripts/verify-display-motion.mjs` to reproduce without changing GitHub Actions minutes. Do not commit any temporary Vercel sharing token.

Production `lvz.app` uses the registered Vercel project but remains unchanged. Publishing real notices and pairing physical church TVs remain behind the original owner-approval and security gates.
