-- LV Zion Official Contacts: first-account-only private release candidate.
-- No group/leader sharing, exports, member conversion, external messages, or imports.
-- Independent of member_private_contacts and original LV Zion data.
begin;
create schema contacts_private;
revoke all on schema contacts_private from public,anon,authenticated,service_role;
grant usage on schema contacts_private to authenticated;
alter default privileges in schema contacts_private revoke execute on functions from public,anon,authenticated,service_role;

create table contacts_private.records (
 id uuid primary key default gen_random_uuid(),
 owner_member_id uuid not null references public.members(id) on delete restrict,
 display_name text not null check(length(btrim(display_name)) between 2 and 120),
 phone text check(phone is null or length(btrim(phone)) between 3 and 30),
 preferred_method text not null default 'unknown' check(preferred_method in ('unknown','text','phone','email')),
 lifecycle text not null default 'new' check(lifecycle in ('new','active','paused','closed')),
 do_not_contact boolean not null default false,
 dnc_recorded_at timestamptz,
 archived_at timestamptz,
 version bigint not null default 1 check(version>=1),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check ((do_not_contact and lifecycle='closed' and dnc_recorded_at is not null)
    or (not do_not_contact and dnc_recorded_at is null)),
 check (archived_at is null or lifecycle='closed')
);
create index contact_owner_page on contacts_private.records(owner_member_id,id);

-- Prepared for future separate sharing authorization; no shipping RPC touches this table.
create table contacts_private.shares (
 id uuid primary key default gen_random_uuid(),
 contact_id uuid not null references contacts_private.records(id) on delete restrict,
 member_id uuid not null references public.members(id) on delete restrict,
 placement_id uuid references public.member_placements(id) on delete restrict,
 granted_by uuid not null references public.members(id) on delete restrict,
 allow_methods boolean not null default false,
 starts_at timestamptz not null default clock_timestamp(),
 revoked_at timestamptz,
 check (revoked_at is null or revoked_at>=starts_at)
);
create unique index contact_one_active_share on contacts_private.shares(contact_id,member_id) where revoked_at is null;

create table contacts_private.interactions (
 id uuid primary key,
 contact_id uuid not null references contacts_private.records(id) on delete restrict,
 author_member_id uuid not null references public.members(id) on delete restrict,
 body text not null check(length(btrim(body)) between 1 and 500),
 visibility text not null default 'author' check(visibility='author'),
 recorded_at timestamptz not null default clock_timestamp()
);
create index contact_interactions_recent on contacts_private.interactions(contact_id,recorded_at desc,id);

create table contacts_private.follow_ups (
 id uuid primary key,
 contact_id uuid not null references contacts_private.records(id) on delete restrict,
 assigned_member_id uuid not null references public.members(id) on delete restrict,
 due_at timestamptz not null,
 action text not null check(length(btrim(action)) between 1 and 160),
 state text not null default 'scheduled' check(state in ('scheduled','completed','cancelled')),
 completed_at timestamptz,
 completed_by uuid references public.members(id) on delete restrict,
 cancel_reason text check(cancel_reason in ('rescheduled','agreed_cancellation','do_not_contact','paused','closed','archived')),
 check ((state='scheduled' and completed_at is null and completed_by is null and cancel_reason is null)
   or (state='completed' and completed_at is not null and completed_by is not null and cancel_reason is null)
   or (state='cancelled' and completed_at is null and completed_by is null and cancel_reason is not null))
);
create unique index contact_one_open_next_step on contacts_private.follow_ups(contact_id) where state='scheduled';
create index contact_owner_due on contacts_private.follow_ups(assigned_member_id,due_at) where state='scheduled';

create table contacts_private.audit_events (
 id bigint generated always as identity primary key,
 request_id uuid not null,
 actor_member_id uuid not null references public.members(id) on delete restrict,
 contact_id uuid not null references contacts_private.records(id) on delete restrict,
 operation text not null,
 before_version bigint not null,
 after_version bigint not null,
 occurred_at timestamptz not null default clock_timestamp(),
 check(after_version=before_version+1),
 unique(actor_member_id,request_id)
);
create table contacts_private.command_receipts (
 actor_member_id uuid not null references public.members(id) on delete restrict,
 request_id uuid not null,
 contact_id uuid not null references contacts_private.records(id) on delete restrict,
 payload_digest text not null check(payload_digest ~ '^[0-9a-f]{64}$'),
 resulting_version bigint not null check(resulting_version>0),
 created_at timestamptz not null default clock_timestamp(),
 primary key(actor_member_id,request_id)
);
create function contacts_private.prevent_history_mutation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception using errcode='42501',message='History is append-only';end$$;
create trigger contacts_audit_append_only before update or delete on contacts_private.audit_events
for each row execute function contacts_private.prevent_history_mutation();
create trigger contacts_note_append_only before update or delete on contacts_private.interactions
for each row execute function contacts_private.prevent_history_mutation();

