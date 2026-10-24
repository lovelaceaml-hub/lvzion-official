# Device appearance

Current behavior (October 24, 2026): **More, then Appearance** offers **System**, **Light** and **Dark**. System is the default. Each app keeps its own Atlas style in both schemes; see the [design contract](LVZ-DESIGN-CONTRACT.md).

The preference is stored on the device under `lvz.appearance.v1` as `system`, `light` or `dark`. Choices saved by the October 19 release (24 named themes) keep working: Midnight Sapphire, Aurora Night, Copper Noir and Plum Velvet become Dark, every other theme becomes Light. The head script applies the choice before first paint; the paired TV player at `/display` ignores it.

Implementation: `lib/appearance-preference.ts`, `lib/appearance.ts`, `components/appearance-sync.tsx`, `components/appearance-picker.tsx`, `/appearance`, and the scheme blocks in `styles/lvz-tokens.css`.

## History

The October 19, 2026 release (PR #65, deployment `dpl_HVSBqrSGcvVaTQupPhwaAkU7FDVk`) offered 24 optional device themes layered over every module. Anthony replaced that on October 24, 2026 with one shared base, a style per app and a Light/Dark/System choice. The release receipt for the earlier version remains in [APPEARANCE-RELEASE.json](APPEARANCE-RELEASE.json).
