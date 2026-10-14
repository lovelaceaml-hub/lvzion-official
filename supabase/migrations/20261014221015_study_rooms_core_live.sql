-- Study Room Reservation: first selected module. REVIEW ONLY / NOT APPLIED HOSTED.
-- Depends on the member foundation and module_runtime_foundation migrations.
begin;
insert into app_private.app_modules(id,module_key,display_name,short_name,description,accent,route_path,status)
 values('91000000-0000-4000-8000-000000000001','study-rooms','Study Room Reservation','Rooms','Reserve a study room, whiteboard or TV.','#337963','/modules/study-rooms','draft');
-- Selection does not publish the module or grant a real person access.
create table app_private.study_resources(
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 80),
 kind text not null check(kind in ('room','whiteboard','tv')), active boolean not null default true, sort_order integer not null default 0
);
insert into app_private.study_resources(id,name,kind,sort_order)
 select ('92000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Room '||n,'room',n from generate_series(1,4)n;
insert into app_private.study_resources(id,name,kind,sort_order)
 select ('92000000-0000-4000-8000-'||lpad((n+10)::text,12,'0'))::uuid,'Board '||n,'whiteboard',n+10 from generate_series(1,5)n;
insert into app_private.study_resources(id,name,kind,sort_order)
 select ('92000000-0000-4000-8000-'||lpad((n+20)::text,12,'0'))::uuid,'TV '||n,'tv',n+20 from generate_series(1,3)n;
create table app_private.study_service_blocks(
 id bigint generated always as identity primary key, weekday integer not null check(weekday between 0 and 6),
 start_min integer not null check(start_min between 600 and 1350 and start_min%30=0),
 end_min integer not null check(end_min between 630 and 1380 and end_min%30=0),
 label text not null check(length(label) between 2 and 80),check(start_min<end_min)
);
insert into app_private.study_service_blocks(weekday,start_min,end_min,label) values
 (2,1170,1230,'Evening service'),(6,600,660,'Morning service'),(6,870,930,'Afternoon service'),(6,1170,1230,'Evening service');
create table app_private.study_bookings(
 id uuid primary key default gen_random_uuid(),resource_id uuid not null references app_private.study_resources on delete restrict,
 member_id uuid not null references public.members on delete restrict,book_day date not null,
 start_min integer not null check(start_min between 600 and 1350 and start_min%30=0),
 end_min integer not null check(end_min between 630 and 1380 and end_min%30=0),
 purpose text not null check(purpose in ('contact','new-member','other','hold')),private_detail text not null,
 state text not null default 'confirmed' check(state in ('confirmed','cancelled')),
 created_at timestamptz not null default clock_timestamp(),cancelled_at timestamptz,cancelled_by uuid references public.members on delete restrict,cancel_reason text,
 check(start_min<end_min),check(length(btrim(private_detail)) between 1 and 240),
 check(purpose not in ('contact','new-member') or length(private_detail)<=120)
);
create index study_bookings_day on app_private.study_bookings(book_day,resource_id,start_min) where state='confirmed';
create index study_bookings_owner on app_private.study_bookings(member_id,book_day desc);
-- Slots are half-open [start,end); adjacent reservations are allowed, overlap is not.
-- PK is a second integrity boundary in addition to transaction serialization.
create table app_private.study_slots(
 resource_id uuid not null references app_private.study_resources on delete restrict,book_day date not null,
 minute integer not null check(minute between 600 and 1350 and minute%30=0),booking_id uuid not null references app_private.study_bookings on delete restrict,
 primary key(resource_id,book_day,minute)
);
create index study_slots_booking on app_private.study_slots(booking_id);
create table app_private.study_request_receipts(
 member_id uuid not null references public.members on delete restrict,request_id uuid not null,
 command jsonb not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),primary key(member_id,request_id)
);
create table app_private.study_audit(
 id bigint generated always as identity primary key,actor_id uuid not null references public.members on delete restrict,
 booking_id uuid not null references app_private.study_bookings on delete restrict,action text not null,
 occurred_at timestamptz not null default clock_timestamp(),reason text not null
);
do $$declare t text;begin foreach t in array array['study_resources','study_service_blocks','study_bookings','study_slots','study_request_receipts','study_audit'] loop
 execute format('alter table app_private.%I enable row level security',t);
 execute format('revoke all on app_private.%I from public,anon,authenticated',t);
