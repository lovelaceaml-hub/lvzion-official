-- Disposable Study Rooms leader access regressions. Fictional members only. All writes ROLLBACK.
begin;
insert into auth.users(id,email,email_confirmed_at)
 select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'access-'||n||'@example.invalid',now()-interval '1 day'
 from generate_series(101,109)n;
insert into auth.sessions(id,user_id,created_at)
 select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 hour'
 from generate_series(101,109)n;
insert into app_private.account_links(member_id,auth_user_id,username)
 select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'access_'||n
 from generate_series(101,109)n;
create function pg_temp.m(n integer) returns uuid language sql immutable as $$select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.login(n integer) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claim.sub','99999999-9999-4999-8999-'||lpad(n::text,12,'0'),true);
 perform set_config('request.jwt.claims',jsonb_build_object('session_id','aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::text,true);
end $$;
create function pg_temp.pass(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label;end if;raise notice 'ACCESS PASS: %',label;end $$;
create function pg_temp.denied(command text,expected text,label text) returns void language plpgsql as $$
declare state text;
begin
 begin execute command;exception when others then get stacked diagnostics state=returned_sqlstate;end;
 if state is distinct from expected then raise exception 'FAIL: % expected % got %',label,expected,state;end if;
 raise notice 'ACCESS PASS: %',label;
end $$;
create function pg_temp.study(n integer) returns boolean language sql stable as $$
 select app_private.module_allowed(pg_temp.m(n),'91000000-0000-4000-8000-000000000001')$$;
create function pg_temp.in_apps(n integer) returns boolean language plpgsql as $$
declare home jsonb;begin perform pg_temp.login(n);home:=app_private.member_module_home();
 return exists(select 1 from jsonb_array_elements(home->'modules') e where e->>'id'='91000000-0000-4000-8000-000000000001');end $$;
create function pg_temp.cmd(act text,target integer) returns jsonb language sql as $$
 select app_private.study_group_access(jsonb_build_object('action',act,'memberId',pg_temp.m(target)))$$;

-- Approve every app in this disposable database so the boundary checks are meaningful.
update app_private.app_modules set status='approved',approved_at=now();
-- Fictional seed: 101 unit leader (group A), 102 department manager, 103 group leader of group B,
-- 104 technical admin (group B), 105 pastoral staff, 106 inactive, 107/109 group A, 108 group B.
select pg_temp.pass(pg_temp.study(101),'unit leader may use Study Rooms automatically');
select pg_temp.pass(pg_temp.study(103),'group leader may use Study Rooms automatically');
select pg_temp.pass(pg_temp.study(105),'pastoral staff may use Study Rooms automatically');
select pg_temp.pass(not pg_temp.study(102),'department manager alone has no Study Rooms access');
select pg_temp.pass(not pg_temp.study(104),'technical admin alone has no Study Rooms access');
select pg_temp.pass(not pg_temp.study(107),'ordinary member has no Study Rooms access by default');
select pg_temp.pass(pg_temp.in_apps(101),'leader sees Study Rooms in Apps');
select pg_temp.pass(not pg_temp.in_apps(107),'ordinary member does not see Study Rooms in Apps');
select pg_temp.pass((select count(*)>0 and bool_and(not app_private.module_allowed(pg_temp.m(101),id)) from app_private.app_modules where id<>'91000000-0000-4000-8000-000000000001'),'leader role does not open any other app');
select pg_temp.pass(not has_function_privilege('authenticated','app_private.study_leader_access(uuid)','execute'),'leader helper is not directly callable');
select pg_temp.pass(not has_function_privilege('anon','public.study_group_access(jsonb)','execute'),'signed-out visitors cannot call group access');

-- Schedule reads work for an automatic leader.
select pg_temp.login(101);
select pg_temp.pass(app_private.study_room_schedule((now() at time zone 'America/Los_Angeles')::date) ? 'resources','automatic leader can read the schedule');

-- Only group leaders may manage group access.
select pg_temp.login(101);
select pg_temp.denied($$select pg_temp.cmd('list',101)$$,'42501','unit leader cannot manage group access');
select pg_temp.login(104);
select pg_temp.denied($$select pg_temp.cmd('list',104)$$,'42501','technical admin cannot manage group access');
select pg_temp.login(108);
select pg_temp.denied($$select pg_temp.cmd('enable',108)$$,'42501','ordinary member cannot turn on their own access');

select pg_temp.login(103);
select pg_temp.pass((select jsonb_array_length(pg_temp.cmd('list',103)->'groups')=1),'group leader sees only the group they lead');
select pg_temp.pass((select array_agg(e->>'name' order by e->>'name')=array['Cara Example','Devin Example','Hugo Example']
 from jsonb_array_elements(pg_temp.cmd('list',103)->'groups'->0->'members') e),'list shows current active members only');
select pg_temp.denied($$select pg_temp.cmd('enable',107)$$,'42501','group leader cannot turn on someone outside their group');
select pg_temp.denied($$select pg_temp.cmd('enable',106)$$,'42501','group leader cannot turn on an inactive former member');
select pg_temp.denied($$select app_private.study_group_access('{"action":"enable","memberId":"not-a-uuid"}')$$,'22023','invalid member is rejected');
select pg_temp.denied($$select app_private.study_group_access('{"action":"delete"}')$$,'22023','unknown action is rejected');

select pg_temp.cmd('enable',108);
select pg_temp.pass(pg_temp.study(108),'group leader turned on a member of their group');
select pg_temp.cmd('enable',108);
select pg_temp.pass((select count(*)=1 from app_private.module_access_grants where member_id=pg_temp.m(108) and module_id='91000000-0000-4000-8000-000000000001'),'turning on twice creates one grant');
select pg_temp.pass((select g.granted_by=pg_temp.m(103) and g.permission='viewer' from app_private.module_access_grants g where g.member_id=pg_temp.m(108)),'grant records who turned it on and is not a manager grant');
select pg_temp.pass((select count(*)=1 from app_private.audit_events where operation='study_rooms.group_access.enable' and target_member_id=pg_temp.m(108) and actor_member_id=pg_temp.m(103)),'turning on is audited');
select pg_temp.pass((select bool_or((e->>'enabled')::boolean) from jsonb_array_elements(pg_temp.cmd('list',103)->'groups'->0->'members') e where e->>'name'='Hugo Example'),'list shows the member as turned on');

select pg_temp.cmd('disable',108);
select pg_temp.pass(not pg_temp.study(108),'group leader turned the member off again');
select pg_temp.pass((select count(*)=1 from app_private.audit_events where operation='study_rooms.group_access.disable' and target_member_id=pg_temp.m(108)),'turning off is audited');
select pg_temp.pass((select count(*)=1 and bool_and(ended_by=pg_temp.m(103)) from app_private.module_access_grants where member_id=pg_temp.m(108)),'ended grant keeps its history');

-- A manager grant inside the group is never changed by a group leader.
insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_at)
 values(pg_temp.m(104),'91000000-0000-4000-8000-000000000001','manager','Fictional owner manager grant',now());
select pg_temp.login(103);
select pg_temp.denied($$select pg_temp.cmd('disable',104)$$,'42501','group leader cannot remove a manager grant');
select pg_temp.pass(pg_temp.study(104),'manager grant is still active');

-- Ending a leader role ends the automatic access.
update app_private.role_assignments set ended_at=clock_timestamp() where member_id=pg_temp.m(101) and role_key='unit_leader';
select pg_temp.pass(not pg_temp.study(101),'ending the unit leader role ends automatic access');
update app_private.role_assignments set ended_at=clock_timestamp() where member_id=pg_temp.m(103) and role_key='group_leader';
select pg_temp.login(103);
select pg_temp.denied($$select pg_temp.cmd('list',103)$$,'42501','former group leader cannot manage group access');
rollback;
