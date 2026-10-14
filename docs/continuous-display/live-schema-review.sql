-- LV Zion Official Continuous Display: deny-by-default private data and narrowly scoped public RPCs.
-- Phase 1 only: schema + functions, NO app registration, real content, device or TV.
-- Apply after checking hosted migration ledger. Publication requires an exact approved draft.
create schema if not exists display_private;
revoke all on schema display_private from public, anon, authenticated;

create table display_private.screens(
 id uuid primary key default gen_random_uuid(),
 label text not null check(length(btrim(label)) between 3 and 80),
 enabled boolean not null default false,
 draft_version bigint not null default 0 check(draft_version>=0),
 draft_items jsonb not null default '[]'::jsonb,
 draft_from timestamptz,
 draft_until timestamptz,
 generation bigint not null default 0 check(generation>=0),
 current_publication uuid,
 created_at timestamptz not null default now(),
 check((draft_from is null and draft_until is null) or
       (draft_from is not null and draft_until>draft_from))
);
create table display_private.permissions(
 screen_id uuid not null references display_private.screens on delete restrict,
 member_id uuid not null references public.members on delete restrict,
 permission text not null check(permission in('edit','approve','publish','device')),
 active boolean not null default true,
 primary key(screen_id,member_id,permission)
);
create table display_private.approvals(
 id uuid primary key default gen_random_uuid(),
 screen_id uuid not null references display_private.screens on delete restrict,
 draft_version bigint not null check(draft_version>0),
 items jsonb not null,
 valid_from timestamptz not null,
 valid_until timestamptz not null,
 approved_by uuid not null references public.members on delete restrict,
 approved_at timestamptz not null default now(),
 unique(screen_id,draft_version),
 check(valid_until>valid_from)
);
create table display_private.publications(
 id uuid primary key default gen_random_uuid(),
 screen_id uuid not null references display_private.screens on delete restrict,
 approval_id uuid not null references display_private.approvals on delete restrict,
 generation bigint not null check(generation>0),
 items jsonb not null,
 valid_from timestamptz not null,
 valid_until timestamptz not null,
 published_by uuid not null references public.members on delete restrict,
 published_at timestamptz not null default now(),
 unique(screen_id,generation),
 check(valid_until>valid_from)
);
alter table display_private.screens add constraint valid_display_publication
 foreign key(current_publication) references display_private.publications(id) on delete restrict;
create table display_private.pairing_codes(
 code_digest text primary key check(code_digest ~ '^[a-f0-9]{64}$'),
 screen_id uuid not null references display_private.screens on delete restrict,
 created_by uuid not null references public.members on delete restrict,
 expires_at timestamptz not null,
 claimed_at timestamptz,
 created_at timestamptz not null default now(),
 check(expires_at>created_at and expires_at<=created_at+interval '5 minutes')
);
create table display_private.devices(
 id uuid primary key default gen_random_uuid(),
 screen_id uuid not null references display_private.screens on delete restrict,
 token_digest text not null unique check(token_digest ~ '^[a-f0-9]{64}$'),
 paired_by uuid not null references public.members on delete restrict,
 paired_at timestamptz not null default now(),
 revoked_at timestamptz,
 last_seen timestamptz,
 check(revoked_at is null or revoked_at>=paired_at)
);
create index active_display_devices on display_private.devices(screen_id) where revoked_at is null;
create table display_private.audit_events(
 id bigint generated always as identity primary key,
 screen_id uuid not null references display_private.screens on delete restrict,
 actor_id uuid not null references public.members on delete restrict,
 action text not null check(action in('draft_saved','approved','published','pairing_created','paired','device_revoked')),
 subject_id uuid,
 happened_at timestamptz not null default now()
);

-- Strip hidden fields and decline malformed or oversized content at the database boundary.
create function display_private.valid_items(p_items jsonb) returns boolean
 language plpgsql immutable set search_path='' as $$
