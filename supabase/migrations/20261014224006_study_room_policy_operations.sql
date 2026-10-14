-- Study Room R4: manager-controlled inventory and service calendar.
-- Additive, not a booking cutover. Retains the explicit CLOSED booking activation gate.
begin;

create table app_private.study_policy_state(
 singleton boolean primary key default true check(singleton),
 version integer not null default 1 check(version>0),
 updated_at timestamptz not null default clock_timestamp()
);
insert into app_private.study_policy_state(singleton) values(true);
alter table app_private.study_policy_state enable row level security;
revoke all on app_private.study_policy_state from public,anon,authenticated,service_role;

create table app_private.study_special_days(
 book_day date primary key,
 blocks jsonb not null check(jsonb_typeof(blocks)='array' and jsonb_array_length(blocks)<=26),
 reason text not null check(length(btrim(reason)) between 5 and 240),
 updated_by uuid not null references public.members on delete restrict,
 updated_at timestamptz not null default clock_timestamp()
);
alter table app_private.study_special_days enable row level security;
revoke all on app_private.study_special_days from public,anon,authenticated,service_role;
create unique index study_resources_kind_name_ci on app_private.study_resources(kind,lower(btrim(name)));

-- An explicit special-day record REPLACES its weekday service restrictions,
-- even when the special-day interval list is empty. Date closures still apply.
create function app_private.study_effective_service_blocks(p_day date)
 returns table(start_min integer,end_min integer,label text)
 language sql stable set search_path='' as $$
 select w.start_min,w.end_min,w.label
 from app_private.study_service_blocks w
 where w.weekday=extract(dow from p_day) and not exists(
  select 1 from app_private.study_special_days d where d.book_day=p_day
 )
 union all
 select (b.block->>'start')::integer,(b.block->>'end')::integer,b.block->>'label'
 from app_private.study_special_days d
 cross join lateral jsonb_array_elements(d.blocks) b(block)
 where d.book_day=p_day
$$;
revoke all on function app_private.study_effective_service_blocks(date) from public,anon,authenticated;

-- Fail if the reviewed booking/schedule implementation has changed; never
-- introduce a separate calendar projection not enforced by booking RPCs.
do $calendar$
declare f regprocedure;definition text;old_piece text;new_piece text;found_count integer;
begin
 foreach f in array array[
  'app_private.study_room_command_r1(jsonb)'::regprocedure,
  'app_private.study_room_command_r2(jsonb)'::regprocedure,
  'app_private.study_room_schedule_r2(date)'::regprocedure
 ] loop
  definition:=pg_get_functiondef(f);
  if f='app_private.study_room_schedule_r2(date)'::regprocedure then
   old_piece:='from app_private.study_service_blocks where weekday=extract(dow from p_day)';
   new_piece:='from app_private.study_effective_service_blocks(p_day) where true';
  else
   old_piece:='from app_private.study_service_blocks where weekday=extract(dow from d)';
   new_piece:='from app_private.study_effective_service_blocks(d) where true';
  end if;
  found_count:=(length(definition)-length(replace(definition,old_piece,'')))/length(old_piece);
  if found_count<>1 then raise exception 'Study Room reviewed function changed; manual review required: %',f;end if;
  execute replace(definition,old_piece,new_piece);
 end loop;
end $calendar$;

create function app_private.study_operations_snapshot() returns jsonb
 language sql stable set search_path='' as $$
 select jsonb_build_object(
  'version',(select version from app_private.study_policy_state where singleton),
  'bookingsOpen',(select bookings_open from app_private.study_booking_activation where id),
  'newSystemBookings',(select count(*) from app_private.study_bookings where state='confirmed'
   and book_day >= (now() at time zone 'America/Los_Angeles')::date),
  'weekly',coalesce((select jsonb_agg(jsonb_build_object(
     'weekday',weekday,'start',start_min,'end',end_min,'label',label
   ) order by weekday,start_min,end_min) from app_private.study_service_blocks),'[]'::jsonb),
  'specialDays',coalesce((select jsonb_agg(jsonb_build_object(
    'day',book_day,'blocks',blocks,'reason',reason
   ) order by book_day) from app_private.study_special_days
   where book_day >= (now() at time zone 'America/Los_Angeles')::date),'[]'::jsonb)
 )
