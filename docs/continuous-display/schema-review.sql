-- REVIEW ONLY: not a Supabase migration. Execute in disposable PostgreSQL/PGlite only.
-- Requires reviewed member foundation app_private.current_member_id().
-- No public wrappers, browser grants, storage buckets, production devices or real content are created.
create schema display_private;
revoke all on schema display_private from public;

create table display_private.displays(
 id uuid primary key default gen_random_uuid(), label text not null check(length(label) between 1 and 80),
 enabled boolean not null default false, timezone text not null default 'America/Los_Angeles' check(timezone='America/Los_Angeles'),
 width integer not null default 1920 check(width between 1280 and 4096),height integer not null default 1080 check(height between 720 and 2304),
 operating_periods jsonb not null default '[]', max_offline_seconds integer not null default 300 check(max_offline_seconds between 0 and 300),
 generation bigint not null default 0 check(generation>=0),created_at timestamptz not null default now()
);
create table display_private.authority_grants(
 display_id uuid references display_private.displays on delete restrict,member_id uuid references public.members on delete restrict,
 permission text check(permission in('create','review','approve','publish','playlist','assign','device','override')),
 granted_at timestamptz not null default now(),ended_at timestamptz,
 primary key(display_id,member_id,permission),check(ended_at is null or ended_at>=granted_at)
);
create function display_private.require_permission(p_display uuid,p_permission text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=app_private.current_member_id();begin
 if actor is null or not exists(select 1 from display_private.authority_grants where display_id=p_display and member_id=actor and permission=p_permission and ended_at is null) then raise exception 'Not authorized' using errcode='42501';end if;return actor;
end $$;
create table display_private.templates(id text primary key check(id in('editorial','schedule','event','campaign','image','video')),version integer not null default 1 check(version>0));
insert into display_private.templates(id) values('editorial'),('schedule'),('event'),('campaign'),('image'),('video');
create table display_private.media_assets(
 id uuid primary key default gen_random_uuid(),display_id uuid not null references display_private.displays,owner_id uuid not null references public.members,
 private_object_key text not null unique check(length(private_object_key) between 1 and 250),
 mime text not null check(mime in('image/png','image/jpeg','image/webp','video/mp4')),
 bytes bigint not null check(bytes between 1 and 10485760),width integer check(width between 1280 and 4096),height integer check(height between 720 and 2304),
 duration_seconds numeric check(duration_seconds>0 and duration_seconds<=60),
 state text not null default 'quarantined' check(state in('quarantined','validated','rejected')),
 metadata_stripped boolean not null default false, digest bytea check(octet_length(digest)=32),
 check(state<>'validated' or (metadata_stripped and width is not null and height is not null and digest is not null and (mime<>'video/mp4' or duration_seconds is not null)))
);
create table display_private.content_items(
 id uuid primary key default gen_random_uuid(),display_id uuid not null references display_private.displays,created_by uuid not null references public.members,
 created_at timestamptz not null default now(),archived_at timestamptz
);
create function display_private.valid_payload(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text;r jsonb;begin
 if jsonb_typeof(p)<>'object' or octet_length(p::text)>5000 then return false;end if;
 for k in select jsonb_object_keys(p) loop if k not in('eyebrow','title','body','date','time','location','rows') then return false;end if;end loop;
 if coalesce(jsonb_typeof(p->'title'),'null')<>'string' or length(btrim(p->>'title')) not between 1 and 74 then return false;end if;
 if coalesce(jsonb_typeof(p->'body'),'null')<>'string' or length(btrim(p->>'body')) not between 1 and 160 then return false;end if;
 if coalesce(jsonb_typeof(p->'eyebrow'),'null')<>'string' or length(btrim(p->>'eyebrow')) not between 1 and 52 then return false;end if;
 foreach k in array array['date','time','location'] loop if p?k and (jsonb_typeof(p->k)<>'string' or length(btrim(p->>k)) not between 1 and 64) then return false;end if;end loop;
 if p?'rows' then
  if jsonb_typeof(p->'rows')<>'array' or jsonb_array_length(p->'rows')>3 then return false;end if;
  for r in select value from jsonb_array_elements(p->'rows') loop
   if jsonb_typeof(r)<>'object' or not(r?'time' and r?'label') or (select count(*) from jsonb_object_keys(r))<>2 or jsonb_typeof(r->'time')<>'string' or jsonb_typeof(r->'label')<>'string' or length(r->>'time') not between 1 and 28 or length(r->>'label') not between 1 and 80 then return false;end if;
  end loop;
 end if;return true;
end $$;
create table display_private.content_revisions(
 id uuid primary key default gen_random_uuid(),item_id uuid not null references display_private.content_items,
 revision integer not null check(revision>0),template_id text not null references display_private.templates,
 payload jsonb not null check(display_private.valid_payload(payload)),media_id uuid references display_private.media_assets,
 created_by uuid not null references public.members,created_at timestamptz not null default now(),
 unique(item_id,revision),check(template_id not in('image','video') or media_id is not null),
 check(template_id<>'schedule' or (payload?'date' and payload?'rows' and jsonb_array_length(payload->'rows')>0)),
 check(template_id<>'event' or (payload?'date' and payload?'time' and payload?'location'))
);
create table display_private.publication_windows(
 id uuid primary key default gen_random_uuid(),revision_id uuid not null references display_private.content_revisions,
 display_id uuid not null references display_private.displays,starts_at timestamptz not null,ends_at timestamptz not null,
 cache_allowed boolean not null default false,check(ends_at>starts_at),unique(id,display_id)
);
create table display_private.approvals(
 id uuid primary key default gen_random_uuid(),window_id uuid not null unique references display_private.publication_windows,
 approved_by uuid not null references public.members,approved_at timestamptz not null default now()
);
create table display_private.approval_revocations(
 approval_id uuid primary key references display_private.approvals,revoked_by uuid not null references public.members,revoked_at timestamptz not null default now()
);
create table display_private.playlists(id uuid primary key default gen_random_uuid(),display_id uuid not null references display_private.displays,label text not null check(length(label) between 1 and 80),revision bigint not null default 1 check(revision>0));
create table display_private.playlist_entries(
 id uuid primary key default gen_random_uuid(),playlist_id uuid not null references display_private.playlists,window_id uuid not null references display_private.publication_windows,
 position integer not null check(position between 0 and 39),seconds integer not null check(seconds between 5 and 60),transition text not null default 'fade' check(transition in('cut','fade')),
 repeat integer not null default 1 check(repeat between 1 and 3),emphasis_start timestamptz,emphasis_end timestamptz,emphasis_repeat integer check(emphasis_repeat between 1 and 3),
 unique(playlist_id,position),check((emphasis_start is null and emphasis_end is null and emphasis_repeat is null) or (emphasis_start is not null and emphasis_end>emphasis_start and emphasis_repeat is not null))
);
create table display_private.published_versions(
 id uuid primary key default gen_random_uuid(),display_id uuid not null references display_private.displays,playlist_id uuid not null references display_private.playlists,
 generation bigint not null check(generation>0),snapshot jsonb not null check(jsonb_typeof(snapshot)='array' and jsonb_array_length(snapshot)<=40),
 published_by uuid not null references public.members,published_at timestamptz not null default now(),unique(display_id,generation)
);
create table display_private.current_publications(display_id uuid primary key references display_private.displays,publication_id uuid not null references display_private.published_versions);
create table display_private.device_pairings(
 id uuid primary key default gen_random_uuid(),code_digest bytea unique not null check(octet_length(code_digest)=32),poll_digest bytea unique not null check(octet_length(poll_digest)=32),
 created_at timestamptz not null default now(),expires_at timestamptz not null,attempts integer not null default 0 check(attempts between 0 and 5),claimed_at timestamptz,
 check(expires_at>created_at and expires_at<=created_at+interval '10 minutes')
);
create table display_private.device_sessions(
 id uuid primary key default gen_random_uuid(),display_id uuid not null references display_private.displays,token_digest bytea unique not null check(octet_length(token_digest)=32),
 paired_by uuid not null references public.members,created_at timestamptz not null default now(),expires_at timestamptz not null,revoked_at timestamptz,
 check(expires_at>created_at and expires_at<=created_at+interval '30 days')
);
create table display_private.playback_health(
 session_id uuid primary key references display_private.device_sessions,last_seen timestamptz not null default now(),generation bigint not null check(generation>=0),
 status text not null check(status in('playing','offline','stale','empty','quiet','revoked','media_error','clock_untrusted'))
);
create table display_private.overrides(
 id uuid primary key default gen_random_uuid(),display_id uuid not null references display_private.displays,window_id uuid not null references display_private.publication_windows,
 priority integer not null check(priority between 0 and 100),starts_at timestamptz not null,ends_at timestamptz not null,created_by uuid not null references public.members,
 check(ends_at>starts_at and ends_at<=starts_at+interval '30 minutes')
);
create table display_private.audit_events(
 id bigint generated always as identity primary key,display_id uuid not null references display_private.displays,actor_id uuid not null references public.members,
 action text not null check(action in('approve','publish','revoke_approval','pair','revoke_device','reassign_device','override','assign')),
 subject_id uuid not null,occurred_at timestamptz not null default now()
);
create function display_private.immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Create a new immutable revision' using errcode='23514';end $$;
create trigger immutable_revision before update or delete on display_private.content_revisions for each row execute function display_private.immutable();
create trigger immutable_window before update or delete on display_private.publication_windows for each row execute function display_private.immutable();
create trigger immutable_approval before update or delete on display_private.approvals for each row execute function display_private.immutable();
create trigger immutable_publication before update or delete on display_private.published_versions for each row execute function display_private.immutable();
create trigger immutable_audit before update or delete on display_private.audit_events for each row execute function display_private.immutable();

create function display_private.approve_window(p_window uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare w display_private.publication_windows;actor uuid;result uuid;begin
 select * into strict w from display_private.publication_windows where id=p_window;
 actor:=display_private.require_permission(w.display_id,'approve');
 if w.ends_at<=now() then raise exception 'Window expired' using errcode='23514';end if;
 if exists(select 1 from display_private.content_revisions r join display_private.content_items i on i.id=r.item_id where r.id=w.revision_id and (i.archived_at is not null or i.display_id<>w.display_id)) then raise exception 'Source not eligible' using errcode='23514';end if;
 insert into display_private.approvals(window_id,approved_by) values(p_window,actor) returning id into result;
 insert into display_private.audit_events(display_id,actor_id,action,subject_id) values(w.display_id,actor,'approve',result);return result;
end $$;
create function display_private.publish_playlist(p_playlist uuid,p_expected_generation bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare p display_private.playlists;d display_private.displays;actor uuid;result uuid;package jsonb;begin
 select * into strict p from display_private.playlists where id=p_playlist for update;
 actor:=display_private.require_permission(p.display_id,'publish');
 select * into strict d from display_private.displays where id=p.display_id for update;
 if d.generation<>p_expected_generation then raise exception 'Concurrent publication; review the current version' using errcode='40001';end if;
 if exists(select 1 from display_private.playlist_entries e join display_private.publication_windows w on w.id=e.window_id left join display_private.approvals a on a.window_id=w.id left join display_private.approval_revocations x on x.approval_id=a.id join display_private.content_revisions r on r.id=w.revision_id join display_private.content_items i on i.id=r.item_id left join display_private.media_assets m on m.id=r.media_id where e.playlist_id=p.id and (w.display_id<>d.id or i.display_id<>d.id or i.archived_at is not null or a.id is null or x.approval_id is not null or (r.media_id is not null and (m.state<>'validated' or m.display_id<>d.id)) or (e.emphasis_start is not null and (e.emphasis_start<w.starts_at or e.emphasis_end>w.ends_at)))) then raise exception 'Only exact approved display revisions can be published' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('entryId',e.id,'revisionId',r.id,'windowId',w.id,'layout',r.template_id,'content',r.payload,'mediaId',r.media_id,'startsAt',w.starts_at,'endsAt',w.ends_at,'cacheAllowed',w.cache_allowed,'seconds',e.seconds,'transition',e.transition,'repeat',e.repeat,'emphasisStart',e.emphasis_start,'emphasisEnd',e.emphasis_end,'emphasisRepeat',e.emphasis_repeat) order by e.position),'[]') into package from display_private.playlist_entries e join display_private.publication_windows w on w.id=e.window_id join display_private.content_revisions r on r.id=w.revision_id where e.playlist_id=p.id;
 insert into display_private.published_versions(display_id,playlist_id,generation,snapshot,published_by) values(d.id,p.id,d.generation+1,package,actor) returning id into result;
 insert into display_private.current_publications(display_id,publication_id) values(d.id,result) on conflict(display_id) do update set publication_id=excluded.publication_id;
 update display_private.displays set generation=generation+1 where id=d.id;
 insert into display_private.audit_events(display_id,actor_id,action,subject_id) values(d.id,actor,'publish',result);return result;
end $$;
create function display_private.revoke_approval(p_approval uuid) returns void language plpgsql security definer set search_path='' as $$
declare d uuid;actor uuid;begin
 select w.display_id into strict d from display_private.approvals a join display_private.publication_windows w on w.id=a.window_id where a.id=p_approval;
 actor:=display_private.require_permission(d,'approve');insert into display_private.approval_revocations(approval_id,revoked_by) values(p_approval,actor) on conflict do nothing;
 insert into display_private.audit_events(display_id,actor_id,action,subject_id) values(d,actor,'revoke_approval',p_approval);
end $$;
create function display_private.claim_pairing(p_pairing uuid,p_display uuid,p_token_digest bytea) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid;result uuid;begin
 actor:=display_private.require_permission(p_display,'device');
 if octet_length(p_token_digest)<>32 then raise exception 'Invalid digest' using errcode='23514';end if;
 update display_private.device_pairings set claimed_at=now() where id=p_pairing and claimed_at is null and attempts<5 and expires_at>now();
 if not found then raise exception 'Pairing unavailable' using errcode='42501';end if;
 insert into display_private.device_sessions(display_id,token_digest,paired_by,expires_at) values(p_display,p_token_digest,actor,now()+interval '30 days') returning id into result;
 insert into display_private.audit_events(display_id,actor_id,action,subject_id) values(p_display,actor,'pair',result);return result;
end $$;
create function display_private.revoke_device(p_session uuid) returns void language plpgsql security definer set search_path='' as $$
declare d uuid;actor uuid;begin
 select display_id into strict d from display_private.device_sessions where id=p_session;actor:=display_private.require_permission(d,'device');
 update display_private.device_sessions set revoked_at=now() where id=p_session;
 insert into display_private.audit_events(display_id,actor_id,action,subject_id) values(d,actor,'revoke_device',p_session);
end $$;
-- Only a future trusted server adapter may invoke this. It receives a SHA-256 digest, never an auth/member JWT.
-- Returns JSON, not public asset links. The private asset-signing/lease endpoint is deliberately NOT active.
create function display_private.playback_projection(p_digest bytea) returns jsonb language plpgsql security definer set search_path='' as $$
declare d display_private.displays;v display_private.published_versions;items jsonb;begin
 select screen.* into d from display_private.device_sessions s join display_private.displays screen on screen.id=s.display_id where s.token_digest=p_digest and octet_length(p_digest)=32 and s.revoked_at is null and s.expires_at>now() and screen.enabled;
 if not found then return null;end if;
 select pv.* into v from display_private.current_publications c join display_private.published_versions pv on pv.id=c.publication_id and pv.display_id=d.id where c.display_id=d.id;
 if not found then return null;end if;
 select coalesce(jsonb_agg(item),'[]') into items from jsonb_array_elements(v.snapshot) item join display_private.publication_windows w on w.id=(item->>'windowId')::uuid join display_private.approvals a on a.window_id=w.id left join display_private.approval_revocations x on x.approval_id=a.id where x.approval_id is null and w.ends_at>now() and w.display_id=d.id;
 return jsonb_build_object('screenId',d.id,'generation',v.generation,'serverTime',now(),'leaseUntil',now()+make_interval(secs=>d.max_offline_seconds),'items',items);
end $$;

-- No ambient role obtains these private resources. RLS is deny-all; only reviewed owner-executed commands can write.
do $$declare r record;begin for r in select tablename from pg_tables where schemaname='display_private' loop execute format('alter table display_private.%I enable row level security',r.tablename);end loop;end $$;
revoke all on all tables in schema display_private from public;
revoke all on all sequences in schema display_private from public;
revoke all on all functions in schema display_private from public;
alter default privileges in schema display_private revoke execute on functions from public;
