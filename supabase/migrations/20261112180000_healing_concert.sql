-- Healing Concert: RSVP tickets with QR codes and door check-in. Anthony's plan, 2026-11-12.
-- Members RSVP in the app and share a personal invite link; guests without an account RSVP
-- through that link. Door staff (module managers) scan tickets to record attendance.
-- No event, ticket or grant is seeded. The module is registered as draft until Anthony approves it.
-- Ticket and invite tokens are derived on the server with a secret; only SHA-256 digests are stored.
begin;
create table app_private.concert_events(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(btrim(title)) between 2 and 80 and title !~ '[[:cntrl:]]'),
 event_date date not null check(event_date between date '2020-01-01' and date '2100-12-31'),
 start_time time not null,doors_time time,
 venue text not null check(length(btrim(venue)) between 2 and 120 and venue !~ '[[:cntrl:]]'),
 details text not null default '' check(length(details)<=600),
 capacity integer check(capacity is null or capacity between 1 and 5000),
 rsvp_open boolean not null default true,
 status text not null default 'active' check(status in ('active','archived')),
 version integer not null default 1 check(version>0),
 created_by uuid not null references public.members on delete restrict,
 updated_by uuid not null references public.members on delete restrict,
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 check(doors_time is null or doors_time<=start_time)
);
-- One current concert at a time; archiving it frees the slot for the next one.
create unique index concert_events_one_active on app_private.concert_events((true)) where status='active';
create index concert_events_created_by_idx on app_private.concert_events(created_by);
create index concert_events_updated_by_idx on app_private.concert_events(updated_by);

