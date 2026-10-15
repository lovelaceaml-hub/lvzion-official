# Morning Prayer code cleanup R7

[Actual module](https://lvz.app/modules/work-mission-prayer). Phase 1 of the lvz.app refactor and redesign: code cleanup only, with no change to what members see, what the API accepts or returns, or any permission or database rule. No migration, dependency, hosted data or deployment change.

## What changed

- The single 180-line member screen is split into readable parts: `MorningPrayerLive.tsx` (shell, loading, saving, navigation), `HomeTab.tsx`, `ScheduleTab.tsx`, `MeTab.tsx` and `ManageTab.tsx`. Draft form state stays in the shell, so drafts still survive tab switches and month reloads exactly as before.
- `MorningPrayerOperations.tsx` is split into one component per panel (several dates, change a time, meeting link, edit material, people). Panels stay mounted while hidden, so their input still survives switching Manage sections.
- `shared.ts` holds the one copy of the client types, date and time formatters and the JSON request helper that were previously repeated in three files.
- API routes reuse the private response headers and the UUID check from `lib/morning-prayer/server.ts`, and the date check from `lib/morning-prayer/time.ts`, instead of keeping their own copies. Every status code and error message is unchanged.
- Removed `MorningPrayerPreview.tsx`, the R2 fictional preview screen. No route rendered it. The domain model, fixtures and sync planner it used stay, because the policy tests still exercise them.
- Removed the style rules that only the preview used, and stored the three style files one rule per line.
- The isolated browser harness copies the whole `components/morning-prayer` folder, so new files are picked up.

One unreachable branch was dropped: the Hosting requests card only renders when a request is pending, so its "No pending requests" text could never show. A management save that returned success with an unreadable body is now reported as unreadable instead of silently accepted; the routes always return JSON, so this does not occur in practice.

## Verification

See the Build log for the commands and results of this change.

## Build log

- Branched from main `0458315` (includes PRs #42 and #43).
- `npm run build` passed: strict types, 375 application tests, all SQL assertions and the Next production build.
- `npm run test:morning-prayer:browser` passed all 15 isolated client cases, including 320/390/768/1024 widths, keyboard disclosures, text-entry month fallback and permission revocation.
- `npm run test:morning-prayer:races` passed all 4 two-connection PostgreSQL cases. On this Mac, PostgreSQL 16 needs `LC_ALL=en_US.UTF-8` set or it refuses to start ("postmaster became multithreaded during startup").
- Not deployed. Hosted Supabase, Vercel and Zoom settings untouched.