end loop;end $$;
-- Internal helper: call only after verifying current_member_id() in private boundary.
create function app_private.study_is_manager(p_actor uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from app_private.module_access_grants g where g.member_id=p_actor and g.module_id='91000000-0000-4000-8000-000000000001' and g.permission='manager' and g.ended_at is null and g.granted_at<=now())
$$;
create function app_private.study_room_schedule(p_day date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();mgr boolean;today date:=(now() at time zone 'America/Los_Angeles')::date; minute_now integer;
begin
 if actor is null or not app_private.module_allowed(actor,'91000000-0000-4000-8000-000000000001') then raise exception 'Not authorized' using errcode='42501';end if;
 if p_day is null or p_day<today or p_day>=today+4 then raise exception 'Outside booking window' using errcode='22023';end if;
 mgr:=app_private.study_is_manager(actor);
 minute_now:=extract(hour from now() at time zone 'America/Los_Angeles')::integer*60+extract(minute from now() at time zone 'America/Los_Angeles')::integer;
 return jsonb_build_object('day',p_day::text,'today',today::text,'nowMinute',minute_now,'open',600,'close',1380,'step',30,'horizon',4,'canManage',mgr,
 'resources',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind) order by sort_order) from app_private.study_resources where active),'[]'::jsonb),
 'blocks',coalesce((select jsonb_agg(jsonb_build_object('start',start_min,'end',end_min,'label',label) order by start_min) from app_private.study_service_blocks where weekday=extract(dow from p_day)),'[]'::jsonb),
 'bookings',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
  'id',b.id,'resourceId',b.resource_id,'day',b.book_day::text,'start',b.start_min,'end',b.end_min,'state',b.state,'hold',b.purpose='hold','mine',b.member_id=actor,
  'label',case when b.purpose='hold' then 'Unavailable' when b.member_id=actor then 'You' when mgr or exists(select 1 from public.member_placements mine join public.member_placements other on other.group_id=mine.group_id where mine.member_id=actor and other.member_id=b.member_id and mine.ended_at is null and other.ended_at is null) then m.display_name else 'Reserved' end,
  'purpose',case when (b.member_id=actor or mgr) and b.purpose<>'hold' then b.purpose end,
  'detail',case when b.member_id=actor or mgr then b.private_detail end
 )) order by b.start_min,b.id) from app_private.study_bookings b join public.members m on m.id=b.member_id
 where b.book_day=p_day and (b.state='confirmed' or b.member_id=actor or mgr)),'[]'::jsonb));
