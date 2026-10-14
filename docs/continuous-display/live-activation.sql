-- Enable this real LV Zion Official module only AFTER production web deployment and verified private schema.
-- Authorizes exactly the already-confirmed initial owner. No general leadership or technical role inheritance.
do $$
declare v_owner uuid; v_module uuid; v_screen uuid;
begin
 if (select count(*) from app_private.bootstrap_receipts)<>1 then
  raise exception 'Exactly one confirmed initial owner is required' using errcode='42501';end if;
 select l.member_id into v_owner
 from app_private.bootstrap_receipts b
 join app_private.account_links l on l.auth_user_id=b.auth_user_id
 where l.enabled and l.technical_enabled;
 if v_owner is null then raise exception 'Enabled owner required' using errcode='42501';end if;
 insert into app_private.app_modules(
  module_key,display_name,short_name,description,accent,route_path,status,approved_at,approved_by
 ) values(
  'continuous-display','Church Display','Display',
  'Prepare and approve announcements, events and schedules for paired church televisions.',
  '#466D58','/modules/continuous-display','approved',now(),v_owner
 ) on conflict(module_key) do nothing;
 select m.id into v_module from app_private.app_modules m
 where m.module_key='continuous-display' and m.status='approved' and m.approved_at is not null;
 if v_module is null then raise exception 'Official module approval missing' using errcode='42501';end if;
 insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by)
 select v_owner,v_module,'manager','Authorized original LV Zion Display module owner',v_owner
 where not exists(
  select 1 from app_private.module_access_grants g
  where g.member_id=v_owner and g.module_id=v_module and g.ended_at is null);
 select s.id into v_screen from display_private.screens s where s.label='Lobby Display' limit 1;
 if v_screen is null then
  insert into display_private.screens(label,enabled)
  values('Lobby Display',false) returning id into v_screen;
 end if;
 insert into display_private.permissions(screen_id,member_id,permission)
 select v_screen,v_owner,p.permission
 from (values('edit'),('approve'),('publish'),('device')) p(permission)
 on conflict(screen_id,member_id,permission) do nothing;
 if (select count(*) from display_private.permissions gr
     where gr.screen_id=v_screen and gr.member_id=v_owner and gr.active)<>4 then
  raise exception 'Owner-specific screen rights missing' using errcode='42501';end if;
end $$;
