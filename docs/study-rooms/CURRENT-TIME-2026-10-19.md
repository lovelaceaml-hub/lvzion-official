# Current-time schedule positioning

Today’s availability shows a red line and a “Now” time label using the server’s Las Vegas clock. It opens with the current time near the top of the scrollable schedule. Members can scroll in either direction afterward; existing visibility/focus refreshes update the indicator without resetting their position.

Entering a different resource category or returning to the schedule positions it again. Future dates start at the top without a current-time marker. Before opening, today starts at the top; after closing, it starts at the end. The marker is noninteractive and has an accessible current-time label.

No booking data, permissions, hours, or database schema changed.

Validation: production build, 386 application tests, 198 PostgreSQL permission assertions, and 54 Study Rooms/group-access browser checks passed. Browser coverage includes fractional-slot positioning, initial scroll, manual-scroll preservation on clock refresh, future-date behavior, and both out-of-hours boundaries. Synthetic browser data only; no hosted bookings created.

## Production release

PR #59 merged as `0858627804a20269650569c7769af4bb2fd5580d`. Explicit production deployment `dpl_42BtndGorthbRt2eL2gej53Cyi4Z` is READY and assigned to lvz.app and www.lvz.app. The live module returns HTTP 200 and its assets contain the current-time marker and shared red token. Anonymous schedule/admin reads remain HTTP 401 with private, no-store caching.

Rollback: prior production deployment `dpl_4WQDMt4aAxLmd83N8MANPyuMJ5sZ` (runtime `0970a05efe43a53a76226df9a7aa14a4cae93404`). No database rollback needed.
