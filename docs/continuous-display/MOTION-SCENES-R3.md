# Animated Church Display — Cinematic Scenes R3 (review)
This is a **real LV Zion Official application workstream** intended to serve under `lvz.app` after an authorized release. R3 is a *stacked development-only motion enhancement* based on Continuous Church Display PR #8 at `e6d0b8e491f86eec333ed4ad37aa580dbd1d554f`. No production alias, hosted database or live display is changed.

## Direction
The original Mother's Love app establishes a quality benchmark for polished ambient animation and graceful content arrivals. This work **does not** copy its source data, display credentials, Joy/Peace characters, QR, branding, approved campaign wording or active TV settings.

Four different, information-appropriate motion treatments are implemented:
1. **Announcement:** slowly swaying sage botanical structures, glowing sunlight and a floating orb, with static high-contrast headline.
2. **Sunday schedule:** a restrained cobalt date-rail light sweep, atmospheric arcs and glints. The activities remain fixed after their entrance. Its fictionalized decorative title is not approved religious language.
3. **Event:** dimensional terracotta paper-cut shapes, sunlight rings and gentle parallax; complete event date/time block stays readable.
4. **Fictional campaign:** floating pastel bubbles/petal shapes and looping rings. This is *not* a Mother's Love data feed or published segment.

All scenes rely on transform/opacity animation of a bounded number of CSS layers, not accumulating JS objects, canvas or WebGL. Effects run only while a slide is mounted and stop naturally when its DOM subtree is removed. Text performs a brief entrance then stays still. The new file loads **after** the first-pass motion.css, adding characterful scenes while preserving that earlier work. Content rotation, approved windows and overrides are unaffected.

## Motion controls and operational rules
- **Standard:** the regular slow scene animation.
- **Lively:** a shorter, still restrained ambient loop.
- **Calm:** longer ambient loops.
- **Still:** all animations and transitions disabled.
- **System prefers-reduced-motion:** animation disabled regardless of preview mode.
- **Cut transitions:** entry choreography disabled by the inherited rule.

The phone preview's lab button cycles the four modes for demonstration; it is **not** a persisted remote device setting. Clean TV defaults to Standard (or OS reduced-motion). Nothing adds autoplay audio, external image requests, admin overlays, religious symbols or unrelated external data.

## Review and release
Use the PR #8 preview workflow and repeat Chromium reduced-motion and animation tests on this branch. Review 1920×1080 TV and 320/390px phone screens, monitor rapid slide changes and test long-running playback. A real iPad/Windows TV, real viewing distance, connectivity failures, power/sleep behavior and owner-approved publishing/security remain independent launch gates.
