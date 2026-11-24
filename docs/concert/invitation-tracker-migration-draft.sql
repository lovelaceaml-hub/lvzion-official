-- REVIEW DRAFT ONLY. Generate the migration with Supabase CLI before release.
-- This file has not been applied to the hosted database.
begin;
alter table app_private.concert_named_invites add column is_test boolean not null default false;
alter table app_private.concert_audit drop constraint concert_audit_operation_check;
alter table app_private.concert_audit add constraint concert_audit_operation_check check
 (operation in ('event_create','event_edit','event_archive','rsvp_member','rsvp_guest','checkin','undo','cancel','invite_test_mark','invite_resend'));

-- Exact email AND name, not tied to another named invite. Never changes RSVP attribution.
create function app_private.concert_invite_possible_registration(p_invite app_private.concert_named_invites)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(
   select 1 from app_private.concert_tickets t
   where t.event_id=p_invite.event_id and t.status='active' and p_invite.guest_email is not null
     and lower(btrim(t.email))=lower(btrim(p_invite.guest_email))
     and lower(btrim(t.guest_name))=lower(btrim(p_invite.guest_name))
     and not exists(select 1 from app_private.concert_named_invites other where other.ticket_id=t.id)
 )
$$;
revoke all on function app_private.concert_invite_possible_registration(app_private.concert_named_invites) from public,anon,authenticated,service_role;

create function app_private.concert_invitation_tracker(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare
 actor uuid := app_private.current_member_id();
 ev app_private.concert_events;
 inv app_private.concert_named_invites;
 mail app_private.concert_mail;
 action text := p->>'action';
 wanted uuid;
begin
 if actor is null or not coalesce(app_private.module_manager(actor,app_private.concert_module_id()),false) then
   raise exception 'Not authorized' using errcode='42501';
 end if;
 if action='list' then
   select * into ev from app_private.concert_events where status='active';
 else
   select * into ev from app_private.concert_events where status='active' for update;
 end if;
 if not found then raise exception 'No active concert' using errcode='23514'; end if;
 if action='list' then
   return jsonb_build_object('eventId',ev.id,'rows',coalesce((
     select jsonb_agg(jsonb_build_object(
       'id',i.id,'sender',i.sender_name,'senderEmail',i.sender_email,'leader',i.sender_group_leader,
       'name',i.guest_name,'email',i.guest_email,'createdAt',i.created_at,'test',i.is_test,
       'mailStatus',m.status,'mailUpdatedAt',m.updated_at,'attempts',coalesce(m.attempts,0),
       'rsvp',case when i.withdrawn_at is not null then 'Withdrawn'
                   when i.party_confirmed and t.status='active' then 'Confirmed'
                   when i.ticket_id is not null then 'Linked'
                   else 'Pending' end,
       'registration',case when t.status='active' then 'Registered'
                           when t.status='cancelled' then 'Cancelled'
                           when app_private.concert_invite_possible_registration(i) then 'Possible separate registration'
                           else 'No linked ticket' end,
       'canResend',coalesce(ev.public_rsvp and ev.rsvp_open and not i.is_test and i.withdrawn_at is null
                    and i.ticket_id is null and i.guest_email is not null
                    and not app_private.concert_invite_possible_registration(i)
                    and m.status in ('pending','sent','failed')
                    and (m.attempts=0 or m.updated_at<clock_timestamp()-interval '1 minute'),false)
     ) order by i.created_at desc,i.id)
     from app_private.concert_named_invites i
     left join app_private.concert_mail m on m.kind='invitation' and m.reference_id=i.id
     left join app_private.concert_tickets t on t.id=i.ticket_id
     where i.event_id=ev.id
   ),'[]'::jsonb));
 end if;

 wanted := (p->>'id')::uuid;
 if (p->>'eventId')::uuid is distinct from ev.id then
   raise exception 'Event changed' using errcode='23514';
 end if;
 select * into inv from app_private.concert_named_invites i where i.id=wanted and i.event_id=ev.id for update;
 if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 if action='markTest' then
   if jsonb_typeof(p->'test') is distinct from 'boolean' then
     raise exception 'Invalid test flag' using errcode='22023';
   end if;
   if inv.is_test is distinct from (p->>'test')::boolean then
     update app_private.concert_named_invites set is_test=(p->>'test')::boolean where id=inv.id;
     insert into app_private.concert_audit(actor_id,event_id,operation,detail)
       values(actor,ev.id,'invite_test_mark',jsonb_build_object('invitationId',inv.id,'test',(p->>'test')::boolean));
   end if;
   return jsonb_build_object('ok',true);
 elsif action='resend' then
   if not ev.public_rsvp or not ev.rsvp_open or inv.is_test or inv.ticket_id is not null
      or inv.withdrawn_at is not null or inv.guest_email is null
      or app_private.concert_invite_possible_registration(inv) then
     raise exception 'Invitation unavailable' using errcode='23514';
   end if;
   select * into mail from app_private.concert_mail m where m.kind='invitation' and m.reference_id=inv.id for update;
   if not found or mail.status not in ('pending','sent','failed')
      or (mail.attempts>0 and mail.updated_at>=clock_timestamp()-interval '1 minute') then
     raise exception 'Mail unavailable or recently attempted' using errcode='23514';
   end if;
   -- Existing delivery RPC serializes claims. Do not create a new invitation or token.
   update app_private.concert_mail set status='pending',updated_at=clock_timestamp() where id=mail.id;
   insert into app_private.concert_audit(actor_id,event_id,operation,detail)
     values(actor,ev.id,'invite_resend',jsonb_build_object('invitationId',inv.id));
   return jsonb_build_object('ok',true);
 end if;
 raise exception 'Invalid tracker action' using errcode='22023';
end $$;

create function public.concert_invitation_tracker(p jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select app_private.concert_invitation_tracker(p) $$;
revoke all on function app_private.concert_invitation_tracker(jsonb),public.concert_invitation_tracker(jsonb) from public,anon,authenticated,service_role;
grant execute on function app_private.concert_invitation_tracker(jsonb),public.concert_invitation_tracker(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
