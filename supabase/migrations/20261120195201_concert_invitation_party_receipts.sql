begin;

alter table app_private.concert_named_invites add column party_confirmed boolean not null default false;
alter table app_private.concert_mail drop constraint concert_mail_kind_check,
  add constraint concert_mail_kind_check check (kind in ('invitation','registered','tickets','host_receipt','host_party'));

-- One durable receipt per invitation, including invitations created for sharing by hand.
create function app_private.concert_queue_host_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into app_private.concert_mail(kind,reference_id)
    values (case when tg_table_name='concert_tickets' then 'host_party' else 'host_receipt' end,
      case when tg_table_name='concert_mail' then (to_jsonb(new)->>'reference_id')::uuid else new.id end) on conflict do nothing;
  return new;
end $$;
revoke all on function app_private.concert_queue_host_receipt() from public,anon,authenticated;
create trigger named_invitation_receipt after insert on app_private.concert_named_invites
  for each row execute function app_private.concert_queue_host_receipt();
create trigger emailed_invitation_receipt after update of status on app_private.concert_mail
  for each row when (new.kind='invitation' and new.status='sent' and old.status<>'sent')
  execute function app_private.concert_queue_host_receipt();
create trigger reusable_invitation_receipt after insert on app_private.concert_tickets
  for each row when (new.invited_by is not null and new.member_id is null)
  execute function app_private.concert_queue_host_receipt();

