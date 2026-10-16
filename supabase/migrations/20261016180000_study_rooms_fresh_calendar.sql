-- Self-contained Study Rooms: explicit calendars, preserved authorization and audit.
-- Applied incrementally; earlier schema receipts remain immutable.
begin;

-- Preserve the existing permission checks, receipts, locking and conflict rollback.
-- Fail closed if the expected function definition has changed unexpectedly.
do $patch$
declare definition text; needle text := E'   or (act=''weekly.replace'' and jsonb_array_length(p_command->''blocks'')=0)\n';
begin
 select pg_get_functiondef('app_private.study_room_operations(jsonb)'::regprocedure) into definition;
 if position(needle in definition)=0 then
  raise exception 'Unexpected calendar validation definition; review before applying';
 end if;
 definition:=replace(definition,needle,'');
 definition:=replace(definition,
  'if jsonb_typeof(p_command->''blocks'')<>''array''',
  'if coalesce(jsonb_typeof(p_command->''blocks''),'''')<>''array''');
 execute definition;
end $patch$;

create or replace function app_private.study_room_command(p_command jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $function$
begin
 if not coalesce((select g.bookings_open from app_private.study_booking_activation g where g.id=true),false)
    and coalesce(p_command->>'action','') not in ('cancel','end_early') then
  raise exception 'Reservations are paused' using errcode='42501';
 end if;
 return app_private.study_room_command_open_impl(p_command);
end $function$;

-- Only the exact, never-edited installation defaults may be removed.
-- A customized calendar, existing reservation, or explicit pause is left untouched.
do $cleanup$
declare before_value jsonb; seeded jsonb; pristine boolean;
begin
 perform pg_advisory_xact_lock(741085);
 lock table app_private.study_service_blocks, app_private.study_bookings,
  app_private.study_slots, app_private.study_booking_activation in share row exclusive mode;
 perform 1 from app_private.study_policy_state where singleton for update;
 select jsonb_agg(to_jsonb(w)-'id' order by weekday,start_min,end_min)
  into seeded from app_private.study_service_blocks w;
 pristine:=coalesce((select version=1 from app_private.study_policy_state where singleton),false)
  and not exists(select 1 from app_private.study_change_history where action in ('weekly.replace','day.replace','day.reset'))
  and not exists(select 1 from app_private.study_special_days)
  and not exists(select 1 from app_private.study_bookings)
  and not exists(select 1 from app_private.study_slots)
  and seeded='[{"weekday":2,"start_min":1170,"end_min":1230,"label":"Evening service"},{"weekday":6,"start_min":600,"end_min":660,"label":"Morning service"},{"weekday":6,"start_min":870,"end_min":930,"label":"Afternoon service"},{"weekday":6,"start_min":1170,"end_min":1230,"label":"Evening service"}]'::jsonb;
 if pristine then
  before_value:=app_private.study_operations_snapshot();
  delete from app_private.study_service_blocks;
  update app_private.study_policy_state set version=version+1,updated_at=clock_timestamp() where singleton;
  -- Enable this application's already-authorized audience only. No grant is added.
  update app_private.study_booking_activation
   set bookings_open=true,opened_at=clock_timestamp(),updated_at=clock_timestamp()
   where id and not bookings_open and opened_at is null and opened_by is null;
  insert into app_private.audit_events(operation,reason,before_state,after_state)
   values('study_rooms.fresh_calendar','Owner-directed fresh start: remove unedited installation defaults; retain accounts, grants and history.',before_value,app_private.study_operations_snapshot());
 end if;
end $cleanup$;

commit;
