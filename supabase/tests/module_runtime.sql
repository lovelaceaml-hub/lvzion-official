-- Module integration contract; fictional test fixture ONLY, rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at)
 select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,
 'module-'||n||'@example.invalid',now()-interval '3 days'
 from unnest(array[101,103,105,107]) n;
insert into auth.sessions(id,user_id,created_at)
 select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,
 ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,
 now()-interval '1 hour' from unnest(array[101,103,105,107]) n;
insert into app_private.account_links(member_id,auth_user_id,username)
 select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,
 ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,
 'module_'||n from unnest(array[101,103,105,107]) n;

create function pg_temp.login(n integer) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claim.sub','99999999-9999-4999-8999-'||lpad(n::text,12,'0'),true);
 perform set_config('request.jwt.claims',jsonb_build_object(
  'sub','99999999-9999-4999-8999-'||lpad(n::text,12,'0'),
  'session_id','aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0')
 )::text,true);
end $$;
create function pg_temp.pass_if(p boolean,label text) returns void language plpgsql as $$
begin if p is distinct from true then raise exception 'FAIL: %',label;end if;raise notice 'PASS: %',label;end $$;
create function pg_temp.must_fail(p_sql text,p_code text,p_label text) returns void language plpgsql as $$
declare actual text;
begin
 begin execute p_sql;exception when others then get stacked diagnostics actual=returned_sqlstate;end;
 if actual is distinct from p_code then
  raise exception 'FAIL: %, expected %, got %',p_label,p_code,actual;
 end if;raise notice 'PASS: %',p_label;
end $$;

-- Seed two approved modules and one deliberately unapproved draft. Not production data.
insert into app_private.app_modules(id,module_key,display_name,short_name,description,accent,route_path,status,approved_at)
values
 ('77777777-7777-4777-8777-000000000001','sample-a','Example Approved A','A','Fictional approved module used only in disposable tests.','#52718c','/modules/sample-a','approved',now()-interval '2 hours'),
 ('77777777-7777-4777-8777-000000000002','sample-b','Example Approved B','B','Other group fictional test module.','#957344','/modules/sample-b','approved',now()-interval '2 hours'),
 ('77777777-7777-4777-8777-000000000003','sample-draft','Example Draft','D','Unapproved module.','#5f8174','/modules/sample-draft','draft',null);

insert into app_private.module_access_grants(member_id,module_id,permission,granted_at,reason) values
 ('44444444-4444-4444-8444-000000000107','77777777-7777-4777-8777-000000000001','viewer',now()-interval '1 day','Synthetic individual module access'),
 ('44444444-4444-4444-8444-000000000103','77777777-7777-4777-8777-000000000002','viewer',now()-interval '1 day','Synthetic other group access'),
 ('44444444-4444-4444-8444-000000000107','77777777-7777-4777-8777-000000000003','viewer',now()-interval '1 day','Synthetic draft should remain hidden');

insert into app_private.module_activities(id,module_id,recipient_member_id,title,context,begins_at,ends_at,status) values
 ('88888888-8888-4888-8888-000000000001','77777777-7777-4777-8777-000000000001','44444444-4444-4444-8444-000000000107','Example activity A','Scoped fixture',now()+interval '2 days',now()+interval '2 days 1 hour','scheduled'),
 ('88888888-8888-4888-8888-000000000002','77777777-7777-4777-8777-000000000002','44444444-4444-4444-8444-000000000107','Example ungranted data','Must not display',now()+interval '2 days',now()+interval '2 days 1 hour','scheduled'),
 ('88888888-8888-4888-8888-000000000003','77777777-7777-4777-8777-000000000001','44444444-4444-4444-8444-000000000107','Example cancelled','Must not display',now()+interval '1 day',now()+interval '1 day 1 hour','cancelled'),
 ('88888888-8888-4888-8888-000000000004','77777777-7777-4777-8777-000000000002','44444444-4444-4444-8444-000000000103','Example other member','Not for first member',now()+interval '3 days',now()+interval '3 days 1 hour','scheduled');

insert into app_private.module_notices(id,module_id,recipient_member_id,requires_action) values
 ('99999999-9999-4999-8999-000000000001','77777777-7777-4777-8777-000000000001','44444444-4444-4444-8444-000000000107',true),
 ('99999999-9999-4999-8999-000000000002','77777777-7777-4777-8777-000000000002','44444444-4444-4444-8444-000000000107',true),
 ('99999999-9999-4999-8999-000000000003','77777777-7777-4777-8777-000000000002','44444444-4444-4444-8444-000000000103',false);

-- Open access (owner decision 2026-10-24): every approved app appears for every signed-in member.
create function pg_temp.has_module(home jsonb,module_name text) returns boolean language sql as $$
 select exists(select 1 from jsonb_array_elements(home->'modules') e where e->>'name'=module_name)$$;
create function pg_temp.manages(home jsonb,module_name text) returns boolean language sql as $$
 select coalesce((select (e->>'canManage')::boolean from jsonb_array_elements(home->'modules') e where e->>'name'=module_name),false)$$;
