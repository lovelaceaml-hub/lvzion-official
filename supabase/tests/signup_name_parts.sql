-- Disposable fictional signup identity exercise. Do not run against hosted member data.
begin;
create function pg_temp.parts_ok(v boolean,label text) returns void language plpgsql as $$
begin
 if v is distinct from true then raise exception 'FAIL: %',label;end if;
 raise notice 'PASS: %',label;
end $$;
create function pg_temp.parts_denied(q text,code text,label text) returns void language plpgsql as $$
declare got text;
begin
 begin execute q; exception when others then get stacked diagnostics got=returned_sqlstate;end;
 if got is distinct from code then raise exception 'FAIL: %, expected %, got %',label,code,got;end if;
 raise notice 'PASS: %',label;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('dddddddd-dddd-4ddd-8ddd-000000000011','parts-new@example.invalid',now()),
 ('dddddddd-dddd-4ddd-8ddd-000000000012','parts-old@example.invalid',now()),
 ('dddddddd-dddd-4ddd-8ddd-000000000013','parts-pastor@example.invalid',now()),
 ('dddddddd-dddd-4ddd-8ddd-000000000014','parts-unconfirmed@example.invalid',null);
insert into auth.sessions(id,user_id) select
 ('eeeeeeee-eeee-4eee-8eee-'||lpad(n::text,12,'0'))::uuid,
 ('dddddddd-dddd-4ddd-8ddd-'||lpad(n::text,12,'0'))::uuid
 from generate_series(11,14)n;
update app_private.enrollment_settings set enabled=true,allowed_email_domains=array['example.invalid'];
set local role anon;
select pg_temp.parts_denied(
 $q$select public.complete_self_service_enrollment('Example Person','Example','Person')$q$,
 '42501','anonymous cannot invoke structured enrollment');
select pg_temp.parts_denied(
 $q$select * from app_private.member_signup_names$q$,
 '42501','anonymous cannot query private signup names');
reset role;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-000000000014',true),
 set_config('request.jwt.claims','{"session_id":"eeeeeeee-eeee-4eee-8eee-000000000014"}',true);
set local role authenticated;
select pg_temp.parts_denied(
 $q$select public.complete_self_service_enrollment('Not Confirmed','Not','Confirmed')$q$,
 '42501','unconfirmed account cannot save signup names');
reset role;
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-000000000011',true),
 set_config('request.jwt.claims','{"session_id":"eeeeeeee-eeee-4eee-8eee-000000000011"}',true);
set local role authenticated;
select pg_temp.parts_denied(
 $q$select public.complete_self_service_enrollment('Unmatched Example','María José','de la Cruz')$q$,
 '22023','display name cannot disagree with saved first and last names');
select public.complete_self_service_enrollment('María José de la Cruz','María José','de la Cruz');
select pg_temp.parts_ok(public.member_workspace()->'self'->>'firstName'='María José',
 'a multiword international first name remains intact');
select pg_temp.parts_ok(public.member_workspace()->'self'->>'lastName'='de la Cruz',
 'a multiword last name remains intact');
select pg_temp.parts_ok(public.member_workspace()->'self'->>'name'='María José de la Cruz',
 'joined name continues serving existing member displays');
select pg_temp.parts_ok(public.member_workspace()->'self'->'groupId'='null'::jsonb
 and public.member_workspace()->'self'->'unitId'='null'::jsonb,
 'signup has no synthesized group or unit');
select pg_temp.parts_denied(
 $q$select first_name,last_name from app_private.member_signup_names$q$,
 '42501','even a registered member cannot query the private table');
select public.complete_self_service_enrollment('Different Submitted Name','Different','Submitted Name');
reset role;
select pg_temp.parts_ok(
 (select first_name='María José' and last_name='de la Cruz'
  from app_private.member_signup_names where member_id=(
    select member_id from app_private.self_service_enrollments
    join app_private.member_private_contacts using(member_id)
    where email='parts-new@example.invalid')),
 'repeat signup cannot overwrite already recorded name parts');
select pg_temp.parts_ok((select count(*)=1 from app_private.member_signup_names),
 'signup name persistence is one-row-per-member');
select pg_temp.parts_ok((select count(*)=0 from public.member_placements
 where member_id in (select member_id from app_private.member_signup_names)),
 'separate names grant no organizational placement');
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-000000000012',true),
 set_config('request.jwt.claims','{"session_id":"eeeeeeee-eeee-4eee-8eee-000000000012"}',true);
set local role authenticated;
select public.complete_self_service_enrollment('Legacy Example');
select pg_temp.parts_ok(public.member_workspace()->'self'->'firstName'='null'::jsonb,
 'legacy account remains valid without inferred first name');
select pg_temp.parts_ok(public.member_workspace()->'self'->'lastName'='null'::jsonb,
 'legacy account remains valid without inferred last name');
reset role;
insert into app_private.account_links(member_id,auth_user_id,username)
 values('44444444-4444-4444-8444-000000000105',
 'dddddddd-dddd-4ddd-8ddd-000000000013','name_parts_pastor');
select set_config('request.jwt.claim.sub','dddddddd-dddd-4ddd-8ddd-000000000013',true),
 set_config('request.jwt.claims','{"session_id":"eeeeeeee-eeee-4eee-8eee-000000000013"}',true);
set local role authenticated;
select pg_temp.parts_ok(
 (select count(*) from jsonb_array_elements(public.member_workspace()->'unassignedMembers') item
 where item->>'firstName'='María José' and item->>'lastName'='de la Cruz')=1,
 'authorized pastoral reviewer sees separate submitted names in pending queue');
reset role;
select pg_temp.parts_ok((select count(*)=2 from app_private.self_service_enrollments),
 'legacy and structured signup both have a single enrollment record');
rollback;