do $$declare t text;begin
 for t in select tablename from pg_tables where schemaname='contacts_private' loop
  execute format('alter table contacts_private.%I enable row level security',t);
  execute format('alter table contacts_private.%I force row level security',t);
  execute format('revoke all on contacts_private.%I from public,anon,authenticated,service_role',t);
 end loop;
end$$;
revoke all on all sequences in schema contacts_private from public,anon,authenticated,service_role;
revoke execute on all functions in schema contacts_private from public,anon,authenticated,service_role;

-- All browser requests derive actor from a verified, current Auth session plus
-- an explicit Contacts module grant. Being technical or group leader is not a grant.
create function contacts_private.actor() returns uuid language plpgsql stable
security definer set search_path='' as $$
declare a uuid;begin
 a:=app_private.current_member_id();
 if a is null or not exists(
  select 1 from app_private.app_modules m
  join app_private.module_access_grants g on g.module_id=m.id
  where m.module_key='contacts' and m.status='approved' and m.approved_at is not null
    and g.member_id=a and g.ended_at is null and g.granted_at<=now()
 ) then raise exception using errcode='42501',message='Contacts unavailable';end if;
 return a;
end$$;
create function contacts_private.can_create(a uuid) returns boolean language sql stable
security definer set search_path='' as $$
 select exists(select 1 from app_private.app_modules m
 join app_private.module_access_grants g on g.module_id=m.id
 where m.module_key='contacts' and m.status='approved' and m.approved_at is not null
 and g.member_id=a and g.permission='manager' and g.ended_at is null and g.granted_at<=now())
$$;

create function contacts_private.workspace(p_after uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a uuid:=contacts_private.actor();page_ids uuid[];items jsonb;
begin
 select array_agg(q.id order by q.id) into page_ids from (
  select id from contacts_private.records where owner_member_id=a
   and (p_after is null or id>p_after) order by id limit 101
 ) q;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',r.id,'version',r.version,'name',r.display_name,'owner',r.owner_member_id,
   'lifecycle',r.lifecycle,'preferred',r.preferred_method,
   'do_not_contact',r.do_not_contact,'archived',r.archived_at is not null
 ) order by r.id),'[]'::jsonb) into items
 from contacts_private.records r where r.id=any(page_ids[1:100]) and r.owner_member_id=a;
 return jsonb_build_object('member_id',a,'can_create',contacts_private.can_create(a),
 'contacts',items,'next_cursor',case when cardinality(page_ids)>100 then page_ids[100] else null end);
end$$;

create function contacts_private.detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a uuid:=contacts_private.actor();r contacts_private.records;
begin
 select * into r from contacts_private.records where id=p_id and owner_member_id=a;
 if not found then raise exception using errcode='42501',message='Contacts unavailable';end if;
 if (select count(*) from contacts_private.interactions where contact_id=r.id)>200
    or (select count(*) from contacts_private.follow_ups where contact_id=r.id)>200
 then raise exception using errcode='54000',message='Contact history requires pagination';end if;
 return jsonb_build_object(
  'id',r.id,'version',r.version,'name',r.display_name,'owner',r.owner_member_id,
  'lifecycle',r.lifecycle,'preferred',r.preferred_method,
  'do_not_contact',r.do_not_contact,'archived',r.archived_at is not null,
  'methods',case when r.phone is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('kind','phone','value',r.phone)) end,
  'interactions',coalesce((
    select jsonb_agg(jsonb_build_object('id',n.id,'author',n.author_member_id,'at',n.recorded_at,
     'text',n.body,'visibility',n.visibility,'supersedes',null) order by n.recorded_at,n.id)
    from contacts_private.interactions n where n.contact_id=r.id and n.author_member_id=a),'[]'::jsonb),
  'follow_ups',coalesce((
    select jsonb_agg(jsonb_build_object('id',f.id,'assigned',f.assigned_member_id,
     'due',f.due_at,'action',f.action,'state',f.state,'completed_at',f.completed_at,
     'reason',f.cancel_reason) order by f.due_at,f.id)
    from contacts_private.follow_ups f where f.contact_id=r.id and f.assigned_member_id=a),'[]'::jsonb));
end$$;