declare item jsonb; row_value jsonb; id_value text; known text[] := '{}'; key text;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>16 then return false;end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' then return false;end if;
  for key in select jsonb_object_keys(item) loop
   if key not in ('id','kind','style','title','body','date','time','location','rows','duration','startsAt','endsAt') then return false;end if;
  end loop;
  id_value:=item->>'id';
  if id_value is null or id_value !~ '^[a-z0-9][a-z0-9-]{2,49}$' or id_value=any(known) then return false;end if;
  known:=array_append(known,id_value);
  if (item->>'kind') not in ('announcement','schedule','event','campaign')
    or (item->>'style') not in ('editorial','schedule','event','campaign') then return false;end if;
  if jsonb_typeof(item->'title')<>'string' or length(btrim(item->>'title')) not between 1 and 74
     or (item->>'title') ~ '[[:cntrl:]]' then return false;end if;
  if jsonb_typeof(item->'body')<>'string' or length(btrim(item->>'body')) not between 1 and 160
     or (item->>'body') ~ '[[:cntrl:]]' then return false;end if;
  if jsonb_typeof(item->'duration')<>'number' then return false;end if;
  if (item->>'duration')::numeric not between 8 and 60
     or (item->>'duration')::numeric<>trunc((item->>'duration')::numeric) then return false;end if;
  for key in select unnest(array['date','time','location']) loop
   if item ? key and (jsonb_typeof(item->key)<>'string' or length(btrim(item->>key)) not between 1 and 72) then return false;end if;
  end loop;
  if item->>'kind'='event' and (not item?'date' or not item?'time' or not item?'location') then return false;end if;
  if item->>'kind'='schedule' and (not item?'date' or not item?'rows') then return false;end if;
  if item ? 'rows' then
   if jsonb_typeof(item->'rows')<>'array' or jsonb_array_length(item->'rows')>3 then return false;end if;
   for row_value in select value from jsonb_array_elements(item->'rows') loop
    if jsonb_typeof(row_value)<>'object' or (select count(*) from jsonb_object_keys(row_value))<>2
       or not row_value?'time' or not row_value?'label'
       or jsonb_typeof(row_value->'time')<>'string'
       or jsonb_typeof(row_value->'label')<>'string'
       or length(btrim(row_value->>'time')) not between 1 and 28
       or length(btrim(row_value->>'label')) not between 1 and 80 then return false;end if;
   end loop;
  end if;
  if (item ? 'startsAt')<>(item ? 'endsAt') then return false;end if;
  if item ? 'startsAt' then
    if jsonb_typeof(item->'startsAt')<>'string' or jsonb_typeof(item->'endsAt')<>'string'
      or length(item->>'startsAt')>40 or length(item->>'endsAt')>40
      or (item->>'startsAt')::timestamptz >= (item->>'endsAt')::timestamptz then return false;end if;
  end if;
 end loop;
 return true;
exception when others then return false;
end $$;
alter table display_private.screens add constraint draft_content_valid
 check(display_private.valid_items(draft_items));
alter table display_private.approvals add constraint approved_content_valid
 check(display_private.valid_items(items));
alter table display_private.publications add constraint published_content_valid
 check(display_private.valid_items(items));

create function display_private.immutable_record() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Immutable display history' using errcode='23514';end $$;
create trigger immutable_display_approval before update or delete on display_private.approvals
 for each row execute function display_private.immutable_record();
create trigger immutable_display_publication before update or delete on display_private.publications
 for each row execute function display_private.immutable_record();
create trigger immutable_display_audit before update or delete on display_private.audit_events
 for each row execute function display_private.immutable_record();

-- A member's signed-in, server-verified membership and individual module manager grant are mandatory.
create function display_private.require_manager() returns uuid
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid := app_private.current_member_id();
begin
 if actor is null or not exists(
  select 1 from app_private.app_modules m
  join app_private.module_access_grants g on g.module_id=m.id
  where m.module_key='continuous-display' and m.status='approved' and m.approved_at is not null
    and g.member_id=actor and g.permission='manager' and g.ended_at is null and g.granted_at<=now()
 ) then raise exception 'Not authorized' using errcode='42501';end if;
 return actor;
end $$;
create function display_private.require_permission(p_screen uuid,p_permission text) returns uuid
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid := display_private.require_manager();
begin
 if not exists(select 1 from display_private.permissions p
 where p.screen_id=p_screen and p.member_id=actor and p.permission=p_permission and p.active) then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 return actor;
end $$;

-- Authorized phone management. The full draft never reaches a screen or public endpoint.
create function public.display_management_state() returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=display_private.require_manager(); result jsonb;
begin
 select jsonb_build_object('screens',coalesce(jsonb_agg(jsonb_build_object(
  'id',s.id,'label',s.label,'enabled',s.enabled,
  'draftVersion',s.draft_version,'items',s.draft_items,
  'startsAt',s.draft_from,'endsAt',s.draft_until,
  'approvedVersion',(select max(a.draft_version) from display_private.approvals a where a.screen_id=s.id),
  'publishedVersion',s.generation,
  'publishedAt',(select p.published_at from display_private.publications p where p.id=s.current_publication),
  'publishedUntil',(select p.valid_until from display_private.publications p where p.id=s.current_publication),
  'devices',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'lastSeen',d.last_seen,'pairedAt',d.paired_at,'revoked',d.revoked_at is not null) order by d.paired_at desc)
          from display_private.devices d where d.screen_id=s.id),'[]'::jsonb),
  'history',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'generation',q.generation,'publishedAt',q.published_at,'until',q.valid_until))
          from (select id,generation,published_at,valid_until from display_private.publications where screen_id=s.id order by generation desc limit 8) q),'[]'::jsonb)
 ) order by s.created_at),'[]'::jsonb))
 into result
 from display_private.screens s where exists(
  select 1 from display_private.permissions gr where gr.screen_id=s.id and gr.member_id=actor and gr.active);
 return result;