$$;
revoke all on function app_private.study_operations_snapshot() from public,anon,authenticated;

-- Same advisory lock as R1/R2/R3 and existing resource/date closure manager
-- commands. All updates, receipts and audit entries occur in one transaction.
create function app_private.study_room_operations(p_command jsonb default null)
 returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 actor uuid;act text;req uuid;why text;fields text[];v integer;last app_private.study_request_receipts%rowtype;
 entries jsonb;entry jsonb;local_now timestamp;start_min integer;end_min integer;
 day_num integer;d date;new_id uuid;title text;kind text;prior jsonb;outcome jsonb;
begin
 perform pg_advisory_xact_lock(741085);
 actor:=app_private.current_member_id();
 if actor is null
  or not app_private.module_allowed(actor,'91000000-0000-4000-8000-000000000001')
  or not app_private.study_is_manager(actor)
 then raise exception 'Reservation manager permission required' using errcode='42501';end if;
 if p_command is null then return app_private.study_operations_snapshot();end if;
 if jsonb_typeof(p_command)<>'object' or octet_length(p_command::text)>8192
 then raise exception 'Invalid operations request' using errcode='22023';end if;
 act:=p_command->>'action';
 fields:=case act
  when 'resource.add' then array['kind','name']
  when 'weekly.replace' then array['blocks']
  when 'day.replace' then array['day','blocks']
  when 'day.reset' then array['day']
 end;
 if fields is null then raise exception 'Unknown operations action' using errcode='22023';end if;
 fields:=fields||array['requestId','action','expectedVersion','reason'];
 if exists(select 1 from jsonb_object_keys(p_command) k where not k=any(fields))
 then raise exception 'Unexpected operations field' using errcode='22023';end if;
 if coalesce(jsonb_typeof(p_command->'expectedVersion'),'')<>'number'
  or coalesce(p_command->>'expectedVersion','')!~'^[1-9][0-9]{0,8}$'
  or coalesce(jsonb_typeof(p_command->'requestId'),'')<>'string'
  or coalesce(jsonb_typeof(p_command->'reason'),'')<>'string'
 then raise exception 'Invalid version, request ID or reason' using errcode='22023';end if;
 req:=(p_command->>'requestId')::uuid;
 why:=btrim(p_command->>'reason');
 if length(why) not between 5 and 240 then raise exception 'A reason is required' using errcode='22023';end if;
 select * into last from app_private.study_request_receipts where member_id=actor and request_id=req;
 if found then
  if last.command<>p_command then raise exception 'Request ID cannot be reused' using errcode='22023';end if;
  return last.result;
 end if;
 select version into v from app_private.study_policy_state where singleton for update;
 if (p_command->>'expectedVersion')::integer<>v
 then raise exception 'Configuration changed; refresh first' using errcode='40001';end if;
 prior:=app_private.study_operations_snapshot();
 local_now:=app_private.study_clock() at time zone 'America/Los_Angeles';

 if act='resource.add' then
  kind:=p_command->>'kind';title:=btrim(coalesce(p_command->>'name',''));
  if coalesce(jsonb_typeof(p_command->'kind'),'')<>'string'
   or coalesce(jsonb_typeof(p_command->'name'),'')<>'string'
   or kind not in ('room','whiteboard','tv') or length(title) not between 2 and 80
  then raise exception 'Choose a valid resource kind and name' using errcode='22023';end if;
  insert into app_private.study_resources(name,kind,sort_order)
   values(title,kind,(select coalesce(max(sort_order),0)+1 from app_private.study_resources))
   returning id into new_id;
 elsif act in ('weekly.replace','day.replace') then
  if jsonb_typeof(p_command->'blocks')<>'array'
   or jsonb_array_length(p_command->'blocks')>70
   or (act='weekly.replace' and jsonb_array_length(p_command->'blocks')=0)
  then raise exception 'Invalid service intervals' using errcode='22023';end if;
  entries:=p_command->'blocks';
  for entry in select value from jsonb_array_elements(entries) loop
   if jsonb_typeof(entry)<>'object'
    or coalesce(jsonb_typeof(entry->'start'),'')<>'number'
    or coalesce(jsonb_typeof(entry->'end'),'')<>'number'
    or coalesce(jsonb_typeof(entry->'label'),'')<>'string'
    or coalesce(entry->>'start','')!~'^[0-9]{1,4}$'
    or coalesce(entry->>'end','')!~'^[0-9]{1,4}$'
    or (act='weekly.replace' and
     (coalesce(jsonb_typeof(entry->'weekday'),'')<>'number'
      or coalesce(entry->>'weekday','')!~'^[0-6]$'))
    or exists(select 1 from jsonb_object_keys(entry) k
      where not k=any(case when act='weekly.replace'
       then array['weekday','start','end','label'] else array['start','end','label'] end))
   then raise exception 'Invalid service interval fields' using errcode='22023';end if;
   start_min:=(entry->>'start')::integer;end_min:=(entry->>'end')::integer;
   if start_min<600 or end_min>1380 or start_min>=end_min
     or start_min%30<>0 or end_min%30<>0 or length(btrim(entry->>'label')) not between 2 and 80
   then raise exception 'Intervals must fit 10 AM - 11 PM on half-hour boundaries' using errcode='22023';end if;
  end loop;
  if exists(select 1
   from jsonb_array_elements(entries) with ordinality a(x,ord)
   join jsonb_array_elements(entries) with ordinality b(x,ord) on a.ord<b.ord
   where (act='day.replace' or a.x->>'weekday'=b.x->>'weekday')
     and (a.x->>'start')::integer<(b.x->>'end')::integer
     and (b.x->>'start')::integer<(a.x->>'end')::integer
  ) then raise exception 'Service intervals must not overlap' using errcode='22023';end if;
 end if;

 if act in ('day.replace','day.reset') then
  if coalesce(jsonb_typeof(p_command->'day'),'')<>'string'
   or coalesce(p_command->>'day','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  then raise exception 'Choose a valid special date' using errcode='22023';end if;
  d:=(p_command->>'day')::date;
  if d<local_now::date or d>local_now::date+365
  then raise exception 'Special day must be within the next year' using errcode='22023';end if;
 end if;
 if act='weekly.replace' then
  delete from app_private.study_service_blocks;
  insert into app_private.study_service_blocks(weekday,start_min,end_min,label)
   select (j->>'weekday')::integer,(j->>'start')::integer,(j->>'end')::integer,btrim(j->>'label')
   from jsonb_array_elements(entries) j;
 elsif act='day.replace' then
  insert into app_private.study_special_days(book_day,blocks,reason,updated_by)
   values(d,entries,why,actor) on conflict(book_day) do update
   set blocks=excluded.blocks,reason=excluded.reason,updated_by=excluded.updated_by,
    updated_at=clock_timestamp();
 elsif act='day.reset' then
  delete from app_private.study_special_days where book_day=d;
  if not found then raise exception 'Special day override was not present' using errcode='22023';end if;
 end if;

 -- Full rollback if the new effective calendar would overlap a currently
 -- claimed, unexpired 30-minute resource slot. Never evict an owner silently.
 if act<>'resource.add' and exists(
  select 1 from app_private.study_slots s
  cross join lateral app_private.study_effective_service_blocks(s.book_day) b
  where s.book_day>=local_now::date and
   s.book_day+make_interval(mins=>s.minute+30)>local_now
   and s.minute<b.end_min and b.start_min<s.minute+30
 ) then raise exception 'Calendar change conflicts with existing reservations' using errcode='23505';end if;
 update app_private.study_policy_state set version=version+1,updated_at=clock_timestamp()
  where singleton;
 outcome:=jsonb_build_object('ok',true,'version',v+1,'action',act,'resourceId',new_id);
 insert into app_private.study_change_history(actor_id,target_id,action,reason,previous,next)
  values(actor,coalesce(new_id,'91000000-0000-4000-8000-000000000001'::uuid),
   act,why,prior,app_private.study_operations_snapshot());
 insert into app_private.study_request_receipts(member_id,request_id,command,result)
  values(actor,req,p_command,outcome);
 return outcome;
end $$;

create function public.study_room_operations(p_command jsonb default null)
 returns jsonb language sql security invoker set search_path='' as $$
 select app_private.study_room_operations(p_command)
$$;
revoke all on function app_private.study_room_operations(jsonb),public.study_room_operations(jsonb)
 from public,anon,authenticated;
grant execute on function app_private.study_room_operations(jsonb),public.study_room_operations(jsonb)
 to authenticated;
commit;
