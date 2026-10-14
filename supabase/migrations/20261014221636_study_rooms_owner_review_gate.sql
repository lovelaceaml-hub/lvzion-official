-- Limited owner-only setup access; existing Firebase scheduler remains authoritative.
-- This additive safety gate must remain CLOSED until a separately approved cutover.
begin;
create table app_private.study_booking_activation(
 id boolean primary key default true check(id),
 bookings_open boolean not null default false,
 opened_at timestamptz,
 opened_by uuid references public.members on delete restrict,
 updated_at timestamptz not null default clock_timestamp()
);
insert into app_private.study_booking_activation(id,bookings_open) values(true,false);
alter table app_private.study_booking_activation enable row level security;
revoke all on app_private.study_booking_activation from public,anon,authenticated,service_role;

-- Preserve the complete, tested R3 booking algorithm but prevent creating,
-- holding, or moving real bookings before the original scheduler cutover.
alter function app_private.study_room_command(jsonb) rename to study_room_command_open_impl;
revoke all on function app_private.study_room_command_open_impl(jsonb) from public,anon,authenticated;
create function app_private.study_room_command(p_command jsonb) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
begin
 if not coalesce((select g.bookings_open from app_private.study_booking_activation g where g.id=true),false)
    and coalesce(p_command->>'action','') not in ('cancel','end_early') then
  raise exception 'Reservations remain closed during scheduler transition' using errcode='42501';
 end if;
 return app_private.study_room_command_open_impl(p_command);
end $$;
revoke all on function app_private.study_room_command(jsonb) from public,anon,authenticated;
grant execute on function app_private.study_room_command(jsonb) to authenticated;
create or replace function public.study_room_command(p_command jsonb) returns jsonb
 language sql security invoker set search_path='' as $$select app_private.study_room_command(p_command)$$;
revoke all on function public.study_room_command(jsonb) from public,anon,authenticated;
grant execute on function public.study_room_command(jsonb) to authenticated;

-- Authenticated, owner-only availability works without a secondary database
-- or exposing pending booking access.
alter function app_private.study_room_schedule(date) rename to study_room_schedule_open_impl;
revoke all on function app_private.study_room_schedule_open_impl(date) from public,anon,authenticated;
create function app_private.study_room_schedule(p_day date) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare result_data jsonb;
begin
 result_data:=app_private.study_room_schedule_open_impl(p_day);
 return result_data||jsonb_build_object('bookingsOpen',
  coalesce((select g.bookings_open from app_private.study_booking_activation g where g.id=true),false));
end $$;
revoke all on function app_private.study_room_schedule(date) from public,anon,authenticated;
grant execute on function app_private.study_room_schedule(date) to authenticated;
create or replace function public.study_room_schedule(p_day date) returns jsonb
 language sql stable security invoker set search_path='' as $$select app_private.study_room_schedule(p_day)$$;
revoke all on function public.study_room_schedule(date) from public,anon,authenticated;
grant execute on function public.study_room_schedule(date) to authenticated;

-- The existing designated, confirmed application owner may inspect/manage
-- only THIS module. No department, technical-admin, or group role inherits it.
-- Fresh test databases without an initialized owner retain DRAFT mode.
do $owner$
declare owner_member uuid; owner_count integer;
begin
 select count(*),(array_agg(a.member_id order by a.member_id))[1] into owner_count,owner_member
 from app_private.bootstrap_receipts b
 join app_private.account_links a on a.auth_user_id=b.auth_user_id;
 if owner_count>1 then raise exception 'Multiple bootstrap owners; refuse automatic module assignment'; end if;
 if owner_count=1 then
  update app_private.app_modules
   set status='approved',approved_at=clock_timestamp(),approved_by=owner_member,updated_at=clock_timestamp()
   where id='91000000-0000-4000-8000-000000000001' and status='draft';
  if not found then raise exception 'Expected draft Study Room module absent';end if;
  insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by)
   values(owner_member,'91000000-0000-4000-8000-000000000001','manager',
    'Owner-only setup access before separate booking cutover authorization',owner_member);
 end if;
end $owner$;
commit;