create function app_private.concert_accept_party(p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  invite app_private.concert_named_invites;
  event app_private.concert_events;
  lead uuid := (p->>'id')::uuid;
  names text[];
  v_email text := lower(btrim(p->>'email'));
begin
  select e.* into event from app_private.concert_named_invites i join app_private.concert_events e on e.id=i.event_id
    where i.token_digest=p->>'inviteDigest' and e.status='active' and e.public_rsvp for update of e;
  if not found or not app_private.concert_module_open() then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  select * into invite from app_private.concert_named_invites i where i.event_id=event.id
    and i.token_digest=p->>'inviteDigest' and i.withdrawn_at is null for update;
  if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  if invite.ticket_id is not null then
    if invite.ticket_id=lead and invite.party_confirmed then
      return jsonb_build_object('tickets',app_private.concert_registration_records(lead),'delivery',lead,'notification',invite.id);
    end if;
    return jsonb_build_object('existing',true);
  end if;
  names := array(select btrim(value) from jsonb_array_elements_text(p->'names'));
  if cardinality(names) not between 1 and 10 or exists(select 1 from unnest(names) n
    where n is null or char_length(n) not between 2 and 120 or n ~ '[[:cntrl:]]') or v_email is null
    or lead is null or p->>'digest' is null then raise exception 'Invalid party' using errcode='22023'; end if;
  if not event.rsvp_open then raise exception 'Registration closed' using errcode='23514'; end if;
  if exists(select 1 from app_private.concert_tickets t where t.event_id=event.id and lower(t.email)=v_email and
    (t.status='active' or exists(select 1 from app_private.concert_tickets c where c.registration_id=t.id and c.status='active'))) then
    return jsonb_build_object('existing',true);
  end if;
  if not app_private.concert_has_room(event.id,cardinality(names)) then raise exception 'Concert full' using errcode='LVZCF'; end if;
  insert into app_private.concert_tickets(id,event_id,token_digest,guest_name,email,registration_id,party_size,additional_guest_names,guest_inviter_name)
    values(lead,event.id,p->>'digest',names[1],v_email,lead,cardinality(names),names[2:cardinality(names)],invite.sender_name);
  update app_private.concert_named_invites set ticket_id=lead,guest_name=names[1],guest_email=v_email,party_confirmed=true where id=invite.id;
  insert into app_private.concert_audit(event_id,ticket_id,operation) values(event.id,lead,'rsvp_guest');
  insert into app_private.concert_mail(kind,reference_id) values ('tickets',lead),('registered',invite.id);
  return jsonb_build_object('tickets',app_private.concert_registration_records(lead),'delivery',lead,'notification',invite.id);
end $$;

-- Mail recipients and party details are resolved from committed records, never the HTTP request.
create function app_private.concert_host_context(p jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('email',h.email,'eventId',h.event_id,'name',h.name,'delivery',h.delivery,
    'event',app_private.concert_event_json(e),'guestEmail',t.email,'ticketId',t.id,'partySize',t.party_size,'additionalNames',coalesce(to_jsonb(t.additional_guest_names),'[]'::jsonb))
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
  limit 1
$$;

create function app_private.concert_sender_status(p jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('name',name,'status',status,'partySize',party) order by created_at desc,name),'[]'::jsonb)
  from (
    select i.guest_name name, i.created_at,t.party_size party,case when i.withdrawn_at is not null then 'Withdrawn'
      when t.status='active' then 'Confirmed' when t.id is not null then 'Cancelled'
      when m.status='sent' then 'Invitation emailed' when m.status='failed' then 'Email delivery failed'
      when i.guest_email is null then 'Invitation link created' else 'Email pending' end status
    from app_private.concert_named_invites i left join app_private.concert_tickets t on t.id=i.ticket_id
    left join app_private.concert_mail m on m.kind='invitation' and m.reference_id=i.id
    where i.event_id=(p->>'eventId')::uuid and i.sender_email=p->>'email'
    union all
    select t.guest_name,t.created_at,t.party_size,case when t.status='active' then 'Confirmed' else 'Cancelled' end
    from app_private.concert_tickets t join app_private.account_links l on l.member_id=t.invited_by and l.enabled
    join auth.users u on u.id=l.auth_user_id and lower(u.email)=p->>'email' and u.email_confirmed_at is not null
    where t.event_id=(p->>'eventId')::uuid and t.member_id is null
  ) invitations
$$;

create or replace function app_private.concert_delivery(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  delivery app_private.concert_mail;
  invitation app_private.concert_named_invites;
  key uuid := (p->>'id')::uuid;
  reference uuid := (p->>'reference')::uuid;
  action text := p->>'action';
  v_kind text := p->>'kind';
  email text;
begin
  if action='finish' then
    update app_private.concert_mail m set status=case when p->>'sent'='true' then 'sent' else 'failed' end,updated_at=clock_timestamp()
      where m.id=key and m.status='sending' and m.attempts=(p->>'attempt')::integer;
    return null;
  end if;
  select * into delivery from app_private.concert_mail m
    where m.reference_id=reference and m.kind=v_kind for update;
  if not found or delivery.status='sent' or
    (delivery.status='sending' and delivery.updated_at>now()-interval '2 minutes') then return null; end if;
  if delivery.kind='tickets' then
    select t.email into email from app_private.concert_tickets t where t.id=reference and
      (t.status='active' or exists(select 1 from app_private.concert_tickets child where child.registration_id=t.id and child.status='active'));
  elsif delivery.kind in ('host_receipt','host_party') then
    email:=app_private.concert_host_context(jsonb_build_object('reference',reference,'source',
      case when delivery.kind='host_party' then 'member' else 'named' end))->>'email';
  else
    select * into invitation from app_private.concert_named_invites i where i.id=reference and i.withdrawn_at is null;
    if delivery.kind='invitation' and invitation.ticket_id is null then email:=invitation.guest_email; end if;
    if delivery.kind='registered' and invitation.ticket_id is not null then email:=invitation.sender_email; end if;
  end if;
  if email is null then return null; end if;
  update app_private.concert_mail m set status='sending',attempts=m.attempts+1,updated_at=clock_timestamp()
    where m.id=delivery.id returning * into delivery;
  return jsonb_build_object('id',delivery.id,'attempt',delivery.attempts,'email',email,
    'name',invitation.guest_name,'sender',invitation.sender_name,'eventId',invitation.event_id,
    'tickets',case when delivery.kind='tickets' then app_private.concert_registration_records(reference) end);
end $$;

create function public.concert_accept_party(p jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.concert_accept_party(p)$$;
revoke all on function public.concert_accept_party(jsonb), app_private.concert_accept_party(jsonb) from public,anon,authenticated;
grant execute on function public.concert_accept_party(jsonb), app_private.concert_accept_party(jsonb) to service_role;
create function public.concert_host_context(p jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.concert_host_context(p)$$;
revoke all on function public.concert_host_context(jsonb), app_private.concert_host_context(jsonb) from public,anon,authenticated;
grant execute on function public.concert_host_context(jsonb), app_private.concert_host_context(jsonb) to service_role;
create function public.concert_sender_status(p jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.concert_sender_status(p)$$;
revoke all on function public.concert_sender_status(jsonb), app_private.concert_sender_status(jsonb) from public,anon,authenticated;
grant execute on function public.concert_sender_status(jsonb), app_private.concert_sender_status(jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
