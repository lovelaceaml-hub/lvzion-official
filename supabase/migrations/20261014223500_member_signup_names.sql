-- Live LV Zion enrollment: preserve exactly what was entered into the two name fields.
-- Additive; previous confirmed members are not split heuristically or modified.
begin;

create table app_private.member_signup_names(
 member_id uuid primary key references public.members(id) on delete restrict,
 first_name text not null check (
  length(first_name) between 1 and 80
  and first_name=btrim(first_name)
  and first_name !~ '[[:cntrl:]<>]'
 ),
 last_name text not null check (
  length(last_name) between 1 and 80
  and last_name=btrim(last_name)
  and last_name !~ '[[:cntrl:]<>]'
 ),
 recorded_at timestamptz not null default clock_timestamp()
);
alter table app_private.member_signup_names enable row level security;
revoke all on app_private.member_signup_names from public,anon,authenticated,service_role;
comment on table app_private.member_signup_names is
 'Immutable first and last names supplied by a confirmed self-service registrant. Display name can change independently through approved member commands; historical accounts are not guessed.';

-- Keep the one-argument legacy enrollment procedure for already-confirmed users
-- while atomically recording name parts for new signups with the 3-arg procedure.
create function public.complete_self_service_enrollment(
 p_name text,p_first_name text,p_last_name text
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 mid uuid;
 first_part text:=btrim(regexp_replace(p_first_name,'[[:space:]]+',' ','g'));
 last_part text:=btrim(regexp_replace(p_last_name,'[[:space:]]+',' ','g'));
begin
 if first_part is null or last_part is null
  or length(first_part) not between 1 and 80
  or length(last_part) not between 1 and 80
  or first_part ~ '[[:cntrl:]<>]' or last_part ~ '[[:cntrl:]<>]'
  or p_name is distinct from first_part||' '||last_part
 then raise exception 'Separate first and last name required' using errcode='22023';
 end if;
 -- This existing function independently verifies the Auth session, confirmed
 -- email, allowed enrollment scope, account link, and designated owner receipt.
 mid:=public.complete_self_service_enrollment(p_name);
 if exists(select 1 from app_private.self_service_enrollments where member_id=mid) then
  insert into app_private.member_signup_names(member_id,first_name,last_name)
   values(mid,first_part,last_part) on conflict(member_id) do nothing;
 end if;
 return mid;
end $$;
revoke all on function public.complete_self_service_enrollment(text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.complete_self_service_enrollment(text,text,text) to authenticated;

-- The existing projection already restricts self data and the pending review
-- queue. Enrich ONLY those authorized shapes, never a public name directory.
create or replace function app_private.enrollment_projection() returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare mid uuid:=app_private.own_account_member_id(); result_data jsonb;
begin
 if mid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select jsonb_build_object(
  'self',jsonb_build_object(
   'id',m.id,'name',m.display_name,'firstName',n.first_name,'lastName',n.last_name,
   'status',m.status,'groupId',p.group_id,'unitId',p.unit_id),
  'enrollment',jsonb_build_object(
   'state',case when m.status='intake' then 'unassigned' else 'assigned' end,
   'placementHistory',coalesce((
    select jsonb_agg(jsonb_build_object('id',h.id,'startedAt',h.started_at,
      'endedAt',h.ended_at,'reason',h.reason) order by h.started_at desc)
    from public.member_placements h where h.member_id=mid),'[]'::jsonb)),
  'unassignedMembers',case when app_private.org_authority(app_private.current_member_id())
   then coalesce((
    select jsonb_agg(jsonb_build_object(
     'id',x.id,'name',x.display_name,'firstName',sn.first_name,'lastName',sn.last_name,
     'email',c.email,'createdAt',e.created_at) order by e.created_at)
    from public.members x
    join app_private.self_service_enrollments e on e.member_id=x.id
    left join app_private.member_private_contacts c on c.member_id=x.id
    left join app_private.member_signup_names sn on sn.member_id=x.id
    where x.status='intake' and e.decision='pending'),'[]'::jsonb)
   else '[]'::jsonb end
 ) into result_data
 from public.members m
 left join public.member_placements p on p.member_id=m.id and p.ended_at is null
 left join app_private.member_signup_names n on n.member_id=m.id
 where m.id=mid;
 return result_data;
end $$;

notify pgrst,'reload schema';
commit;
