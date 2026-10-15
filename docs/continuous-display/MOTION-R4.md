# Persistent per-screen motion — Release R4

Real LV Zion Official extension based on main `4c8554e0fd08072e043093d358f1da01c6096c3a`, developed without touching original Mother's Love or Study Room displays.

**Behavior:** Each screen stores Standard / Calm / Lively / Still independently. An owner with an existing module-manager grant *and* the independent device permission can change it through a versioned, audited DB operation. A change never modifies an approved playlist or published revision. Paired TVs retrieve only the motion string alongside their existing short-lived approved, screen-scoped projection. OS reduced motion overrides all speeds. No autoplay audio or extra feed.

Migration `supabase/migrations/20261015004620_continuous_display_motion_r4.sql` adds one NOT NULL bounded column, a new audit action, a permission-checked config-version RPC and extends both existing screen-scoped projections without changing grants. It is additive; no content or devices are seeded. An invalid device payload fails closed. The manager shows a phone-friendly radio control per screen.

**Release gating:** Build and regression test from current main, test 1920×1080 and 390px Chromium and on hardware when available. Apply to hosted project `otecqlkqirncotytbfns` only after confirming migration ledger and deployment. No physical TV pairing, real religious content publication or extra app integration is inferred.

**Known remaining:** secure media upload/re-encoding, approved Mother’s Love read-only adapter, hardware/iPad soak, owner-approved content rollout. Those are separate from this safer operational motion enhancement.
