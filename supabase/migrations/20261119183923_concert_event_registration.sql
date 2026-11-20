begin;

update app_private.app_modules set display_name = 'Event Invitation and Registration' where module_key = 'concert';

-- Secondary guests and door walk-ins have no individual email. The primary
-- ticket keeps the existing unique event/email rule and legacy links still work.
alter table app_private.concert_tickets alter column email drop not null;
alter table app_private.concert_tickets add column registration_id uuid;
create index concert_tickets_registration on app_private.concert_tickets(registration_id) where registration_id is not null;

create table app_private.concert_registration_intake (
  ticket_id uuid primary key references app_private.concert_tickets,
  email text not null,
  church_title text not null,
  first_name text not null,
  last_name text not null,
  zion_location text not null,
  leader_name text not null,
  enrolled_member uuid references public.members
);
create index concert_intake_email on app_private.concert_registration_intake(email);

create table app_private.concert_named_invites (
  id uuid primary key,
  batch_id uuid not null,
  event_id uuid not null references app_private.concert_events,
  token_digest text not null unique,
  sender_email text not null,
  sender_name text not null,
  guest_name text not null,
  guest_email text,
  relationship text not null,
  first_visit boolean not null,
  vip jsonb,
  ticket_id uuid unique references app_private.concert_tickets,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);
create index concert_named_invites_sender on app_private.concert_named_invites(event_id,sender_email,batch_id);

create table app_private.concert_verification (
  id uuid primary key,
  proof_digest text not null,
  email text not null,
  purpose text not null check (purpose in ('sender','recipient','recovery','setup')),
  scope text not null,
  expires_at timestamptz not null,
  attempts smallint not null default 0,
  verified_at timestamptz
);

create table app_private.concert_mail (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('invitation','registered','tickets')),
  reference_id uuid not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (kind,reference_id)
);

do $$
declare t text;
begin
  foreach t in array array['concert_registration_intake','concert_named_invites','concert_verification','concert_mail'] loop
    execute format('alter table app_private.%I enable row level security',t);
    execute format('revoke all on app_private.%I from public,anon,authenticated,service_role',t);
  end loop;
end $$;

create function app_private.concert_registration_records(p_ticket uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.guest_name,'partySize',t.party_size)
    order by (t.id=p_ticket) desc,t.created_at,t.id),'[]'::jsonb)
  from app_private.concert_tickets t
  where t.status='active' and (t.id=p_ticket or t.registration_id=p_ticket)
$$;

create function app_private.concert_register_named(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  event app_private.concert_events;
  invitation app_private.concert_named_invites;
  existing app_private.concert_tickets;
  entry jsonb;
  intake jsonb := p->'intake';
  v_email text := p->>'email';
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
    insert into app_private.concert_tickets(id,event_id,token_digest,guest_name,email,registration_id)
      values(ticket_id,event.id,entry->>'digest',entry->>'name',case when idx=0 then v_email end,lead);
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

create function app_private.concert_named_invitation(p jsonb) returns jsonb
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
      'available',event.rsvp_open,'event',app_private.concert_event_json(event)-'version'-'capacity'-'seatsTaken'-'publicRsvp');
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

