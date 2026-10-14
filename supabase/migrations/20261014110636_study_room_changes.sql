-- Study Room R2. Append-only, unapplied hosted. No account grants or publication.
begin;
create function app_private.study_clock() returns timestamptz language sql volatile set search_path='' as $$select clock_timestamp()$$;
revoke all on function app_private.study_clock() from public,anon,authenticated;
alter table app_private.study_bookings add column version integer not null default 1 check(version>0),
 add column released_at timestamptz, add column released_from integer check(released_from%30=0);
alter table app_private.study_bookings drop constraint study_bookings_state_check;
alter table app_private.study_bookings add constraint study_bookings_state_check check(state in ('confirmed','cancelled','ended')),
 add constraint study_release_bounds check((state='ended' and released_at is not null and released_from>start_min and released_from<end_min) or (state<>'ended' and released_at is null and released_from is null));
alter table app_private.study_resources add column version integer not null default 1 check(version>0);
create table app_private.study_closures(
 id uuid primary key default gen_random_uuid(),resource_id uuid references app_private.study_resources on delete restrict,
 book_day date not null,start_min integer not null check(start_min between 600 and 1350 and start_min%30=0),
 end_min integer not null check(end_min between 630 and 1380 and end_min%30=0),
 reason text not null check(length(btrim(reason)) between 5 and 240),active boolean not null default true,
 version integer not null default 1 check(version>0),created_by uuid not null references public.members on delete restrict,
 created_at timestamptz not null default clock_timestamp(),check(start_min<end_min)
);
create index study_closures_day on app_private.study_closures(book_day,resource_id) where active;
create table app_private.study_change_history(
 id bigint generated always as identity primary key,actor_id uuid not null references public.members on delete restrict,
 target_id uuid not null,action text not null,reason text not null,previous jsonb,next jsonb,occurred_at timestamptz not null default clock_timestamp()
);
do $$declare t text;begin foreach t in array array['study_closures','study_change_history'] loop
 execute format('alter table app_private.%I enable row level security',t);
 execute format('revoke all on app_private.%I from public,anon,authenticated',t);
end loop;end $$;
-- Retain the original implementation internally, never as a bypass RPC.
alter function app_private.study_room_command(jsonb) rename to study_room_command_r1;
revoke all on function app_private.study_room_command_r1(jsonb) from public,anon,authenticated;
create function app_private.study_room_command(p_command jsonb) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare a uuid;act text;req uuid;b app_private.study_bookings%rowtype;old app_private.study_request_receipts%rowtype;
 r app_private.study_resources%rowtype;d date;s integer;e integer;expected integer;detail text;new_purpose text;reason text;
 at_time timestamptz;local_time timestamp;release_min integer;result_data jsonb;fields text[];previous jsonb;
