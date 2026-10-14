-- Apply ONLY after the production web routes and private display schema are verified.
-- The user explicitly authorized registering Continuous Church Display in the real LV Zion Official app.
-- Grants only the previously confirmed single application owner, not all leadership or technical admins.
do $$
declare owner_id uuid; module_id uuid; screen_id uuid;
begin
 if (select count(*) from app_private.bootstrap_receipts)<>1 then
  raise exception 'One verified owner bootstrap is required' using errcode='42501';end if;
 select l.member_id into owner_id
 from app_private.bootstrap_receipts b
 join app_private.account_links l on l.auth_user_id=b.auth_user_id
 where l.enabled and l.technical_enabled;
 if owner_id is null then raise exception 'Verified, enabled owner required' using errcode='42501';end if;
 insert into app_private.app_modules(
  module_key,display_name,short_name,description,accent,route_path,
  status,approved_at,approved_by
 ) values(
  'continuous-display','Church Display','Display',
  'Prepare approved announcements, events and schedules for paired church televisions.',
  '#466D58','/modules/continuous-display','approved',now(),owner_id
 ) on conflict(module_key) do nothing;
 select id into module_id from app_private.app_modules
 where module_key='continuous-display' and status='approved' and approved_at is not null;
 if module_id is null then raise exception 'Module approval missing' using errcode='42501';end if;
 insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by)
 select owner_id,module_id,'manager','Owner-authorized Continuous Church Display setup',owner_id
 where not exists(
  select 1 from app_private.module_access_grants
  where member_id=owner_id and module_id=module_id and ended_at is null);
 select id into screen_id from display_private.screens where label='Lobby Display' limit 1;
 if screen_id is null then
  insert into display_private.screens(label,enabled)
  values('Lobby Display',false) returning id into screen_id;
 end if;
 insert into display_private.permissions(screen_id,member_id,permission)
 select screen_id,owner_id,granted.permission
 from (values('edit'),('approve'),('publish'),('device')) granted(permission)
 on conflict(screen_id,member_id,permission) do nothing;
 if (select count(*) from display_private.permissions where screen_id=screen_id and member_id=owner_id and active)<>4 then
  raise exception 'Explicit screen rights missing' using errcode='42501';end if;
end $$;
