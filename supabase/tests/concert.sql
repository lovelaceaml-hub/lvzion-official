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

savepoint shared_rsvp;
select pg_temp.admin();
select set_config('test.shared_eid',(select id::text from app_private.concert_events where status='active'),true);
select pg_temp.pass(not has_function_privilege('anon','public.concert_shared_view()','EXECUTE'),'anonymous cannot bypass the application shared-view route');
select pg_temp.server();
select pg_temp.pass(public.concert_shared_view() is null,'shared RSVP is opt-in');
select pg_temp.fails($$select public.concert_shared_rsvp(current_setting('test.shared_eid')::uuid,gen_random_uuid(),pg_temp.d('shared-closed'),'Shared Guest','shared@example.invalid',null,1)$$,'23514','unenabled event rejects shared RSVP');
select pg_temp.admin();
update app_private.concert_events set public_rsvp=true where status='active';
select pg_temp.login(101);
select pg_temp.fails($$select public.concert_shared_rsvp(current_setting('test.shared_eid')::uuid,gen_random_uuid(),pg_temp.d('shared-member'),'Shared Guest','shared@example.invalid',null,1)$$,'42501','members cannot bypass public RSVP controls');
select pg_temp.server();
select pg_temp.pass(public.concert_shared_view()->'event'->>'id'=current_setting('test.shared_eid'),'shared view shows the enabled event');
select pg_temp.fails($$select public.concert_shared_rsvp(gen_random_uuid(),gen_random_uuid(),pg_temp.d('shared-elsewhere'),'Shared Guest','shared@example.invalid',null,1)$$,'23514','stale shared form cannot register for another event');
select pg_temp.pass((public.concert_shared_rsvp(current_setting('test.shared_eid')::uuid,gen_random_uuid(),pg_temp.d('shared-ticket'),'Shared Guest','shared@example.invalid',null,6)->>'created')::boolean,'shared RSVP issues a ticket');
select pg_temp.pass((public.concert_shared_rsvp(current_setting('test.shared_eid')::uuid,gen_random_uuid(),pg_temp.d('shared-duplicate'),'Shared Guest','SHARED@example.invalid',null,6)->>'created')::boolean=false,'shared RSVP deduplicates email');
select pg_temp.pass((public.concert_shared_view()->>'full')::boolean,'shared party counts against capacity');
select pg_temp.login(104);
select pg_temp.pass(public.concert_scan(pg_temp.d('shared-ticket'))->>'result'='ok','door scan checks in a shared RSVP ticket');
select pg_temp.pass(public.concert_scan(pg_temp.d('shared-ticket'))->>'result'='already','repeated shared-ticket scans do not record attendance again');
select pg_temp.pass((public.concert_attendance()->'tickets'->0->>'invitedBy') is null,'shared RSVP has no member inviter');
rollback to savepoint shared_rsvp;

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
select set_config('test.guest_party',jsonb_build_object(
 'ticketId','c0000000-0000-4000-8000-000000000002','inviteDigest',pg_temp.d('invite-101'),'digest',pg_temp.d('ticket-2'),
 'name',' Gail Guest ','email','Gail@Example.invalid','phone','(702) 555-0100','partySize',3,
 'inviterName','Ava Example','attendeeNames',jsonb_build_array('Second Attendee','Third Attendee'))::text,true);
select pg_temp.fails($$select public.concert_register_guest_party(current_setting('test.guest_party')::jsonb-'inviterName')$$,'22023','guest party requires the inviter');
select pg_temp.fails($$select public.concert_register_guest_party(current_setting('test.guest_party')::jsonb||'{"attendeeNames":[]}')$$,'22023','guest party requires one name per attendee');
select pg_temp.pass((public.concert_register_guest_party(current_setting('test.guest_party')::jsonb)->>'created')::boolean,'guest RSVP through invite');
select pg_temp.pass((public.concert_guest_rsvp(pg_temp.d('invite-101'),'c0000000-0000-4000-8000-000000000003',pg_temp.d('ticket-3'),'Someone Else','gail@example.invalid',null,1)->>'created')::boolean=false,'same email does not create a second ticket');
select pg_temp.fails($$select public.concert_guest_rsvp(pg_temp.d('invite-unknown'),gen_random_uuid(),pg_temp.d('ticket-4'),'Nope Guest','nope@example.invalid',null,1)$$,'42501','unknown invite cannot RSVP');
select pg_temp.fails($$select public.concert_guest_rsvp(pg_temp.d('invite-101'),gen_random_uuid(),pg_temp.d('ticket-5'),'Bad Email','not-an-email',null,1)$$,'22023','bad email rejected');
select pg_temp.fails($$select public.concert_guest_rsvp(pg_temp.d('invite-101'),gen_random_uuid(),pg_temp.d('ticket-6'),'Too Many','many@example.invalid',null,2)$$,'LVZCF','capacity counts seats (2+3 of 6 taken)');
select pg_temp.pass((public.concert_ticket_view(pg_temp.d('ticket-2'))->>'name')='Gail Guest','ticket view shows the guest name');
select pg_temp.pass(not (public.concert_ticket_view(pg_temp.d('ticket-2')) ?| array['inviterName','additionalNames']),'public ticket omits the guest party details');
select pg_temp.login(104);
select pg_temp.pass(exists(select 1 from jsonb_array_elements(public.concert_attendance()->'tickets') t
 where t->>'name'='Gail Guest' and t->>'invitedBy'='Ava Example' and t->'additionalNames'='["Second Attendee","Third Attendee"]'),
 'staff see all names on the shared party ticket');
