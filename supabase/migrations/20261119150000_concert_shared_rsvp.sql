-- Allow a shared RSVP page only for explicitly enabled events.
begin;
alter table app_private.concert_events add column public_rsvp boolean not null default false;

create or replace function app_private.concert_event_json(e app_private.concert_events) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',e.id,'title',e.title,'date',to_char(e.event_date,'YYYY-MM-DD'),
  'startTime',left(e.start_time::text,5),'doorsTime',case when e.doors_time is null then null else left(e.doors_time::text,5) end,
  'venue',e.venue,'details',e.details,'capacity',e.capacity,'rsvpOpen',e.rsvp_open,'publicRsvp',e.public_rsvp,'version',e.version,
  'seatsTaken',(select coalesce(sum(t.party_size),0)::integer from app_private.concert_tickets t where t.event_id=e.id and t.status='active'),
  'program',coalesce((select jsonb_agg(jsonb_build_object('position',p.position,'title',p.title,'performers',p.performers) order by p.position)
   from app_private.concert_program_items p where p.event_id=e.id),'[]'::jsonb))
$$;
revoke all on function app_private.concert_event_json(app_private.concert_events) from public,anon,authenticated,service_role;

create function app_private.concert_guest_rsvp_insert(p_inviter uuid,p_public_event uuid,p_ticket uuid,p_digest text,p_name text,p_email text,p_phone text,p_party integer) returns jsonb
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
 select id into v_existing from app_private.concert_tickets where event_id=v_event.id and status='active' and lower(email)=v_email;
 -- Never reveal the existing ticket here; the server re-sends it to that email address.
 if found then return jsonb_build_object('ticketId',v_existing,'created',false,'email',v_email);end if;
 if not app_private.concert_has_room(v_event.id,p_party) then raise exception 'Concert full' using errcode='LVZCF';end if;
 insert into app_private.concert_tickets(id,event_id,token_digest,guest_name,email,phone,party_size,invited_by)
  values(p_ticket,v_event.id,p_digest,v_name,v_email,v_phone,p_party,p_inviter);
 insert into app_private.concert_audit(event_id,ticket_id,operation,detail) values(v_event.id,p_ticket,'rsvp_guest',jsonb_build_object('invitedBy',p_inviter));
 return jsonb_build_object('ticketId',p_ticket,'created',true,'email',v_email);
end $$;

-- Preserve existing member links and their inviter attribution.
create or replace function app_private.concert_guest_rsvp(p_invite_digest text,p_ticket uuid,p_digest text,p_name text,p_email text,p_phone text,p_party integer) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare v_inviter uuid;
begin
 perform app_private.concert_check_digest(p_invite_digest);
 select i.member_id into v_inviter from app_private.concert_invites i
  join public.members m on m.id=i.member_id and m.status='active' where i.token_digest=p_invite_digest;
 if not found then raise exception 'Invite not found' using errcode='42501';end if;
 return app_private.concert_guest_rsvp_insert(v_inviter,null,p_ticket,p_digest,p_name,p_email,p_phone,p_party);
end $$;

create function app_private.concert_shared_view() returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'event',app_private.concert_event_json(e)-'version'-'seatsTaken'-'capacity'-'publicRsvp',
  'full',not app_private.concert_has_room(e.id,1))
 from app_private.concert_events e
 where e.status='active' and e.public_rsvp and app_private.concert_module_open()
$$;

create function app_private.concert_shared_rsvp(p_event uuid,p_ticket uuid,p_digest text,p_name text,p_email text,p_phone text,p_party integer) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
begin
 if p_event is null then raise exception 'Invalid concert' using errcode='22023';end if;
 return app_private.concert_guest_rsvp_insert(null,p_event,p_ticket,p_digest,p_name,p_email,p_phone,p_party);
end $$;

create function public.concert_shared_view() returns jsonb
 language sql stable security invoker set search_path='' as $$select app_private.concert_shared_view()$$;
create function public.concert_shared_rsvp(p_event uuid,p_ticket uuid,p_digest text,p_name text,p_email text,p_phone text,p_party integer) returns jsonb
 language sql volatile security invoker set search_path='' as $$
 select app_private.concert_shared_rsvp(p_event,p_ticket,p_digest,p_name,p_email,p_phone,p_party)
$$;
revoke all on function app_private.concert_guest_rsvp_insert(uuid,uuid,uuid,text,text,text,text,integer)
 from public,anon,authenticated,service_role;
revoke all on function app_private.concert_shared_view(),public.concert_shared_view(),
 app_private.concert_shared_rsvp(uuid,uuid,text,text,text,text,integer),public.concert_shared_rsvp(uuid,uuid,text,text,text,text,integer)
 from public,anon,authenticated,service_role;
grant execute on function app_private.concert_shared_view(),public.concert_shared_view(),
 app_private.concert_shared_rsvp(uuid,uuid,text,text,text,text,integer),public.concert_shared_rsvp(uuid,uuid,text,text,text,text,integer)
 to service_role;
notify pgrst, 'reload schema';
commit;