create function app_private.concert_verify(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  key uuid := (p->>'id')::uuid;
  record app_private.concert_verification;
begin
  if p->>'action'='issue' then
    delete from app_private.concert_verification where expires_at<now()-interval '1 day';
    insert into app_private.concert_verification(id,proof_digest,email,purpose,scope,expires_at)
      values(key,p->>'digest',p->>'email',p->>'purpose',p->>'scope',now()+interval '15 minutes');
    return null;
  end if;
  select * into record from app_private.concert_verification v where v.id=key and v.expires_at>now()
    and v.purpose=p->>'purpose' and v.verified_at is null and v.attempts<5 for update;
  if not found then return null; end if;
  if record.proof_digest is distinct from p->>'digest' then
    update app_private.concert_verification set attempts=attempts+1 where id=key;
    return null;
  end if;
  update app_private.concert_verification set verified_at=now() where id=key;
  return jsonb_build_object('email',record.email,'scope',record.scope);
end $$;

create function app_private.concert_member_intake(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare intake app_private.concert_registration_intake;
begin
  select i.* into intake from app_private.concert_registration_intake i
    join app_private.concert_tickets t on t.id=i.ticket_id
    where i.email=p->>'email' and t.status='active' and i.enrolled_member is null
      and (p->>'ticketId' is null or i.ticket_id=(p->>'ticketId')::uuid)
    order by t.created_at desc limit 1 for update of i;
  if not found then return null; end if;
  if p->>'memberId' is not null then
    update app_private.concert_registration_intake set enrolled_member=(p->>'memberId')::uuid where ticket_id=intake.ticket_id;
    update app_private.concert_tickets t set member_id=(p->>'memberId')::uuid where t.id=intake.ticket_id
      and not exists(select 1 from app_private.concert_tickets x where x.event_id=t.event_id and x.status='active'
        and x.member_id=(p->>'memberId')::uuid);
  end if;
  return to_jsonb(intake);
end $$;

create function app_private.concert_recover_tickets(p jsonb) returns jsonb
language sql stable security definer set search_path = '' as $$
  select app_private.concert_registration_records(coalesce(t.registration_id,t.id))
    from app_private.concert_tickets t
    where t.event_id=(p->>'eventId')::uuid and lower(t.email)=p->>'email' and (t.status='active' or
      (t.registration_id=t.id and exists(select 1 from app_private.concert_tickets child
        where child.registration_id=t.id and child.status='active')))
    order by (t.status='active') desc,t.created_at desc limit 1
$$;

create function app_private.concert_delivery(p jsonb) returns jsonb
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

create function app_private.concert_door(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  actor uuid := app_private.current_member_id();
  event app_private.concert_events;
  ticket app_private.concert_tickets;
  action text := p->>'action';
  name text := btrim(p->>'name');
  result jsonb;
begin
  if actor is null or not coalesce(app_private.module_manager(actor,app_private.concert_module_id()),false) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if action='scan' then
    result := app_private.concert_scan(p->>'digest');
    return result || jsonb_build_object('vip',exists(select 1 from app_private.concert_named_invites i
      where i.ticket_id=(result->>'ticketId')::uuid and i.vip is not null));
  end if;
  select * into event from app_private.concert_events e where e.status='active' for update;
  if action='status' then
    return jsonb_build_object('event',case when event.id is not null then app_private.concert_event_json(event) end);
  end if;
  if not found then raise exception 'No active concert' using errcode='23514'; end if;
  if action='find' then
    return coalesce((select jsonb_agg(to_jsonb(r)) from (
      select t.id,t.guest_name as name,t.party_size as "partySize",t.checked_in_at as "checkedInAt",
        exists(select 1 from app_private.concert_named_invites i where i.ticket_id=t.id and i.vip is not null) as vip
      from app_private.concert_tickets t where t.event_id=event.id and t.status='active'
        and strpos(lower(t.guest_name),lower(name))>0 order by lower(t.guest_name),t.id limit 15
    ) r),'[]'::jsonb);
  end if;
  if action='check' then
    select * into ticket from app_private.concert_tickets t where t.id=(p->>'id')::uuid and t.event_id=event.id;
    if not found then return jsonb_build_object('result','invalid'); end if;
  elsif action='walk' then
    select * into ticket from app_private.concert_tickets t where t.id=(p->>'id')::uuid and t.event_id=event.id;
    if not found then
      if p->>'confirm' is distinct from 'true' and exists(select 1 from app_private.concert_tickets t
        where t.event_id=event.id and t.status='active' and lower(t.guest_name)=lower(name)) then
        raise exception 'Matching guest' using errcode='LVZDM';
      end if;
      if not app_private.concert_has_room(event.id,1) then raise exception 'Concert full' using errcode='LVZCF'; end if;
      insert into app_private.concert_tickets(id,event_id,token_digest,guest_name)
        values((p->>'id')::uuid,event.id,p->>'digest',name) returning * into ticket;
      insert into app_private.concert_audit(actor_id,event_id,ticket_id,operation,detail)
        values(actor,event.id,ticket.id,'rsvp_guest','{"via":"door"}');
    end if;
  else
    raise exception 'Invalid door action' using errcode='22023';
  end if;
  result := app_private.concert_scan(ticket.token_digest);
  return result || jsonb_build_object('vip',exists(select 1 from app_private.concert_named_invites i
    where i.ticket_id=ticket.id and i.vip is not null));
end $$;

-- Restricted reporting. Door scans only get the VIP badge. Existing concert
-- managers have the organizer workspace; placement still uses organization roles.
create function app_private.concert_registration_report() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'invitationCount',(select count(*) from app_private.concert_named_invites i where i.event_id=e.id and i.withdrawn_at is null),
    'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'name',i.guest_name,'details',i.vip,
      'sender',i.sender_name,'relationship',i.relationship,'firstVisit',i.first_visit,'registered',i.ticket_id is not null)
      order by (i.vip is not null) desc,i.guest_name)
      from app_private.concert_named_invites i where i.event_id=e.id and i.withdrawn_at is null),'[]'::jsonb),
    'intake',coalesce((select jsonb_agg(jsonb_build_object('id',i.ticket_id,'name',t.guest_name,'title',i.church_title,
      'location',i.zion_location,'leader',i.leader_name,'memberId',i.enrolled_member) order by t.guest_name)
      from app_private.concert_registration_intake i join app_private.concert_tickets t on t.id=i.ticket_id
      where t.event_id=e.id and t.status='active'),'[]'::jsonb))
  from app_private.concert_events e where e.status='active'
    and app_private.module_manager(app_private.current_member_id(),app_private.concert_module_id())