select pg_temp.server();
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

-- Program: managers edit it; everyone sees order, title and performers only.
select pg_temp.fails($$select public.concert_program_save('[{"songNumber":"121","title":"Opening","duration":"3:08","performers":"Brass"}]')$$,'42501','member cannot edit the program');
select pg_temp.fails($$select public.concert_program_full()$$,'42501','member cannot read song numbers and times');
select pg_temp.login(104);
select pg_temp.pass((public.concert_program_save('[{"songNumber":"121","title":"Opening Song","duration":"3:08","performers":"Brass ensemble"},{"songNumber":null,"title":"Second Song","duration":"4:00","performers":"Choir + piano"}]')->>'count')::integer=2,'manager saves a two-song program');
select pg_temp.fails($$select public.concert_program_save('[{"songNumber":null,"title":"Bad","duration":"4 min","performers":null}]')$$,'23514','bad duration rejected');
select pg_temp.fails($$select public.concert_program_save('[{"title":"No other keys"}]')$$,'22023','missing program fields rejected');
select pg_temp.pass((public.concert_program_full()->'items'->0->>'songNumber')='121','managers see song numbers');
select pg_temp.pass(jsonb_array_length(public.concert_program_full()->'items')=2,'failed saves left the program intact');
select pg_temp.server();
select pg_temp.pass((public.concert_invite_view(pg_temp.d('invite-101'))->'event'->'program'->1->>'title')='Second Song','invite page shows the program in order');
select pg_temp.pass(not((public.concert_invite_view(pg_temp.d('invite-101'))->'event'->'program'->0) ? 'songNumber') and not((public.concert_invite_view(pg_temp.d('invite-101'))->'event'->'program'->0) ? 'duration'),'public program hides song numbers and times');
select pg_temp.pass((public.concert_ticket_view(pg_temp.d('ticket-1'))->'event'->'program'->0->>'performers')='Brass ensemble','ticket page shows performers');
select pg_temp.login(101);
select pg_temp.pass(jsonb_array_length(public.concert_workspace(pg_temp.d('invite-101'))->'event'->'program')=2,'members see the program');

-- Archive: old tickets scan as another event.
select pg_temp.login(104);
select pg_temp.pass((public.concert_command(format('{"op":"archive","eventId":"%s","expectedVersion":2}',current_setting('test.eid'))::jsonb)->>'ok')::boolean,'archive the concert');
select pg_temp.pass(public.concert_scan(pg_temp.d('ticket-1'))->>'result'='other_event','archived ticket scans as another event');

-- Named tickets use the same capacity, check-in and ticket view as legacy tickets.
select pg_temp.admin();
insert into app_private.concert_events(id,title,event_date,start_time,venue,capacity,public_rsvp,created_by,updated_by)
 values('70000000-0000-4000-8000-000000000001','Registration Test','2030-12-07','16:30','Fictional Auditorium',4,true,pg_temp.m(104),pg_temp.m(104));
select set_config('test.registration',jsonb_build_object(
 'id','71000000-0000-4000-8000-000000000001','eventId','70000000-0000-4000-8000-000000000001','email','coordinator@example.invalid','inviterName','Shared Link Inviter',
 'tickets',jsonb_build_array(
  jsonb_build_object('id','71000000-0000-4000-8000-000000000001','name','Lead Guest','digest',pg_temp.d('named-lead')),
  jsonb_build_object('id','71000000-0000-4000-8000-000000000002','name','Second Guest','digest',pg_temp.d('named-second'))
 ))::text,true);