end $$;
create function app_private.study_room_command(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;mgr boolean;act text;req uuid;old app_private.study_request_receipts%rowtype;b app_private.study_bookings%rowtype;r app_private.study_resources%rowtype;
 d date;s integer;e integer;purpose text;detail text;result_data jsonb;now_at timestamptz;today date;local_now timestamp;allowed text[];
begin
 -- Same lock as member status/placement commands: no write after concurrent suspension.
 perform pg_advisory_xact_lock(741085);actor:=app_private.current_member_id();
 if actor is null or not app_private.module_allowed(actor,'91000000-0000-4000-8000-000000000001') then raise exception 'Not authorized' using errcode='42501';end if;
 if p_command is null or jsonb_typeof(p_command)<>'object' or octet_length(p_command::text)>8192 then raise exception 'Invalid command' using errcode='22023';end if;
 act:=p_command->>'action';req:=(p_command->>'requestId')::uuid;
 if req is null or act is null or act not in ('reserve','hold','cancel') then raise exception 'Invalid command' using errcode='22023';end if;
 allowed:=case when act='cancel' then array['requestId','action','bookingId','reason'] else array['requestId','action','resourceId','day','start','end','purpose','detail','reason'] end;
 if exists(select 1 from jsonb_object_keys(p_command) k where not k=any(allowed)) then raise exception 'Unexpected command field' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(p_command) x where (x.key in ('start','end') and jsonb_typeof(x.value)<>'number') or (x.key not in ('start','end') and jsonb_typeof(x.value)<>'string')) then raise exception 'Invalid field type' using errcode='22023';end if;
 select * into old from app_private.study_request_receipts where member_id=actor and request_id=req;
 if found then if old.command<>p_command then raise exception 'Request ID reused' using errcode='22023';end if;return old.result;end if;
 mgr:=app_private.study_is_manager(actor);now_at:=clock_timestamp();local_now:=now_at at time zone 'America/Los_Angeles';today:=local_now::date;
 if act='cancel' then
  select * into b from app_private.study_bookings where id=(p_command->>'bookingId')::uuid for update;
  detail:=btrim(p_command->>'reason');
  if b.id is null or (b.member_id<>actor and not mgr) or (b.purpose='hold' and not mgr) then raise exception 'Not authorized' using errcode='42501';end if;
  if b.state<>'confirmed' or b.book_day+make_interval(mins=>b.end_min)<=local_now or detail is null or length(detail) not between 5 and 240 then raise exception 'Invalid cancellation' using errcode='22023';end if;
  update app_private.study_bookings set state='cancelled',cancelled_at=now_at,cancelled_by=actor,cancel_reason=detail where id=b.id;
  delete from app_private.study_slots where booking_id=b.id;
  update app_private.module_activities set status='cancelled' where module_id='91000000-0000-4000-8000-000000000001' and external_reference='study:'||b.id;
 else
  if act='hold' and not mgr then raise exception 'Reservation manager required' using errcode='42501';end if;
  if jsonb_typeof(p_command->'start') is distinct from 'number' or jsonb_typeof(p_command->'end') is distinct from 'number' or (p_command->>'start') !~ '^[0-9]+$' or (p_command->>'end') !~ '^[0-9]+$' or coalesce(p_command->>'day','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid interval' using errcode='22023';end if;
  d:=(p_command->>'day')::date;s:=(p_command->>'start')::integer;e:=(p_command->>'end')::integer;
  select * into r from app_private.study_resources where id=(p_command->>'resourceId')::uuid and active for update;
  if r.id is null or d<today or d>=today+4 or s<600 or e>1380 or s>=e or s%30<>0 or e%30<>0 or d+make_interval(mins=>s)<local_now then raise exception 'Invalid interval' using errcode='22023';end if;
  if exists(select 1 from app_private.study_service_blocks where weekday=extract(dow from d) and start_min<e and s<end_min) then raise exception 'Service time unavailable' using errcode='22023';end if;
  if exists(select 1 from app_private.study_slots where resource_id=r.id and book_day=d and minute>=s and minute<e) then raise exception 'Time unavailable' using errcode='23505';end if;
  purpose:=case when act='hold' then 'hold' else p_command->>'purpose' end;
  detail:=btrim(case when act='hold' then p_command->>'reason' else p_command->>'detail' end);
  if purpose is null or purpose not in ('contact','new-member','other','hold') or (act='reserve' and purpose='hold') or detail is null or length(detail)<(case when act='hold' then 5 else 1 end) or length(detail)>(case when purpose in ('contact','new-member') then 120 else 240 end) then raise exception 'Invalid purpose' using errcode='22023';end if;
  insert into app_private.study_bookings(resource_id,member_id,book_day,start_min,end_min,purpose,private_detail) values(r.id,actor,d,s,e,purpose,detail) returning * into b;
  insert into app_private.study_slots(resource_id,book_day,minute,booking_id) select r.id,d,n,b.id from generate_series(s,e-30,30)n;
  if act='reserve' then
   insert into app_private.module_activities(module_id,recipient_member_id,title,context,location_label,begins_at,ends_at,external_reference)
   values('91000000-0000-4000-8000-000000000001',actor,'Study Room Reservation · '||r.name,'Your reservation',r.name,(d+make_interval(mins=>s)) at time zone 'America/Los_Angeles',(d+make_interval(mins=>e)) at time zone 'America/Los_Angeles','study:'||b.id);
  end if;
 end if;
 insert into app_private.study_audit(actor_id,booking_id,action,reason) values(actor,b.id,act,case when act='cancel' then detail else 'Resource reservation action' end);
 insert into app_private.module_notices(module_id,recipient_member_id,requires_action,external_reference) values('91000000-0000-4000-8000-000000000001',b.member_id,false,'study:'||actor||':'||req);
 result_data:=jsonb_build_object('ok',true,'bookingId',b.id,'action',act);
 insert into app_private.study_request_receipts(member_id,request_id,command,result) values(actor,req,p_command,result_data);
 return result_data;
end $$;
create function public.study_room_schedule(p_day date) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.study_room_schedule(p_day)$$;
create function public.study_room_command(p_command jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.study_room_command(p_command)$$;
revoke execute on function app_private.study_is_manager(uuid),app_private.study_room_schedule(date),app_private.study_room_command(jsonb),public.study_room_schedule(date),public.study_room_command(jsonb) from public,anon,authenticated;
grant execute on function app_private.study_room_schedule(date),app_private.study_room_command(jsonb),public.study_room_schedule(date),public.study_room_command(jsonb) to authenticated;
commit;