$$;

create function app_private.concert_placement(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  actor uuid := app_private.organization_member_id();
  actor_name text;
  is_org boolean;
  target app_private.concert_registration_intake;
  destination uuid := (p->>'groupId')::uuid;
  now_at timestamptz := clock_timestamp();
  reason text := 'Church membership and group placement confirmed through concert registration';
begin
  if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
  is_org := app_private.org_authority(actor);
  select m.display_name into actor_name from public.members m where m.id=actor;
  if not is_org and not exists(select 1 from public.church_groups g where app_private.manages_group(actor,g.id)) then
    raise exception 'Not authorized' using errcode='42501';
  end if;

  if p->>'action'='approve' then
    perform pg_advisory_xact_lock(741085);
    select i.* into target from app_private.concert_registration_intake i
      join app_private.self_service_enrollments a on a.member_id=i.enrolled_member
      join public.members m on m.id=a.member_id
      join app_private.concert_tickets t on t.id=i.ticket_id
      where i.ticket_id=(p->>'id')::uuid and a.decision='pending' and m.status='intake' and t.status='active'
      for update of a,m;
    if (p->>'verified') is distinct from 'true' or not found or not app_private.manages_group(actor,destination)
      or (not is_org and lower(btrim(target.leader_name))<>lower(btrim(actor_name)))
      or exists(select 1 from public.member_placements mp where mp.member_id=target.enrolled_member and mp.ended_at is null) then
      raise exception 'Placement is unavailable' using errcode='42501';
    end if;
    -- This authority is limited to the leader named on this verified intake,
    -- and only to an active group the actor currently leads.
    insert into public.member_placements(member_id,group_id,started_at,reason)
      values(target.enrolled_member,destination,now_at,reason);
    update public.members set status='active',updated_at=now_at where id=target.enrolled_member;
    update app_private.self_service_enrollments set decision='assigned',reviewed_at=now_at,reviewed_by=actor
      where member_id=target.enrolled_member;
    insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,before_state,after_state)
      values(actor,auth.uid(),'enrollment.assign',target.enrolled_member,reason,
        jsonb_build_object('status','intake'),jsonb_build_object('status','active','groupId',destination));
    return jsonb_build_object('ok',true);
  end if;

  return jsonb_build_object(
    'groups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',c.name||' · '||g.name) order by c.name,g.name)
      from public.church_groups g join public.age_categories c on c.id=g.age_category_id
      where app_private.manages_group(actor,g.id)),'[]'::jsonb),
    'requests',coalesce((select jsonb_agg(jsonb_build_object('id',i.ticket_id,'name',t.guest_name,
      'title',i.church_title,'location',i.zion_location,'leader',i.leader_name) order by t.guest_name)
      from app_private.concert_registration_intake i join app_private.concert_tickets t on t.id=i.ticket_id
      join app_private.self_service_enrollments a on a.member_id=i.enrolled_member and a.decision='pending'
      join public.members m on m.id=a.member_id and m.status='intake'
      where t.status='active' and (is_org or lower(btrim(i.leader_name))=lower(btrim(actor_name)))),'[]'::jsonb));
end $$;

-- Expose explicit invoker wrappers. No public or anonymous execution.
do $$
declare fn text; role_name text;
begin
  foreach fn in array array['concert_register_named','concert_named_invitation','concert_verify','concert_member_intake',
    'concert_recover_tickets','concert_delivery','concert_door','concert_placement'] loop
    role_name := case when fn in ('concert_door','concert_placement') then 'authenticated' else 'service_role' end;
    execute format('create function public.%I(p jsonb) returns jsonb language sql security invoker set search_path='''' as %L',fn,
      format('select app_private.%I(p)',fn));
    execute format('revoke all on function app_private.%I(jsonb),public.%I(jsonb) from public,anon,authenticated,service_role',fn,fn);
    execute format('grant execute on function app_private.%I(jsonb),public.%I(jsonb) to %I',fn,fn,role_name);
  end loop;
end $$;
revoke all on function app_private.concert_registration_records(uuid) from public,anon,authenticated,service_role;
create function public.concert_registration_report() returns jsonb language sql security invoker set search_path='' as
  $$ select app_private.concert_registration_report() $$;
revoke all on function app_private.concert_registration_report(),public.concert_registration_report() from public,anon,authenticated,service_role;
grant execute on function app_private.concert_registration_report(),public.concert_registration_report() to authenticated;

notify pgrst, 'reload schema';
commit;