select pg_temp.login(101);
select pg_temp.fails($$select public.concert_register_named(current_setting('test.registration')::jsonb)$$,'42501','authenticated caller cannot issue public tickets directly');
select pg_temp.fails($$select public.concert_register_guest_party('{}')$$,'42501','authenticated caller cannot issue a guest party ticket');
select pg_temp.fails($$select public.concert_door('{"action":"find","name":"Lead"}')$$,'42501','member cannot search for guests');
select pg_temp.server();
select pg_temp.pass(jsonb_array_length(public.concert_register_named(current_setting('test.registration')::jsonb)->'tickets')=2,'named party issues two tickets');
select pg_temp.pass(jsonb_array_length(public.concert_register_named(current_setting('test.registration')::jsonb)->'tickets')=2,'replayed request returns the same named tickets');
select pg_temp.pass((public.concert_ticket_view(pg_temp.d('named-second'))->>'partySize')::int=1,'secondary guest gets an individual ticket');
select pg_temp.pass(jsonb_array_length(public.concert_recover_tickets('{"eventId":"70000000-0000-4000-8000-000000000001","email":"coordinator@example.invalid"}'))=2,'verified recovery can return all named tickets');
select pg_temp.pass(jsonb_array_length(public.concert_named_invitation(jsonb_build_object(
 'action','create','batch','72000000-0000-4000-8000-000000000001','eventId','70000000-0000-4000-8000-000000000001',
 'name','Verified Inviter','sender','inviter@example.invalid','recipients',jsonb_build_array(jsonb_build_object(
  'id','73000000-0000-4000-8000-000000000001','name','Named VIP','email','vip@example.invalid','relationship','Friend',
  'digest',pg_temp.d('named-invite'),'firstVisit',true,'vip',jsonb_build_object('title','Director','organization','Fictional Arts','category','Music'))))))=1,
 'one verified named invitation is stored');
select pg_temp.pass(not(public.concert_named_invitation(jsonb_build_object('action','view','digest',pg_temp.d('named-invite'))) ? 'vip'),'personal invite response excludes VIP metadata');
select pg_temp.pass(public.concert_delivery('{"kind":"invitation","reference":"73000000-0000-4000-8000-000000000001"}')->>'email'='vip@example.invalid','mail queue claims the intended recipient');
select pg_temp.pass(public.concert_delivery('{"kind":"invitation","reference":"73000000-0000-4000-8000-000000000001"}') is null,'mail worker cannot claim an in-progress delivery twice');
select set_config('test.accept',jsonb_build_object(
 'id','71000000-0000-4000-8000-000000000003','eventId','70000000-0000-4000-8000-000000000001','email','vip@example.invalid',
 'inviteId','73000000-0000-4000-8000-000000000001','verified',true,'tickets',jsonb_build_array(
  jsonb_build_object('id','71000000-0000-4000-8000-000000000003','name','Named VIP','digest',pg_temp.d('named-vip'))
 ))::text,true);
select pg_temp.fails($$select public.concert_register_named(current_setting('test.accept')::jsonb||'{"email":"wrong@example.invalid"}')$$,'42501','personal invitation rejects an address mismatch');
select pg_temp.pass(jsonb_array_length(public.concert_register_named(current_setting('test.accept')::jsonb)->'tickets')=1,'named acceptance issues one ticket');
select pg_temp.pass(public.concert_delivery('{"kind":"registered","reference":"73000000-0000-4000-8000-000000000001"}')->>'email'='inviter@example.invalid','acceptance queues one notification to the verified inviter');
select pg_temp.login(104);
select pg_temp.pass((select count(*) from jsonb_array_elements(public.concert_attendance()->'tickets') t
 where t->>'invitedBy'='Shared Link Inviter')=2,'staff see the inviter on both individual tickets');
