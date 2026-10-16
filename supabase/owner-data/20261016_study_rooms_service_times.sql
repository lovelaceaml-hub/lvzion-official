-- Owner-approved production data, 2026-10-16 (Anthony): Study Rooms weekly service times.
-- Not a schema migration and not an application default. Run once against production during release.
-- Adds the four restrictions only when the weekly calendar is still empty; otherwise changes nothing.
-- Existing reservations are never displaced: it stops if any confirmed reservation overlaps.
begin;
do $owner$
declare before_value jsonb; wanted jsonb:='[
 {"weekday":2,"start_min":1170,"end_min":1230,"label":"Evening service"},
 {"weekday":6,"start_min":600,"end_min":660,"label":"Morning service"},
 {"weekday":6,"start_min":870,"end_min":930,"label":"Afternoon service"},
 {"weekday":6,"start_min":1170,"end_min":1230,"label":"Evening service"}]';
begin
 perform pg_advisory_xact_lock(741085);
 lock table app_private.study_service_blocks, app_private.study_bookings, app_private.study_slots in share row exclusive mode;
 perform 1 from app_private.study_policy_state where singleton for update;
 if exists(select 1 from app_private.study_service_blocks) then
  raise notice 'Weekly calendar already has restrictions; nothing changed.';
  return;
 end if;
 if exists(
  select 1 from app_private.study_bookings b, jsonb_array_elements(wanted) w
  where b.state='confirmed' and b.book_day>=(now() at time zone 'America/Los_Angeles')::date
    and extract(dow from b.book_day)=(w->>'weekday')::int
    and b.start_min<(w->>'end_min')::int and b.end_min>(w->>'start_min')::int
 ) then raise exception 'A future reservation overlaps a service time; resolve it first';end if;
 before_value:=app_private.study_operations_snapshot();
 insert into app_private.study_service_blocks(weekday,start_min,end_min,label)
  select (w->>'weekday')::int,(w->>'start_min')::int,(w->>'end_min')::int,w->>'label' from jsonb_array_elements(wanted) w;
 update app_private.study_policy_state set version=version+1,updated_at=clock_timestamp() where singleton;
 insert into app_private.audit_events(operation,reason,before_state,after_state)
  values('study_rooms.owner_service_times','Owner-approved weekly service times (Anthony, 2026-10-16): Tuesday evening; Saturday morning, afternoon and evening.',before_value,app_private.study_operations_snapshot());
end $owner$;
commit;
