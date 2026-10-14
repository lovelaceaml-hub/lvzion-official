-- LV Zion Official — UNAPPLIED review candidate, no official modules seeded.
-- Publish/authorize modules only after an explicit module + owner approval.
-- Existing member permissions remain independent; private module grants are additive.
begin;

create table app_private.app_modules (
 id uuid primary key default gen_random_uuid(),
 module_key text not null unique check(module_key ~ '^[a-z][a-z0-9-]{2,48}$'),
 display_name text not null check(length(btrim(display_name)) between 2 and 80),
 short_name text not null check(length(btrim(short_name)) between 1 and 12),
 description text not null default '' check(length(description)<=500),
 accent text not null default '#52718c' check(accent ~ '^#[0-9a-fA-F]{6}$'),
 route_path text not null unique check(route_path ~ '^/modules/[a-z][a-z0-9-]{2,48}$'),
 status text not null default 'draft' check(status in ('draft','approved','retired')),
 approved_at timestamptz,
 approved_by uuid references public.members on delete restrict,
 owner_department_id uuid references public.departments on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check(status<>'approved' or approved_at is not null)
);
create table app_private.module_access_grants (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.members on delete restrict,
 module_id uuid not null references app_private.app_modules on delete restrict,
 permission text not null default 'viewer' check(permission in ('viewer','manager')),
 granted_at timestamptz not null default clock_timestamp(),
 ended_at timestamptz,
 reason text not null check(length(btrim(reason)) between 5 and 500),
 granted_by uuid references public.members on delete restrict,
 ended_by uuid references public.members on delete restrict,
 check(ended_at is null or ended_at>granted_at)
);
create unique index one_current_module_access on app_private.module_access_grants(member_id,module_id) where ended_at is null;
create index module_grants_current on app_private.module_access_grants(module_id,member_id) where ended_at is null;

create table app_private.member_module_favorites (
 member_id uuid primary key references public.members on delete restrict,
 module_ids uuid[] not null default '{}'::uuid[],
 version integer not null default 0 check(version>=0),
 updated_at timestamptz not null default clock_timestamp(),
 check(cardinality(module_ids)<=8),
 check(array_position(module_ids,null) is null)
);
create table app_private.module_activities (
 id uuid primary key default gen_random_uuid(),
 module_id uuid not null references app_private.app_modules on delete restrict,
 recipient_member_id uuid not null references public.members on delete restrict,
 title text not null check(length(btrim(title)) between 2 and 150),
 context text not null default '' check(length(context)<=300),
 location_label text check(length(location_label)<=140),
 begins_at timestamptz not null,
 ends_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','cancelled')),
 external_reference text check(length(external_reference)<=128),
 created_at timestamptz not null default clock_timestamp(),
 check(ends_at>begins_at)
);
create index module_activities_recipient_upcoming on app_private.module_activities(recipient_member_id,begins_at,id)
 where status='scheduled';
create unique index module_activity_external_ref on app_private.module_activities(module_id,external_reference)
 where external_reference is not null;

-- Only generic notices are stored here; no message/body free text or private member data.
create table app_private.module_notices (
 id uuid primary key default gen_random_uuid(),
 module_id uuid not null references app_private.app_modules on delete restrict,
 recipient_member_id uuid not null references public.members on delete restrict,
 requires_action boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 read_at timestamptz,
 external_reference text check(length(external_reference)<=128),
 check(read_at is null or read_at>=created_at)
);
create index module_notices_recipient_recent on app_private.module_notices(recipient_member_id,created_at desc,id);
create unique index module_notice_external_ref on app_private.module_notices(module_id,external_reference)
 where external_reference is not null;

-- Push is OFF by default; inserting preferences does not activate delivery.
create table app_private.module_notification_preferences (
 member_id uuid not null references public.members on delete restrict,
 module_id uuid not null references app_private.app_modules on delete restrict,
 push_requested boolean not null default false,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(member_id,module_id)
);

do $$
declare t text;
begin
 foreach t in array array[
  'app_modules','module_access_grants','member_module_favorites',
  'module_activities','module_notices','module_notification_preferences'
 ] loop
  execute format('alter table app_private.%I enable row level security',t);
  execute format('revoke all on app_private.%I from public, anon, authenticated',t);
 end loop;
end $$;

-- Internal helper, used ONLY from functions that verified current_member_id().
create function app_private.module_allowed(p_member uuid,p_module uuid)
returns boolean language sql stable set search_path='' as $$
 select p_member is not null and exists(
  select 1 from app_private.app_modules m
  join app_private.module_access_grants g on g.module_id=m.id
  where m.id=p_module and m.status='approved' and m.approved_at is not null
    and g.member_id=p_member and g.ended_at is null and g.granted_at<=now()
 )
$$;

-- Whitelisted projection: self-only module rights, self activities and generic notices.
create function app_private.member_module_home()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 actor uuid:=app_private.current_member_id();
 result_data jsonb;
