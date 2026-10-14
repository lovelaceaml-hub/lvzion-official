# Continuous Church Display R2 — operations, publication and release

> **Production release verified October 14, 2026.** R2 operations are on production `lvz.app` through READY Vercel deployment `dpl_FFquRhvQkTW1xv1gRVz1SuKBg66S`, source `de5dcdede5fc740873fddfa36467d9d47f318fd6`. Hosted migration `continuous_display_operations` (`20261014232519`) is applied; its source is on `main` at `supabase/migrations/20261014230147_continuous_display_operations.sql`. The release sequence below is now **historical implementation evidence**, not unfinished permission to migrate or publish material. Read-only audit: one screen, zero real publications, zero paired devices. Live public TVs, religious content and external feed integrations still require separate authorization. [Current status](../CURRENT-STATUS.md) · [Ledger](../HOSTED-MIGRATION-LEDGER.json).

**Product:** real LV Zion Official module at `https://lvz.app/modules/continuous-display` with the independent full-screen player at `https://lvz.app/display`.

**Scope:** one usable screen plus the ability for the verified original owner to create up to eight independent, disabled, unpaired screens. Every new screen receives explicit owner-specific edit, approve, publish and device permissions. No group leader or technical administrator inherits broadcast power. Mother’s Love and original Study Room lobby displays are untouched.

## Owner workflow

1. Open **Church Display** in the Apps menu and select the intended screen. New screens start empty, disabled and unpaired.
2. Under **Content**, prepare short text announcements, one-date Gospel Schedules, events or separately approved campaign cards. Choose one of four independently animated styles.
3. Optionally set each slide's **Show from** and **Stop showing** dates. They must be within the overall **Publication window**. All scheduling is based on America/Los_Angeles, including offset choice at DST transitions.
4. Under **Playlist**, reorder entries and set per-slide seconds; **Save draft**. Saving does not publish.
5. Under **Publish**, compare draft and published versions. Approve the exact saved revision, then publish separately. The current player adopts normal updates at a safe transition.
6. An authorized approver/publisher may **temporarily feature an already approved, currently eligible slide** for one to thirty minutes. This cannot introduce new wording. The player checks remote updates every twelve seconds; operators can end the emphasis at any time.
7. A previously approved, unexpired publication may be **restored as a new generation**. Restoring never extends its original publication end or silently approves an edited draft.
8. Under **Screens**, set optional weekday operating windows. Outside them a connected player shows a neutral fallback; the application never powers the physical TV on or off.
9. Once the owner approves an actual device pilot, open **lvz.app/display** on that device, generate a five-minute code in Screens, enter it on the TV, and later revoke it from the same management page if needed.

## Presentation and resilience

The player presents 16:9 animated slides with large type, silent playback, restrained layers, and `prefers-reduced-motion` support. Only published, screen-assigned text enters the TV projection; management drafts, contact records, member directory and credentials never appear in the player API. The paired TV uses a revocable, HttpOnly screen cookie and a short-lived (30-second maximum) server-verified content lease. A failed connection, expired publication, out-of-hours condition or empty playlist produces neutral fallback. The player has one rotation coordinator, bounds fetch lifetimes and ignores superseded network responses.

## Security boundaries

- Private Supabase schema `display_private` has eight RLS-enabled tables with no browser table grants.
- Device-only RPC is executable by `service_role` on the server, not `anon` or `authenticated`.
- User-facing security-definer RPCs intentionally require both a verified member session, an approved module-level manager grant, and the independent action-specific screen grant. The original owner is additionally verified for screen creation.
- Per-slide scheduled ranges are constrained at SQL level to remain inside their approved overall publication window.
- Temporary overrides use only a slide ID copied from the immutable current approved publication, with a maximum thirty-minute expiry and a separate audit event.
- Restore appends a versioned immutable publication and audit entry; concurrent stale generation attempts fail closed.
- No real content, private uploads, QR, external feed, video or auto-paired device is introduced by this R2 migration.

Supabase Security Advisor intentionally flags `authenticated`-callable security-definer functions, including preexisting Display R1 RPCs. Each such Display RPC has verified membership and explicit permission checks, tested in disposable PGlite; the advisory remains an independent security-review item rather than being suppressed. Advisor: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.

## Executed verification

- Vercel Git-backed preview `dpl_HJ46CyXyqfmUTgzvVAwNiPxVX5em` compiled the combined current-main and R2 branch successfully.
- **342 Node application/policy/database tests passed, zero failures** during its built-in release checks.
- Existing foundation PostgreSQL suite: **198 permission assertions passed in disposable PGlite**.
- Four hosted Chromium browser scenarios passed using a strictly fictional data interceptor: phone screen creation / selector / hours, approved temporary emphasis and restoration, unsaved per-slide draft safety, TV operating-hour gating / override / offline neutral fallback.
- Test window was pinned to October 14, 2026 so future/expired fixtures do not give false positives.
- No actual owner account, real TV, sensitive record or production publication was used in these browser tests.
- No additional automatic GitHub Actions workflows were added.

## Release sequence and gates

1. Reconcile current `main` and verify successful preview build; keep other app branches untouched.
2. Apply only the reviewed additive migration `20261014230147_continuous_display_operations.sql` to Supabase project `otecqlkqirncotytbfns`, leaving existing content and device state unchanged.
3. Verify eight RLS tables, seven new Operations RPCs and service-role-only device snapshot access. Check Supabase Security Advisor and keep warnings documented.
4. Merge the exact tested feature into `main` and manually deploy the resulting production Git commit to Vercel project `lvzion-official`. Do not enable GitHub Actions on every push.
5. Verify `lvz.app/display`, `lvz.app/modules/continuous-display` (authenticated owner-only), existing sign-in/sign-up and anonymous management denial.
6. Confirm database still has one disabled existing Lobby Display, zero active devices/publications/overrides and no imported church material.
7. **Only with independent owner authorization:** real TV pairing, actual church material publication, external campaign feed, and an extended physical iPad/Windows/70-inch unattended soak.

**Known remaining capabilities:** this release intentionally stays text/animation-first. Private raster/video ingestion with server-side metadata stripping, approved Mother’s Love feed and live room availability adapters require separate source approval and independent authorization tests. A long-running browser regression does not replace a real TV hardware soak.