create function contacts_private.agenda() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a uuid:=contacts_private.actor();begin
 return coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'title','Private Contacts activity',
 'href','/modules/contacts','delivery_enabled',false) order by f.due_at,f.id)
 from (select f.id,f.due_at from contacts_private.follow_ups f join contacts_private.records r on r.id=f.contact_id
 where r.owner_member_id=a and f.assigned_member_id=a and f.state='scheduled'
 and r.archived_at is null and not r.do_not_contact and r.lifecycle in ('new','active')
 order by f.due_at,f.id limit 100) f),'[]'::jsonb);
end$$;

create function contacts_private.duplicates(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a uuid:=contacts_private.actor();r contacts_private.records;begin
 select * into r from contacts_private.records where id=p_id and owner_member_id=a;
 if not found then raise exception using errcode='42501',message='Contacts unavailable';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.display_name))
 from (select x.id,x.display_name from contacts_private.records x
 where x.owner_member_id=a and x.id<>r.id and
 (lower(btrim(x.display_name))=lower(btrim(r.display_name)) or
  (r.phone is not null and x.phone is not null and regexp_replace(x.phone,'\D','','g')=regexp_replace(r.phone,'\D','','g')))
 order by x.id limit 20) s),'[]'::jsonb);
end$$;

create function contacts_private.command(p_id uuid,p_version bigint,p_request uuid,p_op text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;r contacts_private.records;prior contacts_private.command_receipts;
 digest text;allowed text[];key text;tgt uuid;f contacts_private.follow_ups;due timestamptz;
 oldv bigint;result jsonb;valid_method text;
begin
 if p_id is null or p_request is null or p_version is null or p_version<0 or
  p_op is null or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>4096
 then raise exception using errcode='22023',message='Invalid Contacts command';end if;
 allowed:=case p_op
  when 'create' then array['name','phone','preferred']
  when 'edit' then array['name','preferred']
  when 'interact' then array['text','visibility']
  when 'schedule' then array['target','due','text']
  when 'complete' then array['target']
  when 'reschedule' then array['target','due']
  when 'cancel-followup' then array['target']
  when 'status' then array['lifecycle']
  when 'dnc' then array[]::text[]
  when 'archive' then array[]::text[]
  when 'restore' then array[]::text[]
  else null end;
 if allowed is null or exists(select 1 from jsonb_object_keys(p_data) k where not k=any(allowed))
 then raise exception using errcode='22023',message='Invalid Contacts command';end if;
 for key in select jsonb_object_keys(p_data) loop
  if jsonb_typeof(p_data->key)<>'string' then raise exception using errcode='22023',message='Invalid Contacts command';end if;
 end loop;
 -- Serialize configuration and verified authority changes with writes. Always
 -- derive identity from the session; a request never supplies an actor.
 perform 1 from app_private.app_modules where module_key='contacts' for share;
 a:=contacts_private.actor();
 perform 1 from public.members where id=a for share;
 perform 1 from app_private.account_links where member_id=a for share;
 perform 1 from auth.sessions where user_id=auth.uid() and id::text=auth.jwt()->>'session_id' for share;
 perform 1 from app_private.module_access_grants where member_id=a
 and module_id in(select id from app_private.app_modules where module_key='contacts')
 and ended_at is null for share;
 a:=contacts_private.actor();
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('contacts:req:'||a::text||p_request::text,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('contacts:rec:'||p_id::text,0));
 select * into r from contacts_private.records where id=p_id for update;
 if r.id is not null and r.owner_member_id<>a
 then raise exception using errcode='42501',message='Contacts unavailable';end if;
 digest:=encode(sha256(convert_to(jsonb_build_object('id',p_id,'version',p_version,'op',p_op,'data',p_data)::text,'UTF8')),'hex');
 select * into prior from contacts_private.command_receipts
 where actor_member_id=a and request_id=p_request;
 if found then
  if prior.payload_digest<>digest or prior.contact_id<>p_id
  then raise exception using errcode='40001',message='Contacts version conflict';end if;
  return jsonb_build_object('id',prior.contact_id,'version',prior.resulting_version);
 end if;
 if p_op='create' then
  if p_version<>0 or r.id is not null then raise exception using errcode='40001',message='Contacts version conflict';end if;
  if not contacts_private.can_create(a) then raise exception using errcode='42501',message='Contacts unavailable';end if;
  if length(btrim(coalesce(p_data->>'name',''))) not between 2 and 120 or
   (p_data?'phone' and length(btrim(p_data->>'phone')) not between 3 and 30)
  then raise exception using errcode='22023',message='Invalid Contacts command';end if;
  valid_method:=coalesce(p_data->>'preferred','unknown');
  if valid_method not in ('unknown','text','phone','email') then raise exception using errcode='22023',message='Invalid Contacts command';end if;
  insert into contacts_private.records(id,owner_member_id,display_name,phone,preferred_method)
  values(p_id,a,btrim(p_data->>'name'),case when p_data?'phone' then btrim(p_data->>'phone') end,valid_method);
  oldv:=0;
 else
  if r.id is null then raise exception using errcode='42501',message='Contacts unavailable';end if;
  oldv:=r.version;
  if p_version<>oldv then raise exception using errcode='40001',message='Contacts version conflict';end if;
  if (p_op='restore' and r.archived_at is null) or (p_op<>'restore' and r.archived_at is not null)
  then raise exception using errcode='42501',message='Contacts unavailable';end if;
  case p_op
   when 'edit' then
    if not(p_data?'name' or p_data?'preferred') or
      (p_data?'name' and length(btrim(p_data->>'name')) not between 2 and 120) or
      (p_data?'preferred' and p_data->>'preferred' not in ('unknown','text','phone','email'))
    then raise exception using errcode='22023',message='Invalid Contacts command';end if;
    update contacts_private.records set display_name=case when p_data?'name' then btrim(p_data->>'name') else display_name end,
    preferred_method=case when p_data?'preferred' then p_data->>'preferred' else preferred_method end where id=p_id;
   when 'interact' then
    if p_data->>'visibility'<>'author' or length(btrim(coalesce(p_data->>'text',''))) not between 1 and 500
    then raise exception using errcode='22023',message='Invalid Contacts command';end if;
    insert into contacts_private.interactions(id,contact_id,author_member_id,body)
    values(p_request,p_id,a,btrim(p_data->>'text'));
   when 'schedule' then
    tgt:=(p_data->>'target')::uuid;
    if tgt is distinct from a or r.do_not_contact or r.lifecycle not in ('new','active')
    then raise exception using errcode='42501',message='Contacts unavailable';end if;
    due:=(p_data->>'due')::timestamptz;
    if due is null or due<=now() or due>now()+interval '366 days' or
      length(btrim(coalesce(p_data->>'text',''))) not between 1 and 160
    then raise exception using errcode='22023',message='Invalid Contacts command';end if;
    insert into contacts_private.follow_ups(id,contact_id,assigned_member_id,due_at,action)
    values(p_request,p_id,a,due,btrim(p_data->>'text'));
   when 'complete','reschedule','cancel-followup' then
    tgt:=(p_data->>'target')::uuid;
    select * into f from contacts_private.follow_ups where id=tgt and contact_id=p_id for update;
    if f.id is null or f.assigned_member_id<>a then raise exception using errcode='42501',message='Contacts unavailable';end if;
    if f.state<>'scheduled' then raise exception using errcode='40001',message='Contacts version conflict';end if;
    if p_op<>'cancel-followup' and (r.do_not_contact or r.lifecycle not in ('new','active'))
    then raise exception using errcode='42501',message='Contacts unavailable';end if;
    if p_op='complete' then
     update contacts_private.follow_ups set state='completed',completed_at=clock_timestamp(),completed_by=a where id=tgt;
    else
     if p_op='reschedule' then
      due:=(p_data->>'due')::timestamptz;
      if due is null or due<=now() or due>now()+interval '366 days'
      then raise exception using errcode='22023',message='Invalid Contacts command';end if;
     end if;
     update contacts_private.follow_ups set state='cancelled',
       cancel_reason=case when p_op='reschedule' then 'rescheduled' else 'agreed_cancellation' end where id=tgt;
     if p_op='reschedule' then
      insert into contacts_private.follow_ups(id,contact_id,assigned_member_id,due_at,action)
      values(p_request,p_id,a,due,f.action);
     end if;
    end if;
   when 'status' then
    key:=p_data->>'lifecycle';
    if not ((r.lifecycle='new' and key in ('active','paused','closed')) or
    (r.lifecycle='active' and key in ('paused','closed')) or
    (r.lifecycle='paused' and key in ('active','closed')) or
    (r.lifecycle='closed' and key='active' and not r.do_not_contact))
    then raise exception using errcode='22023',message='Invalid Contacts command';end if;
    update contacts_private.records set lifecycle=key where id=p_id;
    if key in ('paused','closed') then
     update contacts_private.follow_ups set state='cancelled',cancel_reason=key where contact_id=p_id and state='scheduled';
    end if;
   when 'dnc' then
    update contacts_private.records set do_not_contact=true,
      dnc_recorded_at=coalesce(dnc_recorded_at,clock_timestamp()),lifecycle='closed' where id=p_id;
    update contacts_private.follow_ups set state='cancelled',cancel_reason='do_not_contact'
    where contact_id=p_id and state='scheduled';
   when 'archive' then
    if r.lifecycle<>'closed' then raise exception using errcode='42501',message='Contacts unavailable';end if;
    update contacts_private.records set archived_at=clock_timestamp() where id=p_id;
   when 'restore' then
    update contacts_private.records set archived_at=null where id=p_id;
   else raise exception using errcode='42501',message='Contacts unavailable';
  end case;
  update contacts_private.records set version=version+1,updated_at=clock_timestamp() where id=p_id and version=oldv;
  if not found then raise exception using errcode='40001',message='Contacts version conflict';end if;
 end if;
 insert into contacts_private.audit_events(request_id,actor_member_id,contact_id,operation,before_version,after_version)
 values(p_request,a,p_id,p_op,oldv,oldv+1);
 insert into contacts_private.command_receipts(actor_member_id,request_id,contact_id,payload_digest,resulting_version)
 values(a,p_request,p_id,digest,oldv+1);
 return jsonb_build_object('id',p_id,'version',oldv+1);
exception
 when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or check_violation or not_null_violation
 then raise exception using errcode='22023',message='Invalid Contacts command';
 when unique_violation then raise exception using errcode='40001',message='Contacts version conflict';
 when foreign_key_violation then raise exception using errcode='42501',message='Contacts unavailable';
end$$;

-- Public API is a validated invoker shim. No direct table grants exist.
create function public.contacts_workspace_r3(p_after uuid default null) returns jsonb
language sql security invoker set search_path='' as $$select contacts_private.workspace(p_after)$$;
create function public.contacts_detail_r3(p_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select contacts_private.detail(p_id)$$;
create function public.contacts_agenda_r3() returns jsonb
language sql security invoker set search_path='' as $$select contacts_private.agenda()$$;
create function public.contacts_duplicates_r3(p_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select contacts_private.duplicates(p_id)$$;
create function public.contacts_command_r3(p_id uuid,p_version bigint,p_request uuid,p_op text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select contacts_private.command(p_id,p_version,p_request,p_op,p_data)$$;

-- Restrict every private helper; grant only the five application entrypoints.
revoke execute on all functions in schema contacts_private from public,anon,authenticated,service_role;
grant execute on function contacts_private.workspace(uuid),contacts_private.detail(uuid),
 contacts_private.agenda(),contacts_private.duplicates(uuid),
 contacts_private.command(uuid,bigint,uuid,text,jsonb) to authenticated;
revoke execute on function public.contacts_workspace_r3(uuid),public.contacts_detail_r3(uuid),
 public.contacts_agenda_r3(),public.contacts_duplicates_r3(uuid),
 public.contacts_command_r3(uuid,bigint,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.contacts_workspace_r3(uuid),public.contacts_detail_r3(uuid),
 public.contacts_agenda_r3(),public.contacts_duplicates_r3(uuid),
 public.contacts_command_r3(uuid,bigint,uuid,text,jsonb) to authenticated;

-- Explicitly limit the first live release to the one verified bootstrap owner.
-- The owner remains Unassigned; organizational roles do not create Contacts grants.
do $$declare owner_id uuid;owner_auth uuid;module_id uuid;count_owners integer;
begin
 select count(*) into count_owners
 from app_private.bootstrap_receipts b join auth.users u on u.id=b.auth_user_id
 join app_private.account_links l on l.auth_user_id=u.id
 join public.members m on m.id=l.member_id
 where u.email_confirmed_at is not null and l.enabled and l.technical_enabled
 and m.status in ('active','intake');
 if count_owners<>1 then raise exception 'Expected exactly one verified bootstrap account';end if;
 select l.member_id,u.id into owner_id,owner_auth
 from app_private.bootstrap_receipts b join auth.users u on u.id=b.auth_user_id
 join app_private.account_links l on l.auth_user_id=u.id
 join public.members m on m.id=l.member_id
 where u.email_confirmed_at is not null and l.enabled and l.technical_enabled
 and m.status in ('active','intake') limit 1;
 insert into app_private.app_modules(module_key,display_name,short_name,description,accent,route_path,status,approved_at,approved_by)
 values('contacts','Contacts','Contacts','Private outreach contacts and follow-up','#42644D',
 '/modules/contacts','approved',clock_timestamp(),owner_id)
 returning id into module_id;
 insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_by)
 values(owner_id,module_id,'manager','Explicit private first-account Contacts launch; no sharing',owner_id);
 insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,after_state)
 values(owner_id,owner_auth,'contacts.initial_owner_grant',owner_id,
 'Contacts private first-account module activation',jsonb_build_object('module','contacts','audience','bootstrap_owner_only'));
end$$;
commit;