begin
 perform pg_advisory_xact_lock(741085);a:=app_private.current_member_id();
 if a is null or not app_private.module_allowed(a,'91000000-0000-4000-8000-000000000001') then raise exception 'Not authorized' using errcode='42501';end if;
 if p_command is null or jsonb_typeof(p_command)<>'object' or octet_length(p_command::text)>8192 then raise exception 'Invalid command' using errcode='22023';end if;
 act:=p_command->>'action';req:=(p_command->>'requestId')::uuid;
 fields:=case act when 'reserve' then array['requestId','action','resourceId','day','start','end','purpose','detail']
 when 'hold' then array['requestId','action','resourceId','day','start','end','reason']
 when 'cancel' then array['requestId','action','bookingId','reason','expectedVersion']
 when 'end_early' then array['requestId','action','bookingId','reason','expectedVersion']
 when 'reschedule' then array['requestId','action','bookingId','reason','expectedVersion','resourceId','day','start','end','purpose','detail'] end;
 if req is null or fields is null or exists(select 1 from jsonb_each(p_command) x where not x.key=any(fields) or
 (x.key in ('start','end','expectedVersion') and (jsonb_typeof(x.value)<>'number' or (x.value#>>'{}')!~'^[0-9]+$')) or
 (x.key not in ('start','end','expectedVersion') and jsonb_typeof(x.value)<>'string')) then raise exception 'Invalid command fields' using errcode='22023';end if;
 select * into old from app_private.study_request_receipts where member_id=a and request_id=req;
 if found then if old.command<>p_command then raise exception 'Request ID reused' using errcode='22023';end if;return old.result;end if;
 at_time:=app_private.study_clock();local_time:=at_time at time zone 'America/Los_Angeles';
 if act in ('reserve','hold','reschedule') then
  if coalesce(p_command->>'day','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023';end if;
  d:=(p_command->>'day')::date;s:=(p_command->>'start')::integer;e:=(p_command->>'end')::integer;
  select * into r from app_private.study_resources where id=(p_command->>'resourceId')::uuid and active for update;
  if r.id is null or d<local_time::date or d>=local_time::date+4 or s is null or e is null or s<600 or e>1380 or s>=e or s%30<>0 or e%30<>0 or d+make_interval(mins=>s)<local_time then raise exception 'Invalid interval' using errcode='22023';end if;
  if exists(select 1 from app_private.study_closures c where c.active and c.book_day=d and (c.resource_id is null or c.resource_id=r.id) and c.start_min<e and s<c.end_min) then raise exception 'Scheduled closure' using errcode='23505';end if;
 end if;
 if act in ('reserve','hold') then return app_private.study_room_command_r1(p_command);end if;
 select * into b from app_private.study_bookings where id=(p_command->>'bookingId')::uuid for update;
 if b.id is null or (b.member_id<>a and not app_private.study_is_manager(a)) or (b.purpose='hold' and not app_private.study_is_manager(a)) then raise exception 'Not authorized' using errcode='42501';end if;
 expected:=(p_command->>'expectedVersion')::integer;reason:=btrim(p_command->>'reason');
 if expected is null or expected<>b.version then raise exception 'Reservation changed; refresh first' using errcode='40001';end if;
 if b.state<>'confirmed' or b.book_day+make_interval(mins=>b.end_min)<=local_time or reason is null or length(reason) not between 5 and 240 then raise exception 'Reservation is not changeable' using errcode='22023';end if;
 previous:=jsonb_build_object('resourceId',b.resource_id,'day',b.book_day,'start',b.start_min,'end',b.end_min,'state',b.state,'version',b.version);
 if act='cancel' then
  -- The inner command has its own atomic receipt; upgrade it to this exact payload.
  result_data:=app_private.study_room_command_r1(p_command-'expectedVersion');
  update app_private.study_bookings set version=version+1 where id=b.id;
  result_data:=result_data||jsonb_build_object('version',b.version+1);
  update app_private.study_request_receipts set command=p_command,result=result_data where member_id=a and request_id=req;
 elsif act='end_early' then
  if b.purpose='hold' or b.book_day+make_interval(mins=>b.start_min)>local_time then raise exception 'Only a running reservation can end early' using errcode='22023';end if;
  -- Release at the next available 30-minute boundary; retain elapsed occupancy/history.
  release_min:=ceil(extract(epoch from(local_time-b.book_day::timestamp))/1800)::integer*30;
  if release_min<=b.start_min or release_min>=b.end_min then raise exception 'No remaining complete slot to release' using errcode='22023';end if;
  update app_private.study_bookings set state='ended',released_at=at_time,released_from=release_min,version=version+1 where id=b.id;
  delete from app_private.study_slots where booking_id=b.id and minute>=release_min;
  update app_private.module_activities set status='cancelled',ends_at=(b.book_day+make_interval(mins=>release_min)) at time zone 'America/Los_Angeles' where module_id='91000000-0000-4000-8000-000000000001' and external_reference='study:'||b.id;
  result_data:=jsonb_build_object('ok',true,'bookingId',b.id,'action',act,'version',b.version+1,'releasedFrom',release_min);
 else
  if b.purpose='hold' or b.book_day+make_interval(mins=>b.start_min)<=local_time then raise exception 'Only future reservations can be rescheduled' using errcode='22023';end if;
  if exists(select 1 from app_private.study_service_blocks where weekday=extract(dow from d) and start_min<e and s<end_min) then raise exception 'Service time unavailable' using errcode='22023';end if;
  if exists(select 1 from app_private.study_slots where resource_id=r.id and book_day=d and minute>=s and minute<e and booking_id<>b.id) then raise exception 'Time unavailable; original reservation kept' using errcode='23505';end if;
  new_purpose:=p_command->>'purpose';detail:=btrim(p_command->>'detail');
  if new_purpose is null or new_purpose not in ('contact','new-member','other') or detail is null or length(detail)<1 or length(detail)>(case when new_purpose='other' then 240 else 120 end) then raise exception 'Invalid purpose' using errcode='22023';end if;
  -- All modifications are one transaction: rollback restores original slots on any failure.
  delete from app_private.study_slots where booking_id=b.id;
  insert into app_private.study_slots(resource_id,book_day,minute,booking_id) select r.id,d,n,b.id from generate_series(s,e-30,30)n;
  update app_private.study_bookings set resource_id=r.id,book_day=d,start_min=s,end_min=e,purpose=new_purpose,private_detail=detail,version=version+1 where id=b.id;
  update app_private.module_activities set title='Study Room Reservation · '||r.name,location_label=r.name,begins_at=(d+make_interval(mins=>s)) at time zone 'America/Los_Angeles',ends_at=(d+make_interval(mins=>e)) at time zone 'America/Los_Angeles' where module_id='91000000-0000-4000-8000-000000000001' and external_reference='study:'||b.id;
  result_data:=jsonb_build_object('ok',true,'bookingId',b.id,'action',act,'version',b.version+1);
 end if;
 if act<>'cancel' then
  insert into app_private.study_request_receipts(member_id,request_id,command,result) values(a,req,p_command,result_data);
  insert into app_private.study_audit(actor_id,booking_id,action,reason) values(a,b.id,act,reason);
  insert into app_private.module_notices(module_id,recipient_member_id,requires_action,external_reference) values('91000000-0000-4000-8000-000000000001',b.member_id,false,'study:'||a||':'||req);
 end if;
 insert into app_private.study_change_history(actor_id,target_id,action,reason,previous,next)
 select a,id,act,reason,previous,jsonb_build_object('resourceId',resource_id,'day',book_day,'start',start_min,'end',end_min,'state',state,'version',version,'releasedFrom',released_from) from app_private.study_bookings where id=b.id;
 return result_data;
end $$;
-- Public wrapper must resolve the new boundary, not the renamed legacy function.
create or replace function public.study_room_command(p_command jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.study_room_command(p_command)$$;
revoke all on function app_private.study_room_command(jsonb) from public,anon;
grant execute on function app_private.study_room_command(jsonb) to authenticated;

-- Manager-only configuration, with optimistic versions and no silent booking eviction.
create function app_private.study_room_admin(p_command jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;act text;req uuid;target uuid;r app_private.study_resources%rowtype;c app_private.study_closures%rowtype;
 old app_private.study_request_receipts%rowtype;result_data jsonb;reason text;nm text;v integer;d date;s integer;e integer;fields text[];current_local timestamp;
begin
 perform pg_advisory_xact_lock(741085);a:=app_private.current_member_id();
 if a is null or not app_private.module_allowed(a,'91000000-0000-4000-8000-000000000001') or not app_private.study_is_manager(a) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_command is null then return jsonb_build_object('resources',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'active',active,'version',version) order by sort_order,id) from app_private.study_resources),'[]'::jsonb),'closures',coalesce((select jsonb_agg(jsonb_build_object('id',id,'resourceId',resource_id,'day',book_day,'start',start_min,'end',end_min,'reason',cl.reason,'active',active,'version',version) order by book_day,start_min) from app_private.study_closures cl where book_day>=(now() at time zone 'America/Los_Angeles')::date and active),'[]'::jsonb));end if;
 if jsonb_typeof(p_command)<>'object' or octet_length(p_command::text)>8192 then raise exception 'Invalid config' using errcode='22023';end if;
 act:=p_command->>'action';req:=(p_command->>'requestId')::uuid;reason:=btrim(p_command->>'reason');
 fields:=case act when 'resource.update' then array['requestId','action','resourceId','name','active','expectedVersion','reason'] when 'closure.add' then array['requestId','action','resourceId','day','start','end','reason'] when 'closure.remove' then array['requestId','action','id','expectedVersion','reason'] end;
 if req is null or fields is null or reason is null or length(reason) not between 5 and 240 or exists(select 1 from jsonb_each(p_command)x where not x.key=any(fields) or (x.key in ('start','end','expectedVersion') and (jsonb_typeof(x.value)<>'number' or (x.value#>>'{}')!~'^[0-9]+$')) or (x.key='active' and jsonb_typeof(x.value)<>'boolean') or (x.key not in ('start','end','expectedVersion','active') and jsonb_typeof(x.value)<>'string')) then raise exception 'Invalid config fields' using errcode='22023';end if;
 select * into old from app_private.study_request_receipts where member_id=a and request_id=req;
 if found then if old.command<>p_command then raise exception 'Request ID reused' using errcode='22023';end if;return old.result;end if;
 current_local:=app_private.study_clock() at time zone 'America/Los_Angeles';
 if act='resource.update' then
  select * into r from app_private.study_resources where id=(p_command->>'resourceId')::uuid for update;
  nm:=btrim(p_command->>'name');v:=(p_command->>'expectedVersion')::integer;
  if r.id is null or nm is null or length(nm) not between 2 and 80 or p_command->'active' is null then raise exception 'Invalid resource' using errcode='22023';end if;
  if v is null or v<>r.version then raise exception 'Resource changed; refresh first' using errcode='40001';end if;
  if not (p_command->>'active')::boolean and exists(select 1 from app_private.study_slots where resource_id=r.id and book_day+make_interval(mins=>minute+30)>current_local) then raise exception 'Resource has reservations; cancel explicitly first' using errcode='23505';end if;
  update app_private.study_resources set name=nm,active=(p_command->>'active')::boolean,version=version+1 where id=r.id;target:=r.id;
  update app_private.module_activities m set title='Study Room Reservation · '||nm,location_label=nm from app_private.study_bookings b where b.resource_id=r.id and m.module_id='91000000-0000-4000-8000-000000000001' and m.external_reference='study:'||b.id and m.status='scheduled';
 elsif act='closure.add' then
  if coalesce(p_command->>'day','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date' using errcode='22023';end if;
  d:=(p_command->>'day')::date;s:=(p_command->>'start')::integer;e:=(p_command->>'end')::integer;target:=nullif(p_command->>'resourceId','')::uuid;
  if d<current_local::date or d>current_local::date+365 or s is null or e is null or s<600 or e>1380 or s>=e or s%30<>0 or e%30<>0 or (target is not null and not exists(select 1 from app_private.study_resources where id=target and active)) then raise exception 'Invalid closure' using errcode='22023';end if;
  if exists(select 1 from app_private.study_slots where book_day=d and (target is null or resource_id=target) and minute>=s and minute<e and book_day+make_interval(mins=>minute+30)>current_local) then raise exception 'Closure conflicts with existing reservations' using errcode='23505';end if;
  insert into app_private.study_closures(resource_id,book_day,start_min,end_min,reason,created_by) values(target,d,s,e,reason,a) returning id into target;
 else
  select * into c from app_private.study_closures where id=(p_command->>'id')::uuid for update;v:=(p_command->>'expectedVersion')::integer;
  if c.id is null or not c.active then raise exception 'Closure unavailable' using errcode='22023';end if;
  if v is null or v<>c.version then raise exception 'Closure changed; refresh first' using errcode='40001';end if;
  update app_private.study_closures set active=false,version=version+1 where id=c.id;target:=c.id;
 end if;
 result_data:=jsonb_build_object('ok',true,'id',target,'action',act);
 insert into app_private.study_change_history(actor_id,target_id,action,reason) values(a,target,act,reason);
 insert into app_private.study_request_receipts(member_id,request_id,command,result) values(a,req,p_command,result_data);
 return result_data;
end $$;
create function public.study_room_admin(p_command jsonb default null) returns jsonb language sql security invoker set search_path='' as $$select app_private.study_room_admin(p_command)$$;
revoke all on function app_private.study_room_admin(jsonb),public.study_room_admin(jsonb) from public,anon;
grant execute on function app_private.study_room_admin(jsonb),public.study_room_admin(jsonb) to authenticated;

create or replace function app_private.study_room_schedule(p_day date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a uuid:=app_private.current_member_id();mgr boolean;local_now timestamp:=app_private.study_clock() at time zone 'America/Los_Angeles';
begin
 if a is null or not app_private.module_allowed(a,'91000000-0000-4000-8000-000000000001') then raise exception 'Not authorized' using errcode='42501';end if;
 if p_day is null or p_day<local_now::date or p_day>=local_now::date+4 then raise exception 'Outside booking window' using errcode='22023';end if;
 mgr:=app_private.study_is_manager(a);
 return jsonb_build_object('day',p_day::text,'today',local_now::date::text,'nowMinute',ceil(extract(epoch from(local_now-local_now::date))/60)::integer,'open',600,'close',1380,'step',30,'horizon',4,'canManage',mgr,
 'resources',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'active',active) order by sort_order,id) from app_private.study_resources),'[]'::jsonb),
 'blocks',coalesce((select jsonb_agg(x.item) from (select jsonb_build_object('start',start_min,'end',end_min,'label',label) item from app_private.study_service_blocks where weekday=extract(dow from p_day)
 union all select jsonb_build_object('start',start_min,'end',end_min,'label','Scheduled closure','resourceId',resource_id) from app_private.study_closures where book_day=p_day and active)x),'[]'::jsonb),
 'bookings',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',b.id,'resourceId',b.resource_id,'day',b.book_day::text,'start',b.start_min,'end',coalesce(b.released_from,b.end_min),'originalEnd',b.end_min,'state',b.state,'hold',b.purpose='hold','mine',b.member_id=a,'version',b.version,
 'label',case when b.purpose='hold' then 'Unavailable' when b.member_id=a then 'You' when mgr or exists(select 1 from public.member_placements mine join public.member_placements other on other.group_id=mine.group_id where mine.member_id=a and other.member_id=b.member_id and mine.ended_at is null and other.ended_at is null) then m.display_name else 'Reserved' end,
 'purpose',case when (b.member_id=a or mgr) and b.purpose<>'hold' then b.purpose end,'detail',case when b.member_id=a or mgr then b.private_detail end
 )) order by b.start_min,b.id) from app_private.study_bookings b join public.members m on m.id=b.member_id where b.book_day=p_day and (b.state in ('confirmed','ended') or b.member_id=a or mgr)),'[]'::jsonb));
end $$;
commit;