end $$;

create function public.display_save_draft(p_screen uuid,p_expected_version bigint,p_items jsonb,p_from timestamptz,p_until timestamptz)
 returns bigint language plpgsql security definer set search_path='' as $$
declare actor uuid; next_version bigint;
begin
 actor:=display_private.require_permission(p_screen,'edit');
 if not display_private.valid_items(p_items) then raise exception 'Invalid display content' using errcode='22023';end if;
 if p_from is null or p_until is null or p_until<=now() or p_from>=p_until
   or p_until>now()+interval '90 days' or p_until-p_from>interval '90 days' then
  raise exception 'Invalid publication window' using errcode='22023';end if;
 update display_private.screens
  set draft_version=draft_version+1,draft_items=p_items,draft_from=p_from,draft_until=p_until
  where id=p_screen and draft_version=p_expected_version returning draft_version into next_version;
 if not found then raise exception 'Draft updated elsewhere' using errcode='40001';end if;
 insert into display_private.audit_events(screen_id,actor_id,action) values(p_screen,actor,'draft_saved');
 return next_version;
end $$;
create function public.display_approve_draft(p_screen uuid,p_expected_version bigint)
 returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid; s display_private.screens; approval uuid;
begin
 actor:=display_private.require_permission(p_screen,'approve');
 select * into strict s from display_private.screens where id=p_screen for update;
 if s.draft_version<>p_expected_version or s.draft_version<1
    or s.draft_until is null or s.draft_until<=now() then
  raise exception 'Draft changed or expired' using errcode='40001';end if;
 insert into display_private.approvals(screen_id,draft_version,items,valid_from,valid_until,approved_by)
 values(p_screen,s.draft_version,s.draft_items,s.draft_from,s.draft_until,actor)
 returning id into approval;
 insert into display_private.audit_events(screen_id,actor_id,action,subject_id)
 values(p_screen,actor,'approved',approval);
 return approval;
end $$;
create function public.display_publish_approved(p_screen uuid,p_expected_version bigint)
 returns bigint language plpgsql security definer set search_path='' as $$
declare actor uuid; s display_private.screens; a display_private.approvals; pub uuid; next_version bigint;
begin
 actor:=display_private.require_permission(p_screen,'publish');
 select * into strict s from display_private.screens where id=p_screen for update;
 if s.draft_version<>p_expected_version or s.draft_version<1 then
  raise exception 'Draft changed' using errcode='40001';end if;
 select * into strict a from display_private.approvals
  where screen_id=p_screen and draft_version=s.draft_version;
 if a.items<>s.draft_items or a.valid_from<>s.draft_from or a.valid_until<>s.draft_until
   or a.valid_until<=now() then raise exception 'Exact approval required' using errcode='42501';end if;
 if s.current_publication is not null and exists(select 1 from display_private.publications q where q.id=s.current_publication and q.approval_id=a.id) then raise exception 'Approval already published' using errcode='23505';end if;
 next_version:=s.generation+1;
 insert into display_private.publications(screen_id,approval_id,generation,items,valid_from,valid_until,published_by)
 values(p_screen,a.id,next_version,a.items,a.valid_from,a.valid_until,actor) returning id into pub;
 update display_private.screens set current_publication=pub,generation=next_version where id=p_screen;
 insert into display_private.audit_events(screen_id,actor_id,action,subject_id)
 values(p_screen,actor,'published',pub);
 return next_version;
end $$;
create function public.display_issue_pairing(p_screen uuid,p_code_digest text)
 returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=display_private.require_permission(p_screen,'device');
 if p_code_digest is null or p_code_digest !~ '^[a-f0-9]{64}$' then raise exception 'Invalid code' using errcode='22023';end if;
 delete from display_private.pairing_codes where expires_at<=now();
 insert into display_private.pairing_codes(code_digest,screen_id,created_by,expires_at)
 values(p_code_digest,p_screen,actor,now()+interval '5 minutes');
 insert into display_private.audit_events(screen_id,actor_id,action) values(p_screen,actor,'pairing_created');
 return true;
end $$;
create function public.display_revoke_device(p_device uuid)
 returns boolean language plpgsql security definer set search_path='' as $$
