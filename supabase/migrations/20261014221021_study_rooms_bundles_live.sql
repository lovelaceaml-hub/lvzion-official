-- Study Room R3: one identity, one revision, all resources or none.
-- Development proposal only. Does not publish the module or grant members access.
begin;

alter table app_private.study_resources add constraint study_resources_id_kind unique(id,kind);
create table app_private.study_booking_resources (
 booking_id uuid not null references app_private.study_bookings(id) on delete restrict,
 resource_id uuid not null,
 kind text not null check(kind in ('room','whiteboard','tv')),
 primary key(booking_id,resource_id),
 unique(booking_id,kind),
 foreign key(resource_id,kind) references app_private.study_resources(id,kind) on delete restrict
);
insert into app_private.study_booking_resources(booking_id,resource_id,kind)
 select b.id,b.resource_id,r.kind from app_private.study_bookings b
 join app_private.study_resources r on r.id=b.resource_id;
alter table app_private.study_booking_resources enable row level security;
revoke all on app_private.study_booking_resources from public,anon,authenticated;
-- Deferred because the existing, private R2 implementation inserts the primary
-- slot before the outer transaction records the full bundle membership.
alter table app_private.study_slots add constraint study_slot_bundle_member
 foreign key(booking_id,resource_id) references app_private.study_booking_resources(booking_id,resource_id)
 deferrable initially deferred;

create function app_private.study_resource_ids(p_booking uuid) returns uuid[]
 language sql stable set search_path='' as $$
 select coalesce(array_agg(x.resource_id order by r.sort_order,r.id),'{}'::uuid[])
 from app_private.study_booking_resources x join app_private.study_resources r on r.id=x.resource_id
 where x.booking_id=p_booking
$$;
revoke all on function app_private.study_resource_ids(uuid) from public,anon,authenticated;

-- These older implementations remain internal, never alternate public RPCs.
alter function app_private.study_room_command(jsonb) rename to study_room_command_r2;
revoke all on function app_private.study_room_command_r2(jsonb) from public,anon,authenticated;
create function app_private.study_room_command(p_command jsonb) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare
 actor uuid; req uuid; action text; cmd jsonb; result_data jsonb;
 receipt app_private.study_request_receipts%rowtype;
 booking app_private.study_bookings%rowtype;
 ids uuid[]; previous_ids uuid[]; bid uuid; d date; s integer; e integer;
 history_before bigint; safe_label text;
