begin;
alter table app_private.concert_tickets
  add column guest_inviter_name text check (guest_inviter_name ~ '[^[:space:]]' and
    char_length(guest_inviter_name) <= 120 and guest_inviter_name !~ '[[:cntrl:]]'),
  add column additional_guest_names text[] check (cardinality(additional_guest_names) = party_size - 1);

-- The app requires the inviter for new guests. Nullable storage supports older
-- tickets and allows the database and app release to roll out independently.

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
    where t.event_id=event.id and lower(t.email)=v_email and (t.status='active' or
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

-- Existing reusable invitations keep a single QR per party. Save the guest
-- details in the same transaction, only when a new ticket was created.
create function app_private.concert_register_guest_party(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_ticket_id uuid := (p->>'ticketId')::uuid;
  v_party_size integer := (p->>'partySize')::integer;
  v_inviter_name text := p->>'inviterName';
  v_names text[];
begin
  if v_inviter_name is null or jsonb_typeof(p->'attendeeNames') is distinct from 'array' then
    raise exception 'Missing guest details' using errcode='22023';
  end if;
  v_names := array(select jsonb_array_elements_text(p->'attendeeNames'));
  if cardinality(v_names) is distinct from v_party_size - 1 or exists (
    select 1 from unnest(v_names) name where name is null or char_length(btrim(name)) not between 2 and 120 or name ~ '[[:cntrl:]]'
  ) then
    raise exception 'Invalid attendee names' using errcode='22023';
  end if;
  if p->>'inviteDigest' is not null then
    v_result := app_private.concert_guest_rsvp(p->>'inviteDigest',v_ticket_id,p->>'digest',p->>'name',p->>'email',p->>'phone',v_party_size);
  else
    v_result := app_private.concert_shared_rsvp((p->>'eventId')::uuid,v_ticket_id,p->>'digest',p->>'name',p->>'email',p->>'phone',v_party_size);
  end if;
  if v_result->>'created'='true' then
    update app_private.concert_tickets set guest_inviter_name=v_inviter_name, additional_guest_names=v_names
      where id=v_ticket_id;
  end if;
  return v_result;
end $$;

create function public.concert_register_guest_party(p jsonb) returns jsonb
language sql volatile security invoker set search_path = '' as $$select app_private.concert_register_guest_party(p)$$;
revoke all on function app_private.concert_register_guest_party(jsonb), public.concert_register_guest_party(jsonb) from public,anon,authenticated,service_role;
grant execute on function app_private.concert_register_guest_party(jsonb), public.concert_register_guest_party(jsonb) to service_role;

create or replace function app_private.concert_attendance()returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_event app_private.concert_events;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_manager(actor,app_private.concert_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 select * into v_event from app_private.concert_events where status='active';
 if not found then return jsonb_build_object('event',null,'tickets','[]'::jsonb);end if;
 return jsonb_build_object('event',app_private.concert_event_json(v_event),'tickets',coalesce((
  select jsonb_agg(jsonb_build_object('id',t.id,'name',t.guest_name,'email',t.email,'phone',t.phone,'partySize',t.party_size,
   'member',t.member_id is not null,'invitedBy',coalesce(t.guest_inviter_name,i.sender_name,inv.display_name),'additionalNames',t.additional_guest_names,'createdAt',t.created_at,'checkedInAt',t.checked_in_at,'checkedInBy',chk.display_name)
   order by lower(t.guest_name),t.id)
  from app_private.concert_tickets t left join public.members inv on inv.id=t.invited_by left join public.members chk on chk.id=t.checked_in_by
  left join app_private.concert_named_invites i on i.ticket_id=t.id
  where t.event_id=v_event.id and t.status='active'),'[]'::jsonb));
end $$;

notify pgrst, 'reload schema';
commit;
