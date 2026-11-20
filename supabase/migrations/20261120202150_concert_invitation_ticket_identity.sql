begin;

-- Personal invitations and reusable-link submissions identify parties independently
-- of the receipt inbox. Ordinary email-based registrations retain their unique key.
alter table app_private.concert_tickets add column invitation_key text
  check (invitation_key ~ '^[0-9a-f]{64}$');
update app_private.concert_tickets t set invitation_key=i.token_digest
  from app_private.concert_named_invites i where i.ticket_id=t.id and i.party_confirmed;
create unique index concert_ticket_invitation_key on app_private.concert_tickets(event_id,invitation_key)
  where invitation_key is not null;
drop index app_private.concert_tickets_email_idx;
create unique index concert_tickets_email_idx on app_private.concert_tickets(event_id,lower(email))
  where status='active' and invitation_key is null;

create or replace function app_private.concert_accept_party(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  invite app_private.concert_named_invites;
  event app_private.concert_events;
  ticket app_private.concert_tickets;
  host_id uuid;
  host_name text;
  party_key text;
  names text[];
  receipt_email text := lower(btrim(p->>'email'));
begin
  if not app_private.concert_module_open() then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  if p ? 'hostDigest' then
    select m.id,m.display_name into host_id,host_name from app_private.concert_invites i
      join public.members m on m.id=i.member_id and m.status='active' where i.token_digest=p->>'hostDigest';
    if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
    select * into event from app_private.concert_events e where e.status='active' and e.id=(p->>'eventId')::uuid for update;
    party_key := p->>'requestDigest';
    perform app_private.concert_check_digest(party_key);
  else
    select e.* into event from app_private.concert_named_invites i join app_private.concert_events e on e.id=i.event_id
      where i.token_digest=p->>'inviteDigest' and e.status='active' and e.public_rsvp for update of e;
    select * into invite from app_private.concert_named_invites i where i.event_id=event.id
      and i.token_digest=p->>'inviteDigest' and i.withdrawn_at is null for update;
    if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
    host_name := invite.sender_name;
    party_key := invite.token_digest;
  end if;
  if event.id is null then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  -- The bearer of a personal link can open only its bound ticket. A reusable
  -- link also requires the original party's unguessable submission key.
  if invite.ticket_id is not null then
    select * into strict ticket from app_private.concert_tickets t where t.id=invite.ticket_id and t.event_id=event.id;
  elsif host_id is not null then
    select * into ticket from app_private.concert_tickets t
      where t.event_id=event.id and t.invitation_key=party_key and t.invited_by=host_id;
  end if;
  if ticket.id is not null then
    if ticket.status<>'active' then raise exception 'Ticket cancelled' using errcode='23514'; end if;
    if invite.id is not null and not invite.party_confirmed then
      -- Older accepted invitations already have a ticket and may have sent
      -- the old text notice. Send the upgraded QR receipt once on confirmation.
      update app_private.concert_named_invites set party_confirmed=true where id=invite.id;
      insert into app_private.concert_mail(kind,reference_id) values ('tickets',ticket.id),('registered',invite.id)
        on conflict(kind,reference_id) do update set status='pending', updated_at=clock_timestamp()
        where app_private.concert_mail.status in ('sent','failed');
    end if;
  else
    names := array(select btrim(value) from jsonb_array_elements_text(p->'names'));
    if cardinality(names) not between 1 and 10 or exists(select 1 from unnest(names) n
      where n is null or char_length(n) not between 2 and 120 or n ~ '[[:cntrl:]]') or receipt_email is null then
      raise exception 'Invalid party' using errcode='22023';
    end if;
    if not event.rsvp_open then raise exception 'Registration closed' using errcode='23514'; end if;
    if not app_private.concert_has_room(event.id,cardinality(names)) then raise exception 'Concert full' using errcode='LVZCF'; end if;
    insert into app_private.concert_tickets(id,event_id,token_digest,guest_name,email,registration_id,party_size,
      additional_guest_names,guest_inviter_name,invited_by,invitation_key)
    values((p->>'id')::uuid,event.id,p->>'digest',names[1],receipt_email,(p->>'id')::uuid,cardinality(names),
      names[2:cardinality(names)],host_name,host_id,party_key) returning * into ticket;
    if invite.id is not null then
      update app_private.concert_named_invites set ticket_id=ticket.id,guest_name=names[1],guest_email=receipt_email,party_confirmed=true where id=invite.id;
      insert into app_private.concert_mail(kind,reference_id) values ('registered',invite.id);
    end if;
    insert into app_private.concert_audit(event_id,ticket_id,operation) values(event.id,ticket.id,'rsvp_guest');
    insert into app_private.concert_mail(kind,reference_id) values ('tickets',ticket.id);
  end if;
  return jsonb_build_object('tickets',jsonb_build_array(jsonb_build_object('id',ticket.id,'name',ticket.guest_name,'partySize',ticket.party_size)),
    'delivery',ticket.id,'notification',invite.id,'hostParty',case when host_id is not null then ticket.id end);
end $$;

create or replace function app_private.concert_member_rsvp(p_ticket uuid,p_digest text,p_email text,p_party integer) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_event app_private.concert_events;v_existing app_private.concert_tickets;v_name text;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_allowed(actor,app_private.concert_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 perform app_private.concert_check_digest(p_digest);
 if p_ticket is null or p_party is null or p_party not between 1 and 10 then raise exception 'Invalid RSVP' using errcode='22023';end if;
 select * into v_event from app_private.concert_events where status='active' for update;
 if not found or not v_event.rsvp_open then raise exception 'RSVP closed' using errcode='23514';end if;
 select * into v_existing from app_private.concert_tickets where event_id=v_event.id and status='active' and (member_id=actor or (invitation_key is null and lower(email)=lower(btrim(p_email))));
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

create or replace function app_private.concert_guest_rsvp_insert(p_inviter uuid,p_public_event uuid,p_ticket uuid,p_digest text,p_name text,p_email text,p_phone text,p_party integer) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare v_event app_private.concert_events;v_existing uuid;v_name text:=btrim(coalesce(p_name,''));v_email text:=lower(btrim(coalesce(p_email,'')));v_phone text:=nullif(btrim(coalesce(p_phone,'')),'');
begin
 perform app_private.concert_check_digest(p_digest);
 if not app_private.concert_module_open() then raise exception 'Not available' using errcode='42501';end if;
 if p_ticket is null or p_party is null or p_party not between 1 and 10 or length(v_name) not between 2 and 120 or v_name ~ '[[:cntrl:]]'
  or length(v_email)>254 or v_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
  or (v_phone is not null and (length(v_phone) not between 7 and 30 or v_phone !~ '^[0-9+().[:space:]-]+$')) then raise exception 'Invalid RSVP' using errcode='22023';end if;
 select * into v_event from app_private.concert_events where status='active'
  and (p_public_event is null or (id=p_public_event and public_rsvp))
  for update;
 if not found or not v_event.rsvp_open then raise exception 'RSVP closed' using errcode='23514';end if;
 select id into v_existing from app_private.concert_tickets where event_id=v_event.id and status='active' and invitation_key is null and lower(email)=v_email;
 -- Never reveal the existing ticket here; the server re-sends it to that email address.
 if found then return jsonb_build_object('ticketId',v_existing,'created',false,'email',v_email);end if;
 if not app_private.concert_has_room(v_event.id,p_party) then raise exception 'Concert full' using errcode='LVZCF';end if;
 insert into app_private.concert_tickets(id,event_id,token_digest,guest_name,email,phone,party_size,invited_by)
  values(p_ticket,v_event.id,p_digest,v_name,v_email,v_phone,p_party,p_inviter);
 insert into app_private.concert_audit(event_id,ticket_id,operation,detail) values(v_event.id,p_ticket,'rsvp_guest',jsonb_build_object('invitedBy',p_inviter));
 return jsonb_build_object('ticketId',p_ticket,'created',true,'email',v_email);
end $$;

create or replace function app_private.concert_register_named(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  event app_private.concert_events;
  invitation app_private.concert_named_invites;
  existing app_private.concert_tickets;
  entry jsonb;
  intake jsonb := p->'intake';
  v_email text := p->>'email';
  v_inviter_name text := case when intake is null then p->>'inviterName' end;
  lead uuid := (p->>'id')::uuid;
  event_id uuid := (p->>'eventId')::uuid;
  invite_id uuid := (p->>'inviteId')::uuid;
  ticket_id uuid;
  idx integer := 0;
  kind text := 'rsvp_guest';
begin
  if not app_private.concert_module_open() or jsonb_typeof(p->'tickets') is distinct from 'array' or
    jsonb_array_length(p->'tickets') not between 1 and 10 or v_email is null or lead is null then
    raise exception 'Invalid registration' using errcode='22023';
  end if;
  select * into event from app_private.concert_events e where e.id=event_id and e.status='active' and e.public_rsvp for update;
  if not found then raise exception 'Registration closed' using errcode='23514'; end if;

  if invite_id is not null then
    select * into invitation from app_private.concert_named_invites i
      where i.id=invite_id and i.event_id=event.id and i.withdrawn_at is null for update;
    if not found or jsonb_array_length(p->'tickets')<>1 or intake is not null or
      (invitation.guest_email is not null and invitation.guest_email<>v_email) or
      lower(invitation.guest_name)<>lower(p->'tickets'->0->>'name') then
      raise exception 'Invitation is unavailable' using errcode='42501';
    end if;
    if invitation.ticket_id is not null and invitation.ticket_id<>lead then
      return jsonb_build_object('existing',true);
    end if;
  end if;

  select * into existing from app_private.concert_tickets t
    where t.event_id=event.id and t.invitation_key is null and lower(t.email)=v_email and (t.status='active' or
      (t.registration_id=t.id and exists(select 1 from app_private.concert_tickets child
        where child.registration_id=t.id and child.status='active')))
    order by (t.status='active') desc,t.created_at desc limit 1;
  if found then
    if existing.id=lead and existing.registration_id=lead then
      return jsonb_build_object('tickets',app_private.concert_registration_records(lead),'delivery',lead,'notification',invite_id);
    end if;
    -- A previously registered named guest can accept an invitation without
    -- consuming another seat once the API has proved inbox control.
    if invite_id is not null and existing.status='active' and p->>'verified'='true' and lower(existing.guest_name)=lower(invitation.guest_name)
      and not exists(select 1 from app_private.concert_named_invites i where i.ticket_id=existing.id) then
      update app_private.concert_named_invites set ticket_id=existing.id where id=invite_id;
      if v_inviter_name is not null then
        update app_private.concert_tickets set guest_inviter_name=v_inviter_name
          where id=existing.id and guest_inviter_name is null and member_id is null;
      end if;
      insert into app_private.concert_mail(kind,reference_id) values ('registered',invite_id) on conflict do nothing;
      return jsonb_build_object('existing',true,'notification',invite_id);
    end if;
    return jsonb_build_object('existing',true);
  end if;
  if not event.rsvp_open then raise exception 'Registration closed' using errcode='23514'; end if;
  if not app_private.concert_has_room(event.id,jsonb_array_length(p->'tickets')) then
    raise exception 'Concert full' using errcode='LVZCF';
  end if;
  if intake is not null then kind := 'rsvp_member'; end if;
  for entry in select value from jsonb_array_elements(p->'tickets') loop
    ticket_id := (entry->>'id')::uuid;
    if idx=0 and ticket_id<>lead then raise exception 'Invalid ticket' using errcode='22023'; end if;
    insert into app_private.concert_tickets(id,event_id,token_digest,guest_name,email,registration_id,guest_inviter_name)
      values(ticket_id,event.id,entry->>'digest',entry->>'name',case when idx=0 then v_email end,lead,v_inviter_name);
    insert into app_private.concert_audit(event_id,ticket_id,operation) values(event.id,ticket_id,kind);
    idx := idx+1;
  end loop;
  if intake is not null then
    insert into app_private.concert_registration_intake
      (ticket_id,email,church_title,first_name,last_name,zion_location,leader_name)
    values (lead,v_email,intake->>'title',intake->>'firstName',intake->>'lastName',intake->>'location',intake->>'leader');
  end if;
  insert into app_private.concert_mail(kind,reference_id) values ('tickets',lead);
  if invite_id is not null then
    update app_private.concert_named_invites set ticket_id=lead where id=invite_id;
    insert into app_private.concert_mail(kind,reference_id) values ('registered',invite_id);
  end if;
  return jsonb_build_object('tickets',app_private.concert_registration_records(lead),'delivery',lead,'notification',invite_id);
end $$;

create or replace function app_private.concert_named_invitation(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  event app_private.concert_events;
  invitation app_private.concert_named_invites;
  recipient jsonb;
  batch uuid := (p->>'batch')::uuid;
  event_key uuid := (p->>'eventId')::uuid;
  invite_key uuid := (p->>'id')::uuid;
  sender text := p->>'sender';
  action text := p->>'action';
begin
  if action='view' then
    select i.* into invitation from app_private.concert_named_invites i
      join app_private.concert_events e on e.id=i.event_id and e.status='active' and e.public_rsvp
      where i.token_digest=p->>'digest' and i.withdrawn_at is null and app_private.concert_module_open();
    if not found then return null; end if;
    select * into event from app_private.concert_events e where e.id=invitation.event_id;
    return jsonb_build_object('id',invitation.id,'name',invitation.guest_name,'email',invitation.guest_email,
      'senderName',invitation.sender_name,'accepted',invitation.ticket_id is not null,
      'confirmedTicket',case when invitation.party_confirmed then invitation.ticket_id end,'available',event.rsvp_open,'event',app_private.concert_event_json(event)-'version'-'capacity'-'seatsTaken'-'publicRsvp');
  end if;

  select * into event from app_private.concert_events e where e.id=event_key and e.status='active'
    and e.public_rsvp and app_private.concert_module_open() for update;
  if not found or sender is null then raise exception 'Registration closed' using errcode='23514'; end if;
  if action='create' then
    if not exists(select 1 from app_private.concert_named_invites i where i.batch_id=batch and i.event_id=event.id and i.sender_email=sender) then
      if not event.rsvp_open or not app_private.concert_has_room(event.id,1) then
        raise exception 'Registration closed or full' using errcode='23514';
      end if;
      for recipient in select value from jsonb_array_elements(p->'recipients') loop
        insert into app_private.concert_named_invites
          (id,batch_id,event_id,token_digest,sender_email,sender_name,guest_name,guest_email,relationship,first_visit,vip)
        values ((recipient->>'id')::uuid,batch,event.id,recipient->>'digest',sender,p->>'name',recipient->>'name',
          recipient->>'email',recipient->>'relationship',(recipient->>'firstVisit')::boolean,nullif(recipient->'vip','null'::jsonb));
        if recipient->>'email' is not null then
          insert into app_private.concert_mail(kind,reference_id) values ('invitation',(recipient->>'id')::uuid);
        end if;
      end loop;
    end if;
  elsif action in ('withdraw','resend') then
    select * into invitation from app_private.concert_named_invites i
      where i.id=invite_key and i.event_id=event.id and i.sender_email=sender for update;
    if not found or invitation.ticket_id is not null or invitation.withdrawn_at is not null then
      raise exception 'Invitation is unavailable' using errcode='42501';
    end if;
    if action='withdraw' then
      update app_private.concert_named_invites set withdrawn_at=now() where id=invite_key;
    elsif event.rsvp_open and invitation.guest_email is not null then
      update app_private.concert_mail set status='pending',updated_at=now()
        where kind='invitation' and reference_id=invite_key and status in ('failed','sent');
    end if;
  elsif action<>'list' then
    raise exception 'Invalid invitation action' using errcode='22023';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'name',i.guest_name,'vip',i.vip is not null,
    'hasEmail',i.guest_email is not null,'accepted',i.ticket_id is not null,'withdrawn',i.withdrawn_at is not null,
    'delivery',m.status,'notification',notice.status) order by i.created_at desc,i.guest_name)
    from app_private.concert_named_invites i left join app_private.concert_mail m on m.kind='invitation' and m.reference_id=i.id
    left join app_private.concert_mail notice on notice.kind='registered' and notice.reference_id=i.id
    where i.event_id=event.id and i.sender_email=sender and (batch is null or i.batch_id=batch)),'[]'::jsonb);
end $$;

create or replace function app_private.concert_recover_tickets(p jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(item order by lead.created_at,records.position),'[]'::jsonb)
  from app_private.concert_tickets lead
  cross join lateral jsonb_array_elements(app_private.concert_registration_records(lead.id)) with ordinality records(item,position)
  where lead.event_id=(p->>'eventId')::uuid and lower(lead.email)=p->>'email'
$$;

commit;