begin
 -- Serialize against the same member suspension, reservation and closure lock.
 perform pg_advisory_xact_lock(741085);
 actor:=app_private.current_member_id();
 if actor is null or not app_private.module_allowed(actor,'91000000-0000-4000-8000-000000000001') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 if p_command is null or jsonb_typeof(p_command)<>'object' or octet_length(p_command::text)>8192 then
  raise exception 'Invalid command' using errcode='22023';
 end if;
 action:=p_command->>'action';req:=(p_command->>'requestId')::uuid;
 if req is null then raise exception 'Missing request ID' using errcode='22023';end if;
 select * into receipt from app_private.study_request_receipts where member_id=actor and request_id=req;
 if found then
  if receipt.command<>p_command then raise exception 'Request ID reused' using errcode='22023';end if;
  return receipt.result;
 end if;
 cmd:=p_command;
 if action in ('cancel','end_early','reschedule') then
  select * into booking from app_private.study_bookings where id=(p_command->>'bookingId')::uuid for update;
  if booking.id is null or (booking.member_id<>actor and not app_private.study_is_manager(actor)) or
    (booking.purpose='hold' and not app_private.study_is_manager(actor)) then
   raise exception 'Not authorized' using errcode='42501';
  end if;
  previous_ids:=app_private.study_resource_ids(booking.id);
  if (p_command->>'expectedVersion')::integer is distinct from booking.version then
   raise exception 'Reservation changed; refresh first' using errcode='40001';
  end if;
 end if;
 if action in ('reserve','hold','reschedule') then
  if p_command ? 'resourceIds' then
   if p_command ? 'resourceId' or jsonb_typeof(p_command->'resourceIds')<>'array' then
    raise exception 'Choose one resource selector' using errcode='22023';
   end if;
   if jsonb_array_length(p_command->'resourceIds') not between 1 and 3 or
     exists(select 1 from jsonb_array_elements(p_command->'resourceIds') x where jsonb_typeof(x)<>'string') then
    raise exception 'Select one to three resources' using errcode='22023';
   end if;
   select array_agg(value::uuid order by ordinality) into ids
    from jsonb_array_elements_text(p_command->'resourceIds') with ordinality;
   cmd:=(p_command-'resourceIds')||jsonb_build_object('resourceId',ids[1]);
  else
   ids:=array[(p_command->>'resourceId')::uuid];
   if action='reschedule' and cardinality(previous_ids)>1 then
    raise exception 'Select all resources when changing a combined reservation' using errcode='22023';
   end if;
  end if;
  if cardinality(ids)<>(select count(distinct x) from unnest(ids)x) or
     cardinality(ids)<>(select count(distinct kind) from app_private.study_resources where id=any(ids) and active) then
   raise exception 'Select at most one active resource of each kind' using errcode='22023';
  end if;
  -- Lock every selected inventory row in deterministic order.
  perform 1 from app_private.study_resources where id=any(ids) order by id for update;
  d:=(p_command->>'day')::date;s:=(p_command->>'start')::integer;e:=(p_command->>'end')::integer;
  if exists(select 1 from app_private.study_closures c where c.active and c.book_day=d
   and (c.resource_id is null or c.resource_id=any(ids)) and c.start_min<e and s<c.end_min) then
   raise exception 'Scheduled closure' using errcode='23505';
  end if;
  if exists(select 1 from app_private.study_slots x where x.resource_id=any(ids) and x.book_day=d
   and x.minute>=s and x.minute<e and (booking.id is null or x.booking_id<>booking.id)) then
   raise exception 'One or more resources are no longer available' using errcode='23505';
  end if;
 end if;
 select coalesce(max(id),0) into history_before from app_private.study_change_history;
 -- R2 enforces the full interval, policy, purpose, ownership and version rules.
 -- Any failure below rolls its writes back as part of this same transaction.
 result_data:=app_private.study_room_command_r2(cmd);
 bid:=(result_data->>'bookingId')::uuid;
 if action in ('reserve','hold','reschedule') then
  delete from app_private.study_booking_resources where booking_id=bid;
  insert into app_private.study_booking_resources(booking_id,resource_id,kind)
   select bid,id,kind from app_private.study_resources where id=any(ids);
  insert into app_private.study_slots(resource_id,book_day,minute,booking_id)
   select r,d,n,bid from unnest(ids)r cross join generate_series(s,e-30,30)n where r<>ids[1];
  select string_agg(r.name,' + ' order by r.sort_order,r.id) into safe_label
   from app_private.study_resources r where r.id=any(ids);
  update app_private.module_activities set title=left('Study Room Reservation · '||safe_label,150),
   location_label=left(safe_label,140)
   where module_id='91000000-0000-4000-8000-000000000001' and external_reference='study:'||bid;
 end if;
 -- Cancelling/ending R2 already releases slots by booking ID, across the bundle.
 ids:=app_private.study_resource_ids(bid);
 result_data:=result_data||jsonb_build_object('resourceIds',ids);
 update app_private.study_request_receipts set command=p_command,result=result_data
  where member_id=actor and request_id=req;
 update app_private.study_change_history set
  previous=coalesce(previous,'{}'::jsonb)||jsonb_build_object('resourceIds',previous_ids),
  next=coalesce(next,'{}'::jsonb)||jsonb_build_object('resourceIds',ids)
  where id>history_before and target_id=bid and actor_id=actor;
 return result_data;
end $$;
create or replace function public.study_room_command(p_command jsonb) returns jsonb
 language sql security invoker set search_path='' as $$select app_private.study_room_command(p_command)$$;
revoke all on function app_private.study_room_command(jsonb) from public,anon;
grant execute on function app_private.study_room_command(jsonb) to authenticated;

-- Preserve R2's authorized, privacy-filtered projection and only add membership.
alter function app_private.study_room_schedule(date) rename to study_room_schedule_r2;
revoke all on function app_private.study_room_schedule_r2(date) from public,anon,authenticated;
create function app_private.study_room_schedule(p_day date) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare result_data jsonb;
begin
 result_data:=app_private.study_room_schedule_r2(p_day);
 return jsonb_set(result_data,'{bookings}',coalesce((select jsonb_agg(x||jsonb_build_object(
  'resourceIds',app_private.study_resource_ids((x->>'id')::uuid)) order by ordinality)
  from jsonb_array_elements(result_data->'bookings') with ordinality t(x,ordinality)),'[]'::jsonb));
