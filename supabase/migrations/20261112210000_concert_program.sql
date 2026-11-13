-- Healing Concert program (song list). Anthony's decision, 2026-11-12: show the program everywhere
-- (invite page, ticket page, member app) with order, title and performers; song numbers and times
-- are for concert managers only. No program rows are seeded here.
begin;
create table app_private.concert_program_items(
 event_id uuid not null references app_private.concert_events on delete restrict,
 position smallint not null check(position between 1 and 40),
 song_number text check(song_number is null or (length(btrim(song_number)) between 1 and 12 and song_number !~ '[[:cntrl:]]')),
 title text not null check(length(btrim(title)) between 1 and 120 and title !~ '[[:cntrl:]]'),
 duration text check(duration is null or duration ~ '^[0-9]{1,2}:[0-5][0-9]$'),
 performers text check(performers is null or (length(btrim(performers)) between 1 and 120 and performers !~ '[[:cntrl:]]')),
 primary key(event_id,position)
);
alter table app_private.concert_program_items enable row level security;
revoke all on app_private.concert_program_items from public,anon,authenticated,service_role;

-- Public program: order, title and performers only. Every event view (member, invite, ticket) includes it.
create or replace function app_private.concert_event_json(e app_private.concert_events) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',e.id,'title',e.title,'date',to_char(e.event_date,'YYYY-MM-DD'),
  'startTime',left(e.start_time::text,5),'doorsTime',case when e.doors_time is null then null else left(e.doors_time::text,5) end,
  'venue',e.venue,'details',e.details,'capacity',e.capacity,'rsvpOpen',e.rsvp_open,'version',e.version,
  'seatsTaken',(select coalesce(sum(t.party_size),0)::integer from app_private.concert_tickets t where t.event_id=e.id and t.status='active'),
  'program',coalesce((select jsonb_agg(jsonb_build_object('position',p.position,'title',p.title,'performers',p.performers) order by p.position)
   from app_private.concert_program_items p where p.event_id=e.id),'[]'::jsonb))
$$;
revoke all on function app_private.concert_event_json(app_private.concert_events) from public,anon,authenticated,service_role;

-- Managers: the full program for editing.
create function app_private.concert_program_full() returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_event uuid;
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_manager(actor,app_private.concert_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 select id into v_event from app_private.concert_events where status='active';
 return jsonb_build_object('eventId',v_event,'items',coalesce((select jsonb_agg(jsonb_build_object('songNumber',p.song_number,'title',p.title,'duration',p.duration,'performers',p.performers) order by p.position)
  from app_private.concert_program_items p where p.event_id=v_event),'[]'::jsonb));
end $$;

-- Managers: replace the whole program of the open concert, in order.
create function app_private.concert_program_save(p_items jsonb) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();v_event uuid;v_item jsonb;v_pos integer:=0;v_keys text[]:=array['songNumber','title','duration','performers'];
begin
 if auth.uid() is null or actor is null or not coalesce(app_private.module_manager(actor,app_private.concert_module_id()),false) then raise exception 'Not authorized' using errcode='42501';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>40 or octet_length(p_items::text)>16384 then raise exception 'Invalid program' using errcode='22023';end if;
 select id into v_event from app_private.concert_events where status='active' for update;
 if not found then raise exception 'No open concert' using errcode='23514';end if;
 delete from app_private.concert_program_items where event_id=v_event;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item) is distinct from 'object' or not(v_item ?& v_keys) or exists(select 1 from jsonb_object_keys(v_item) k where not(k=any(v_keys)))
   or jsonb_typeof(v_item->'title') is distinct from 'string'
   or jsonb_typeof(v_item->'songNumber') not in ('string','null') or jsonb_typeof(v_item->'duration') not in ('string','null') or jsonb_typeof(v_item->'performers') not in ('string','null')
   then raise exception 'Invalid program item' using errcode='22023';end if;
  v_pos:=v_pos+1;
  insert into app_private.concert_program_items(event_id,position,song_number,title,duration,performers)
   values(v_event,v_pos,nullif(btrim(v_item->>'songNumber'),''),btrim(v_item->>'title'),nullif(btrim(v_item->>'duration'),''),nullif(btrim(v_item->>'performers'),''));
 end loop;
 insert into app_private.concert_audit(actor_id,event_id,operation,detail) values(actor,v_event,'event_edit',jsonb_build_object('program',p_items));
 return jsonb_build_object('ok',true,'count',v_pos);
end $$;

create function public.concert_program_full() returns jsonb language sql stable security invoker set search_path='' as $$select app_private.concert_program_full()$$;
create function public.concert_program_save(p_items jsonb) returns jsonb language sql volatile security invoker set search_path='' as $$select app_private.concert_program_save(p_items)$$;
revoke all on function app_private.concert_program_full(),app_private.concert_program_save(jsonb),public.concert_program_full(),public.concert_program_save(jsonb) from public,anon,authenticated,service_role;
grant execute on function app_private.concert_program_full(),app_private.concert_program_save(jsonb),public.concert_program_full(),public.concert_program_save(jsonb) to authenticated;
commit;