-- Each member has one stable personal invite link (it always points at the current concert).
create table app_private.concert_invites(
 member_id uuid primary key references public.members on delete restrict,
 token_digest text not null unique check(token_digest ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default clock_timestamp()
);

create table app_private.concert_tickets(
 id uuid primary key,
 event_id uuid not null references app_private.concert_events on delete restrict,
 token_digest text not null unique check(token_digest ~ '^[0-9a-f]{64}$'),
 guest_name text not null check(length(btrim(guest_name)) between 2 and 120 and guest_name !~ '[[:cntrl:]]'),
 email text not null check(length(email) between 3 and 254 and email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'),
 phone text check(phone is null or (length(phone) between 7 and 30 and phone ~ '^[0-9+().[:space:]-]+$')),
 party_size smallint not null default 1 check(party_size between 1 and 10),
 member_id uuid references public.members on delete restrict,
 invited_by uuid references public.members on delete restrict,
 status text not null default 'active' check(status in ('active','cancelled')),
 checked_in_at timestamptz,checked_in_by uuid references public.members on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 check((checked_in_at is null)=(checked_in_by is null))
);
create unique index concert_tickets_email_idx on app_private.concert_tickets(event_id,lower(email)) where status='active';
create unique index concert_tickets_member_idx on app_private.concert_tickets(event_id,member_id) where status='active' and member_id is not null;
create index concert_tickets_event_idx on app_private.concert_tickets(event_id,created_at);
create index concert_tickets_invited_idx on app_private.concert_tickets(invited_by) where invited_by is not null;
create index concert_tickets_member_fk_idx on app_private.concert_tickets(member_id) where member_id is not null;
create index concert_tickets_checked_by_idx on app_private.concert_tickets(checked_in_by) where checked_in_by is not null;

create table app_private.concert_audit(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.members on delete restrict,
 event_id uuid references app_private.concert_events on delete restrict,
 ticket_id uuid references app_private.concert_tickets on delete restrict,
 operation text not null check(operation in ('event_create','event_edit','event_archive','rsvp_member','rsvp_guest','checkin','undo','cancel')),
 detail jsonb,created_at timestamptz not null default clock_timestamp()
);
create index concert_audit_event_idx on app_private.concert_audit(event_id,created_at);
create index concert_audit_actor_idx on app_private.concert_audit(actor_id) where actor_id is not null;
create index concert_audit_ticket_idx on app_private.concert_audit(ticket_id) where ticket_id is not null;
do $$ declare t text;begin
 foreach t in array array['concert_events','concert_invites','concert_tickets','concert_audit'] loop
  execute format('alter table app_private.%I enable row level security',t);
  execute format('revoke all on app_private.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;

create function app_private.concert_module_id() returns uuid language sql stable set search_path='' as $$
 select id from app_private.app_modules where module_key='concert'
$$;
create function app_private.concert_module_open() returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from app_private.app_modules where module_key='concert' and status='approved')
$$;
create function app_private.concert_event_json(e app_private.concert_events) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',e.id,'title',e.title,'date',to_char(e.event_date,'YYYY-MM-DD'),
  'startTime',left(e.start_time::text,5),'doorsTime',case when e.doors_time is null then null else left(e.doors_time::text,5) end,
  'venue',e.venue,'details',e.details,'capacity',e.capacity,'rsvpOpen',e.rsvp_open,'version',e.version,
  'seatsTaken',(select coalesce(sum(t.party_size),0)::integer from app_private.concert_tickets t where t.event_id=e.id and t.status='active'))
$$;
-- Capacity counts seats (party sizes), not tickets.
create function app_private.concert_has_room(p_event uuid,p_party integer) returns boolean language sql stable set search_path='' as $$
 select e.capacity is null or (select coalesce(sum(t.party_size),0) from app_private.concert_tickets t where t.event_id=e.id and t.status='active')+p_party<=e.capacity
 from app_private.concert_events e where e.id=p_event
$$;
create function app_private.concert_check_digest(p text) returns void language plpgsql immutable set search_path='' as $$
begin if p is null or p !~ '^[0-9a-f]{64}$' then raise exception 'Invalid token' using errcode='22023';end if;end $$;

-- Member workspace. Also records the member's personal invite digest (computed by the server).
create function app_private.concert_workspace(p_invite_digest text) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_module uuid:=app_private.concert_module_id();v_manager boolean;v_event app_private.concert_events;v_ticket app_private.concert_tickets;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_allowed(actor,v_module),false) then raise exception 'Not authorized' using errcode='42501';end if;
 perform app_private.concert_check_digest(p_invite_digest);
 insert into app_private.concert_invites(member_id,token_digest) values(actor,p_invite_digest)
  on conflict(member_id) do update set token_digest=excluded.token_digest where app_private.concert_invites.token_digest<>excluded.token_digest;
 v_manager:=coalesce(app_private.module_manager(actor,v_module),false);
 select * into v_event from app_private.concert_events where status='active';
 if found then select * into v_ticket from app_private.concert_tickets where event_id=v_event.id and member_id=actor and status='active';end if;
 return jsonb_build_object('viewerId',actor,'canManage',v_manager,
  'name',(select display_name from public.members where id=actor),
  'event',case when v_event.id is null then null else app_private.concert_event_json(v_event) end,
  'myTicket',case when v_ticket.id is null then null else jsonb_build_object('id',v_ticket.id,'name',v_ticket.guest_name,'email',v_ticket.email,'partySize',v_ticket.party_size,'checkedInAt',v_ticket.checked_in_at) end,
  'invitedCount',case when v_event.id is null then 0 else (select count(*)::integer from app_private.concert_tickets where event_id=v_event.id and invited_by=actor and status='active') end);
end $$;

