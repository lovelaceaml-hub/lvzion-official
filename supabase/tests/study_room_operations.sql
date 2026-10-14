-- Disposable R4 manager/booking calendar regressions. All writes ROLLBACK.
begin;
insert into auth.users(id,email,email_confirmed_at)
 select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,
  'ops-'||n||'@example.invalid',now()-interval '1 day'
 from unnest(array[101,103])n;
insert into auth.sessions(id,user_id,created_at)
 select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,
  ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 hour'
 from unnest(array[101,103])n;
insert into app_private.account_links(member_id,auth_user_id,username)
 select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,
  ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'ops_'||n
 from unnest(array[101,103])n;
create function pg_temp.login(n integer) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claim.sub','99999999-9999-4999-8999-'||lpad(n::text,12,'0'),true);
 perform set_config('request.jwt.claims',jsonb_build_object('session_id','aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::text,true);
end $$;
create function pg_temp.pass(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label;end if;
 raise notice 'OPS PASS: %',label;end $$;
create function pg_temp.denied(command text,expected text,label text) returns void language plpgsql as $$
declare state text;
begin
 begin execute command;exception when others then get stacked diagnostics state=returned_sqlstate;end;
 if state is distinct from expected then
  raise exception 'FAIL: % expected % got %',label,expected,state;
 end if;
 raise notice 'OPS PASS: %',label;
end $$;
create function pg_temp.tomorrow() returns date language sql stable as $$
 select (now() at time zone 'America/Los_Angeles')::date+1 $$;
create function pg_temp.operation(n integer,act text,v integer) returns jsonb language sql stable as $$
 select jsonb_build_object('requestId',('55000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'action',act,'expectedVersion',v,'reason','Fictional approved manager operation')
$$;
select pg_temp.pass((select rowsecurity from pg_tables where schemaname='app_private' and tablename='study_special_days'),'special-day records have RLS');
select pg_temp.pass((select rowsecurity from pg_tables where schemaname='app_private' and tablename='study_policy_state'),'calendar version table has RLS');
select pg_temp.pass((select count(*)=0 from app_private.study_special_days),'calendar starts with no overrides');
select pg_temp.pass((select version=1 from app_private.study_policy_state),'calendar starts at revision one');
select pg_temp.pass((select bookings_open=false from app_private.study_booking_activation),'cutover still closed');
update app_private.app_modules set status='approved',approved_at=now() where module_key='study-rooms';
insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_at)
 select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,
  '91000000-0000-4000-8000-000000000001',
  case when n=101 then 'manager' else 'viewer' end,
  'Fictional operations test grant',now()-interval '1 day'
 from unnest(array[101,103])n;
select pg_temp.login(103);set local role authenticated;
select pg_temp.denied('select public.study_room_operations(null)','42501','ordinary viewer cannot read manager calendar');
select pg_temp.denied($q$select public.study_room_operations('{"action":"resource.add"}')$q$,'42501','viewer cannot mutate inventory');
select pg_temp.denied('select * from app_private.study_special_days','42501','private special-day rows inaccessible');
select pg_temp.denied('select app_private.study_operations_snapshot()','42501','private snapshot helper inaccessible');
select pg_temp.denied('select app_private.study_effective_service_blocks(current_date)','42501','private effective-time helper inaccessible');
select pg_temp.denied($q$select public.study_room_command(jsonb_build_object('requestId',gen_random_uuid(),'action','reserve','resourceId','92000000-0000-4000-8000-000000000001','day',(now() at time zone 'America/Los_Angeles')::date+1,'start',780,'end',840,'purpose','contact','detail','Fictional contact'))$q$,'42501','booking remains CLOSED after calendar migration');
reset role;
select pg_temp.login(101);set local role authenticated;
select pg_temp.pass(public.study_room_operations(null)->>'version'='1','manager receives revision number');
select pg_temp.pass(jsonb_array_length(public.study_room_operations(null)->'weekly')=4,'original service rules preserved');
select pg_temp.pass(public.study_room_operations(null)->>'bookingsOpen'='false','manager sees honest cutover state');
select pg_temp.pass(public.study_room_operations(null)->>'newSystemBookings'='0','zero live bookings reported without legacy detail');
select pg_temp.denied($q$select public.study_room_operations(pg_temp.operation(1,'booking.open',1))$q$,'22023','operations cannot open booking gate');
select pg_temp.denied($q$select public.study_room_operations(pg_temp.operation(2,'resource.add',1)||'{"kind":"room","name":"Room 1"}')$q$,'23505','duplicate resource name rejected');
select set_config('ops.created',(public.study_room_operations(pg_temp.operation(3,'resource.add',1)||'{"kind":"whiteboard","name":"Board 6"}'))::text,true);
select pg_temp.pass(current_setting('ops.created')::jsonb->>'version'='2','new resource increments policy version');
select pg_temp.pass(public.study_room_operations(pg_temp.operation(3,'resource.add',1)||'{"kind":"whiteboard","name":"Board 6"}')=current_setting('ops.created')::jsonb,'exact retry returns same receipt');
select pg_temp.pass((select count(*)=6 from app_private.study_resources where kind='whiteboard'),'new board added exactly once');
select pg_temp.denied($q$select public.study_room_operations(pg_temp.operation(3,'resource.add',1)||'{"kind":"whiteboard","name":"Board 7"}')$q$,'22023','same request key cannot change resource');
select pg_temp.denied($q$select public.study_room_operations(pg_temp.operation(4,'resource.add',1)||'{"kind":"room","name":"Room 7"}')$q$,'40001','stale manager revision rejected');
select pg_temp.denied($q$select public.study_room_operations(pg_temp.operation(5,'weekly.replace',2)||jsonb_build_object('blocks',jsonb_build_array(
 jsonb_build_object('weekday',2,'start',1170,'end',1230,'label','Evening service'),
 jsonb_build_object('weekday',2,'start',1200,'end',1260,'label','Overlaps service'))))$q$,'22023','overlapping weekly intervals rejected');
select pg_temp.pass((select version=2 from app_private.study_policy_state),'failed operations do not advance revision');
select public.study_room_operations(pg_temp.operation(6,'weekly.replace',2)||jsonb_build_object('blocks',jsonb_build_array(
 jsonb_build_object('weekday',2,'start',1170,'end',1230,'label','Evening service'),
 jsonb_build_object('weekday',6,'start',600,'end',660,'label','Morning service'),
 jsonb_build_object('weekday',6,'start',870,'end',930,'label','Afternoon service'),
 jsonb_build_object('weekday',6,'start',1170,'end',1230,'label','Evening service'))));
select pg_temp.pass(public.study_room_operations(null)->>'version'='3','weekly replacement increments revision');
select pg_temp.pass((select count(*)=1 from app_private.study_effective_service_blocks('2026-10-20'::date)),'weekly rules drive effective Tuesday service');
select public.study_room_operations(pg_temp.operation(7,'day.replace',3)||jsonb_build_object('day',pg_temp.tomorrow()::text,'blocks',jsonb_build_array(
 jsonb_build_object('start',960,'end',1020,'label','Special service'))));
select pg_temp.pass(jsonb_array_length(public.study_room_operations(null)->'specialDays')=1,'special date listed for manager');
select pg_temp.pass((select count(*)=1 from app_private.study_effective_service_blocks(pg_temp.tomorrow())),'special date replaces weekdays');
select public.study_room_operations(pg_temp.operation(8,'day.reset',4)||jsonb_build_object('day',pg_temp.tomorrow()::text));
select pg_temp.pass((select count(*)=0 from app_private.study_special_days),'reset returns to weekly service');
select pg_temp.pass((select version=5 from app_private.study_policy_state),'reset advances revision');
select public.study_room_operations(pg_temp.operation(9,'day.replace',5)||jsonb_build_object('day',pg_temp.tomorrow()::text,'blocks','[]'::jsonb));
select pg_temp.pass((select count(*)=0 from app_private.study_effective_service_blocks(pg_temp.tomorrow())),'empty special override means zero service restrictions');
select pg_temp.pass((select count(*)=4 from app_private.study_change_history where action in ('resource.add','weekly.replace','day.replace','day.reset'))=false,'audit counts do not silently collapse separate manager actions');
reset role;
select pg_temp.pass((select count(*)=5 from app_private.study_change_history where action in ('resource.add','weekly.replace','day.replace','day.reset')),'five successful operations have five audit records');
select pg_temp.pass((select count(*)=5 from app_private.study_request_receipts),'operation retries do not create phantom receipts');
select pg_temp.pass((select bookings_open=false from app_private.study_booking_activation),'manager operations never open the booking gate');
rollback;
