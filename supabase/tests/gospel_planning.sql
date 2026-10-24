-- Disposable Groups & Gospel Planning permission regressions. Fictional members only. All writes ROLLBACK.
-- Seed: group A units A1/A2, group B unit B1. 101 Ava unit leader A1; 102 Ben A2; 103 Cara group leader B;
-- 104 Devin technical admin (B); 105 Eira pastoral staff (A1); 106 inactive; 107 Gina A1; 108 Hugo B1; 109 Isla A2.
begin;
insert into auth.users(id,email,email_confirmed_at)
 select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'gospel-'||n||'@example.invalid',now()-interval '1 day' from generate_series(101,109)n;
insert into auth.sessions(id,user_id,created_at)
 select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 hour' from generate_series(101,109)n;
insert into app_private.account_links(member_id,auth_user_id,username)
 select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'gospel_'||n from generate_series(101,109)n;
create function pg_temp.m(n integer) returns uuid language sql immutable as $$select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.login(n integer) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claim.sub','99999999-9999-4999-8999-'||lpad(n::text,12,'0'),true);
 perform set_config('request.jwt.claims',jsonb_build_object('session_id','aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::text,true);
end $$;
create function pg_temp.pass(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label;end if;raise notice 'GP PASS: %',label;end $$;
create function pg_temp.cmd(n integer,act text,payload jsonb,rid uuid default gen_random_uuid()) returns jsonb language plpgsql as $$
begin perform pg_temp.login(n);return public.gospel_planning_command(act,payload,rid);end $$;
create function pg_temp.ws(n integer,week date default (date_trunc('week',(now() at time zone 'America/Los_Angeles')::date+3))::date) returns jsonb language plpgsql as $$
begin perform pg_temp.login(n);return public.gospel_planning_workspace(week);end $$;
-- Expects the exact error message code; the transaction state is restored by the subtransaction.
create function pg_temp.fails(n integer,act text,payload jsonb,expected text,label text) returns void language plpgsql as $$
declare msg text;
begin
 begin perform pg_temp.cmd(n,act,payload);exception when others then msg:=sqlerrm;end;
 if msg is distinct from expected then raise exception 'FAIL: % expected % got %',label,expected,coalesce(msg,'success');end if;
 raise notice 'GP PASS: %',label;
end $$;
create function pg_temp.ws_fails(n integer,label text) returns void language plpgsql as $$
declare msg text;
begin
 begin perform pg_temp.ws(n);exception when others then msg:=sqlerrm;end;
 if msg is distinct from 'GP_DENIED' then raise exception 'FAIL: % got %',label,coalesce(msg,'success');end if;
 raise notice 'GP PASS: %',label;
end $$;
create function pg_temp.day(offset_days integer) returns text language sql stable as $$
 select to_char((now() at time zone 'America/Los_Angeles')::date+offset_days,'YYYY-MM-DD') $$;
create function pg_temp.week() returns text language sql stable as $$
 select to_char(date_trunc('week',(now() at time zone 'America/Los_Angeles')::date+3)::date,'YYYY-MM-DD') $$;
create function pg_temp.session_payload(a integer,b integer,offset_days integer,from_time text,to_time text) returns jsonb language sql stable as $$
 select jsonb_build_object('date',pg_temp.day(offset_days),'from',from_time,'to',to_time,
  'locationId',(select id from gp_private.locations where active order by label limit 1),
  'participants',jsonb_build_array(pg_temp.m(a),pg_temp.m(b))) $$;
create function pg_temp.has_session(ws jsonb,id text) returns boolean language sql immutable as $$
 select exists(select 1 from jsonb_array_elements(ws->'sessions') e where e->>'id'=id) $$;
create function pg_temp.session(ws jsonb,id text) returns jsonb language sql immutable as $$
 select e from jsonb_array_elements(ws->'sessions') e where e->>'id'=id $$;

-- Planning week: the week containing the first fictional session, three days ahead.
-- Group A leader and fictional access for this test only.
insert into app_private.role_assignments(member_id,role_key,group_id,appointed_at)
 values(pg_temp.m(109),'group_leader','22222222-2222-4222-8222-000000000001',now()-interval '1 day');

-- 1. Draft module with no grants: nobody, including leaders, can open it.
select pg_temp.ws_fails(109,'draft module with no grants is closed to a group leader');
select pg_temp.fails(101,'availability.save','{"expected":0,"ranges":[]}','GP_DENIED','draft module rejects writes');
select pg_temp.pass(not has_function_privilege('anon','public.gospel_planning_command(text,jsonb,uuid)','execute'),'anonymous role cannot call the command');
select pg_temp.pass(not has_function_privilege('anon','public.gospel_planning_workspace(date)','execute'),'anonymous role cannot read the workspace');
select pg_temp.pass(not has_schema_privilege('anon','gp_private','usage'),'anonymous role has no private schema access');
select pg_temp.pass((select bool_and(not has_table_privilege('authenticated','gp_private.'||tablename,'select')
  and not has_table_privilege('authenticated','gp_private.'||tablename,'insert')) from pg_tables where schemaname='gp_private'),'members cannot read or write private tables directly');
select pg_temp.pass((select bool_and(rowsecurity) from pg_tables where schemaname='gp_private'),'row level security is on for every private table');
select pg_temp.pass(not has_function_privilege('authenticated','gp_private.capable(uuid,text,uuid,uuid)','execute'),'authority helpers are not callable by members');
select pg_temp.pass((select count(*) from gp_private.locations)=0 and (select count(*) from gp_private.capability_grants)=0
 and (select status from app_private.app_modules where module_key='gospel-planning')='draft','migration seeds no places, roles or approval');

-- Approve in this disposable database and grant fictional access. 108 Hugo manages the module.
update app_private.app_modules set status='approved',approved_at=now() where module_key='gospel-planning';
insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_at)
 select pg_temp.m(n),'a7000000-0000-4000-8000-000000000001',case n when 108 then 'manager' else 'viewer' end,'Fictional test access',now()-interval '1 hour'
 from unnest(array[101,102,103,105,107,108,109]) n;

-- The real browser role reaches the workspace only through the public wrapper.
select pg_temp.login(107);
set role authenticated;
select pg_temp.pass((public.gospel_planning_workspace((select date_trunc('week',(now() at time zone 'America/Los_Angeles')::date)::date))->'me'->>'name')='Gina Example','authenticated role reads through the public wrapper');
do $$ begin perform 1 from gp_private.sessions;raise exception 'FAIL: private table readable';
exception when insufficient_privilege then raise notice 'GP PASS: authenticated role cannot select private tables';end $$;
reset role;

-- 2. Identity, own-group projection and absent ministry access.
select pg_temp.pass((pg_temp.ws(107)->'me'->>'name')='Gina Example','member identity comes from the session');
select pg_temp.pass((select array_agg(e->>'name' order by e->>'name') from jsonb_array_elements(pg_temp.ws(107)->'candidates') e)
 =array['Ava Example','Ben Example','Eira Example','Gina Example','Isla Example'],'partner list is own group names with access only');
select pg_temp.pass(pg_temp.ws(107)->'updates'='null'::jsonb and pg_temp.ws(107)->'reviewers'='null'::jsonb and pg_temp.ws(107)->'weekSummary'='null'::jsonb,'ordinary member gets no restricted leader sections');
select pg_temp.pass((pg_temp.ws(107)->'plan'->'draft')='null'::jsonb,'ordinary member gets no plan draft');
select pg_temp.pass(pg_temp.ws(104)->'manage'='null'::jsonb and not (pg_temp.ws(104)->'me'->>'manager')::boolean,'signed-in technical administrator opens the app (open access) without setup tools');
select pg_temp.ws_fails(106,'inactive member is denied');
select pg_temp.pass((pg_temp.ws(108)->'me'->>'manager')::boolean and pg_temp.ws(108)->'manage' is not null,'module manager sees setup tools');
select pg_temp.pass(pg_temp.ws(109)->'manage'='null'::jsonb,'group leader without manager grant gets no setup tools');
select pg_temp.pass((select bool_and(e->>'id'<>pg_temp.m(106)::text) from jsonb_array_elements(pg_temp.ws(108)->'manage'->'members') e),'manager list covers only active members with access');

-- 3. Manager setup: places and Gospel roles.
select pg_temp.fails(107,'location.add','{"label":"Fictional Library Lobby"}','GP_DENIED','member cannot add places');
select pg_temp.fails(109,'location.add','{"label":"Fictional Library Lobby"}','GP_DENIED','group leader without manager grant cannot add places');
select pg_temp.pass((pg_temp.cmd(108,'location.add','{"label":"Fictional Library Lobby"}')->>'version')='1','manager adds an approved place');
select pg_temp.cmd(108,'location.add','{"label":"Fictional Park Pavilion"}');
select pg_temp.fails(108,'capability.grant',jsonb_build_object('memberId',pg_temp.m(107),'capability','publish'),'GP_DENIED','publisher must be a current group leader');
select pg_temp.cmd(108,'capability.grant',jsonb_build_object('memberId',pg_temp.m(109),'capability','publish'));
select pg_temp.fails(108,'capability.grant',jsonb_build_object('memberId',pg_temp.m(109),'capability','publish'),'GP_STALE','duplicate role grant is rejected');
select pg_temp.cmd(108,'capability.grant',jsonb_build_object('memberId',pg_temp.m(105),'capability','oversee','groupId','22222222-2222-4222-8222-000000000001'));
select pg_temp.fails(108,'capability.grant',jsonb_build_object('memberId',pg_temp.m(106),'capability','oversee','groupId','22222222-2222-4222-8222-000000000001'),'GP_DENIED','role needs an active member with access');
select pg_temp.pass((pg_temp.ws(109)->'me'->>'publisher')::boolean and (pg_temp.ws(105)->'me'->>'overseer')::boolean,'granted roles are effective');
select pg_temp.pass(not exists(select 1 from information_schema.columns where table_schema='gp_private' and table_name in ('audit','receipts') and column_name in ('body','note','support','review','plan')),'audit and receipts store no note text');

-- 4. Availability as a few ranges.
select pg_temp.pass((pg_temp.cmd(107,'availability.save',jsonb_build_object('expected',0,'ranges',jsonb_build_array(
 jsonb_build_object('date',pg_temp.day(3),'from','09:00','to','13:00','repeatWeeks',2,'skip','[]'::jsonb))))->>'version')='1','member saves a repeating range');
select pg_temp.pass(jsonb_array_length(pg_temp.ws(107)->'availability'->'windows')=2,'a two-week range expands to two windows');
select pg_temp.fails(107,'availability.save',jsonb_build_object('expected',0,'ranges','[]'::jsonb),'GP_STALE','stale availability save is rejected');
select pg_temp.fails(107,'availability.save',jsonb_build_object('expected',1,'ranges',jsonb_build_array(
 jsonb_build_object('date',pg_temp.day(3),'from','09:00','to','11:00','repeatWeeks',1,'skip','[]'::jsonb),
 jsonb_build_object('date',pg_temp.day(3),'from','10:00','to','12:00','repeatWeeks',1,'skip','[]'::jsonb))),'GP_AVAILABILITY_OVERLAP','overlapping ranges are rejected');
select pg_temp.fails(107,'availability.save',jsonb_build_object('expected',1,'ranges',jsonb_build_array(
 jsonb_build_object('date',pg_temp.day(3),'from','11:00','to','10:00','repeatWeeks',1,'skip','[]'::jsonb))),'GP_INVALID_TIME','end before start is rejected');
select pg_temp.fails(107,'availability.save',jsonb_build_object('expected',1,'ranges','[]'::jsonb,'memberId',pg_temp.m(102)),'GP_INVALID','client actor field is rejected');
select pg_temp.cmd(102,'availability.save',jsonb_build_object('expected',0,'ranges',jsonb_build_array(
 jsonb_build_object('date',pg_temp.day(3),'from','08:00','to','12:00','repeatWeeks',1,'skip','[]'::jsonb))));
select pg_temp.pass(jsonb_array_length(pg_temp.ws(107)->'availability'->'windows')=2 and pg_temp.ws(107)::text not like '%'||(select to_jsonb(lower(w))#>>'{}' from gp_private.availability x,unnest(x.windows) w where x.member_id=pg_temp.m(102))||'%','another member''s availability is not returned');
do $$ declare msg text;begin
 begin perform gp_private.local_instant('2027-03-14','"02:30"');exception when others then msg:=sqlerrm;end;
 perform pg_temp.pass(msg='GP_CLOCK_CHANGE','a skipped spring-forward time is rejected');msg:=null;
 begin perform gp_private.local_instant('2026-11-01','"01:30"');exception when others then msg:=sqlerrm;end;
 perform pg_temp.pass(msg='GP_CLOCK_CHANGE','a repeated fall-back time is rejected');
 perform pg_temp.pass(gp_private.local_instant('2026-11-01','"03:00"')='2026-11-01 11:00:00+00','standard time converts from Las Vegas wall time');
 perform pg_temp.pass(upper(gp_private.local_range('2026-10-28','"10:00"','"11:00"'))=lower(gp_private.local_range('2026-10-28','"11:00"','"12:00"'))
  and not (gp_private.local_range('2026-10-28','"10:00"','"11:00"') && gp_private.local_range('2026-10-28','"11:00"','"12:00"')),'back-to-back intervals do not overlap');
end $$;

-- 5. Manual session: proposal, scope and publication.
create temp table t(k text primary key,v text);
grant all on t to public;
insert into t select 's1',pg_temp.cmd(107,'session.create',pg_temp.session_payload(107,102,3,'10:00','11:00'))->>'id';
select pg_temp.pass((pg_temp.session(pg_temp.ws(107),(select v from t where k='s1'))->>'phase')='proposal','member-created session starts as a proposal');
select pg_temp.pass(pg_temp.has_session(pg_temp.ws(102),(select v from t where k='s1')),'named partner sees the proposal');
select pg_temp.pass((select bool_and(e->>'response'='pending') from jsonb_array_elements(pg_temp.session(pg_temp.ws(107),(select v from t where k='s1'))->'participants') e),'naming partners does not create acceptance');
select pg_temp.pass(not pg_temp.has_session(pg_temp.ws(101),(select v from t where k='s1')),'unit leader cannot see a session outside their unit');
select pg_temp.pass(pg_temp.has_session(pg_temp.ws(109),(select v from t where k='s1')),'group leader sees sessions in their group');
select pg_temp.pass(not pg_temp.has_session(pg_temp.ws(103),(select v from t where k='s1')),'other group leader cannot see the session');
select pg_temp.pass(not pg_temp.has_session(pg_temp.ws(105),(select v from t where k='s1')),'overseer gets no session access from the oversee role');
select pg_temp.fails(107,'session.create',pg_temp.session_payload(107,108,4,'10:00','11:00'),'GP_DENIED','cross-group partner is denied');
select pg_temp.fails(107,'session.create',pg_temp.session_payload(102,109,4,'10:00','11:00'),'GP_DENIED','member cannot plan a session for others');
select pg_temp.fails(107,'session.create',pg_temp.session_payload(107,102,-1,'10:00','11:00'),'GP_INVALID_TIME','past session is rejected');
select pg_temp.fails(107,'session.publish',jsonb_build_object('id',(select v from t where k='s1'),'expected',1),'GP_DENIED','member cannot publish their own proposal');
select pg_temp.fails(101,'session.publish',jsonb_build_object('id',(select v from t where k='s1'),'expected',1),'GP_DENIED','unit leader cannot publish outside their unit');
select pg_temp.fails(102,'session.respond',jsonb_build_object('id',(select v from t where k='s1'),'expected',1,'expectedResponse',0,'response','accepted'),'GP_CLOSED','a proposal cannot be accepted before publication');
select pg_temp.fails(109,'session.publish',jsonb_build_object('id',(select v from t where k='s1'),'expected',2),'GP_STALE','publication needs the current version');
select pg_temp.cmd(109,'session.publish',jsonb_build_object('id',(select v from t where k='s1'),'expected',1));
select pg_temp.pass((pg_temp.session(pg_temp.ws(102),(select v from t where k='s1'))->>'phase')='published','leader publishes within their group');
insert into t select 's2',pg_temp.cmd(101,'session.create',pg_temp.session_payload(101,107,5,'10:00','11:00'))->>'id';
select pg_temp.cmd(101,'session.publish',jsonb_build_object('id',(select v from t where k='s2'),'expected',1));
select pg_temp.pass((pg_temp.session(pg_temp.ws(107),(select v from t where k='s2'))->>'phase')='published','unit leader publishes inside their unit');

-- 6. Responses, overlap and revision-aware reconfirmation.
insert into t select 's3',pg_temp.cmd(109,'session.create',pg_temp.session_payload(109,102,3,'10:30','11:30'))->>'id';
select pg_temp.cmd(109,'session.publish',jsonb_build_object('id',(select v from t where k='s3'),'expected',1));
select pg_temp.cmd(102,'session.respond',jsonb_build_object('id',(select v from t where k='s1'),'expected',1,'expectedResponse',0,'response','accepted'));
select pg_temp.cmd(107,'session.respond',jsonb_build_object('id',(select v from t where k='s1'),'expected',1,'expectedResponse',0,'response','accepted'));
select pg_temp.fails(107,'session.respond',jsonb_build_object('id',(select v from t where k='s1'),'expected',1,'expectedResponse',0,'response','declined'),'GP_STALE_RESPONSE','stale response revision is rejected');
select pg_temp.pass((select count(*)=2 from gp_private.commitments where session_id=(select v from t where k='s1')::uuid),'two acceptances create two commitments');
select pg_temp.pass((select bool_and(e->>'response'='accepted') from jsonb_array_elements(pg_temp.session(pg_temp.ws(107),(select v from t where k='s1'))->'participants') e),'both partners show as confirmed');
select pg_temp.fails(102,'session.respond',jsonb_build_object('id',(select v from t where k='s3'),'expected',1,'expectedResponse',0,'response','accepted'),'GP_OVERLAP','a member cannot accept two overlapping sessions');
select pg_temp.fails(109,'session.create',pg_temp.session_payload(109,102,3,'10:15','10:45'),'GP_OVERLAP','manual planning does not bypass overlap checks');
insert into t select 's4',pg_temp.cmd(109,'session.create',pg_temp.session_payload(109,102,3,'11:00','12:00'))->>'id';
select pg_temp.cmd(109,'session.publish',jsonb_build_object('id',(select v from t where k='s4'),'expected',1));
select pg_temp.pass((pg_temp.cmd(102,'session.respond',jsonb_build_object('id',(select v from t where k='s4'),'expected',1,'expectedResponse',0,'response','accepted'))->>'version')='1','back-to-back session can be accepted');
select pg_temp.cmd(109,'session.revise',pg_temp.session_payload(107,102,3,'09:00','10:00')||jsonb_build_object('id',(select v from t where k='s1'),'expected',1));
select pg_temp.pass((pg_temp.session(pg_temp.ws(107),(select v from t where k='s1'))->>'phase')='proposal'
 and (select bool_and(e->>'response'='pending' and (e->>'reconfirm')::boolean) from jsonb_array_elements(pg_temp.session(pg_temp.ws(107),(select v from t where k='s1'))->'participants') e),'time change returns to proposal and asks both to reconfirm');
select pg_temp.pass((select count(*)=2 from gp_private.commitments where session_id=(select v from t where k='s1')::uuid and session_version=1),'old commitments stay held until each partner responds');
select pg_temp.pass((select count(*)=2 from gp_private.response_history where session_id=(select v from t where k='s1')::uuid),'response history is retained across the revision');
select pg_temp.fails(102,'session.respond',jsonb_build_object('id',(select v from t where k='s1'),'expected',1,'expectedResponse',0,'response','accepted'),'GP_STALE','response to the old version is rejected');
select pg_temp.fails(107,'session.revise',pg_temp.session_payload(107,102,3,'09:00','10:00')||jsonb_build_object('id',(select v from t where k='s2'),'expected',1),'GP_DENIED','participant who did not create a session cannot change it');

-- 7. Retry receipts.
insert into t values('rid',gen_random_uuid()::text);
select pg_temp.cmd(107,'availability.save',jsonb_build_object('expected',1,'ranges','[]'::jsonb),(select v from t where k='rid')::uuid);
select pg_temp.pass((pg_temp.cmd(107,'availability.save',jsonb_build_object('expected',1,'ranges','[]'::jsonb),(select v from t where k='rid')::uuid)->>'replayed')::boolean,'retried request returns its receipt');
select pg_temp.pass((select version from gp_private.availability where member_id=pg_temp.m(107))=2,'retry does not apply twice');
do $$ declare msg text;begin
 begin perform pg_temp.cmd(107,'availability.save',jsonb_build_object('expected',2,'ranges','[]'::jsonb),(select v from t where k='rid')::uuid);exception when others then msg:=sqlerrm;end;
 perform pg_temp.pass(msg='GP_RETRY_CONFLICT','a reused request id with changed content is rejected');
end $$;

-- 8. One shared result per session.
insert into t select 's5',pg_temp.cmd(107,'session.create',pg_temp.session_payload(107,101,6,'10:00','11:00'))->>'id';
select pg_temp.cmd(101,'session.publish',jsonb_build_object('id',(select v from t where k='s5'),'expected',1));
select pg_temp.cmd(107,'session.respond',jsonb_build_object('id',(select v from t where k='s5'),'expected',1,'expectedResponse',0,'response','accepted'));
select pg_temp.cmd(101,'session.respond',jsonb_build_object('id',(select v from t where k='s5'),'expected',1,'expectedResponse',0,'response','accepted'));
select pg_temp.fails(107,'report.save',jsonb_build_object('id',(select v from t where k='s5'),'expected',1,'expectedReport',0,'outcome','completed','note',''),'GP_CLOSED','result waits until the session ends');
update gp_private.sessions set starts_at=now()-interval '3 hours',ends_at=now()-interval '2 hours' where id=(select v from t where k='s5')::uuid;
select pg_temp.cmd(107,'report.save',jsonb_build_object('id',(select v from t where k='s5'),'expected',1,'expectedReport',0,'outcome','completed','note','Fictional shared result'));
select pg_temp.fails(101,'report.save',jsonb_build_object('id',(select v from t where k='s5'),'expected',1,'expectedReport',0,'outcome','completed','note','Duplicate'),'GP_STALE_REPORT','second partner cannot add a duplicate result');
select pg_temp.fails(101,'report.save',jsonb_build_object('id',(select v from t where k='s5'),'expected',1,'expectedReport',1,'outcome','not-held','note',''),'GP_INVALID','correction needs a reason');
select pg_temp.cmd(101,'report.save',jsonb_build_object('id',(select v from t where k='s5'),'expected',1,'expectedReport',1,'outcome','completed','note','Fictional corrected result','reason','Fictional time correction'));
select pg_temp.pass((select report_version from gp_private.sessions where id=(select v from t where k='s5')::uuid)=2
 and (select count(*) from gp_private.reports where session_id=(select v from t where k='s5')::uuid)=2,'one canonical result with correction history');
select pg_temp.pass((pg_temp.ws(109,date_trunc('week',((now()-interval '3 hours') at time zone 'America/Los_Angeles'))::date)->'weekSummary'->>'completed')::int=1,'week summary counts the corrected session once');
select pg_temp.fails(107,'session.cancel',jsonb_build_object('id',(select v from t where k='s5'),'expected',1),'GP_CLOSED','a reported session cannot be cancelled');
do $$ declare msg text;begin
 begin update gp_private.reports set note='changed';exception when others then msg:=sqlerrm;end;
 perform pg_temp.pass(msg='GP_IMMUTABLE','result history cannot be rewritten');
end $$;
insert into t select 's6',pg_temp.cmd(109,'session.create',pg_temp.session_payload(109,107,8,'10:00','11:00'))->>'id';
select pg_temp.cmd(109,'session.publish',jsonb_build_object('id',(select v from t where k='s6'),'expected',1));
select pg_temp.cmd(109,'session.respond',jsonb_build_object('id',(select v from t where k='s6'),'expected',1,'expectedResponse',0,'response','accepted'));
update gp_private.sessions set starts_at=now()-interval '5 hours',ends_at=now()-interval '4 hours' where id=(select v from t where k='s6')::uuid;
select pg_temp.fails(107,'report.save',jsonb_build_object('id',(select v from t where k='s6'),'expected',1,'expectedReport',0,'outcome','completed','note',''),'GP_DENIED','a partner who never accepted cannot report a result');
select pg_temp.pass((pg_temp.session(pg_temp.ws(107),(select v from t where k='s6'))->>'phase')='published'
 and pg_temp.session(pg_temp.ws(107),(select v from t where k='s6'))->'report'='null'::jsonb,'missing response does not invent a cancellation or result');

-- 9. Group week: private draft, explicit group-safe publication.
select pg_temp.cmd(109,'plan.save',jsonb_build_object('week',pg_temp.week(),'expected',0,'review','Fictional review v1','plan','Fictional plan v1','nextAction','Fictional next step'));
select pg_temp.pass(pg_temp.ws(107)->'plan'->'published'='null'::jsonb and pg_temp.ws(107)::text not like '%Fictional plan v1%','draft is hidden from members');
select pg_temp.pass((pg_temp.ws(101)->'plan'->'draft'->>'plan')='Fictional plan v1' and not (pg_temp.ws(101)->'plan'->>'canEdit')::boolean,'unit leader reads the draft without editing');
select pg_temp.fails(101,'plan.save',jsonb_build_object('week',pg_temp.week(),'expected',1,'review','x','plan','x','nextAction',''),'GP_DENIED','unit leader cannot edit the group draft');
select pg_temp.fails(107,'plan.save',jsonb_build_object('week',pg_temp.week(),'expected',1,'review','x','plan','x','nextAction',''),'GP_DENIED','member cannot edit the group draft');
select pg_temp.fails(109,'plan.save',jsonb_build_object('week',pg_temp.week(),'expected',1,'review','x','plan','x','nextAction','','groupId','22222222-2222-4222-8222-000000000002'),'GP_DENIED','a group the actor does not lead cannot be named');
select pg_temp.fails(101,'plan.publish',jsonb_build_object('week',pg_temp.week(),'expected',1),'GP_DENIED','unit leader cannot publish the group plan');
select pg_temp.cmd(109,'plan.publish',jsonb_build_object('week',pg_temp.week(),'expected',1));
select pg_temp.pass((pg_temp.ws(107)->'plan'->'published'->>'plan')='Fictional plan v1','members see the published plan');
select pg_temp.cmd(109,'plan.save',jsonb_build_object('week',pg_temp.week(),'expected',1,'review','Fictional review v2','plan','Fictional plan v2','nextAction',''));
select pg_temp.pass((pg_temp.ws(107)->'plan'->'published'->>'plan')='Fictional plan v1','published version stays while a replacement is drafted');
select pg_temp.fails(109,'plan.publish',jsonb_build_object('week',pg_temp.week(),'expected',1),'GP_STALE','stale publish is rejected');
select pg_temp.pass(pg_temp.ws(103)::text not like '%Fictional plan%','other group cannot read this plan');

-- 10. Restricted Member Updates.
insert into t select 'u1',pg_temp.cmd(101,'update.create',jsonb_build_object('week',pg_temp.week(),'unitId','33333333-3333-4333-8333-000000000001',
 'aboutMemberId',pg_temp.m(107),'body','Fictional private update','support','Fictional support','nextAction','Fictional call','assigneeId',pg_temp.m(101)))->>'id';
select pg_temp.fails(101,'update.create',jsonb_build_object('week',pg_temp.week(),'unitId','33333333-3333-4333-8333-000000000002','body','x','support','','nextAction',''),'GP_DENIED','unit leader cannot write for another unit');
select pg_temp.fails(101,'update.create',jsonb_build_object('week',pg_temp.week(),'unitId','33333333-3333-4333-8333-000000000001','body','x','support','','nextAction','','assigneeId',pg_temp.m(107)),'GP_DENIED','next action is assigned only to a leader in scope');
select pg_temp.fails(109,'update.create',jsonb_build_object('week',pg_temp.week(),'unitId','33333333-3333-4333-8333-000000000003','body','x','support','','nextAction',''),'GP_DENIED','group leader cannot write for another group''s unit');
select pg_temp.fails(107,'update.create',jsonb_build_object('week',pg_temp.week(),'unitId','33333333-3333-4333-8333-000000000001','body','x','support','','nextAction',''),'GP_DENIED','member cannot write member updates');
select pg_temp.pass(jsonb_array_length(pg_temp.ws(109)->'updates')=1 and jsonb_array_length(pg_temp.ws(101)->'updates')=1,'group and unit leaders read the update');
select pg_temp.pass(pg_temp.ws(107)::text not like '%Fictional private update%','the member the update is about cannot read it');
select pg_temp.pass(pg_temp.ws(105)::text not like '%Fictional private update%' and pg_temp.ws(102)::text not like '%Fictional private update%','overseer and other members cannot read it');
select pg_temp.pass((pg_temp.ws(107)->'plan'->'published')::text not like '%Fictional private update%','published plan excludes member updates');
select pg_temp.cmd(109,'update.edit',jsonb_build_object('id',(select v from t where k='u1'),'expected',1,'body','Fictional private update','support','','nextAction','','status','done'));
select pg_temp.fails(101,'update.edit',jsonb_build_object('id',(select v from t where k='u1'),'expected',1,'body','x','support','','nextAction','','status','open'),'GP_STALE','stale update edit is rejected');

-- 11. Request for Overseer: requester and assigned reviewer only, with history.
select pg_temp.fails(107,'request.create',jsonb_build_object('week',pg_temp.week(),'reviewerId',pg_temp.m(105),'body','x'),'GP_DENIED','member cannot send an overseer request');
select pg_temp.fails(101,'request.create',jsonb_build_object('week',pg_temp.week(),'reviewerId',pg_temp.m(102),'body','x'),'GP_DENIED','reviewer must hold the oversee role');
insert into t select 'r1',pg_temp.cmd(101,'request.create',jsonb_build_object('week',pg_temp.week(),'reviewerId',pg_temp.m(105),'body','Fictional request'))->>'id';
select pg_temp.pass((select e->>'nextActor' from jsonb_array_elements(pg_temp.ws(105)->'requests') e where e->>'id'=(select v from t where k='r1'))='reviewer','assigned overseer sees the request and acts next');
select pg_temp.pass(pg_temp.ws(109)::text not like '%Fictional request%' and pg_temp.ws(107)::text not like '%Fictional request%','group leader and members cannot read another leader''s request');
select pg_temp.fails(101,'request.respond',jsonb_build_object('id',(select v from t where k='r1'),'expected',1,'decision','answer','body','x'),'GP_DENIED','requester cannot answer their own request');
select pg_temp.cmd(105,'request.respond',jsonb_build_object('id',(select v from t where k='r1'),'expected',1,'decision','clarification','body','Fictional question'));
select pg_temp.fails(105,'request.respond',jsonb_build_object('id',(select v from t where k='r1'),'expected',2,'decision','answer','body','x'),'GP_CLOSED','overseer waits for the requester after asking');
select pg_temp.cmd(101,'request.reply',jsonb_build_object('id',(select v from t where k='r1'),'expected',2,'body','Fictional reply'));
select pg_temp.cmd(105,'request.respond',jsonb_build_object('id',(select v from t where k='r1'),'expected',3,'decision','answer','body','Fictional answer'));
select pg_temp.pass((select jsonb_array_length(e->'events')=4 and e->>'status'='answered' from jsonb_array_elements(pg_temp.ws(101)->'requests') e where e->>'id'=(select v from t where k='r1')),'request keeps its full response history');
update gp_private.capability_grants set ended_at=clock_timestamp() where member_id=pg_temp.m(105) and capability='oversee';
select pg_temp.pass(pg_temp.ws(105)::text not like '%Fictional request%','ending the oversee role removes request access');

-- 12. Revocation, ended roles, transfers.
update app_private.role_assignments set ended_at=clock_timestamp() where member_id=pg_temp.m(101) and role_key='unit_leader';
select pg_temp.pass(pg_temp.ws(101)->'updates'='null'::jsonb and pg_temp.ws(101)::text not like '%Fictional request%','ended unit leader loses updates and requests');
select pg_temp.fails(101,'session.publish',jsonb_build_object('id',(select v from t where k='s2'),'expected',1),'GP_DENIED','ended unit leader cannot publish');
update app_private.role_assignments set ended_at=clock_timestamp() where member_id=pg_temp.m(109) and role_key='group_leader';
select pg_temp.fails(109,'plan.publish',jsonb_build_object('week',pg_temp.week(),'expected',2),'GP_DENIED','publish role lapses with the leadership appointment');
select pg_temp.pass(pg_temp.ws(109)->'plan'->'draft'='null'::jsonb,'ended group leader loses the draft');
-- Open access: ending an explicit viewer grant keeps use; suspending the account closes everything at once.
update app_private.module_access_grants set ended_at=clock_timestamp() where member_id=pg_temp.m(102) and module_id='a7000000-0000-4000-8000-000000000001';
select pg_temp.pass((pg_temp.ws(102)->'me'->>'name')='Ben Example','ending a viewer grant keeps open use access');
update app_private.account_links set technical_enabled=false where member_id=pg_temp.m(102);
select pg_temp.ws_fails(102,'a suspended account closes the workspace');
select pg_temp.fails(102,'session.respond',jsonb_build_object('id',(select v from t where k='s1'),'expected',2,'expectedResponse',0,'response','accepted'),'GP_DENIED','a suspended account blocks a queued action');
update public.member_placements set ended_at=now()-interval '2 seconds' where member_id=pg_temp.m(107) and ended_at is null;
insert into public.member_placements(member_id,group_id,unit_id,started_at) values(pg_temp.m(107),'22222222-2222-4222-8222-000000000002','33333333-3333-4333-8333-000000000003',now()-interval '1 second');
select pg_temp.pass(not pg_temp.has_session(pg_temp.ws(107),(select v from t where k='s5')),'a moved member does not carry old group sessions');
select pg_temp.pass((select historical_group_id from gp_private.reports where session_id=(select v from t where k='s5')::uuid and version=1)='22222222-2222-4222-8222-000000000001','historical result keeps its original group');
select pg_temp.pass(pg_temp.ws(103)::text not like '%Fictional shared result%','the new group does not receive the old result');
select pg_temp.pass(pg_temp.ws(107)::text not like '%Fictional plan%','the new group member does not see the old group plan');
select pg_temp.fails(107,'availability.save',jsonb_build_object('expected',2,'ranges','[]'::jsonb),'GP_STALE','availability from the old placement does not carry over');
rollback;
