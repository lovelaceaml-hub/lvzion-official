-- Owner decisions 2026-10-24: open app access, owner-everywhere, group-only placement and
-- leadership independent of placement. Fictional members only. Every write rolls back.
-- Seed: group A (units A1, A2), group B (unit B1). 101 Ava unit leader A1; 102 Ben A2; 103 Cara group
-- leader B; 104 Devin technical admin (B1); 105 Eira pastoral staff; 106 inactive; 107 Gina A1; 108 Hugo B1; 109 Isla A2.
begin;
create function pg_temp.m(n integer) returns uuid language sql immutable as $$select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.owner() returns uuid language sql stable as $$select member_id from app_private.account_links where auth_user_id='99999999-9999-4999-8999-000000000900'$$;
create function pg_temp.login(n integer) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claim.sub','99999999-9999-4999-8999-'||lpad(n::text,12,'0'),true);
 perform set_config('request.jwt.claims',jsonb_build_object('session_id','aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::text,true);
end $$;
create function pg_temp.pass(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label;end if;raise notice 'OPEN PASS: %',label;end $$;
create function pg_temp.denied(statement text,expected text,label text) returns void language plpgsql as $$
declare state text;
begin
 begin execute statement;exception when others then get stacked diagnostics state=returned_sqlstate;end;
 if state is distinct from expected then raise exception 'FAIL: % expected % got %',label,expected,coalesce(state,'success');end if;
 raise notice 'OPEN PASS: %',label;
end $$;
create function pg_temp.gp_fails(n integer,act text,payload jsonb,label text) returns void language plpgsql as $$
declare msg text;
begin
 perform pg_temp.login(n);
 begin perform public.gospel_planning_command(act,payload,gen_random_uuid());exception when others then msg:=sqlerrm;end;
 if msg is distinct from 'GP_DENIED' then raise exception 'FAIL: % got %',label,coalesce(msg,'success');end if;
 raise notice 'OPEN PASS: %',label;
end $$;
create function pg_temp.home(n integer) returns jsonb language plpgsql as $$begin perform pg_temp.login(n);return app_private.member_module_home();end $$;
create function pg_temp.has_module(home jsonb,module_key text) returns boolean language sql as $$
 select exists(select 1 from jsonb_array_elements(home->'modules') e where e->>'route'='/modules/'||module_key)$$;
create function pg_temp.manages(home jsonb,module_key text) returns boolean language sql as $$
 select coalesce((select (e->>'canManage')::boolean from jsonb_array_elements(home->'modules') e where e->>'route'='/modules/'||module_key),false)$$;
create function pg_temp.week() returns date language sql stable as $$select date_trunc('week',(now() at time zone 'America/Los_Angeles')::date+3)::date$$;
create function pg_temp.ws(n integer,g uuid default null) returns jsonb language plpgsql as $$
begin perform pg_temp.login(n);return public.gospel_planning_workspace(pg_temp.week(),g);end $$;
create function pg_temp.gp(n integer,act text,payload jsonb) returns jsonb language plpgsql as $$
begin perform pg_temp.login(n);return public.gospel_planning_command(act,payload,gen_random_uuid());end $$;
create function pg_temp.cmd(n integer,act text,payload jsonb) returns jsonb language plpgsql as $$
declare r jsonb;begin perform pg_temp.login(n);r:=public.member_command(act,payload,gen_random_uuid());perform pg_temp.settle();return r;end $$;
create function pg_temp.owner_cmd(act text,payload jsonb) returns jsonb language plpgsql as $$
declare r jsonb;begin perform pg_temp.login(900);
 r:=case when act like 'enrollment.%' then public.enrollment_command(act,payload,gen_random_uuid()) else public.member_command(act,payload,gen_random_uuid()) end;
 perform pg_temp.settle();return r;end $$;
create function pg_temp.names(list jsonb) returns text[] language sql as $$select coalesce(array_agg(e->>'name' order by e->>'name'),'{}') from jsonb_array_elements(list) e$$;
-- Commands stamp clock time, which is later than this test transaction's now(). Settle new rows so they are current.
create function pg_temp.settle() returns void language plpgsql as $$
begin
 update app_private.role_assignments set appointed_at=now()-interval '1 minute' where appointed_at>now();
 update app_private.module_access_grants set granted_at=now()-interval '1 minute' where granted_at>now();
 update public.member_placements set started_at=now()-interval '1 minute' where started_at>now() and ended_at is null;
end $$;

-- Fictional accounts for every seeded member, plus new fictional people for the new cases.
-- 110 Jade: intake signup (placed group-only by the owner). 111 Kai: placed A2, unit leader of A2 and
-- group leader of the Demo Student Brothers group. 112 Lena: placed B1, unit leader of B1 and group leader
-- of the Demo Student Sisters group. 113 Milo: group-only in Student Brothers. 114 Nora: Student Sisters unit.
-- 115 Omar: intake signup that stays Unassigned.
insert into public.age_categories(id,name) values('11111111-1111-4111-8111-000000000002','Demo Student Category');
insert into public.church_groups(id,age_category_id,name) values
 ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000002','Demo Student Brothers'),
 ('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000002','Demo Student Sisters');
insert into public.church_units(id,group_id,name) values('33333333-3333-4333-8333-000000000004','22222222-2222-4222-8222-000000000004','Demo Unit SS1');
insert into public.members(id,display_name,status) values
 (pg_temp.m(110),'Jade Example','intake'),(pg_temp.m(111),'Kai Example','active'),(pg_temp.m(112),'Lena Example','active'),
 (pg_temp.m(113),'Milo Example','active'),(pg_temp.m(114),'Nora Example','active'),(pg_temp.m(115),'Omar Example','intake');
insert into public.member_placements(member_id,group_id,unit_id,started_at) values
 (pg_temp.m(111),'22222222-2222-4222-8222-000000000001','33333333-3333-4333-8333-000000000002',now()-interval '5 days'),
 (pg_temp.m(112),'22222222-2222-4222-8222-000000000002','33333333-3333-4333-8333-000000000003',now()-interval '5 days'),
 (pg_temp.m(113),'22222222-2222-4222-8222-000000000003',null,now()-interval '5 days'),
 (pg_temp.m(114),'22222222-2222-4222-8222-000000000004','33333333-3333-4333-8333-000000000004',now()-interval '5 days');
insert into app_private.self_service_enrollments(member_id) values(pg_temp.m(110)),(pg_temp.m(115));
insert into auth.users(id,email,email_confirmed_at)
 select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'open-'||n||'@example.invalid',now()-interval '1 day' from generate_series(101,115)n;
insert into auth.sessions(id,user_id,created_at)
 select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 hour' from generate_series(101,115)n;
insert into app_private.account_links(member_id,auth_user_id,username)
 select pg_temp.m(n),('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'open_'||n from generate_series(101,115)n;
-- Approve the remaining apps as production has them. Continuous Display is registered as in production.
update app_private.app_modules set status='approved',approved_at=coalesce(approved_at,now()) where module_key in ('study-rooms','work-mission-prayer');
insert into app_private.app_modules(module_key,display_name,short_name,description,accent,route_path,status,approved_at)
 values('continuous-display','Church Display','Display','Fictional display registration for tests.','#52718c','/modules/continuous-display','approved',now());
update mpg_private.series set enabled=true;
update app_private.study_booking_activation set bookings_open=true where id;

-- ============================================================================ 2. Owner everywhere
select pg_temp.pass((select status='approved' and approved_at is not null and approved_by=pg_temp.owner() from app_private.app_modules where module_key='gospel-planning'),'migration approved Gospel Planning, recorded against the bootstrap owner');
select pg_temp.pass((select count(*)=1 from app_private.audit_events where operation='module.approved' and actor_member_id=pg_temp.owner()),'the approval is audited once, even after a second run');
select pg_temp.pass((select count(*)=1 from app_private.audit_events where operation='module.access_policy'),'the access policy change is audited once');
select pg_temp.pass((select status from public.members where id=pg_temp.owner())='intake' and not exists(select 1 from public.member_placements where member_id=pg_temp.owner()),'the owner stays Unassigned');
select pg_temp.pass((select count(*)=0 from app_private.module_access_grants g join app_private.app_modules m on m.id=g.module_id where g.member_id=pg_temp.owner() and m.module_key in ('study-rooms','gospel-planning','work-mission-prayer','continuous-display')),'no grant rows exist for the owner in those apps');
select pg_temp.pass((select bool_and(pg_temp.manages(pg_temp.home(900),module_key)) from app_private.app_modules where status='approved'),'the owner manages every approved app');
insert into app_private.app_modules(id,module_key,display_name,short_name,description,accent,route_path,status,approved_at)
 values('a8000000-0000-4000-8000-000000000001','future-app','Future Example App','Future','Fictional future module.','#52718c','/modules/future-app','approved',now());
select pg_temp.pass(pg_temp.manages(pg_temp.home(900),'future-app'),'the owner manages a future app automatically');
select pg_temp.pass(pg_temp.has_module(pg_temp.home(107),'future-app') and not pg_temp.manages(pg_temp.home(107),'future-app'),'a member can use the future app without managing it');
select pg_temp.login(900);
select pg_temp.pass((app_private.study_room_schedule((now() at time zone 'America/Los_Angeles')::date+1)->>'canManage')::boolean,'the owner manages Study Rooms without a grant');
select pg_temp.pass(jsonb_typeof(public.display_management_state()->'screens')='array','the owner reaches Display management without a grant');
select pg_temp.pass(public.display_create_screen('Fictional Lobby Screen') is not null,'the owner creates a screen without a prior screen permission');
select pg_temp.pass((select bool_and(mpg_private.allowed(s.id,c,pg_temp.owner())) from mpg_private.series s,unnest(array['view_schedule','manage_schedule','review_requests','publish_materials']) c),'the owner holds every Work Mission capability');
select pg_temp.pass(jsonb_array_length(public.worship_workspace_v2()->'manageDepartments')=8,'the owner manages every Worship department');
select pg_temp.pass(public.worship_setup_workspace() ? 'members','the owner opens Worship setup');
select pg_temp.pass((public.gospel_planning_workspace(pg_temp.week())->'me'->>'manager')::boolean,'the owner manages Gospel Planning without a grant');
reset role;
update app_private.role_assignments set ended_at=clock_timestamp() where member_id=pg_temp.owner();
select pg_temp.pass(not pg_temp.manages(pg_temp.home(900),'study-rooms') and pg_temp.has_module(pg_temp.home(900),'study-rooms'),'ending the owner''s administrator appointments ends owner-everywhere management');
update app_private.role_assignments set ended_at=null where member_id=pg_temp.owner();

-- ============================================================================ 1. Open access, per module
select pg_temp.pass((select bool_and(pg_temp.has_module(pg_temp.home(107),module_key)) from app_private.app_modules where status='approved'),'a signed-in member without grants sees every approved app');
select pg_temp.pass((select bool_and(not pg_temp.manages(pg_temp.home(107),module_key)) from app_private.app_modules where status='approved'),'and manages none of them');
select pg_temp.pass((select bool_and(pg_temp.has_module(pg_temp.home(115),module_key)) from app_private.app_modules where status='approved'),'an Unassigned (intake) member also sees every approved app');
insert into app_private.app_modules(module_key,display_name,short_name,description,accent,route_path,status)
 values('draft-example','Draft Example App','Draft','Fictional draft.','#52718c','/modules/draft-example','draft');
select pg_temp.pass(not pg_temp.has_module(pg_temp.home(107),'draft-example') and not pg_temp.has_module(pg_temp.home(900),'draft-example'),'a draft app stays hidden, even from the owner');
select pg_temp.pass(not app_private.module_allowed(pg_temp.m(106),(select id from app_private.app_modules where module_key='study-rooms')),'an inactive former member has no access');
update app_private.account_links set technical_enabled=false where member_id=pg_temp.m(108);
select pg_temp.login(108);
select pg_temp.denied('select app_private.member_module_home()','42501','a suspended account sees no apps');
update app_private.account_links set technical_enabled=true where member_id=pg_temp.m(108);
select pg_temp.login(115);
select pg_temp.pass(app_private.organization_member_id() is null,'an intake member keeps no organizational identity');
select pg_temp.denied($q$select public.member_command('profile.contacts',jsonb_build_object('memberId',pg_temp.m(115),'email','x@example.invalid','reason','Intake change attempt'),gen_random_uuid())$q$,'42501','an intake member still cannot run member commands');

-- Study Rooms: members book under the existing rules; holds and administration stay with managers.
create function pg_temp.reserve(n integer,s integer) returns jsonb language plpgsql as $$
begin perform pg_temp.login(n);return app_private.study_room_command(jsonb_build_object('requestId',gen_random_uuid(),'action','reserve',
 'resourceId','92000000-0000-4000-8000-000000000001','day',((now() at time zone 'America/Los_Angeles')::date+1)::text,'start',s,'end',s+30,'purpose','contact','detail','Private Fictional Detail'));end $$;
select pg_temp.pass((pg_temp.reserve(107,780)->>'ok')::boolean,'an ungranted member books a study room');
select pg_temp.pass((pg_temp.reserve(115,840)->>'ok')::boolean,'an Unassigned member books a study room');
select pg_temp.login(108);
select pg_temp.pass(app_private.study_room_schedule((now() at time zone 'America/Los_Angeles')::date+1)::text not like '%Private Fictional Detail%','another member never sees booking details');
select pg_temp.pass((select bool_and(e->>'label' in ('Reserved','You')) from jsonb_array_elements(app_private.study_room_schedule((now() at time zone 'America/Los_Angeles')::date+1)->'bookings') e),'another group''s bookings show as Reserved');
select pg_temp.denied($q$select app_private.study_room_command(jsonb_build_object('requestId',gen_random_uuid(),'action','hold','resourceId','92000000-0000-4000-8000-000000000002','day',((now() at time zone 'America/Los_Angeles')::date+1)::text,'start',900,'end',930,'reason','Unauthorized hold'))$q$,'42501','a member cannot place a hold');
select pg_temp.denied($q$select public.study_room_admin('{"action":"list"}'::jsonb)$q$,'42501','a member cannot open Study Rooms administration');

-- Contacts: each member has a private workspace of their own; nobody reads another's records.
select pg_temp.login(107);
select pg_temp.pass((public.contacts_workspace_r3(null)->>'can_create')::boolean,'a member gets their own Contacts workspace');
select pg_temp.pass((public.contacts_command_r3('c0000000-0000-4000-8000-000000000107',0,gen_random_uuid(),'create','{"name":"Fictional Contact"}')->>'version')='1','a member creates a private contact');
select pg_temp.login(108);
select pg_temp.pass(jsonb_array_length(public.contacts_workspace_r3(null)->'contacts')=0,'another member''s workspace is empty');
select pg_temp.denied($q$select public.contacts_detail_r3('c0000000-0000-4000-8000-000000000107')$q$,'42501','another member cannot open the contact');
select pg_temp.denied($q$select public.contacts_command_r3('c0000000-0000-4000-8000-000000000107',1,gen_random_uuid(),'edit','{"name":"Taken over"}')$q$,'42501','another member cannot change the contact');
select pg_temp.login(900);
select pg_temp.pass(public.contacts_workspace_r3(null)::text not like '%Fictional Contact%','even the owner does not see a member''s private contacts');
select pg_temp.login(115);
select pg_temp.pass(jsonb_array_length(public.contacts_workspace_r3(null)->'contacts')=0,'an Unassigned member gets an empty private workspace');

-- Continuous Display: members open the app but never reach management, publishing or pairing.
select pg_temp.login(107);
select pg_temp.denied('select public.display_management_state()','42501','a member cannot read display management');
select pg_temp.denied($q$select public.display_create_screen('Member Screen')$q$,'42501','a member cannot create a screen');
reset role;
insert into app_private.module_access_grants(member_id,module_id,permission,reason)
 select pg_temp.m(103),id,'manager','Fictional display manager grant' from app_private.app_modules where module_key='continuous-display';
select pg_temp.settle();
select pg_temp.login(103);
select pg_temp.pass(jsonb_array_length(public.display_management_state()->'screens')=0,'an explicit manager sees only screens they hold permissions for');
select pg_temp.denied($q$select public.display_create_screen('Manager Screen')$q$,'42501','screen creation stays with the owner');

-- Work Mission Prayer: member view only.
select pg_temp.pass((select mpg_private.allowed(id,'view_schedule',pg_temp.m(107)) and mpg_private.allowed(id,'join_gathering',pg_temp.m(107)) and mpg_private.allowed(id,'view_materials',pg_temp.m(107)) from mpg_private.series),'a member has the member view');
select pg_temp.pass((select not mpg_private.allowed(id,'manage_schedule',pg_temp.m(107)) and not mpg_private.allowed(id,'review_requests',pg_temp.m(107)) and not mpg_private.allowed(id,'volunteer_host',pg_temp.m(107)) and not mpg_private.allowed(id,'publish_materials',pg_temp.m(107)) from mpg_private.series),'a member holds no hosting or management capability');
select pg_temp.login(107);
select pg_temp.pass(jsonb_typeof(public.mpg_live_home((now() at time zone 'America/Los_Angeles')::date,(now() at time zone 'America/Los_Angeles')::date+7))='object','a member opens the Work Mission home');
select pg_temp.denied($q$select public.mpg_bulk_schedule(1,gen_random_uuid(),'[]'::jsonb)$q$,'42501','a member cannot change the schedule');
select pg_temp.denied($q$select public.mpg_owner_roster()$q$,'42501','a member cannot read the roster');

-- Worship Duty: My Duties for members; Manage, Presider and Setup stay role-gated.
select pg_temp.login(107);
select pg_temp.pass(jsonb_array_length(public.worship_workspace_v2()->'manageDepartments')=0,'a member opens My Duties without managing');
select pg_temp.denied($q$select public.worship_batch('{"op":"batch","changes":[{"serviceId":"00000000-0000-4000-8000-000000000001","dutyId":"usher_1","memberId":null,"expectedVersion":0}]}'::jsonb)$q$,'42501','a member cannot assign duties');
select pg_temp.denied($q$select public.worship_setup_workspace()$q$,'42501','a member cannot open Worship setup');
select pg_temp.denied($q$select public.worship_lookup('{"kind":"candidates","serviceId":"00000000-0000-4000-8000-000000000001","dutyId":"usher_1"}'::jsonb)$q$,'42501','a member cannot list duty candidates');
select pg_temp.pass(not app_private.worship_can_plan(pg_temp.m(107),'00000000-0000-4000-8000-000000000001'),'a member is not a presider or song planner');
select pg_temp.login(900);
select pg_temp.pass((select bool_and(not (e->>'hasAccess')::boolean) from jsonb_array_elements(public.worship_setup_workspace()->'members') e),'Worship setup reports explicit participation grants, not open use');

-- Gospel Planning: members open it; managing stays with grants and the owner.
select pg_temp.pass((pg_temp.ws(107)->'me'->>'placed')::boolean and not (pg_temp.ws(107)->'me'->>'manager')::boolean and pg_temp.ws(107)->'manage'='null'::jsonb,'an ungranted member opens Gospel Planning without setup tools');
select pg_temp.pass(not (pg_temp.ws(115)->'me'->>'placed')::boolean and jsonb_array_length(pg_temp.ws(115)->'candidates')=0 and pg_temp.ws(115)->'plan'='null'::jsonb,'an Unassigned member sees the neutral unplaced view');
select pg_temp.gp_fails(115,'availability.save','{"expected":0,"ranges":[]}','an Unassigned member cannot write');
select pg_temp.gp_fails(107,'location.add','{"label":"Fictional Place"}','a member cannot add places');
select pg_temp.pass(pg_temp.ws(107)->'updates'='null'::jsonb and (pg_temp.ws(107)->'plan'->'draft')='null'::jsonb,'a member gets no restricted leader sections');

-- ============================================================================ 3. Group-only placement
-- The owner places an Unassigned signup in a group with no unit, from the Unassigned queue.
select pg_temp.pass((pg_temp.owner_cmd('enrollment.assign',jsonb_build_object('memberId',pg_temp.m(110),'groupId','22222222-2222-4222-8222-000000000001','verified','yes','reason','Fictional group-only placement'))->>'unitId') is null,'the owner places a signup in a group without a unit');
select pg_temp.pass((select unit_id is null and group_id='22222222-2222-4222-8222-000000000001' from public.member_placements where member_id=pg_temp.m(110) and ended_at is null)
 and (select status from public.members where id=pg_temp.m(110))='active','the member is active and group-only');
select pg_temp.login(900);
select pg_temp.denied($q$select public.enrollment_command('enrollment.assign',jsonb_build_object('memberId',pg_temp.m(115),'groupId','22222222-2222-4222-8222-000000000001','unitId','33333333-3333-4333-8333-000000000003','verified','yes','reason','Mismatched unit and group'),gen_random_uuid())$q$,'42501','a unit from another group is rejected');
select pg_temp.denied($q$select public.enrollment_command('enrollment.assign',jsonb_build_object('memberId',pg_temp.m(115),'verified','yes','reason','No destination at all'),gen_random_uuid())$q$,'42501','a group is required');
select pg_temp.denied($q$insert into public.member_placements(member_id,group_id,unit_id) values(pg_temp.m(115),'22222222-2222-4222-8222-000000000001','33333333-3333-4333-8333-000000000003')$q$,'23503','the (unit, group) consistency check still applies when a unit is given');
-- Group leaders see and place their group-only members; unit leaders only see their unit.
select pg_temp.owner_cmd('role.appoint',jsonb_build_object('memberId',pg_temp.m(109),'role','group_leader','groupId','22222222-2222-4222-8222-000000000001','reason','Fictional group A leader'));
select pg_temp.pass(app_private.manages_member(pg_temp.m(109),pg_temp.m(110)),'the group leader manages the group-only member');
select pg_temp.pass(not app_private.manages_member(pg_temp.m(101),pg_temp.m(110)),'a unit leader in that group does not');
select pg_temp.login(109);
select pg_temp.pass('Jade Example'=any(pg_temp.names(app_private.member_workspace()->'managedMembers')),'the group leader sees the group-only member in Members you manage');
select pg_temp.pass((select (e->>'canManage')::boolean from jsonb_array_elements(app_private.member_workspace()->'groups') e where e->>'id'='22222222-2222-4222-8222-000000000001'),'the workspace says the group leader may place members in the group without a unit');
select pg_temp.pass('Jade Example'=any(pg_temp.names(app_private.member_workspace()->'directory')),'the group directory lists the group-only member');
select pg_temp.login(101);
select pg_temp.pass(not('Jade Example'=any(pg_temp.names(app_private.member_workspace()->'managedMembers'))),'the unit leader does not see the group-only member');
select pg_temp.pass(not (select (e->>'canManage')::boolean from jsonb_array_elements(app_private.member_workspace()->'groups') e where e->>'id'='22222222-2222-4222-8222-000000000001'),'the unit leader cannot place members without a unit');
select pg_temp.denied($q$select public.member_command('member.create',jsonb_build_object('name','Group Only Attempt','groupId','22222222-2222-4222-8222-000000000001','reason','Unit leader group-only attempt'),gen_random_uuid())$q$,'42501','a unit leader cannot create a group-only member');
select pg_temp.pass((pg_temp.cmd(109,'member.create',jsonb_build_object('name','Pia Example','groupId','22222222-2222-4222-8222-000000000001','reason','Fictional group-only member'))->>'ok')::boolean,'the group leader creates a group-only member');
select pg_temp.pass((pg_temp.cmd(109,'member.move',jsonb_build_object('memberId',pg_temp.m(110),'unitId','33333333-3333-4333-8333-000000000002','reason','Fictional move into a unit'))->>'ok')::boolean,'the group leader moves the group-only member into a unit');
select pg_temp.pass((pg_temp.cmd(109,'member.move',jsonb_build_object('memberId',pg_temp.m(110),'groupId','22222222-2222-4222-8222-000000000001','reason','Fictional move back to group only'))->>'ok')::boolean,'and back to group-only');
select pg_temp.denied($q$select pg_temp.cmd(109,'member.move',jsonb_build_object('memberId',pg_temp.m(110),'groupId','22222222-2222-4222-8222-000000000001','reason','Unchanged placement attempt'))$q$,'22023','an unchanged group-only placement is rejected');
select pg_temp.pass((select count(*)=3 from public.member_placements where member_id=pg_temp.m(110)),'placement history is retained');
-- Row policy: the group leader reads the group-only placement row; the unit leader does not.
select pg_temp.login(109);set local role authenticated;
select pg_temp.pass(exists(select 1 from public.member_placements where member_id=pg_temp.m(110) and ended_at is null),'the group leader reads the group-only placement through row security');
reset role;select pg_temp.login(101);set local role authenticated;
select pg_temp.pass(not exists(select 1 from public.member_placements where member_id=pg_temp.m(110)),'the unit leader cannot read it');
reset role;
-- Cross-group transfer to a group-only destination.
select pg_temp.cmd(109,'transfer.request',jsonb_build_object('memberId',pg_temp.m(110),'groupId','22222222-2222-4222-8222-000000000002','reason','Fictional transfer to group B'));
select pg_temp.login(103);
select pg_temp.pass((select e->>'groupId'='22222222-2222-4222-8222-000000000002' and e->>'unitId' is null from jsonb_array_elements(app_private.member_workspace()->'transfers') e where e->>'memberId'=pg_temp.m(110)::text),'the receiving leader sees a group-only destination');
select public.member_command('transfer.decide',jsonb_build_object('id',(select e->>'id' from jsonb_array_elements(app_private.member_workspace()->'transfers') e where e->>'memberId'=pg_temp.m(110)::text),'decision','accepted','reason','Receiving group accepts'),gen_random_uuid());
select pg_temp.settle();
select pg_temp.pass((select group_id='22222222-2222-4222-8222-000000000002' and unit_id is null from public.member_placements where member_id=pg_temp.m(110) and ended_at is null),'the transfer lands group-only in group B');
-- Group-only members across modules.
select pg_temp.login(103);
select pg_temp.pass((select e->>'unit'='No unit' from jsonb_array_elements(app_private.study_group_access('{"action":"list"}'::jsonb)->'groups'->0->'members') e where e->>'id'=pg_temp.m(110)::text),'Study Rooms leader view lists the group-only member');
select pg_temp.pass((pg_temp.ws(110)->'me'->>'placed')::boolean and pg_temp.ws(110)->'me'->>'unitId' is null and pg_temp.ws(110)->'me'->>'groupId'='22222222-2222-4222-8222-000000000002','Gospel Planning keeps a group-only member in their group');
select pg_temp.pass('Jade Example'=any(pg_temp.names(pg_temp.ws(103)->'candidates')),'the group leader can plan with the group-only member');
select pg_temp.gp_fails(110,'update.create',jsonb_build_object('week',pg_temp.week(),'unitId','33333333-3333-4333-8333-000000000003','body','x','support','','nextAction',''),'unit-scoped Member Updates do not apply to a group-only member');
select pg_temp.login(110);
select pg_temp.pass(jsonb_typeof(public.worship_workspace_v2()->'services')='array','Worship Duty opens for a group-only member');
select pg_temp.pass((app_private.member_workspace()->'self'->>'unitId') is null and 'Jade Example'=any(pg_temp.names(app_private.member_workspace()->'directory')),'My Group works for a group-only member');

-- ============================================================================ 4. Leadership independent of placement
-- Case 1: Kai (placed A2) is unit leader of A2 and group leader of the Student Brothers group.
-- Case 2: Lena (placed B1) is unit leader of B1 and group leader of the Student Sisters group.
select pg_temp.owner_cmd('role.appoint',jsonb_build_object('memberId',pg_temp.m(111),'role','unit_leader','unitId','33333333-3333-4333-8333-000000000002','reason','Fictional unit leader A2'));
select pg_temp.owner_cmd('role.appoint',jsonb_build_object('memberId',pg_temp.m(111),'role','group_leader','groupId','22222222-2222-4222-8222-000000000003','reason','Fictional Student Brothers leader'));
select pg_temp.owner_cmd('role.appoint',jsonb_build_object('memberId',pg_temp.m(112),'role','unit_leader','unitId','33333333-3333-4333-8333-000000000003','reason','Fictional unit leader B1'));
select pg_temp.owner_cmd('role.appoint',jsonb_build_object('memberId',pg_temp.m(112),'role','group_leader','groupId','22222222-2222-4222-8222-000000000004','reason','Fictional Student Sisters leader'));
select pg_temp.pass(app_private.actor_has(pg_temp.m(111),'group_leader','22222222-2222-4222-8222-000000000003') and app_private.actor_has(pg_temp.m(111),'unit_leader','33333333-3333-4333-8333-000000000002'),'an appointment outside the leader''s own group is effective');
select pg_temp.pass((select group_id from public.member_placements where member_id=pg_temp.m(111) and ended_at is null)='22222222-2222-4222-8222-000000000001','the leader''s own placement is unchanged');
select pg_temp.pass(app_private.manages_member(pg_temp.m(111),pg_temp.m(113)),'Kai manages a member of the group he leads');
select pg_temp.pass(app_private.manages_member(pg_temp.m(111),pg_temp.m(102)),'Kai manages members of the unit he leads');
select pg_temp.pass(not app_private.manages_member(pg_temp.m(111),pg_temp.m(107)),'Kai does not manage another unit of his own group');
select pg_temp.pass(not app_private.manages_member(pg_temp.m(111),pg_temp.m(114)),'Kai does not manage the Student Sisters');
select pg_temp.pass(app_private.manages_member(pg_temp.m(112),pg_temp.m(114)) and app_private.manages_member(pg_temp.m(112),pg_temp.m(108)) and not app_private.manages_member(pg_temp.m(112),pg_temp.m(113)),'Lena manages the Student Sisters and her unit only');
select pg_temp.login(111);
select pg_temp.pass(pg_temp.names(app_private.member_workspace()->'directory')=pg_temp.names((select jsonb_agg(jsonb_build_object('name',m.display_name)) from public.members m join public.member_placements p on p.member_id=m.id and p.ended_at is null where p.group_id='22222222-2222-4222-8222-000000000001' and m.status='active')),'Kai''s own group directory follows his placement');
select pg_temp.pass((pg_temp.cmd(111,'member.create',jsonb_build_object('name','Quin Example','groupId','22222222-2222-4222-8222-000000000003','reason','Fictional Student Brothers member'))->>'ok')::boolean,'Kai places a new member in the group he leads');
select pg_temp.denied($q$select pg_temp.cmd(111,'member.create',jsonb_build_object('name','Outside Attempt','groupId','22222222-2222-4222-8222-000000000004','reason','Outside group attempt'))$q$,'42501','Kai cannot place members in the Student Sisters');
-- Gospel Planning follows the appointment's group.
select pg_temp.pass((select array_agg(e->>'name' order by e->>'name') from jsonb_array_elements(pg_temp.ws(111)->'groups') e)=array['Demo Group A','Demo Student Brothers'],'Kai can open his own group and the group he leads');
select pg_temp.pass(pg_temp.ws(111)->'me'->>'groupId'='22222222-2222-4222-8222-000000000001' and (pg_temp.ws(111)->'me'->>'unitLeader')::boolean and not (pg_temp.ws(111)->'me'->>'groupLeader')::boolean,'in his own group Kai acts as unit leader');
select pg_temp.pass((select array_agg(e->>'id') from jsonb_array_elements(pg_temp.ws(111)->'units') e where (e->>'canWrite')::boolean)=array['33333333-3333-4333-8333-000000000002'],'in his own group Kai writes updates only for his unit');
select pg_temp.pass((pg_temp.ws(111,'22222222-2222-4222-8222-000000000003')->'me'->>'groupLeader')::boolean and pg_temp.ws(111,'22222222-2222-4222-8222-000000000003')->'me'->>'unitId' is null,'in the Student Brothers Kai acts as group leader');
select pg_temp.pass(pg_temp.names(pg_temp.ws(111,'22222222-2222-4222-8222-000000000003')->'candidates')=array['Milo Example'],'Kai sees the Student Brothers members who can sign in, not himself');
select pg_temp.pass((pg_temp.gp(111,'plan.save',jsonb_build_object('week',pg_temp.week(),'expected',0,'review','Fictional review','plan','Fictional plan','nextAction','','groupId','22222222-2222-4222-8222-000000000003'))->>'version')='1','Kai saves the Student Brothers plan');
select pg_temp.pass((pg_temp.ws(111,'22222222-2222-4222-8222-000000000003')->'plan'->'draft'->>'plan')='Fictional plan','the draft belongs to the Student Brothers');
select pg_temp.gp_fails(111,'plan.save',jsonb_build_object('week',pg_temp.week(),'expected',0,'review','x','plan','x','nextAction',''),'Kai cannot edit his own group''s plan as a unit leader');
select pg_temp.gp_fails(111,'plan.save',jsonb_build_object('week',pg_temp.week(),'expected',0,'review','x','plan','x','nextAction','','groupId','22222222-2222-4222-8222-000000000004'),'Kai cannot edit the Student Sisters plan');
select pg_temp.login(111);
select pg_temp.denied($q$select public.gospel_planning_workspace(pg_temp.week(),'22222222-2222-4222-8222-000000000004')$q$,'42501','Kai cannot open the Student Sisters');
select pg_temp.pass(pg_temp.ws(113)::text not like '%Fictional plan%','the unpublished draft stays with leaders');
select pg_temp.pass((pg_temp.gp(112,'plan.save',jsonb_build_object('week',pg_temp.week(),'expected',0,'review','Sisters review','plan','Sisters plan','nextAction','','groupId','22222222-2222-4222-8222-000000000004'))->>'version')='1','Lena saves the Student Sisters plan');
select pg_temp.pass((select bool_and(e->>'id'<>'22222222-2222-4222-8222-000000000003') from jsonb_array_elements(pg_temp.ws(112)->'groups') e),'Lena cannot see the Student Brothers');
-- Study Rooms group access follows the appointment too.
select pg_temp.login(111);
select pg_temp.pass((select array_agg(g->>'name') from jsonb_array_elements(app_private.study_group_access('{"action":"list"}'::jsonb)->'groups') g)=array['Demo Student Brothers'],'Study Rooms Who can book shows the group Kai leads');
-- Organization UI and API: a leader can be appointed from outside the group.
select pg_temp.login(900);
select pg_temp.pass((select count(*) from jsonb_array_elements(public.member_workspace()->'managedMembers') e where e->>'status'='active')>=(select count(*) from public.members where status='active'),'the appointment picker lists every active member');
select pg_temp.denied($q$select public.member_command('role.appoint',jsonb_build_object('memberId',pg_temp.m(107),'role','group_leader','reason','Missing group scope'),gen_random_uuid())$q$,'22023','a group leader appointment must name a group');
reset role;
rollback;
