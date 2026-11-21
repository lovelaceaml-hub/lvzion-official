begin;

-- Service role has no table privileges here. Expose only the projection,
-- as a single JSON value so PostgREST's row cap cannot truncate a workbook.
create function app_private.concert_sheet_snapshot(p_event_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
      'attendee', t.guest_name,
      'registered', to_char(t.created_at at time zone 'America/Los_Angeles', 'YYYY-MM-DD HH24:MI:SS'),
      'attendance', case when t.checked_in_at is null then 'Registered' else 'Checked in' end,
      'checked_in', to_char(t.checked_in_at at time zone 'America/Los_Angeles', 'YYYY-MM-DD HH24:MI:SS')
    ) order by t.created_at, t.id)
    from app_private.concert_tickets t where t.event_id = e.id and t.status = 'active'
  ), '[]'::jsonb)
  from app_private.concert_events e where e.id = p_event_id
$$;

create function public.concert_sheet_snapshot(p_event_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select app_private.concert_sheet_snapshot(p_event_id)
$$;

revoke all on function public.concert_sheet_snapshot(uuid), app_private.concert_sheet_snapshot(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.concert_sheet_snapshot(uuid), app_private.concert_sheet_snapshot(uuid)
  to service_role;

notify pgrst, 'reload schema';
commit;
