begin;
alter table app_private.concert_tickets add column party_position smallint check(party_position between 2 and 10);
create unique index concert_party_position on app_private.concert_tickets(registration_id,party_position) where party_position is not null;

-- Split companions use a domain-separated credential derived from the private
-- lead digest and their random ID. Staff-visible ticket IDs alone cannot mint it.
create function app_private.concert_companion_token(lead_digest text, companion uuid) returns text
language sql immutable strict set search_path='' as $$
 select translate(rtrim(encode(sha256(convert_to('concert-companion:v1:'||lead_digest||':'||companion::text,'UTF8')),'base64'),'='),'+/','-_')
$$;
revoke all on function app_private.concert_companion_token(text,uuid) from public,anon,authenticated,service_role;

create function app_private.concert_split_party(lead_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare lead app_private.concert_tickets; child uuid; pos integer;
begin
 select * into lead from app_private.concert_tickets where id=lead_id for update;
 if not found or lead.party_size<=1 then return; end if;
 update app_private.concert_tickets set party_size=1,additional_guest_names=null,registration_id=id where id=lead_id;
 for pos in 2..lead.party_size loop
   child:=gen_random_uuid();
   insert into app_private.concert_tickets(id,event_id,token_digest,guest_name,party_size,registration_id,party_position,
     guest_inviter_name,status,checked_in_at,checked_in_by,created_at)
   values(child,lead.event_id,encode(sha256(convert_to(app_private.concert_companion_token(lead.token_digest,child),'UTF8')),'hex'),
     coalesce(lead.additional_guest_names[pos-1],'Guest '||pos::text),1,lead.id,pos,lead.guest_inviter_name,
     lead.status,lead.checked_in_at,lead.checked_in_by,lead.created_at);
 end loop;
end $$;
revoke all on function app_private.concert_split_party(uuid) from public,anon,authenticated,service_role;
-- Preserve seat totals, the original QR, cancellations and prior door scans.
select app_private.concert_split_party(id) from app_private.concert_tickets where party_size>1;
create function app_private.concert_finish_party() returns trigger language plpgsql security definer set search_path='' as $$
begin perform app_private.concert_split_party(new.id); return null; end $$;
revoke all on function app_private.concert_finish_party() from public,anon,authenticated,service_role;
create constraint trigger concert_finish_party after insert or update of party_size on app_private.concert_tickets
 deferrable initially deferred for each row when(new.party_size>1) execute function app_private.concert_finish_party();

create or replace function app_private.concert_registration_records(p_ticket uuid) returns jsonb
language sql stable set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',t.id,'name',t.guest_name,'partySize',t.party_size,
   'checkedInAt',t.checked_in_at,'companionToken',case when t.party_position is not null then app_private.concert_companion_token(lead.token_digest,t.id) end))
   order by (t.id=p_ticket) desc,t.party_position nulls last,t.created_at,t.id),'[]'::jsonb)
 from app_private.concert_tickets t left join app_private.concert_tickets lead on lead.id=t.registration_id
 where t.status='active' and (t.id=p_ticket or t.registration_id=p_ticket)
$$;

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
  perform app_private.concert_split_party(ticket.id);
  return jsonb_build_object('tickets',app_private.concert_registration_records(ticket.id),
    'delivery',ticket.id,'notification',invite.id,'hostParty',case when host_id is not null then ticket.id end);
end $$;

create or replace function app_private.concert_ticket_view(p_digest text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare v_ticket app_private.concert_tickets;v_event app_private.concert_events;
begin
 perform app_private.concert_check_digest(p_digest);
 select * into v_ticket from app_private.concert_tickets where token_digest=p_digest;
 if not found then return jsonb_build_object('valid',false);end if;
 select * into v_event from app_private.concert_events where id=v_ticket.event_id;
 return jsonb_build_object('valid',true,'ticketId',v_ticket.id,'passes',case when v_event.status='active' and v_ticket.status='active' then app_private.concert_registration_records(v_ticket.id) end,'name',v_ticket.guest_name,'email',coalesce(v_ticket.email,(select parent.email from app_private.concert_tickets parent where parent.id=v_ticket.registration_id and parent.event_id=v_ticket.event_id)),'partySize',v_ticket.party_size,
  'status',v_ticket.status,'checkedInAt',v_ticket.checked_in_at,'event',app_private.concert_event_json(v_event)-'version'-'seatsTaken'-'capacity'-'rsvpOpen'||jsonb_build_object('archived',v_event.status<>'active'));
end $$;

create or replace function app_private.concert_host_context(p jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('email',h.email,'eventId',h.event_id,'name',h.name,'delivery',h.delivery,
    'event',app_private.concert_event_json(e),'guestEmail',t.email,'ticketId',t.id,'partySize',jsonb_array_length(passes.items),'additionalNames',coalesce((select jsonb_agg(item->'name') from jsonb_array_elements(passes.items) item where item->>'id'<>t.id::text),'[]'::jsonb))
  from (
    select i.sender_email email,i.event_id,i.guest_name name,
      case when i.party_confirmed then i.ticket_id end ticket_id,m.status delivery
    from app_private.concert_named_invites i left join app_private.concert_mail m on m.reference_id=i.id and m.kind='invitation'
    where i.id=(p->>'reference')::uuid and p->>'source'='named'
    union all
    select lower(u.email),t.event_id,t.guest_name,t.id,null from app_private.concert_tickets t
    join app_private.account_links l on l.member_id=t.invited_by and l.enabled
    join auth.users u on u.id=l.auth_user_id and u.email_confirmed_at is not null
    where t.id=(p->>'reference')::uuid and p->>'source'='member'
  ) h join app_private.concert_events e on e.id=h.event_id left join app_private.concert_tickets t on t.id=h.ticket_id and t.status='active'
  cross join lateral (select app_private.concert_registration_records(t.id) items) passes
  limit 1
$$;

create or replace function app_private.concert_sender_status(p jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'status',status,'partySize',party) order by created_at desc,name),'[]'::jsonb)
  from (
    select i.guest_name name, i.created_at,jsonb_array_length(app_private.concert_registration_records(t.id)) party,case when i.withdrawn_at is not null then 'Withdrawn'
      when t.status='active' then 'Confirmed' when t.id is not null then 'Cancelled'
      when m.status='sent' then 'Invitation emailed' when m.status='failed' then 'Email delivery failed'
      when i.guest_email is null then 'Invitation link created' else 'Email pending' end status
    from app_private.concert_named_invites i left join app_private.concert_tickets t on t.id=i.ticket_id
    left join app_private.concert_mail m on m.kind='invitation' and m.reference_id=i.id
    where i.event_id=(p->>'eventId')::uuid and i.sender_email=p->>'email'
    union all
    select t.guest_name,t.created_at,jsonb_array_length(app_private.concert_registration_records(t.id)),case when t.status='active' then 'Confirmed' else 'Cancelled' end
    from app_private.concert_tickets t join app_private.account_links l on l.member_id=t.invited_by and l.enabled
    join auth.users u on u.id=l.auth_user_id and lower(u.email)=p->>'email' and u.email_confirmed_at is not null
    where t.event_id=(p->>'eventId')::uuid and t.member_id is null
  ) invitations
$$;

commit;