declare d display_private.devices;actor uuid;
begin
 select * into strict d from display_private.devices where id=p_device for update;
 actor:=display_private.require_permission(d.screen_id,'device');
 if d.revoked_at is not null then return false;end if;
 update display_private.devices set revoked_at=now() where id=p_device;
 if not exists(select 1 from display_private.devices where screen_id=d.screen_id and revoked_at is null) then
   update display_private.screens set enabled=false where id=d.screen_id;end if;
 insert into display_private.audit_events(screen_id,actor_id,action,subject_id)
 values(d.screen_id,actor,'device_revoked',p_device);
 return true;
end $$;

-- These two functions are service-role-only and called from server routes that guard the cookie.
-- The TV never gets a member JWT or access to the Supabase Data API.
create function public.display_device_redeem(p_code_digest text,p_token_digest text)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare pair display_private.pairing_codes; device_id uuid;
begin
 if p_code_digest is null or p_code_digest !~ '^[a-f0-9]{64}$'
  or p_token_digest is null or p_token_digest !~ '^[a-f0-9]{64}$' then return null;end if;
 select * into pair from display_private.pairing_codes where code_digest=p_code_digest for update;
 if not found or pair.claimed_at is not null or pair.expires_at<=now()
    or not exists(select 1 from display_private.permissions gr where gr.screen_id=pair.screen_id and gr.member_id=pair.created_by and gr.permission='device' and gr.active)
 then return null;end if;
 update display_private.pairing_codes set claimed_at=now() where code_digest=p_code_digest;
 insert into display_private.devices(screen_id,token_digest,paired_by)
 values(pair.screen_id,p_token_digest,pair.created_by) returning id into device_id;
 update display_private.screens set enabled=true where id=pair.screen_id;
 insert into display_private.audit_events(screen_id,actor_id,action,subject_id)
 values(pair.screen_id,pair.created_by,'paired',device_id);
 return jsonb_build_object('paired',true);
end $$;
create function public.display_device_snapshot(p_token_digest text)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare d display_private.devices; s display_private.screens; p display_private.publications;
 rows_json jsonb:='[]'::jsonb;
begin
 if p_token_digest is null or p_token_digest !~ '^[a-f0-9]{64}$' then return null;end if;
 select * into d from display_private.devices where token_digest=p_token_digest and revoked_at is null;
 if not found then return null;end if;
 select * into s from display_private.screens where id=d.screen_id and enabled;
 if not found then return null;end if;
 update display_private.devices set last_seen=now() where id=d.id;
 if s.current_publication is not null then
  select * into p from display_private.publications where id=s.current_publication and screen_id=s.id;
  if found and p.valid_from<=now() and p.valid_until>now() then
   select coalesce(jsonb_agg(i.value order by i.ordinality),'[]'::jsonb) into rows_json
   from jsonb_array_elements(p.items) with ordinality i(value,ordinality)
   where (not (i.value ? 'startsAt') or (i.value->>'startsAt')::timestamptz<=now())
    and (not (i.value ? 'endsAt') or (i.value->>'endsAt')::timestamptz>now());
   return jsonb_build_object('paired',true,'screen',s.label,'version',p.generation,
      'serverTime',now(),'leaseUntil',least(now()+interval '30 seconds',p.valid_until),'slides',rows_json);
  end if;
 end if;
 return jsonb_build_object('paired',true,'screen',s.label,'version',s.generation,
   'serverTime',now(),'leaseUntil',now()+interval '30 seconds','slides','[]'::jsonb);
end $$;

-- Every private table is RLS-enabled with NO broad policies or table privileges.
do $$declare r record;begin for r in select tablename from pg_tables where schemaname='display_private' loop
 execute format('alter table display_private.%I enable row level security',r.tablename);
 execute format('revoke all on display_private.%I from public,anon,authenticated,service_role',r.tablename);
end loop;end $$;
revoke all on all sequences in schema display_private from public,anon,authenticated,service_role;
revoke all on all functions in schema display_private from public,anon,authenticated,service_role;
alter default privileges in schema display_private revoke execute on functions from public;
revoke execute on function public.display_management_state(),
 public.display_save_draft(uuid,bigint,jsonb,timestamptz,timestamptz),
 public.display_approve_draft(uuid,bigint),public.display_publish_approved(uuid,bigint),
 public.display_issue_pairing(uuid,text),public.display_revoke_device(uuid),
 public.display_device_redeem(text,text),public.display_device_snapshot(text)
 from public,anon,authenticated,service_role;
grant execute on function public.display_management_state(),
 public.display_save_draft(uuid,bigint,jsonb,timestamptz,timestamptz),
 public.display_approve_draft(uuid,bigint),public.display_publish_approved(uuid,bigint),
 public.display_issue_pairing(uuid,text),public.display_revoke_device(uuid) to authenticated;
grant execute on function public.display_device_redeem(text,text),
 public.display_device_snapshot(text) to service_role;

-- A future explicit activation migration alone registers the app and grants access.
