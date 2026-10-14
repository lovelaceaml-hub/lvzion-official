-- FICTIONAL DATA ONLY. Disposable, empty development database; never production.
begin;
insert into public.age_categories(id,name) values('11111111-1111-4111-8111-000000000001','Demo Age Category');
insert into public.church_groups(id,age_category_id,name) select ('22222222-2222-4222-8222-'||lpad(n::text,12,'0'))::uuid,'11111111-1111-4111-8111-000000000001','Demo Group '||case n when 1 then 'A' else 'B' end from generate_series(1,2) n;
insert into public.church_units(id,group_id,name) select ('33333333-3333-4333-8333-'||lpad(n::text,12,'0'))::uuid,('22222222-2222-4222-8222-'||lpad((case n when 3 then 2 else 1 end)::text,12,'0'))::uuid,case n when 1 then 'Demo Unit A1' when 2 then 'Demo Unit A2' else 'Demo Unit B1' end from generate_series(1,3) n;
insert into public.members(id,display_name,status) select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,(array['Ava','Ben','Cara','Devin','Eira','Finn','Gina','Hugo','Isla'])[n-100]||' Example',case n when 106 then 'inactive' else 'active' end from generate_series(101,109) n;
insert into public.member_placements(id,member_id,group_id,unit_id,started_at,ended_at)
select ('55555555-5555-4555-8555-'||lpad(n::text,12,'0'))::uuid,('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,
('22222222-2222-4222-8222-'||lpad((case when n in (103,104,106,108) then 2 else 1 end)::text,12,'0'))::uuid,
('33333333-3333-4333-8333-'||lpad((case when n in (103,104,106,108) then 3 when n in (102,109) then 2 else 1 end)::text,12,'0'))::uuid,
now()-interval '10 days',case n when 106 then now()-interval '1 day' end from generate_series(101,109) n;
insert into public.departments(id,name) values('66666666-6666-4666-8666-000000000001','Demo Hospitality'),('66666666-6666-4666-8666-000000000002','Demo Education');
insert into public.department_memberships(member_id,department_id,started_at) select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,'66666666-6666-4666-8666-000000000001',now()-interval '1 day' from unnest(array[101,103,107]) n;
insert into app_private.role_assignments(member_id,role_key,unit_id,group_id,department_id,appointed_at) values
('44444444-4444-4444-8444-000000000101','unit_leader','33333333-3333-4333-8333-000000000001',null,null,now()-interval '1 day'),
('44444444-4444-4444-8444-000000000102','department_manager',null,null,'66666666-6666-4666-8666-000000000001',now()-interval '1 day'),
('44444444-4444-4444-8444-000000000103','group_leader',null,'22222222-2222-4222-8222-000000000002',null,now()-interval '1 day'),
('44444444-4444-4444-8444-000000000104','technical_admin',null,null,null,now()-interval '1 day'),
('44444444-4444-4444-8444-000000000105','pastoral_staff',null,null,null,now()-interval '1 day');
commit;
