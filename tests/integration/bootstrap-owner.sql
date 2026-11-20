-- Reproduce the prerequisite for owner-activated migrations in a new Auth stack.
begin;
do $$ begin
 if current_database() <> 'lvz_auth' or inet_server_addr() is not null
    or current_setting('port') <> '55436'
    or current_setting('data_directory') not in ('/tmp/lvz-integration/pg','/private/tmp/lvz-integration/pg') then
  raise exception 'Disposable local Auth database required';
 end if;
end $$;
insert into auth.users(id,email,email_confirmed_at)
 values ('99999999-9999-4999-8999-000000000900','owner@example.invalid',now());
insert into auth.sessions(id,user_id,created_at)
 values ('aaaaaaaa-aaaa-4aaa-8aaa-000000000900','99999999-9999-4999-8999-000000000900',now());
update app_private.enrollment_settings
 set enabled=true, allowed_email_domains=array['example.invalid'], owner_email='owner@example.invalid';
select set_config('request.jwt.claims',
 '{"sub":"99999999-9999-4999-8999-000000000900","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-000000000900"}',true);
select public.complete_self_service_enrollment('Owner Example');
update app_private.enrollment_settings set enabled=false, allowed_email_domains='{}', owner_email=null;
commit;
