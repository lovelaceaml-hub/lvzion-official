-- CONTACTS R3 REVIEW ONLY. Apply after schema-review.sql and runtime-review.sql
-- in an isolated disposable database. NOT a hosted migration or activation.
-- The literal-false review gate and revoked execution permissions are preserved.
begin;
create function contacts_private.review_command_guarded(
 p_id uuid,p_version bigint,p_request uuid,p_op text,p_data jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid; target_id uuid; ids uuid[]; participants uuid[]; record_id uuid;
 source contacts_private.records;
begin
 -- Resolve the existing verified session; request parameters never select an actor.
 actor:=contacts_private.review_actor();
 if p_id is null or p_request is null or p_version is null or p_version<0
 or p_op is null or jsonb_typeof(p_data) is distinct from 'object'
 or octet_length(p_data::text)>4096 then
  raise exception using errcode='22023',message='Invalid Contacts command';
 end if;
 if p_data ? 'target' then
  if jsonb_typeof(p_data->'target')<>'string' then
   raise exception using errcode='22023',message='Invalid Contacts command';
  end if;
  target_id:=(p_data->>'target')::uuid;
 end if;
 -- A fast denial precedes record locks. The inner command authorizes again after locks.
 select * into source from contacts_private.records where id=p_id;
 if p_op<>'create' and (source.id is null or not coalesce(
   case when p_op='reassign' then contacts_private.review_owner(actor,source)
     or contacts_private.review_capability(actor,'handoff_steward',source.origin_group_id)
   else contacts_private.review_access(actor,source) end,false)) then
  raise exception using errcode='42501',message='Contacts unavailable';
 end if;
 if p_op='duplicate-distinct' and not exists(
  select 1 from contacts_private.records r where r.id=target_id
  and coalesce(contacts_private.review_access(actor,r),false)
 ) then raise exception using errcode='42501',message='Contacts unavailable';end if;

 -- Universal entrypoint order: module, request key, sorted contact keys/rows,
 -- members, placements, hierarchy, account links, session, module grants, capabilities.
 -- Request lock is identical to the inner command's key and covers cross-record reuse.
 perform 1 from app_private.app_modules where module_key='contacts' for share;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text||p_request::text,0));
 ids:=case when p_op='duplicate-distinct' then array[p_id,target_id] else array[p_id] end;
 for record_id in select distinct unnest(ids) order by 1 loop
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('contacts:record:'||record_id::text,0));
 end loop;
 perform 1 from contacts_private.records where id=any(ids) order by id for update;

 -- Resolve task assignees from stored tasks, never treat a task UUID as a member UUID.
 -- Include BOTH duplicate-review owners, all open-task assignees, current collaborators,
 -- the actor, and a member-valued target. These rows cannot change mid-command.
 select array_agg(distinct member_id order by member_id) into participants from (
  select actor member_id
  union all select r.owner_member_id from contacts_private.records r where r.id=any(ids)
  union all select f.assigned_member_id from contacts_private.follow_ups f where f.contact_id=any(ids) and f.state='scheduled'
  union all select s.member_id from contacts_private.shares s where s.contact_id=any(ids) and s.revoked_at is null
  union all select target_id where target_id is not null
 ) resolved where member_id is not null;
 perform 1 from public.members where id=any(participants) order by id for share;
 perform 1 from public.member_placements where member_id=any(participants) order by id for share;
 perform 1 from public.age_categories a where a.id in (
  select g.age_category_id from public.church_groups g join public.member_placements p on p.group_id=g.id where p.member_id=any(participants)
 ) order by a.id for share;
 perform 1 from public.church_groups g where g.id in (
  select p.group_id from public.member_placements p where p.member_id=any(participants)
 ) order by g.id for share;
 perform 1 from public.church_units u where u.id in (
  select p.unit_id from public.member_placements p where p.member_id=any(participants)
 ) order by u.id for share;
 perform 1 from app_private.account_links where member_id=any(participants) order by member_id for share;
 perform 1 from auth.sessions where user_id=auth.uid() and id::text=auth.jwt()->>'session_id' for share;
 perform 1 from app_private.module_access_grants where member_id=any(participants) order by id for share;
 -- Timed capability grants also need locking; do not filter to ends_at IS NULL.
 perform 1 from contacts_private.capabilities where member_id=actor order by id for share;

 -- Existing SQL repeats current authorization, state, version and canonical receipt checks
 -- and commits data, history and audit atomically. No external delivery is performed.
 return contacts_private.review_command(p_id,p_version,p_request,p_op,p_data);
exception when invalid_text_representation then
 raise exception using errcode='22023',message='Invalid Contacts command';
end$$;
-- The R2 function is an internal implementation, never an API entrypoint.
revoke execute on function contacts_private.review_command(uuid,bigint,uuid,text,jsonb) from public,anon,authenticated,service_role;
revoke execute on function contacts_private.review_command_guarded(uuid,bigint,uuid,text,jsonb) from public,anon,authenticated,service_role;
commit;
