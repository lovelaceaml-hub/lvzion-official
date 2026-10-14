-- Disposable database ONLY, before the fictional member seed. Entire test rolls back.
begin;
insert into auth.users(id,email,email_confirmed_at) values('bbbbbbbb-bbbb-4bbb-8bbb-000000000001','bootstrap@example.invalid',now()),('bbbbbbbb-bbbb-4bbb-8bbb-000000000002','unverified@example.invalid',null);
create function pg_temp.assert_ok(v boolean,label text) returns void language plpgsql as $$ begin if v is distinct from true then raise exception 'FAIL: %',label;end if;raise notice 'PASS: %',label;end $$;
create function pg_temp.assert_denied(statement text,code text,label text) returns void language plpgsql as $$declare actual text;begin begin execute statement;exception when others then get stacked diagnostics actual=returned_sqlstate;end;if actual is distinct from code then raise exception 'FAIL: %, expected %, got %',label,code,actual;end if;raise notice 'PASS: %',label;end $$;
set local role authenticated;
select pg_temp.assert_denied($q$select public.bootstrap_foundation('bbbbbbbb-bbbb-4bbb-8bbb-000000000001','Demo Owner','demo_owner','Demo Category','Demo Group','Demo Unit',array['member_administrator'],'Verified fictional operator bootstrap')$q$,'42501','browser role cannot bootstrap');
reset role;set local role service_role;
select pg_temp.assert_denied($q$select public.bootstrap_foundation('bbbbbbbb-bbbb-4bbb-8bbb-000000000002','Demo Owner','demo_owner','Demo Category','Demo Group','Demo Unit',array['member_administrator'],'Verified fictional operator bootstrap')$q$,'42501','bootstrap refuses unverified Auth identity');
select public.bootstrap_foundation('bbbbbbbb-bbbb-4bbb-8bbb-000000000001','Demo Owner','demo_owner','Demo Category','Demo Group','Demo Unit',array['member_administrator','technical_admin','department_administrator'],'Verified fictional operator bootstrap');
select pg_temp.assert_denied($q$select public.bootstrap_foundation('bbbbbbbb-bbbb-4bbb-8bbb-000000000001','Second Owner','second_owner','Demo Category','Demo Group','Demo Unit',array['member_administrator'],'Verified fictional operator bootstrap')$q$,'42501','bootstrap cannot run twice');
reset role;
select pg_temp.assert_ok((select count(*)=1 from public.members),'bootstrap creates exactly one person');
select pg_temp.assert_ok((select count(*)=1 from public.member_placements),'bootstrap creates exactly one primary placement');
select pg_temp.assert_ok((select count(*)=3 from app_private.role_assignments),'bootstrap assigns only three explicitly chosen independent roles');
select pg_temp.assert_ok((select count(*)=1 from app_private.audit_events where operation='foundation.bootstrap'),'bootstrap is audited once');
select pg_temp.assert_ok((select count(*)=1 from app_private.account_links),'bootstrap links the verified identity');
set constraints all immediate;
rollback;