select pg_temp.pass(public.concert_door(jsonb_build_object('action','scan','digest',pg_temp.d('named-vip')))->>'vip'='true','VIP badge is visible at the door');
select pg_temp.pass(public.concert_door(jsonb_build_object('action','scan','digest',pg_temp.d('named-vip')))->>'result'='already','named tickets are idempotent at the door');
select pg_temp.pass(jsonb_array_length(public.concert_door('{"action":"find","name":"Second"}'))=1,'door can find an individual attendee');
select pg_temp.pass(public.concert_door('{"action":"check","id":"71000000-0000-4000-8000-000000000002"}')->>'result'='ok','door can check in a guest by name');
select set_config('test.walk',jsonb_build_object('action','walk','id','71000000-0000-4000-8000-000000000004','name','Fictional Walk In','digest',pg_temp.d('walking-guest'))::text,true);
select pg_temp.pass(public.concert_door(current_setting('test.walk')::jsonb)->>'result'='ok','walk-in reserves and checks in the last seat');
select pg_temp.pass(public.concert_door(current_setting('test.walk')::jsonb)->>'result'='already','walk-in retry does not record another attendee');
select pg_temp.fails($$select public.concert_door(current_setting('test.walk')::jsonb||jsonb_build_object('id',gen_random_uuid(),'name','Extra Guest','digest',pg_temp.d('extra-guest')))$$,'LVZCF','walk-in cannot exceed capacity');
select pg_temp.pass(public.concert_registration_report()->>'invitationCount'='1','organizer counts invitations separately');
select pg_temp.server();
select pg_temp.pass(public.concert_shared_view()->>'full'='true','door and online reservations use the same seats');
select pg_temp.pass(public.concert_verify(jsonb_build_object('action','issue','id','74000000-0000-4000-8000-000000000001',
  'purpose','sender','scope','event','email','inviter@example.invalid','digest',pg_temp.d('proof'))) is null,'email proof can be issued');
select pg_temp.pass(public.concert_verify(jsonb_build_object('action','redeem','id','74000000-0000-4000-8000-000000000001',
  'purpose','sender','digest',pg_temp.d('proof')))->>'email'='inviter@example.invalid','email proof returns the bound address');
select pg_temp.pass(public.concert_verify(jsonb_build_object('action','redeem','id','74000000-0000-4000-8000-000000000001',
  'purpose','sender','digest',pg_temp.d('proof'))) is null,'email proof cannot be used twice');
select pg_temp.login(104);
-- No direct table access for clients.
select pg_temp.fails($$select count(*) from app_private.concert_tickets$$,'42501','members cannot read the tickets table');
select pg_temp.server();
select pg_temp.fails($$select count(*) from app_private.concert_tickets$$,'42501','server role cannot read the tickets table directly');
select pg_temp.admin();
-- A personal link can correct recipient details and reserve several seats with one scan.
update app_private.concert_events set capacity=null,rsvp_open=true where id='70000000-0000-4000-8000-000000000001';
insert into app_private.concert_named_invites(id,batch_id,event_id,token_digest,sender_email,sender_name,guest_name,guest_email,relationship,first_visit)
values('73000000-0000-4000-8000-000000000009',gen_random_uuid(),'70000000-0000-4000-8000-000000000001',pg_temp.d('party-invite'),
'party-host@example.invalid','Fictional Host','Original Guest','original@example.invalid','Friend',false);
select pg_temp.server();
select set_config('test.party',jsonb_build_object('id','71000000-0000-4000-8000-000000000009','inviteDigest',pg_temp.d('party-invite'),
'digest',pg_temp.d('party-qr'),'email','corrected@example.invalid','names',jsonb_build_array('Corrected Guest','Second Guest'))::text,true);
select pg_temp.pass(public.concert_accept_party(current_setting('test.party')::jsonb)->'tickets'->0->>'partySize'='2','single QR reserves both seats');
select pg_temp.pass(public.concert_accept_party(current_setting('test.party')::jsonb)->'tickets'->0->>'name'='Corrected Guest','idempotent confirmation uses corrected name');
select pg_temp.pass(public.concert_accept_party(current_setting('test.party')::jsonb||jsonb_build_object('id',gen_random_uuid()))->>'existing'='true','repeat confirmation cannot claim another ticket');
select set_config('test.context',public.concert_host_context('{"reference":"73000000-0000-4000-8000-000000000009","source":"named"}')::text,true);
select pg_temp.pass(current_setting('test.context')::jsonb->>'guestEmail'='corrected@example.invalid' and
 current_setting('test.context')::jsonb->'additionalNames'->>0='Second Guest','host receipt reflects corrected email and party names');
select pg_temp.pass(public.concert_delivery('{"kind":"host_receipt","reference":"73000000-0000-4000-8000-000000000009"}')->>'email'='party-host@example.invalid','host receipt queued to sender');
select pg_temp.pass(public.concert_sender_status('{"eventId":"70000000-0000-4000-8000-000000000001","email":"party-host@example.invalid"}')=
 '[{"name":"Corrected Guest","status":"Confirmed","partySize":2}]'::jsonb,'status exposes only this sender’s party');
select pg_temp.pass(not has_function_privilege('anon','public.concert_sender_status(jsonb)','execute') and
 not has_function_privilege('authenticated','public.concert_host_context(jsonb)','execute'),'only service role can read host data');
select pg_temp.admin();
rollback;
