# Current-time schedule positioning

Today’s availability shows a red line and a “Now” time label using the server’s Las Vegas clock. It opens with the current time near the top of the scrollable schedule. Members can scroll in either direction afterward; existing visibility/focus refreshes update the indicator without resetting their position.

Entering a different resource category or returning to the schedule positions it again. Future dates start at the top without a current-time marker. Before opening, today starts at the top; after closing, it starts at the end. The marker is noninteractive and has an accessible current-time label.

No booking data, permissions, hours, or database schema changed.

Validation: production build, 386 application tests, 198 PostgreSQL permission assertions, and 54 Study Rooms/group-access browser checks passed. Browser coverage includes fractional-slot positioning, initial scroll, manual-scroll preservation on clock refresh, future-date behavior, and both out-of-hours boundaries. Synthetic browser data only; no hosted bookings created.