-- Member RSVP. The server supplies a fresh ticket id and the digest of its derived token.
create function app_private.concert_member_rsvp(p_ticket uuid,p_digest text,p_email text,p_party integer) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_event app_private.concert_events;v_existing app_private.concert_tickets;v_name text;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_allowed(actor,app_private.concert_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 perform app_private.concert_check_digest(p_digest);
 if p_ticket is null or p_party is null or p_party not between 1 and 10 then raise exception 'Invalid RSVP' using errcode='22023';end if;
 select * into v_event from app_private.concert_events where status='active' for update;
 if not found or not v_event.rsvp_open then raise exception 'RSVP closed' using errcode='23514';end if;
 select * into v_existing from app_private.concert_tickets where event_id=v_event.id and status='active' and (member_id=actor or lower(email)=lower(btrim(p_email)));
 if found then
  if v_existing.member_id is not null and v_existing.member_id<>actor then raise exception 'Email already registered' using errcode='23505';end if;
  if v_existing.member_id is null and v_existing.checked_in_at is null then
   -- A guest ticket already holds this email: claim it for the member instead of making a second one.
   update app_private.concert_tickets set member_id=actor where id=v_existing.id;
  end if;
  return jsonb_build_object('ticketId',v_existing.id,'created',false);
 end if;
 if not app_private.concert_has_room(v_event.id,p_party) then raise exception 'Concert full' using errcode='LVZCF';end if;
 select display_name into v_name from public.members where id=actor;
 insert into app_private.concert_tickets(id,event_id,token_digest,guest_name,email,party_size,member_id)
  values(p_ticket,v_event.id,p_digest,v_name,lower(btrim(p_email)),p_party,actor);
 insert into app_private.concert_audit(actor_id,event_id,ticket_id,operation) values(actor,v_event.id,p_ticket,'rsvp_member');
 return jsonb_build_object('ticketId',p_ticket,'created',true);
end $$;

-- Guest RSVP through a member's invite link. Called only by the trusted server (service role).
create function app_private.concert_guest_rsvp(p_invite_digest text,p_ticket uuid,p_digest text,p_name text,p_email text,p_phone text,p_party integer) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare v_inviter uuid;v_event app_private.concert_events;v_existing uuid;v_name text:=btrim(coalesce(p_name,''));v_email text:=lower(btrim(coalesce(p_email,'')));v_phone text:=nullif(btrim(coalesce(p_phone,'')),'');
begin
 perform app_private.concert_check_digest(p_invite_digest);perform app_private.concert_check_digest(p_digest);
 if not app_private.concert_module_open() then raise exception 'Not available' using errcode='42501';end if;
 select i.member_id into v_inviter from app_private.concert_invites i join public.members m on m.id=i.member_id and m.status='active' where i.token_digest=p_invite_digest;
 if not found then raise exception 'Invite not found' using errcode='42501';end if;
 if p_ticket is null or p_party is null or p_party not between 1 and 10 or length(v_name) not between 2 and 120 or v_name ~ '[[:cntrl:]]'
  or length(v_email)>254 or v_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
  or (v_phone is not null and (length(v_phone) not between 7 and 30 or v_phone !~ '^[0-9+().[:space:]-]+$')) then raise exception 'Invalid RSVP' using errcode='22023';end if;
 select * into v_event from app_private.concert_events where status='active' for update;
 if not found or not v_event.rsvp_open then raise exception 'RSVP closed' using errcode='23514';end if;
 select id into v_existing from app_private.concert_tickets where event_id=v_event.id and status='active' and lower(email)=v_email;
 -- Never reveal the existing ticket here; the server re-sends it to that email address.
 if found then return jsonb_build_object('ticketId',v_existing,'created',false,'email',v_email);end if;
 if not app_private.concert_has_room(v_event.id,p_party) then raise exception 'Concert full' using errcode='LVZCF';end if;
 insert into app_private.concert_tickets(id,event_id,token_digest,guest_name,email,phone,party_size,invited_by)
  values(p_ticket,v_event.id,p_digest,v_name,v_email,v_phone,p_party,v_inviter);
 insert into app_private.concert_audit(event_id,ticket_id,operation,detail) values(v_event.id,p_ticket,'rsvp_guest',jsonb_build_object('invitedBy',v_inviter));
 return jsonb_build_object('ticketId',p_ticket,'created',true,'email',v_email);
end $$;

-- What a public invite link shows before RSVP. Service role only.
create function app_private.concert_invite_view(p_invite_digest text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare v_inviter text;v_event app_private.concert_events;
begin
 perform app_private.concert_check_digest(p_invite_digest);
 if not app_private.concert_module_open() then return jsonb_build_object('valid',false);end if;
 select m.display_name into v_inviter from app_private.concert_invites i join public.members m on m.id=i.member_id and m.status='active' where i.token_digest=p_invite_digest;
 if not found then return jsonb_build_object('valid',false);end if;
 select * into v_event from app_private.concert_events where status='active';
 return jsonb_build_object('valid',true,'invitedBy',v_inviter,'event',case when v_event.id is null then null else app_private.concert_event_json(v_event)-'version'-'seatsTaken' end,
  'full',case when v_event.id is null then false else not app_private.concert_has_room(v_event.id,1) end);
end $$;

-- The ticket a holder sees (public link) or the server needs for e-mail. Service role only.
create function app_private.concert_ticket_view(p_digest text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare v_ticket app_private.concert_tickets;v_event app_private.concert_events;
begin
 perform app_private.concert_check_digest(p_digest);
 select * into v_ticket from app_private.concert_tickets where token_digest=p_digest;
 if not found then return jsonb_build_object('valid',false);end if;
 select * into v_event from app_private.concert_events where id=v_ticket.event_id;
 return jsonb_build_object('valid',true,'ticketId',v_ticket.id,'name',v_ticket.guest_name,'email',v_ticket.email,'partySize',v_ticket.party_size,
  'status',v_ticket.status,'checkedInAt',v_ticket.checked_in_at,'event',app_private.concert_event_json(v_event)-'version'-'seatsTaken'-'capacity'-'rsvpOpen'||jsonb_build_object('archived',v_event.status<>'active'));
end $$;

-- A member's own ticket for e-mail resend (server derives the token from the id).
create function app_private.concert_ticket_owner_email(p_ticket uuid) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_ticket app_private.concert_tickets;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_allowed(actor,app_private.concert_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 select * into v_ticket from app_private.concert_tickets where id=p_ticket and status='active'
  and (member_id=actor or coalesce(app_private.module_manager(actor,app_private.concert_module_id()),false));
 if not found then raise exception 'Not authorized' using errcode='42501';end if;
 return jsonb_build_object('ticketId',v_ticket.id,'email',v_ticket.email);
end $$;

-- Door scan. Managers only. Returns a result instead of raising so the scanner can show it.
create function app_private.concert_scan(p_digest text) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_ticket app_private.concert_tickets;v_active uuid;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_manager(actor,app_private.concert_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 if p_digest is null or p_digest !~ '^[0-9a-f]{64}$' then return jsonb_build_object('result','invalid');end if;
 select id into v_active from app_private.concert_events where status='active';
 select * into v_ticket from app_private.concert_tickets where token_digest=p_digest for update;
 if not found then return jsonb_build_object('result','invalid');end if;
 if v_ticket.status<>'active' then return jsonb_build_object('result','cancelled','name',v_ticket.guest_name);end if;
 if v_active is distinct from v_ticket.event_id then return jsonb_build_object('result','other_event','name',v_ticket.guest_name);end if;
 if v_ticket.checked_in_at is not null then
  return jsonb_build_object('result','already','ticketId',v_ticket.id,'name',v_ticket.guest_name,'partySize',v_ticket.party_size,'checkedInAt',v_ticket.checked_in_at);
 end if;
 update app_private.concert_tickets set checked_in_at=clock_timestamp(),checked_in_by=actor where id=v_ticket.id returning * into v_ticket;
 insert into app_private.concert_audit(actor_id,event_id,ticket_id,operation,detail) values(actor,v_ticket.event_id,v_ticket.id,'checkin','{"via":"scan"}');
 return jsonb_build_object('result','ok','ticketId',v_ticket.id,'name',v_ticket.guest_name,'partySize',v_ticket.party_size,'checkedInAt',v_ticket.checked_in_at);
end $$;

-- Attendance list for the current concert. Managers only.
create function app_private.concert_attendance() returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_event app_private.concert_events;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_manager(actor,app_private.concert_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 select * into v_event from app_private.concert_events where status='active';
 if not found then return jsonb_build_object('event',null,'tickets','[]'::jsonb);end if;
 return jsonb_build_object('event',app_private.concert_event_json(v_event),'tickets',coalesce((
  select jsonb_agg(jsonb_build_object('id',t.id,'name',t.guest_name,'email',t.email,'phone',t.phone,'partySize',t.party_size,
   'member',t.member_id is not null,'invitedBy',inv.display_name,'createdAt',t.created_at,'checkedInAt',t.checked_in_at,'checkedInBy',chk.display_name)
   order by lower(t.guest_name),t.id)
  from app_private.concert_tickets t left join public.members inv on inv.id=t.invited_by left join public.members chk on chk.id=t.checked_in_by
  where t.event_id=v_event.id and t.status='active'),'[]'::jsonb));
end $$;

-- Manager commands: create/edit/archive the concert; manual check-in, undo and cancel for a ticket.
create function app_private.concert_command(p_command jsonb) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_op text;v_keys text[];v_event app_private.concert_events;v_ticket app_private.concert_tickets;
 v_title text;v_venue text;v_details text;v_date date;v_start time;v_doors time;v_capacity integer;v_open boolean;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_manager(actor,app_private.concert_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 if jsonb_typeof(p_command) is distinct from 'object' or octet_length(p_command::text)>4096 then raise exception 'Invalid command' using errcode='22023';end if;
 v_op:=p_command->>'op';
 v_keys:=case v_op
  when 'create' then array['op','title','date','startTime','doorsTime','venue','details','capacity','rsvpOpen']
  when 'edit' then array['op','eventId','expectedVersion','title','date','startTime','doorsTime','venue','details','capacity','rsvpOpen']
  when 'archive' then array['op','eventId','expectedVersion']
  when 'checkin' then array['op','ticketId'] when 'undo' then array['op','ticketId'] when 'cancel' then array['op','ticketId'] end;
 if v_keys is null or not(p_command ?& v_keys) or exists(select 1 from jsonb_object_keys(p_command) k where not(k=any(v_keys))) then raise exception 'Unexpected or missing field' using errcode='22023';end if;
 perform pg_advisory_xact_lock(742612);
 if v_op in ('edit','archive') then
  select * into v_event from app_private.concert_events where id=(p_command->>'eventId')::uuid and status='active' for update;
  if not found then raise exception 'Concert not editable' using errcode='23514';end if;
  if jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' or v_event.version<>(p_command->>'expectedVersion')::integer then raise exception 'Stale version' using errcode='40001';end if;
 end if;
 if v_op in ('create','edit') then
  if jsonb_typeof(p_command->'title') is distinct from 'string' or jsonb_typeof(p_command->'venue') is distinct from 'string' or jsonb_typeof(p_command->'details') is distinct from 'string'
   or (p_command->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or (p_command->>'startTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   or (jsonb_typeof(p_command->'doorsTime')<>'null' and (p_command->>'doorsTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
   or jsonb_typeof(p_command->'capacity') not in ('null','number') or jsonb_typeof(p_command->'rsvpOpen') is distinct from 'boolean' then raise exception 'Invalid concert details' using errcode='22023';end if;
  v_title:=btrim(p_command->>'title');v_venue:=btrim(p_command->>'venue');v_details:=btrim(p_command->>'details');
  v_date:=(p_command->>'date')::date;v_start:=(p_command->>'startTime')::time;v_doors:=(p_command->>'doorsTime')::time;
  v_capacity:=(p_command->>'capacity')::integer;v_open:=(p_command->>'rsvpOpen')::boolean;
  if length(v_title) not between 2 and 80 or length(v_venue) not between 2 and 120 or length(v_details)>600 or v_title ~ '[[:cntrl:]]' or v_venue ~ '[[:cntrl:]]'
   or (v_doors is not null and v_doors>v_start) or (v_capacity is not null and v_capacity not between 1 and 5000) then raise exception 'Invalid concert details' using errcode='23514';end if;
 end if;
 if v_op='create' then
  if exists(select 1 from app_private.concert_events where status='active') then raise exception 'A concert is already open' using errcode='23505';end if;
  insert into app_private.concert_events(title,event_date,start_time,doors_time,venue,details,capacity,rsvp_open,created_by,updated_by)
   values(v_title,v_date,v_start,v_doors,v_venue,v_details,v_capacity,v_open,actor,actor) returning * into v_event;
  insert into app_private.concert_audit(actor_id,event_id,operation,detail) values(actor,v_event.id,'event_create',to_jsonb(v_event));
  return jsonb_build_object('ok',true,'eventId',v_event.id);
 elsif v_op='edit' then
  if v_capacity is not null and v_capacity<(select coalesce(sum(party_size),0) from app_private.concert_tickets where event_id=v_event.id and status='active') then raise exception 'Capacity below seats taken' using errcode='23514';end if;
  update app_private.concert_events set title=v_title,event_date=v_date,start_time=v_start,doors_time=v_doors,venue=v_venue,details=v_details,capacity=v_capacity,rsvp_open=v_open,
   version=version+1,updated_by=actor,updated_at=clock_timestamp() where id=v_event.id returning * into v_event;
  insert into app_private.concert_audit(actor_id,event_id,operation,detail) values(actor,v_event.id,'event_edit',to_jsonb(v_event));
  return jsonb_build_object('ok',true,'eventId',v_event.id);
 elsif v_op='archive' then
  update app_private.concert_events set status='archived',rsvp_open=false,version=version+1,updated_by=actor,updated_at=clock_timestamp() where id=v_event.id;
  insert into app_private.concert_audit(actor_id,event_id,operation) values(actor,v_event.id,'event_archive');
  return jsonb_build_object('ok',true,'eventId',v_event.id);
 end if;
 select t.* into v_ticket from app_private.concert_tickets t join app_private.concert_events e on e.id=t.event_id and e.status='active'
  where t.id=(p_command->>'ticketId')::uuid and t.status='active' for update of t;
 if not found then raise exception 'Ticket not found' using errcode='23514';end if;
 if v_op='checkin' then
  if v_ticket.checked_in_at is null then update app_private.concert_tickets set checked_in_at=clock_timestamp(),checked_in_by=actor where id=v_ticket.id;end if;
 elsif v_op='undo' then
  update app_private.concert_tickets set checked_in_at=null,checked_in_by=null where id=v_ticket.id;
 else
  update app_private.concert_tickets set status='cancelled' where id=v_ticket.id;
 end if;
 insert into app_private.concert_audit(actor_id,event_id,ticket_id,operation,detail) values(actor,v_ticket.event_id,v_ticket.id,v_op,case when v_op='checkin' then '{"via":"manual"}'::jsonb end);
 return jsonb_build_object('ok',true,'ticketId',v_ticket.id);
end $$;

-- Thin SECURITY INVOKER wrappers, same boundary as the other modules.
create function public.concert_workspace(p_invite_digest text) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.concert_workspace(p_invite_digest)$$;
create function public.concert_member_rsvp(p_ticket uuid,p_digest text,p_email text,p_party integer) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.concert_member_rsvp(p_ticket,p_digest,p_email,p_party)$$;
create function public.concert_ticket_owner_email(p_ticket uuid) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.concert_ticket_owner_email(p_ticket)$$;
create function public.concert_scan(p_digest text) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.concert_scan(p_digest)$$;
create function public.concert_attendance() returns jsonb language sql stable security invoker set search_path='' as $$select app_private.concert_attendance()$$;
create function public.concert_command(p_command jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.concert_command(p_command)$$;
create function public.concert_guest_rsvp(p_invite_digest text,p_ticket uuid,p_digest text,p_name text,p_email text,p_phone text,p_party integer) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.concert_guest_rsvp(p_invite_digest,p_ticket,p_digest,p_name,p_email,p_phone,p_party)$$;
create function public.concert_invite_view(p_invite_digest text) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.concert_invite_view(p_invite_digest)$$;
create function public.concert_ticket_view(p_digest text) returns jsonb language sql stable security invoker set search_path='' as $$select app_private.concert_ticket_view(p_digest)$$;

revoke all on function app_private.concert_module_id(),app_private.concert_module_open(),app_private.concert_event_json(app_private.concert_events),app_private.concert_has_room(uuid,integer),app_private.concert_check_digest(text) from public,anon,authenticated,service_role;
revoke all on function app_private.concert_workspace(text),app_private.concert_member_rsvp(uuid,text,text,integer),app_private.concert_ticket_owner_email(uuid),app_private.concert_scan(text),app_private.concert_attendance(),app_private.concert_command(jsonb),
 app_private.concert_guest_rsvp(text,uuid,text,text,text,text,integer),app_private.concert_invite_view(text),app_private.concert_ticket_view(text) from public,anon,authenticated,service_role;
revoke all on function public.concert_workspace(text),public.concert_member_rsvp(uuid,text,text,integer),public.concert_ticket_owner_email(uuid),public.concert_scan(text),public.concert_attendance(),public.concert_command(jsonb),
 public.concert_guest_rsvp(text,uuid,text,text,text,text,integer),public.concert_invite_view(text),public.concert_ticket_view(text) from public,anon,authenticated,service_role;
-- Signed-in members: their own workspace and RSVP; scan, attendance and commands check manager inside.
grant execute on function app_private.concert_workspace(text),app_private.concert_member_rsvp(uuid,text,text,integer),app_private.concert_ticket_owner_email(uuid),app_private.concert_scan(text),app_private.concert_attendance(),app_private.concert_command(jsonb) to authenticated;
grant execute on function public.concert_workspace(text),public.concert_member_rsvp(uuid,text,text,integer),public.concert_ticket_owner_email(uuid),public.concert_scan(text),public.concert_attendance(),public.concert_command(jsonb) to authenticated;
-- Guests have no session: only the trusted server (service role) reaches these, after bot and rate checks.
grant execute on function app_private.concert_guest_rsvp(text,uuid,text,text,text,text,integer),app_private.concert_invite_view(text),app_private.concert_ticket_view(text) to service_role;
grant execute on function public.concert_guest_rsvp(text,uuid,text,text,text,text,integer),public.concert_invite_view(text),public.concert_ticket_view(text) to service_role;

-- Catalog registration only, as draft. Anthony approves it at release; the owner manages it automatically.
insert into app_private.app_modules(module_key,display_name,short_name,description,accent,route_path,status)
 values('concert','Healing Concert','Concert','RSVP, invite guests and show your ticket for the Healing Concert.','#a08aff','/modules/concert','draft');
commit;
