-- LV Zion Official: activate Worship Duty for the already verified application owner only.
-- Registers the module and grants initial access only to that owner. No records are imported.
begin;
do $activation$
declare v_owner uuid; v_module uuid; v_count integer; v_department text;
begin
 select count(*),min(l.member_id::text)::uuid into v_count,v_owner
 from app_private.bootstrap_receipts b join app_private.account_links l on l.auth_user_id=b.auth_user_id
 join public.members m on m.id=l.member_id where l.enabled and l.technical_enabled;
 if v_count<>1 then raise exception 'One verified application owner required for Worship setup' using errcode='42501';end if;
 if exists(select 1 from app_private.app_modules where module_key='worship-duty') then raise exception 'Worship Duty module already exists; review current setup before migrating' using errcode='23505';end if;
 -- These eight names are the existing, explicitly audited Worship Duty departments.
 for v_department in select department_key from app_private.worship_departments loop
  if (select count(*) from public.departments where name=v_department)>1 then raise exception 'Duplicate department %; manual reconciliation needed',v_department;end if;
  if not exists(select 1 from public.departments where name=v_department) then
   insert into public.departments(name) values(v_department);
  end if;
  update app_private.worship_departments
   set department_id=(select id from public.departments where name=v_department)
   where department_key=v_department and department_id is null;
 end loop;
 if exists(select 1 from app_private.worship_departments where department_id is null) then raise exception 'Missing Worship department mapping';end if;
 insert into app_private.app_modules(module_key,display_name,short_name,description,accent,route_path,status,approved_at,approved_by)
 values('worship-duty','Worship Duty','Duties','View and coordinate authorized worship-service duties.','#3184ff','/modules/worship-duty','approved',clock_timestamp(),v_owner)
 returning id into v_module;
 insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by)
 values(v_owner,v_module,'manager','Explicit owner-only Worship Duty setup access',v_owner);
 insert into app_private.worship_song_editor_grants(member_id,granted_by,reason)
 values(v_owner,v_owner,'Explicit first-owner Worship Duty song setup appointment');
end
$activation$;
commit;