select pg_temp.login(107);
set local role authenticated;
select pg_temp.pass_if(pg_temp.has_module(public.member_module_home(),'Example Approved A') and pg_temp.has_module(public.member_module_home(),'Example Approved B'),'every approved module appears for a signed-in member');
select pg_temp.pass_if(not pg_temp.has_module(public.member_module_home(),'Example Draft'),'a draft module stays hidden even with a grant');
select pg_temp.pass_if(not pg_temp.manages(public.member_module_home(),'Example Approved A'),'a viewer grant does not manage');
select pg_temp.pass_if(jsonb_array_length(public.member_module_home()->'activities')=2,'only own scheduled activities from approved modules appear');
select pg_temp.pass_if(not(public.member_module_home()::text like '%Example other member%'),'another member''s activity never appears');
select pg_temp.pass_if(jsonb_array_length(public.member_module_home()->'notifications')=2,'own notices from approved modules appear');
select pg_temp.pass_if(public.member_module_home()->'notifications'->0->>'title' like 'Update available in Example Approved %','notice text is generic');
select pg_temp.pass_if(public.member_module_home()->>'favoriteVersion'='0','initial favorite version is zero');
select pg_temp.must_fail('select * from app_private.app_modules','42501','no direct module catalog access');
select pg_temp.must_fail('select * from app_private.module_activities','42501','no direct activity access');
select pg_temp.must_fail('select * from app_private.module_access_grants','42501','no direct module role access');
select pg_temp.must_fail('select * from app_private.module_notices','42501','no direct notification access');
select pg_temp.must_fail('select * from app_private.member_module_favorites','42501','no direct favorites table access');
select pg_temp.must_fail('select app_private.module_allowed(''44444444-4444-4444-8444-000000000103'',''77777777-7777-4777-8777-000000000002'')','42501','no arbitrary-member authority oracle');
select pg_temp.must_fail('select app_private.module_manager(''44444444-4444-4444-8444-000000000103'',''77777777-7777-4777-8777-000000000002'')','42501','no arbitrary-member manager oracle');
select pg_temp.must_fail($q$select public.save_module_favorites(array['77777777-7777-4777-8777-000000000003'::uuid],0)$q$,'42501','cannot save draft module as favorite');
select pg_temp.must_fail($q$select public.save_module_favorites(array['77777777-7777-4777-8777-000000000001'::uuid,'77777777-7777-4777-8777-000000000001'::uuid],0)$q$,'22023','duplicate favorites rejected');
select pg_temp.pass_if(public.save_module_favorites(array['77777777-7777-4777-8777-000000000001'::uuid],0)->>'favoriteVersion'='1','first save increments favorite version');
select pg_temp.pass_if(jsonb_array_length(public.member_module_home()->'favorites')=1,'favorite visible after save');
select pg_temp.must_fail($q$select public.save_module_favorites('{}'::uuid[],0)$q$,'40001','stale device version is rejected');
select pg_temp.pass_if(public.save_module_favorites('{}'::uuid[],1)->>'favoriteVersion'='2','authorized unpin increments version');
select pg_temp.pass_if(jsonb_array_length(public.member_module_home()->'favorites')=0,'removed favorite no longer visible');
select pg_temp.pass_if(public.mark_module_notice_read('99999999-9999-4999-8999-000000000001')=true,'member may mark own approved module notice read');
select pg_temp.pass_if(exists(select 1 from jsonb_array_elements(public.member_module_home()->'notifications') n where n->>'id'='99999999-9999-4999-8999-000000000001' and n->>'readAt' is not null),'notice read receipt is visible to owner');
select pg_temp.pass_if(public.mark_module_notice_read('99999999-9999-4999-8999-000000000003')=false,'cannot mark other member notice');

reset role;
insert into app_private.module_access_grants(member_id,module_id,permission,granted_at,reason) values
 ('44444444-4444-4444-8444-000000000105','77777777-7777-4777-8777-000000000002','manager',now()-interval '1 day','Synthetic explicit manager grant');
select pg_temp.login(103);
set local role authenticated;
select pg_temp.pass_if(pg_temp.has_module(public.member_module_home(),'Example Approved A'),'other group user also sees every approved module');
select pg_temp.pass_if(jsonb_array_length(public.member_module_home()->'activities')=1,'other group user sees only own activity');
select pg_temp.pass_if(public.mark_module_notice_read('99999999-9999-4999-8999-000000000001')=false,'other member cannot modify first user notice');
reset role;
select pg_temp.login(101);
set local role authenticated;
select pg_temp.pass_if(pg_temp.has_module(public.member_module_home(),'Example Approved B') and not pg_temp.manages(public.member_module_home(),'Example Approved B'),'unit leader uses apps but gains no manager permission');
reset role;
select pg_temp.login(105);
set local role authenticated;
select pg_temp.pass_if(pg_temp.manages(public.member_module_home(),'Example Approved B') and not pg_temp.manages(public.member_module_home(),'Example Approved A'),'an explicit manager grant manages only its own app');
reset role;
-- Ending an explicit viewer grant leaves open use access; suspending the account removes every app.
update app_private.module_access_grants set ended_at=clock_timestamp()
where member_id='44444444-4444-4444-8444-000000000107' and module_id='77777777-7777-4777-8777-000000000001';
select pg_temp.login(107);
set local role authenticated;
select pg_temp.pass_if(pg_temp.has_module(public.member_module_home(),'Example Approved A'),'ending a viewer grant keeps open use access');
reset role;
update app_private.account_links set technical_enabled=false where member_id='44444444-4444-4444-8444-000000000107';
select pg_temp.login(107);
set local role authenticated;
select pg_temp.must_fail('select public.member_module_home()','42501','a suspended account loses every app, activity and notice');
select pg_temp.must_fail($q$select public.save_module_favorites(array['77777777-7777-4777-8777-000000000001'::uuid],2)$q$,'42501','a suspended account cannot save favorites');
reset role;
set local role anon;
select pg_temp.must_fail('select public.member_module_home()','42501','anonymous cannot call module workspace');
select pg_temp.must_fail($q$select public.save_module_favorites('{}'::uuid[],0)$q$,'42501','anonymous cannot update favorites');
reset role;
select pg_temp.pass_if((select count(*)=6 from pg_tables where schemaname='app_private' and tablename in
 ('app_modules','module_access_grants','member_module_favorites','module_activities','module_notices','module_notification_preferences') and rowsecurity),'all six module tables enforce RLS');
rollback;
