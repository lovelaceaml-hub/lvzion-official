-- Disposable Healing Concert regressions. Fictional members only. All writes ROLLBACK.
-- 101 Ava ordinary member; 102 Ben ordinary member; 104 Devin door manager (explicit grant); 106 inactive.
begin;
insert into auth.users(id,email,email_confirmed_at)
 select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'concert-'||n||'@example.invalid',now()-interval '1 day' from generate_series(101,109)n;
insert into auth.sessions(id,user_id,created_at)
 select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 hour' from generate_series(101,109)n;
insert into app_private.account_links(member_id,auth_user_id,username)
 select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'concert_'||n from generate_series(101,109)n;
create function pg_temp.m(n integer) returns uuid language sql immutable as $$select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid$$;
create function pg_temp.d(label text) returns text language sql immutable as $$select encode(sha256(convert_to(label,'UTF8')),'hex')$$;
create function pg_temp.login(n integer) returns void language plpgsql as $$
begin
 perform set_config('role','authenticated',true);
 perform set_config('request.jwt.claim.sub','99999999-9999-4999-8999-'||lpad(n::text,12,'0'),true);
 perform set_config('request.jwt.claims',jsonb_build_object('session_id','aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::text,true);
end $$;
create function pg_temp.server() returns void language plpgsql as $$
begin
 perform set_config('role','service_role',true);
 perform set_config('request.jwt.claim.sub','',true);perform set_config('request.jwt.claims','',true);
end $$;
create function pg_temp.admin() returns void language plpgsql as $$begin perform set_config('role','postgres',true);end $$;
create function pg_temp.pass(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label;end if;raise notice 'CONCERT PASS: %',label;end $$;
create function pg_temp.fails(sql text,expected_code text,label text) returns void language plpgsql as $$
declare code text;
begin
 begin execute sql;exception when others then code:=sqlstate;end;
 if code is distinct from expected_code then raise exception 'FAIL: % expected % got %',label,expected_code,coalesce(code,'success');end if;
 raise notice 'CONCERT PASS: %',label;
end $$;
grant execute on all functions in schema pg_temp to authenticated,service_role;

-- Draft module: nobody can use it yet.
select pg_temp.login(101);
select pg_temp.fails($$select public.concert_workspace(pg_temp.d('invite-101'))$$,'42501','draft module is closed to members');
select pg_temp.server();
select pg_temp.pass((public.concert_invite_view(pg_temp.d('nothing'))->>'valid')::boolean=false,'draft module invite links are invalid');

-- Approve for the test and grant Devin door management.
select pg_temp.admin();
update app_private.app_modules set status='approved',approved_at=clock_timestamp() where module_key='concert';
insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_at)
 values(pg_temp.m(104),app_private.concert_module_id(),'manager','Fictional door volunteer for tests',now()-interval '1 minute');

select pg_temp.login(101);
select pg_temp.pass(public.concert_workspace(pg_temp.d('invite-101'))->'event'='null'::jsonb,'empty concert shows no event');
select pg_temp.pass((public.concert_workspace(pg_temp.d('invite-101'))->>'canManage')::boolean=false,'ordinary member cannot manage');
select pg_temp.fails($$select public.concert_command('{"op":"create","title":"Healing Concert","date":"2030-12-06","startTime":"18:00","doorsTime":"17:30","venue":"Main Hall","details":"","capacity":6,"rsvpOpen":true}')$$,'42501','member cannot create the concert');
select pg_temp.fails($$select public.concert_attendance()$$,'42501','member cannot read attendance');
select pg_temp.fails($$select public.concert_scan(pg_temp.d('x'))$$,'42501','member cannot scan tickets');
select pg_temp.fails($$select public.concert_guest_rsvp(pg_temp.d('invite-101'),gen_random_uuid(),pg_temp.d('t'),'Guest Example','g@example.invalid',null,1)$$,'42501','members cannot call the server-only guest RSVP');

select pg_temp.login(104);
select pg_temp.fails($$select public.concert_command('{"op":"create","title":"Healing Concert","date":"2030-12-06","startTime":"18:00","doorsTime":"18:30","venue":"Main Hall","details":"","capacity":6,"rsvpOpen":true}')$$,'23514','doors cannot open after the start');
select pg_temp.pass((public.concert_command('{"op":"create","title":"Healing Concert","date":"2030-12-06","startTime":"18:00","doorsTime":"17:30","venue":"Main Hall","details":"Free entry","capacity":6,"rsvpOpen":true}')->>'ok')::boolean,'manager creates the concert');
select pg_temp.fails($$select public.concert_command('{"op":"create","title":"Second","date":"2030-12-07","startTime":"18:00","doorsTime":null,"venue":"Main Hall","details":"","capacity":null,"rsvpOpen":true}')$$,'23505','only one open concert at a time');
select pg_temp.fails($$select public.concert_command('{"op":"create","title":"Second","date":"2030-12-07","startTime":"18:00","doorsTime":null,"venue":"Main Hall","details":"","capacity":null,"rsvpOpen":true,"extra":1}')$$,'22023','unexpected fields rejected');

-- Member RSVP.
select pg_temp.login(101);
select pg_temp.pass((public.concert_member_rsvp('c0000000-0000-4000-8000-000000000001',pg_temp.d('ticket-1'),'ava@example.invalid',2)->>'created')::boolean,'member RSVP creates a ticket');
select pg_temp.pass((public.concert_member_rsvp('c0000000-0000-4000-8000-000000000009',pg_temp.d('ticket-9'),'ava@example.invalid',2)->>'ticketId')='c0000000-0000-4000-8000-000000000001','second member RSVP returns the same ticket');
select pg_temp.pass(public.concert_workspace(pg_temp.d('invite-101'))->'myTicket'->>'id'='c0000000-0000-4000-8000-000000000001','workspace shows my ticket');
select pg_temp.fails($$select public.concert_member_rsvp(gen_random_uuid(),pg_temp.d('ticket-x'),'x@example.invalid',11)$$,'22023','party size above 10 rejected');

-- Guest RSVP through Ava's invite link (server role).
select pg_temp.server();
select pg_temp.pass((public.concert_invite_view(pg_temp.d('invite-101'))->>'invitedBy')='Ava Example','invite link names the inviter');
select pg_temp.pass((public.concert_invite_view(pg_temp.d('invite-unknown'))->>'valid')::boolean=false,'unknown invite link is invalid');
select pg_temp.pass((public.concert_guest_rsvp(pg_temp.d('invite-101'),'c0000000-0000-4000-8000-000000000002',pg_temp.d('ticket-2'),' Gail Guest ','Gail@Example.invalid','(702) 555-0100',3)->>'created')::boolean,'guest RSVP through invite');
select pg_temp.pass((public.concert_guest_rsvp(pg_temp.d('invite-101'),'c0000000-0000-4000-8000-000000000003',pg_temp.d('ticket-3'),'Someone Else','gail@example.invalid',null,1)->>'created')::boolean=false,'same email does not create a second ticket');
select pg_temp.fails($$select public.concert_guest_rsvp(pg_temp.d('invite-unknown'),gen_random_uuid(),pg_temp.d('ticket-4'),'Nope Guest','nope@example.invalid',null,1)$$,'42501','unknown invite cannot RSVP');
select pg_temp.fails($$select public.concert_guest_rsvp(pg_temp.d('invite-101'),gen_random_uuid(),pg_temp.d('ticket-5'),'Bad Email','not-an-email',null,1)$$,'22023','bad email rejected');
select pg_temp.fails($$select public.concert_guest_rsvp(pg_temp.d('invite-101'),gen_random_uuid(),pg_temp.d('ticket-6'),'Too Many','many@example.invalid',null,2)$$,'LVZCF','capacity counts seats (2+3 of 6 taken)');
select pg_temp.pass((public.concert_ticket_view(pg_temp.d('ticket-2'))->>'name')='Gail Guest','ticket view shows the guest name');
select pg_temp.pass((public.concert_ticket_view(pg_temp.d('ticket-404'))->>'valid')::boolean=false,'unknown ticket is invalid');

select pg_temp.login(101);
select pg_temp.pass((public.concert_workspace(pg_temp.d('invite-101'))->>'invitedCount')::integer=1,'Ava sees one invited guest');

-- Door scanning.
select pg_temp.login(104);
select pg_temp.pass(public.concert_scan(pg_temp.d('ticket-2'))->>'result'='ok','first scan checks in');
select pg_temp.pass(public.concert_scan(pg_temp.d('ticket-2'))->>'result'='already','second scan says already checked in');
select pg_temp.pass(public.concert_scan(pg_temp.d('ticket-404'))->>'result'='invalid','unknown ticket scans invalid');
select pg_temp.pass(public.concert_scan('not hex')->>'result'='invalid','garbage scans invalid');
select pg_temp.pass((select count(*)=1 from jsonb_array_elements(public.concert_attendance()->'tickets') t where t->>'checkedInAt' is not null),'attendance shows one arrival');
select pg_temp.pass((select t->>'invitedBy' from jsonb_array_elements(public.concert_attendance()->'tickets') t where t->>'name'='Gail Guest')='Ava Example','attendance shows who invited the guest');
select pg_temp.pass((public.concert_command('{"op":"checkin","ticketId":"c0000000-0000-4000-8000-000000000001"}')->>'ok')::boolean,'manual check-in');
select pg_temp.pass((public.concert_command('{"op":"undo","ticketId":"c0000000-0000-4000-8000-000000000001"}')->>'ok')::boolean,'undo a check-in');
select pg_temp.pass(public.concert_scan(pg_temp.d('ticket-1'))->>'result'='ok','scan after undo checks in again');
select pg_temp.pass((public.concert_command('{"op":"cancel","ticketId":"c0000000-0000-4000-8000-000000000002"}')->>'ok')::boolean,'cancel a ticket');
select pg_temp.pass(public.concert_scan(pg_temp.d('ticket-2'))->>'result'='cancelled','cancelled ticket scans as cancelled');

select pg_temp.admin();
select set_config('test.eid',(select id::text from app_private.concert_events where status='active'),true);
select pg_temp.login(104);
-- Managers can lower capacity only down to seats taken; RSVP closes.
select pg_temp.fails(format($$select public.concert_command('{"op":"edit","eventId":"%s","expectedVersion":1,"title":"Healing Concert","date":"2030-12-06","startTime":"18:00","doorsTime":"17:30","venue":"Main Hall","details":"","capacity":1,"rsvpOpen":true}')$$,current_setting('test.eid')),'23514','capacity below seats taken rejected');
select pg_temp.fails(format($$select public.concert_command('{"op":"edit","eventId":"%s","expectedVersion":9,"title":"Healing Concert","date":"2030-12-06","startTime":"18:00","doorsTime":"17:30","venue":"Main Hall","details":"","capacity":6,"rsvpOpen":false}')$$,current_setting('test.eid')),'40001','stale version rejected');
select pg_temp.pass((public.concert_command(format('{"op":"edit","eventId":"%s","expectedVersion":1,"title":"Healing Concert","date":"2030-12-06","startTime":"18:00","doorsTime":"17:30","venue":"Main Hall","details":"","capacity":6,"rsvpOpen":false}',current_setting('test.eid'))::jsonb)->>'ok')::boolean,'manager closes RSVP');
select pg_temp.login(102);
select pg_temp.fails($$select public.concert_member_rsvp(gen_random_uuid(),pg_temp.d('ticket-7'),'ben@example.invalid',1)$$,'23514','closed RSVP rejects members');

-- Archive: old tickets scan as another event.
select pg_temp.login(104);
select pg_temp.pass((public.concert_command(format('{"op":"archive","eventId":"%s","expectedVersion":2}',current_setting('test.eid'))::jsonb)->>'ok')::boolean,'archive the concert');
select pg_temp.pass(public.concert_scan(pg_temp.d('ticket-1'))->>'result'='other_event','archived ticket scans as another event');

-- No direct table access for clients.
select pg_temp.fails($$select count(*) from app_private.concert_tickets$$,'42501','members cannot read the tickets table');
select pg_temp.server();
select pg_temp.fails($$select count(*) from app_private.concert_tickets$$,'42501','server role cannot read the tickets table directly');
select pg_temp.admin();
rollback;
