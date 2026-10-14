# Live Continuous Display integration verification — October 14, 2026

> **Historical R1 verification and planned release order.** R1 and R2 integration have since been deployed to the real `lvz.app` project, but the physical TV/soak and real-content approvals described below remain open. For live status see [R2 Operations](OPERATIONS-R2.md) and [CURRENT-STATUS.md](../CURRENT-STATUS.md). This file is not proof of an actual TV session.

## Target
New owner-only module on **lvz.app**, not another prototype website. The production app keeps its existing member sign-in, self-registration, Unassigned intake policy, and its general Apps system. No existing Mother's Love or lobby display code or database was modified.

## Local production-source verification
A disposable Vercel sandbox was reconstructed from the exact GitHub branch source (text files) with temporary same-dimension PNG stand-ins used **only** for local icon checks. All other app files and unrelated staged routes were removed before the final build. The repository's existing icon binaries remain untouched.

- Full Next.js optimized build and TypeScript: PASS.
- Node application suite: **157 passed**, zero failed/skipped, including the new display policies, device pairing policy and isolated PGlite approval/pairing/revocation tests.
- Foundation PostgreSQL suite: **182 passed**, disposable PGlite with schema migration included.
- Playwright Chromium: **36 passed**, including four display checks. TV styles were exercised at 1920×1080; phone management uses the existing mobile architecture.
- The separate activation script was exercised in disposable PostgreSQL with a synthetic verified owner, including the rejection of a missing owner, re-run idempotency and no non-owner grants.
- Independent 20-case SQL simulation checked unauthorized access, draft immutability, version races, publication review, replayed pairing, projection privacy and device revocation.

## Release order
1. Schema only; do not register the module prematurely.
2. Merge the reviewed production-based module code and deploy via the existing LV Zion Vercel project with Git automation still disabled.
3. Check anonymous production API denials, neutral unpaired TV and existing sign-in/sign-up routes.
4. Run owner-only activation SQL from `docs/continuous-display/live-activation.sql`. The owner is identified from the **already existing bootstrap record**; no email, password or fixed real account ID is included.
5. Verify the owner alone receives an Apps tile, the Lobby Display starts disabled and empty, and no TV has been paired or exposed.

## Scope
This release provides real Supabase-backed text cards (announcements, events, date-specific schedules, campaign text), exact version review and publication, short-lived 12-character screen pairing, revocable HttpOnly TV identity and four distinct motion treatments with OS reduced-motion support.

Video uploads, external Mother’s Love/rooms feeds, arbitrary QR destinations, text moderation, multi-screen UI, approved photos and physical 70-inch/iPad unattended playback remain separate work. Never publish actual religious content to the church TV without owner review.