end $$;
create or replace function public.study_room_schedule(p_day date) returns jsonb
 language sql stable security invoker set search_path='' as $$select app_private.study_room_schedule(p_day)$$;
revoke all on function app_private.study_room_schedule(date) from public,anon;
grant execute on function app_private.study_room_schedule(date) to authenticated;

-- Resource rename must refresh all bundled activity labels, including accessories.
alter function app_private.study_room_admin(jsonb) rename to study_room_admin_r2;
revoke all on function app_private.study_room_admin_r2(jsonb) from public,anon,authenticated;
create function app_private.study_room_admin(p_command jsonb default null) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare result_data jsonb;
begin
 result_data:=app_private.study_room_admin_r2(p_command);
 if p_command->>'action'='resource.update' then
  update app_private.module_activities a set title=left('Study Room Reservation · '||x.label,150),location_label=left(x.label,140)
  from (select br.booking_id,string_agg(r.name,' + ' order by r.sort_order,r.id) label
   from app_private.study_booking_resources br join app_private.study_resources r on r.id=br.resource_id
   where br.booking_id in (select booking_id from app_private.study_booking_resources
    where resource_id=(p_command->>'resourceId')::uuid) group by br.booking_id)x
  where a.module_id='91000000-0000-4000-8000-000000000001' and a.external_reference='study:'||x.booking_id;
 end if;
 return result_data;
end $$;
create or replace function public.study_room_admin(p_command jsonb default null) returns jsonb
 language sql security invoker set search_path='' as $$select app_private.study_room_admin(p_command)$$;
revoke all on function app_private.study_room_admin(jsonb) from public,anon;
grant execute on function app_private.study_room_admin(jsonb) to authenticated;

-- History is a separate private read: never broaden the shared schedule to old names.
-- A 31-day window and 50-row pages bound each request; any historical month is accessible.
create function app_private.study_room_history(p_from date,p_to date,p_offset integer default 0,p_managed boolean default false)
 returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();mgr boolean;rows jsonb;total integer;
begin
 if actor is null or not app_private.module_allowed(actor,'91000000-0000-4000-8000-000000000001') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 mgr:=app_private.study_is_manager(actor);
 if p_managed is null or (p_managed and not mgr) then raise exception 'Manager permission required' using errcode='42501';end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>30 or p_offset is null or p_offset<0 then
  raise exception 'Choose a valid history window' using errcode='22023';
 end if;
 select count(*) into total from app_private.study_bookings b
  where b.book_day between p_from and p_to and (b.member_id=actor or p_managed);
 select coalesce(jsonb_agg(x.item order by x.book_day desc,x.start_min desc,x.id),'[]'::jsonb) into rows
 from (select b.book_day,b.start_min,b.id,jsonb_strip_nulls(jsonb_build_object(
  'id',b.id,'resourceId',b.resource_id,'resourceIds',app_private.study_resource_ids(b.id),
  'resourceNames',(select jsonb_agg(r.name order by r.sort_order,r.id) from app_private.study_booking_resources br
    join app_private.study_resources r on r.id=br.resource_id where br.booking_id=b.id),
  'day',b.book_day,'start',b.start_min,'end',coalesce(b.released_from,b.end_min),'originalEnd',b.end_min,
  'state',b.state,'version',b.version,'mine',b.member_id=actor,'label',case when b.member_id=actor then 'You' else m.display_name end,
  'hold',b.purpose='hold','purpose',case when b.purpose<>'hold' then b.purpose end,'detail',b.private_detail,
  'createdAt',b.created_at,'cancelledAt',b.cancelled_at,'cancelReason',b.cancel_reason)) item
  from app_private.study_bookings b join public.members m on m.id=b.member_id
  where b.book_day between p_from and p_to and (b.member_id=actor or p_managed)
  order by b.book_day desc,b.start_min desc,b.id limit 50 offset p_offset)x;
 return jsonb_build_object('bookings',rows,'total',total,'nextOffset',case when p_offset+50<total then p_offset+50 end,'managed',p_managed);
end $$;
create function public.study_room_history(p_from date,p_to date,p_offset integer default 0,p_managed boolean default false)
 returns jsonb language sql stable security invoker set search_path='' as $$select app_private.study_room_history(p_from,p_to,p_offset,p_managed)$$;
revoke all on function app_private.study_room_history(date,date,integer,boolean),public.study_room_history(date,date,integer,boolean) from public,anon;
grant execute on function app_private.study_room_history(date,date,integer,boolean),public.study_room_history(date,date,integer,boolean) to authenticated;
commit;
