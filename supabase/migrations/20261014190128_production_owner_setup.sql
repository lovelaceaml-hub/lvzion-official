-- One designated, confirmed owner can initialize application administration.
-- The owner's placement stays Unassigned. No hierarchy or member import is seeded.
begin;
alter table app_private.enrollment_settings add column owner_email text;
create function app_private.initialize_application_owner() returns boolean language plpgsql security definer set search_path='' as $$
 declare mid uuid:=app_private.own_account_member_id(); expected text;
 begin
 perform pg_advisory_xact_lock(741085);
 if mid is null then raise exception 'Verified account required' using errcode='42501'; end if;
 select lower(owner_email) into expected from app_private.enrollment_settings where singleton;
 if expected is null or not exists(select 1 from auth.users where id=auth.uid() and lower(email)=expected and email_confirmed_at is not null) then return false; end if;
 if exists(select 1 from app_private.bootstrap_receipts) then return false; end if;
 if exists(select 1 from app_private.role_assignments where ended_at is null and role_key in ('member_administrator','technical_admin','department_administrator','pastoral_staff')) then raise exception 'Foundation already has administrators' using errcode='42501'; end if;
 insert into app_private.bootstrap_receipts(auth_user_id) values(auth.uid());
 insert into app_private.role_assignments(member_id,role_key,appointed_by,appointed_at)
 select mid,role_key,mid,now() from unnest(array['member_administrator','technical_admin','department_administrator']) role_key;
 insert into app_private.audit_events(actor_member_id,actor_auth_user_id,operation,target_member_id,reason,after_state)
 values(mid,auth.uid(),'application.owner_initialized',mid,'Designated owner confirmed personal email',jsonb_build_object('roles',array['member_administrator','technical_admin','department_administrator'],'placement',null));
 return true;
 end $$;
revoke all on function app_private.initialize_application_owner() from public,anon,authenticated,service_role;
create or replace function public.complete_self_service_enrollment(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
 declare mid uuid;
 begin
 mid:=app_private.complete_self_service_enrollment(p_name);
 perform app_private.initialize_application_owner();
 return mid;
 end $$;
-- Only the designated bootstrap identity has administrative authority before placement.
create or replace function app_private.current_member_id() returns uuid language sql stable security definer set search_path='' as $$
 select m.id from public.members m where m.id=app_private.own_account_member_id()
 and (m.status='active' or (m.status='intake' and exists(select 1 from app_private.bootstrap_receipts b where b.auth_user_id=auth.uid())))
$$;
create or replace function app_private.actor_has(p_actor uuid,p_role text,p_scope uuid default null) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from app_private.role_assignments r join public.members m on m.id=r.member_id
 where r.member_id=p_actor and (m.status='active' or (m.status='intake' and r.role_key in ('member_administrator','technical_admin','department_administrator') and exists(select 1 from app_private.bootstrap_receipts b join app_private.account_links l on l.auth_user_id=b.auth_user_id where l.member_id=m.id and l.enabled and l.technical_enabled)))
 and r.role_key=p_role and r.ended_at is null and r.appointed_at<=now()
 and (p_scope is null or p_scope=coalesce(r.unit_id,r.group_id,r.department_id))
 and (r.role_key not in ('unit_leader','group_leader') or exists(select 1 from public.member_placements p
 where p.member_id=p_actor and p.ended_at is null and p.started_at<=now()
 and ((r.role_key='unit_leader' and p.unit_id=r.unit_id) or (r.role_key='group_leader' and p.group_id=r.group_id)))))
$$;
-- A short-lived server-issued authorization prevents bypassing app bot/rate checks
-- through Supabase's public signup endpoint. Tickets are never member authority.
create table app_private.signup_tickets (
 token uuid primary key default gen_random_uuid(), email text not null,
 expires_at timestamptz not null default clock_timestamp()+interval '5 minutes'
);
alter table app_private.signup_tickets enable row level security;
revoke all on app_private.signup_tickets from public,anon,authenticated,service_role;
create function public.issue_signup_ticket(p_email text,p_mode text default 'signup') returns uuid language plpgsql security definer set search_path='' as $$
 declare ticket uuid; email_address text:=lower(btrim(p_email));
 begin
 if email_address is null or length(email_address)>254 or email_address !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' then raise exception 'Invalid address' using errcode='22023';end if;
 if p_mode='signup' then
  if not exists(select 1 from app_private.enrollment_settings where singleton and enabled and (allow_any_email or email_address=any(allowed_emails) or split_part(email_address,'@',2)=any(allowed_email_domains))) then raise exception 'Signup unavailable' using errcode='42501';end if;
 elsif p_mode='invitation' then
  if not exists(select 1 from app_private.invitations where expected_email=email_address and consumed_at is null and revoked_at is null and expires_at>now()) then raise exception 'Invitation required' using errcode='42501';end if;
 else raise exception 'Invalid mode' using errcode='22023';end if;
 delete from app_private.signup_tickets where expires_at<clock_timestamp();
 insert into app_private.signup_tickets(email) values(email_address) returning token into ticket;
 return ticket;
 end $$;
revoke all on function public.issue_signup_ticket(text,text) from public,anon,authenticated;
grant execute on function public.issue_signup_ticket(text,text) to service_role;
create function app_private.before_user_created(event jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare consumed uuid;
 begin
 delete from app_private.signup_tickets where token::text=event->'user'->'user_metadata'->>'lvz_signup_ticket'
 and email=lower(event->'user'->>'email') and expires_at>clock_timestamp() returning token into consumed;
 if consumed is null then return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Please create your account through lvz.app.'));end if;
 return '{}'::jsonb;
 end $$;
revoke all on function app_private.before_user_created(jsonb) from public,anon,authenticated,service_role;
grant usage on schema app_private to supabase_auth_admin;
grant execute on function app_private.before_user_created(jsonb) to supabase_auth_admin;

commit;
