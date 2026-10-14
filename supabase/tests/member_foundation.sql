-- RUN ONLY on a disposable Supabase local/test database.
-- Precondition: member-system migration and seed/fictional_members.sql applied.
-- Tests synthetic Auth identities inside a transaction that always rolls back.
-- Recommended: psql -v ON_ERROR_STOP=1 -f supabase/tests/member_foundation.sql
\set ON_ERROR_STOP on
begin;

-- Supabase Auth fixtures exist only during this test transaction; never create
-- fake Auth users in production. These addresses cannot receive email.
insert into auth.users (
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  ('99999999-9999-4999-8999-' || lpad(n::text,12,'0'))::uuid,
  'authenticated','authenticated',
  'lvzion-test-' || n || '@example.invalid','',now(),now(),now()
from generate_series(101,108) as n;

insert into app_private.account_links(member_id,auth_user_id,username) values
 ('44444444-4444-4444-8444-000000000101','99999999-9999-4999-8999-000000000101','ava_demo'),
 ('44444444-4444-4444-8444-000000000102','99999999-9999-4999-8999-000000000102','ben_demo'),
 ('44444444-4444-4444-8444-000000000103','99999999-9999-4999-8999-000000000103','cara_demo'),
 ('44444444-4444-4444-8444-000000000104','99999999-9999-4999-8999-000000000104','devin_demo'),
 ('44444444-4444-4444-8444-000000000105','99999999-9999-4999-8999-000000000105','eira_demo'),
 ('44444444-4444-4444-8444-000000000106','99999999-9999-4999-8999-000000000106','finn_demo'),
 ('44444444-4444-4444-8444-000000000107','99999999-9999-4999-8999-000000000107','gina_demo'),
 ('44444444-4444-4444-8444-000000000108','99999999-9999-4999-8999-000000000108','hugo_demo');

-- Group A ordinary member: five active names from A and none from B.
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-000000000107',true);
do $$
declare n integer;
begin
  select count(id) into n from public.members;
  if n <> 5 then raise exception 'Group A ordinary user saw % member names, expected 5', n; end if;
  if exists(select 1 from public.members where display_name = 'Cara Example') then
    raise exception 'Cross-group name disclosure';
  end if;
  if public.my_membership_id() <> '44444444-4444-4444-8444-000000000107'::uuid then
    raise exception 'Own identity mismatch';
  end if;
  begin
    perform email from app_private.member_private_contacts;
    raise exception 'Private contacts unexpectedly readable';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.members set display_name = 'Unauthorized Update'
      where id = '44444444-4444-4444-8444-000000000107';
    raise exception 'Direct UPDATE unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Unit leader can rename own unit only. Inserts must atomically audit.
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-000000000101',true);
insert into public.member_name_changes(member_id,new_display_name,reason)
values ('44444444-4444-4444-8444-000000000107','Gina Updated','Verified correction to demo name');
do $$
begin
  begin
    insert into public.member_name_changes(member_id,new_display_name,reason)
    values ('44444444-4444-4444-8444-000000000102','Invalid Change','Wrong unit denial test');
    raise exception 'Unit leader renamed another unit';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.member_name_changes(member_id,new_display_name,reason)
    values ('44444444-4444-4444-8444-000000000108','Invalid Change','Wrong group denial test');
    raise exception 'Unit leader renamed another group';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$
begin
  if not exists(select 1 from public.members where id = '44444444-4444-4444-8444-000000000107' and display_name='Gina Updated') then
    raise exception 'Authorized name update did not apply';
  end if;
  if not exists(select 1 from app_private.audit_events
    where operation='member.display_name.changed'
      and actor_auth_user_id='99999999-9999-4999-8999-000000000101'::uuid
      and target_member_id='44444444-4444-4444-8444-000000000107'::uuid) then
    raise exception 'Audited member update missing';
  end if;
end $$;

-- Department management is independent from organization/units:
-- Ben can see Cara, a cross-group member of Ben's department, but cannot rename Gina.
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-000000000102',true);
do $$
begin
  if not exists(select 1 from public.members where display_name='Cara Example') then
    raise exception 'Department manager cannot see assigned department member';
  end if;
  begin
    insert into public.member_name_changes(member_id,new_display_name,reason)
    values ('44444444-4444-4444-8444-000000000107','Invalid Change','Department manager scope denial');
    raise exception 'Department management escalated to group edit';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Group leader can manage within Group B, not Group A.
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-000000000103',true);
insert into public.member_name_changes(member_id,new_display_name,reason)
values ('44444444-4444-4444-8444-000000000108','Hugo Updated','Group B correction');
do $$
begin
  begin
    insert into public.member_name_changes(member_id,new_display_name,reason)
    values ('44444444-4444-4444-8444-000000000101','Invalid Change','Wrong group');
    raise exception 'Group leader edited Group A';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Technical admin is not a pastoral/member administrator.
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-000000000104',true);
do $$
begin
  if exists(select 1 from public.members where id='44444444-4444-4444-8444-000000000107') then
    raise exception 'Technical admin accessed other group without a ministry role';
  end if;
  begin
    insert into public.member_name_changes(member_id,new_display_name,reason)
    values ('44444444-4444-4444-8444-000000000108','Invalid Change','No church management scope');
    raise exception 'Technical admin edited ministry record';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- A separately granted pastoral appointment can manage across groups.
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-000000000105',true);
insert into public.member_name_changes(member_id,new_display_name,reason)
values ('44444444-4444-4444-8444-000000000108','Hugo Pastoral Update','Pastoral demo correction');
reset role;

-- Inactive account retained in Auth but denied all member content.
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-000000000106',true);
do $$
begin
  if public.my_membership_id() is not null then
    raise exception 'Inactive member activated';
  end if;
  if exists(select 1 from public.members) then
    raise exception 'Inactive member could enumerate names';
  end if;
end $$;
reset role;

-- Move unit leader Ava away without ending appointment: old unit rights
-- must cease immediately. This is a TEST-ONLY direct privileged edit.
update public.member_placements set ended_at = now()
  where member_id='44444444-4444-4444-8444-000000000101' and ended_at is null;
insert into public.member_placements(member_id,group_id,unit_id)
values ('44444444-4444-4444-8444-000000000101',
        '22222222-2222-4222-8222-000000000002',
        '33333333-3333-4333-8333-000000000003');
set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-000000000101',true);
do $$
begin
  begin
    insert into public.member_name_changes(member_id,new_display_name,reason)
    values ('44444444-4444-4444-8444-000000000107','Invalid Change','Old unit now inaccessible');
    raise exception 'Departed leader still has old unit permission';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Structural constraints: duplicate active placement and unit/group mismatch.
do $$
begin
  begin
    insert into public.member_placements(member_id,group_id,unit_id)
    values ('44444444-4444-4444-8444-000000000102',
            '22222222-2222-4222-8222-000000000001',
            '33333333-3333-4333-8333-000000000002');
    raise exception 'Duplicate current placement accepted';
  exception when unique_violation then null;
  end;
  begin
    insert into public.member_placements(member_id,group_id,unit_id)
    values ('44444444-4444-4444-8444-000000000109',
            '22222222-2222-4222-8222-000000000002',
            '33333333-3333-4333-8333-000000000001');
    raise exception 'Unit from wrong group accepted';
  exception when foreign_key_violation then null;
  end;
  if not exists (select 1 from public.member_placements
      where member_id='44444444-4444-4444-8444-000000000106' and ended_at is not null) then
    raise exception 'Inactive member history missing';
  end if;
end $$;

select 'PASS: synthetic member scoping, audited changes, suspension and constraints' as result;
rollback;