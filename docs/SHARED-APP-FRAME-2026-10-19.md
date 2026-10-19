# Persistent application frame

Anthony’s October 18 reference and request authorize a matching compact glass-accent header and bottom control across member-facing pages. This supersedes older wordmark-header and desktop-top-navigation rules. Main content remains opaque and readable; no new palette or imagery is introduced.

The root `AppFrame` owns fixed, safe-area-aware bars. The header shows the current module symbol/title and a circular profile link. The existing profile model has no photo field, so the avatar uses account initials, with a person icon while signed out or unavailable. The private avatar endpoint returns only initials from the authenticated member workspace and uses private/no-store responses. No profile fields, directory data, or photo upload feature is exposed by it.

Home remains first, Apps remains centered, and More remains last. `FrameControls` registers each module’s two adjacent actions and optional More actions, retaining the module’s actual view state and permission checks. The native Apps sheet continues to use the server-filtered authorized module feed; member Home retains its existing favorites-capable Apps sheet.

| Page | Left of Apps | Right of Apps | Additional navigation |
|---|---|---|---|
| Home | Calendar | Notifications | Authorized management under More |
| Study Rooms | Schedule | Bookings | Existing More view retains manager tools/history |
| Contacts | Contacts | Follow-ups | Overview and Reload under More |
| Morning Prayer | Schedule | Me | Overview and permitted Manage under More |
| Church Display management | Content | Screens | Playlist and Publish under More |
| Member workspace | My Group | Profile | Permitted Manage under More |

The frame also remains during loading, denied-access and authentication screens. Full-screen paired TV playback at `/display` is intentionally immersive and has no member navigation overlay. Unknown/unfinished module routes receive their module title and safe links to My Week/Profile until their implementation registers actions. Navigation does not grant access.

Study Rooms reserves space above the new bottom bar for Reserve, keeps the grid scrollable and retains the red current-time marker. Dialogs use the native top layer, so the persistent bars cannot obstruct reservation/forms or trap keyboard focus behind a sheet.

## Verification

- Production build and TypeScript passed; 386 application tests and 198 disposable PostgreSQL permission assertions passed.
- Full main browser run identified three previously documented sign-in/resend failures plus three old-navigation/test-route expectations, which were corrected. The final applicable run passed 119 checks, excluding the three pre-existing authentication cases.
- All 16 isolated Morning Prayer client browser checks passed with the shared frame, including manager permissions and real view navigation.
- Responsive screenshots reviewed at 320, 390 and 1280px. Shared-frame checks cover fixed positioning, target sizes, title/avatar, contextual controls, authorized app lists, dialog dismissal/focus restoration and anonymous avatar denial.
- The isolated Contacts client test passed: contextual navigation, Overview/Reload, authorized Apps sheet and denied-access clearing remain intact.
- Native Morning Prayer database race command was attempted but could not start: this environment lacks `initdb`/`pg_ctl`. No SQL, permissions, scheduling or command implementation changed in this release.
- Browser data was synthetic. No hosted member bookings, contacts, schedules or messages were created. Physical iOS/Safari acceptance remains separate.

## Recovery

Previous production: `dpl_42BtndGorthbRt2eL2gej53Cyi4Z`, runtime `0858627804a20269650569c7769af4bb2fd5580d`. Rollback requires no database change.

## Production release

PR #60 merged as `ebbedbdd486a87a835855307c501b99fe78ea7ba`. Explicit production deployment `dpl_B4CDgswkqhY3kU7hjtajQ98thg97` is READY with lvz.app and www.lvz.app aliases. Provider readback confirms the exact merged source. Live HTTP checks through the Vercel connector returned 200 for Study Rooms and sign-in with the shared frame, 200 for full-screen `/display` without the frame, and 401 for anonymous `/api/members/avatar`. Study Rooms HTML identifies the exact new deployment. Direct executor network checks timed out at the network proxy; provider connector verification succeeded. No authenticated hosted member transaction was performed.