begin
 if actor is null then raise exception 'Not authorized' using errcode='42501';end if;
 select jsonb_build_object(
 'modules',coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',m.id,'name',m.display_name,'shortName',m.short_name,'description',m.description,
   'accent',m.accent,'route',m.route_path,'status','approved','canManage',g.permission='manager'
  ) order by m.display_name,m.id)
  from app_private.app_modules m
  join app_private.module_access_grants g on g.module_id=m.id
  where g.member_id=actor and g.ended_at is null and g.granted_at<=now()
    and m.status='approved' and m.approved_at is not null
 ),'[]'::jsonb),
 'activities',coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',a.id,'moduleId',a.module_id,'title',a.title,
   'date',to_char(a.begins_at at time zone 'America/Los_Angeles','YYYY-MM-DD'),
   'startTime',to_char(a.begins_at at time zone 'America/Los_Angeles','HH24:MI'),
   'endTime',to_char(a.ends_at at time zone 'America/Los_Angeles','HH24:MI'),
   'context',a.context,'location',a.location_label,'source','approved-module'
  ) order by a.begins_at,a.id)
  from (
    select * from app_private.module_activities a
    where a.recipient_member_id=actor and a.status='scheduled'
      and a.begins_at>=now()-interval '7 days'
      and a.begins_at<now()+interval '90 days'
      and app_private.module_allowed(actor,a.module_id)
    order by a.begins_at,a.id limit 80
  ) a
 ),'[]'::jsonb),
 'notifications',coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',n.id,'moduleId',n.module_id,'title','Update available in '||m.display_name,
   'description',case when n.requires_action then 'An action is available in your authorized application.'
                      else 'A new update is available in your authorized application.' end,
   'createdAt',n.created_at,'readAt',n.read_at,'requiresAction',n.requires_action,
   'route',m.route_path
  ) order by n.created_at desc,n.id)
  from (
    select * from app_private.module_notices n
    where n.recipient_member_id=actor and n.created_at>=now()-interval '30 days'
      and app_private.module_allowed(actor,n.module_id)
    order by n.created_at desc,n.id limit 40
  ) n join app_private.app_modules m on m.id=n.module_id
 ),'[]'::jsonb),
 'favorites',coalesce((
  select jsonb_agg(f.module_id order by f.sort_order)
  from app_private.member_module_favorites p,
       unnest(p.module_ids) with ordinality as f(module_id,sort_order)
  where p.member_id=actor and app_private.module_allowed(actor,f.module_id)
 ),'[]'::jsonb),
 'favoriteVersion',coalesce((select version from app_private.member_module_favorites where member_id=actor),0)
 ) into result_data;
 return result_data;
end $$;

-- Atomic compare-and-swap; a stale phone cannot overwrite favorites from another device.
-- Every submitted module must be currently approved and individually granted.
create function app_private.save_module_favorites(p_module_ids uuid[],p_expected_version integer)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid; before_version integer; next_version integer; module_id uuid;
begin
 actor:=app_private.current_member_id();
 if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_module_ids is null or p_expected_version is null or p_expected_version<0
    or cardinality(p_module_ids)>8 or array_position(p_module_ids,null) is not null
    or (select count(distinct x) from unnest(p_module_ids) x)<>cardinality(p_module_ids)
 then raise exception 'Invalid favorites' using errcode='22023'; end if;

 -- Serialize all changes to this member, even across separate initial inserts.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,139853));
 insert into app_private.member_module_favorites(member_id) values(actor)
  on conflict(member_id) do nothing;
 select version into before_version from app_private.member_module_favorites where member_id=actor for update;
 if before_version<>p_expected_version then raise exception 'Favorites changed on another device' using errcode='40001'; end if;
 foreach module_id in array p_module_ids loop
  if not app_private.module_allowed(actor,module_id) then
   raise exception 'Module not authorized' using errcode='42501';
  end if;
 end loop;
 update app_private.member_module_favorites
  set module_ids=p_module_ids,version=version+1,updated_at=clock_timestamp()
  where member_id=actor returning version into next_version;
 return jsonb_build_object('favorites',to_jsonb(p_module_ids),'favoriteVersion',next_version);
end $$;

create function app_private.mark_module_notice_read(p_notice_id uuid)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=app_private.current_member_id();
 if actor is null then raise exception 'Not authorized' using errcode='42501'; end if;
 update app_private.module_notices n
 set read_at=coalesce(read_at,clock_timestamp())
 where n.id=p_notice_id and n.recipient_member_id=actor
  and app_private.module_allowed(actor,n.module_id);
 return found;
end $$;

-- Exposed, security-invoker wrappers. No SERVICE_ROLE key is used in the UI.
create function public.member_module_home()
returns jsonb language sql stable security invoker set search_path='' as $$
 select app_private.member_module_home()
$$;
create function public.save_module_favorites(p_module_ids uuid[],p_expected_version integer)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.save_module_favorites(p_module_ids,p_expected_version)
$$;
create function public.mark_module_notice_read(p_notice_id uuid)
returns boolean language sql security invoker set search_path='' as $$
 select app_private.mark_module_notice_read(p_notice_id)
$$;

revoke execute on function app_private.module_allowed(uuid,uuid) from public,anon,authenticated;
revoke execute on function app_private.member_module_home(),app_private.save_module_favorites(uuid[],integer),
 app_private.mark_module_notice_read(uuid) from public,anon,authenticated;
revoke execute on function public.member_module_home(),public.save_module_favorites(uuid[],integer),
 public.mark_module_notice_read(uuid) from public,anon,authenticated;
grant execute on function app_private.member_module_home(),app_private.save_module_favorites(uuid[],integer),
 app_private.mark_module_notice_read(uuid) to authenticated;
grant execute on function public.member_module_home(),public.save_module_favorites(uuid[],integer),
 public.mark_module_notice_read(uuid) to authenticated;

-- Privileged writes to app_modules, grants, activities and notices are NOT supplied
-- by this migration. A module-specific owner and audit procedure require approval.
commit;
