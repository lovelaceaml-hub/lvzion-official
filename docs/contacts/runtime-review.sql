-- CONTACTS R2: UNAPPLIED TRANSACTIONAL REVIEW. Not a migration; no public API.
-- Requires the member/module foundations and schema-review.sql in a disposable database.
-- Every entry point is closed by a literal false gate. Only the isolated test harness
-- replaces that function. Never install the test harness on a hosted database.
begin;
alter table contacts_private.follow_ups drop constraint follow_ups_cancel_reason_check;
alter table contacts_private.follow_ups add constraint follow_ups_cancel_reason_check check(cancel_reason in ('sharing_revoked','handoff_review','do_not_contact','paused','closed','archived','rescheduled','agreed_cancellation'));
alter table contacts_private.audit_events drop constraint audit_events_action_check;
alter table contacts_private.audit_events add constraint audit_events_action_check check(action in ('create','share','revoke','interact','schedule','complete','reassign','status','dnc','archive','duplicate-distinct','edit','reschedule','cancel-followup','restore','correct-interaction'));
create function contacts_private.review_is_approved() returns boolean language sql immutable security invoker set search_path='' as $$select false$$;
create function contacts_private.review_placement(m uuid) returns uuid language sql stable security invoker set search_path='' as $$
 select p.id from public.member_placements p join public.members u on u.id=p.member_id
 join public.church_groups g on g.id=p.group_id join public.church_units n on n.id=p.unit_id join public.age_categories a on a.id=g.age_category_id
 where p.member_id=m and u.status='active' and p.ended_at is null and p.started_at<=now() and g.is_active and n.is_active and a.is_active
 and exists(select 1 from app_private.module_access_grants v join app_private.app_modules x on x.id=v.module_id
 where v.member_id=m and v.ended_at is null and v.granted_at<=now() and x.module_key='contacts' and x.status='approved' and x.approved_at<=now()) limit 1
$$;
create function contacts_private.review_actor() returns uuid language plpgsql stable security invoker set search_path='' as $$declare a uuid;begin
 if not contacts_private.review_is_approved() then raise exception using errcode='42501',message='Contacts unavailable';end if;
 a:=app_private.current_member_id();
 if a is null or contacts_private.review_placement(a) is null then raise exception using errcode='42501',message='Contacts unavailable';end if;return a;
end$$;
create function contacts_private.review_capability(a uuid,k text,g uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from contacts_private.capabilities c join public.member_placements p on p.id=c.placement_id
 where c.member_id=a and c.capability=k and c.group_id=g and p.group_id=g and c.placement_id=contacts_private.review_placement(a)
 and c.starts_at<=now() and (c.ends_at is null or c.ends_at>now()))
$$;
create function contacts_private.review_owner(a uuid,c contacts_private.records) returns boolean language sql stable security invoker set search_path='' as $$
 select a=c.owner_member_id and c.owner_placement_id=contacts_private.review_placement(a)
$$;
create function contacts_private.review_access(a uuid,c contacts_private.records) returns boolean language sql stable security invoker set search_path='' as $$
 select c.owner_placement_id=contacts_private.review_placement(c.owner_member_id) and
 (a=c.owner_member_id or exists(select 1 from contacts_private.shares s join public.member_placements p on p.id=s.placement_id
 where s.contact_id=c.id and s.member_id=a and s.revoked_at is null and s.starts_at<=now() and s.placement_id=contacts_private.review_placement(a) and p.group_id=c.origin_group_id))
$$;
create function contacts_private.review_methods(a uuid,c contacts_private.records) returns boolean language sql stable security invoker set search_path='' as $$
 select contacts_private.review_access(a,c) and (a=c.owner_member_id or exists(select 1 from contacts_private.shares s where s.contact_id=c.id and s.member_id=a and s.placement_id=contacts_private.review_placement(a) and s.revoked_at is null and s.starts_at<=now() and s.read_methods))
$$;
create function contacts_private.review_read(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a uuid:=contacts_private.review_actor();c contacts_private.records;since timestamptz;begin
 select * into c from contacts_private.records where id=p_id;
 if c.id is null or not coalesce(contacts_private.review_access(a,c),false) then raise exception using errcode='42501',message='Contacts unavailable';end if;
 select s.starts_at into since from contacts_private.shares s where s.contact_id=c.id and s.member_id=a and s.revoked_at is null and s.placement_id=contacts_private.review_placement(a);
 return jsonb_build_object('id',c.id,'version',c.version,'name',(select i.display_name from contacts_private.identities i where i.contact_id=c.id),'owner',c.owner_member_id,'lifecycle',c.lifecycle,'preferred',c.preferred_method,'do_not_contact',c.do_not_contact,'archived',c.archived_at is not null,
 'methods',case when contacts_private.review_methods(a,c) then coalesce((select jsonb_agg(jsonb_build_object('kind',m.kind,'value',m.value) order by m.kind,m.id) from contacts_private.methods m where m.contact_id=c.id),'[]'::jsonb) else '[]'::jsonb end,
 'interactions',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'author',i.author_member_id,'at',i.occurred_at,'text',i.body,'visibility',i.visibility,'supersedes',i.supersedes_id) order by i.recorded_at,i.id) from contacts_private.interactions i where i.contact_id=c.id and ((i.visibility='author' and i.author_member_id=a) or (i.visibility='collaborators' and (a=c.owner_member_id or i.recorded_at>=since)))),'[]'::jsonb),
 'follow_ups',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'assigned',f.assigned_member_id,'due',f.due_at,'action',f.action,'state',f.state,'completed_at',f.completed_at,'reason',f.cancel_reason) order by f.due_at,f.id) from contacts_private.follow_ups f where f.contact_id=c.id and (a=c.owner_member_id or f.assigned_member_id=a)),'[]'::jsonb));
end$$;
create function contacts_private.review_agenda() returns jsonb language plpgsql stable security definer set search_path='' as $$declare a uuid:=contacts_private.review_actor();begin
 return coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'title','Private Contacts activity','href','/modules/contacts','delivery_enabled',false) order by f.due_at,f.id)
 from contacts_private.follow_ups f join contacts_private.records c on c.id=f.contact_id where f.assigned_member_id=a and f.state='scheduled' and c.archived_at is null and not c.do_not_contact and c.lifecycle in ('new','active') and contacts_private.review_access(a,c)),'[]'::jsonb);
end$$;
create function contacts_private.review_duplicates(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare a uuid:=contacts_private.review_actor();c contacts_private.records;begin
 select * into c from contacts_private.records where id=p_id;
 if c.id is null or not coalesce(contacts_private.review_access(a,c),false) then raise exception using errcode='42501',message='Contacts unavailable';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.display_name)) from (
 select d.id,i.display_name from contacts_private.records d join contacts_private.identities i on i.contact_id=d.id
 where d.id<>c.id and contacts_private.review_access(a,d) and (lower(btrim(i.display_name))=(select lower(btrim(n.display_name)) from contacts_private.identities n where n.contact_id=c.id)
 or (contacts_private.review_methods(a,c) and contacts_private.review_methods(a,d) and exists(select 1 from contacts_private.methods m join contacts_private.methods n on n.kind=m.kind and lower(n.value)=lower(m.value) where m.contact_id=c.id and n.contact_id=d.id))) order by d.id limit 20) r),'[]'::jsonb);
end$$;
create function contacts_private.review_command(p_id uuid,p_version bigint,p_request uuid,p_op text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a uuid;c contacts_private.records;old_version bigint;tgt uuid;placement uuid;scope uuid;prior contacts_private.command_receipts;digest text;result jsonb;allowed text[];owner boolean;reader boolean;task contacts_private.follow_ups;note contacts_private.interactions;due timestamptz;k text;created_id uuid;
begin
 -- Every module suspension, grant revocation, member/placement update and session revocation
 -- conflicts with these SHARE row locks. All Contacts mutations also lock contact rows.
 if not contacts_private.review_is_approved() then raise exception using errcode='42501',message='Contacts unavailable';end if;
 if p_request is null or p_id is null or p_version is null or p_version<0 or p_op is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception using errcode='22023',message='Invalid Contacts command';end if;
 allowed:=case p_op when 'create' then array['name','preferred','phone'] when 'share' then array['target','methods'] when 'revoke' then array['target'] when 'interact' then array['text','visibility'] when 'schedule' then array['target','due','text'] when 'complete' then array['target'] when 'reassign' then array['target'] when 'status' then array['lifecycle'] when 'dnc' then array[]::text[] when 'archive' then array[]::text[] when 'restore' then array[]::text[] when 'edit' then array['name','preferred'] when 'reschedule' then array['target','due'] when 'cancel-followup' then array['target'] when 'correct-interaction' then array['target','text'] when 'duplicate-distinct' then array['target'] else null end;
 if allowed is null or exists(select 1 from jsonb_object_keys(p_data) x where not x=any(allowed)) or octet_length(p_data::text)>4096 then raise exception using errcode='22023',message='Invalid Contacts command';end if;
 for k in select jsonb_object_keys(p_data) loop if (k='methods' and jsonb_typeof(p_data->k)<>'boolean') or (k<>'methods' and jsonb_typeof(p_data->k)<>'string') then raise exception using errcode='22023',message='Invalid Contacts command';end if;end loop;
 if p_data ? 'target' then tgt:=(p_data->>'target')::uuid;end if;
 perform 1 from app_private.app_modules where module_key='contacts' for share;
 -- Contact locks are sorted for pair reviews. A different contact's identifier never grants access.
 perform 1 from contacts_private.records where id=p_id or (p_op='duplicate-distinct' and id=tgt) order by id for update;
 select * into c from contacts_private.records where id=p_id;
 a:=app_private.current_member_id();
 perform 1 from public.members where id in (a,c.owner_member_id,tgt) order by id for share;
 perform 1 from public.member_placements where member_id in (a,c.owner_member_id,tgt) and ended_at is null order by id for share;
 perform 1 from app_private.account_links where member_id=a for share;
 perform 1 from auth.sessions where user_id=auth.uid() and id::text=auth.jwt()->>'session_id' for share;
 perform 1 from app_private.module_access_grants where member_id in (a,c.owner_member_id,tgt) and ended_at is null order by id for share;
 perform 1 from contacts_private.capabilities where member_id=a and ends_at is null order by id for share;
 a:=contacts_private.review_actor();placement:=contacts_private.review_placement(a);
 select group_id into scope from public.member_placements where id=placement;
 owner:=coalesce(contacts_private.review_owner(a,c),false);reader:=coalesce(contacts_private.review_access(a,c),false);
 if p_op='create' then
  if not contacts_private.review_capability(a,'create',scope) then raise exception using errcode='42501',message='Contacts unavailable';end if;
 elsif c.id is null or not (case when p_op='reassign' then owner or contacts_private.review_capability(a,'handoff_steward',c.origin_group_id) when p_op in ('share','revoke','status','archive','restore','edit') then owner else reader end) then raise exception using errcode='42501',message='Contacts unavailable';end if;
 -- Serialize idempotency keys across contacts, then reauthorize before disclosing a receipt.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a::text||p_request::text,0));
 digest:=encode(sha256(convert_to(jsonb_build_object('id',p_id,'version',p_version,'op',p_op,'data',p_data)::text,'UTF8')),'hex');
 select * into prior from contacts_private.command_receipts where actor_member_id=a and request_id=p_request;
 if found then if prior.payload_digest<>digest then raise exception using errcode='40001',message='Contacts version conflict';end if;return jsonb_build_object('id',prior.contact_id,'version',prior.resulting_version);end if;
 if p_op='create' then
  if c.id is not null or p_version<>0 then raise exception using errcode='40001',message='Contacts version conflict';end if;
  if length(btrim(coalesce(p_data->>'name','')) ) not between 2 and 120 or coalesce(p_data->>'preferred','unknown') not in ('unknown','text','phone','email') or (p_data ? 'phone' and length(btrim(p_data->>'phone')) not between 3 and 30) then raise exception using errcode='22023',message='Invalid Contacts command';end if;
  insert into contacts_private.records(id,owner_member_id,owner_placement_id,origin_group_id,preferred_method) values(p_id,a,placement,scope,coalesce(p_data->>'preferred','unknown'));
  insert into contacts_private.identities values(p_id,btrim(p_data->>'name'));
  if p_data ? 'phone' then insert into contacts_private.methods(contact_id,kind,value) values(p_id,'phone',btrim(p_data->>'phone'));end if;
  insert into contacts_private.ownership_events(contact_id,next_member_id,actor_member_id,reason_code) values(p_id,a,a,'created');old_version:=0;
 else
  old_version:=c.version;
  if c.version<>p_version then raise exception using errcode='40001',message='Contacts version conflict';end if;
  if (p_op='restore' and c.archived_at is null) or (p_op<>'restore' and c.archived_at is not null) then raise exception using errcode='42501',message='Contacts unavailable';end if;
  case p_op
  when 'share' then
   if c.do_not_contact or c.lifecycle='closed' or tgt=c.owner_member_id or tgt is null then raise exception using errcode='42501',message='Contacts unavailable';end if;
   placement:=contacts_private.review_placement(tgt);
   if placement is null or not exists(select 1 from public.member_placements p where p.id=placement and p.group_id=c.origin_group_id) then raise exception using errcode='42501',message='Contacts unavailable';end if;
   insert into contacts_private.shares(contact_id,member_id,placement_id,read_methods,granted_by) values(c.id,tgt,placement,coalesce((p_data->>'methods')::boolean,false),a);
  when 'revoke' then
   update contacts_private.shares set revoked_at=clock_timestamp() where contact_id=c.id and member_id=tgt and revoked_at is null;
   if not found then raise exception using errcode='22023',message='Invalid Contacts command';end if;
   update contacts_private.follow_ups set state='cancelled',cancel_reason='sharing_revoked' where contact_id=c.id and assigned_member_id=tgt and state='scheduled';
  when 'interact','correct-interaction' then
   if length(btrim(coalesce(p_data->>'text',''))) not between 1 and 500 then raise exception using errcode='22023',message='Invalid Contacts command';end if;
   if p_op='correct-interaction' then
    select * into note from contacts_private.interactions where id=tgt and contact_id=c.id and author_member_id=a;
    if note.id is null then raise exception using errcode='42501',message='Contacts unavailable';end if;
    k:=note.visibility;
   else k:=p_data->>'visibility';if k is null or k not in ('author','collaborators') then raise exception using errcode='22023',message='Invalid Contacts command';end if;end if;
   insert into contacts_private.interactions(id,contact_id,author_member_id,occurred_at,recorded_at,body,visibility,supersedes_id) values(p_request,c.id,a,clock_timestamp(),clock_timestamp(),btrim(p_data->>'text'),k,case when p_op='correct-interaction' then tgt end);
  when 'schedule' then
   if c.do_not_contact or c.lifecycle not in ('new','active') or tgt is null or not coalesce(contacts_private.review_access(tgt,c),false) or (not owner and tgt<>a) then raise exception using errcode='42501',message='Contacts unavailable';end if;
   due:=(p_data->>'due')::timestamptz;
   if due is null or due<=now() or due>now()+interval '366 days' or length(btrim(coalesce(p_data->>'text',''))) not between 1 and 160 then raise exception using errcode='22023',message='Invalid Contacts command';end if;
   insert into contacts_private.follow_ups(id,contact_id,assigned_member_id,due_at,action) values(p_request,c.id,tgt,due,btrim(p_data->>'text'));
  when 'complete','reschedule','cancel-followup' then
   select * into task from contacts_private.follow_ups where id=tgt and contact_id=c.id for update;
   if task.id is null or (not owner and task.assigned_member_id<>a) then raise exception using errcode='42501',message='Contacts unavailable';end if;
   if task.state<>'scheduled' then raise exception using errcode='40001',message='Contacts version conflict';end if;
   if p_op<>'cancel-followup' and (c.do_not_contact or c.lifecycle not in ('new','active')) then raise exception using errcode='42501',message='Contacts unavailable';end if;
   if p_op='complete' then update contacts_private.follow_ups set state='completed',completed_at=clock_timestamp(),completed_by=a where id=tgt;
   else
    if p_op='reschedule' then due:=(p_data->>'due')::timestamptz;if due is null or due<=now() or due>now()+interval '366 days' or not coalesce(contacts_private.review_access(task.assigned_member_id,c),false) then raise exception using errcode='22023',message='Invalid Contacts command';end if;end if;
    update contacts_private.follow_ups set state='cancelled',cancel_reason=case when p_op='reschedule' then 'rescheduled' else 'agreed_cancellation' end where id=tgt;
    if p_op='reschedule' then insert into contacts_private.follow_ups(id,contact_id,assigned_member_id,due_at,action) values(p_request,c.id,task.assigned_member_id,due,task.action);end if;
   end if;
  when 'reassign' then
   placement:=contacts_private.review_placement(tgt);
   if tgt is null or tgt=c.owner_member_id or placement is null or not exists(select 1 from public.member_placements where id=placement and group_id=c.origin_group_id) then raise exception using errcode='42501',message='Contacts unavailable';end if;
   update contacts_private.records set owner_member_id=tgt,owner_placement_id=placement where id=c.id;
   update contacts_private.shares set revoked_at=clock_timestamp() where contact_id=c.id and revoked_at is null;
   update contacts_private.follow_ups set state='cancelled',cancel_reason='handoff_review' where contact_id=c.id and state='scheduled';
   insert into contacts_private.ownership_events(contact_id,previous_member_id,next_member_id,actor_member_id,reason_code) values(c.id,c.owner_member_id,tgt,a,case when owner then 'voluntary_handoff' else 'inactivity_review' end);
  when 'status' then
   k:=p_data->>'lifecycle';
   if k is null or not ((c.lifecycle='new' and k in ('active','paused','closed')) or (c.lifecycle='active' and k in ('paused','closed')) or (c.lifecycle='paused' and k in ('active','closed')) or (c.lifecycle='closed' and k='active' and not c.do_not_contact)) then raise exception using errcode='22023',message='Invalid Contacts command';end if;
   update contacts_private.records set lifecycle=k where id=c.id;
   if k in ('paused','closed') then update contacts_private.follow_ups set state='cancelled',cancel_reason=k where contact_id=c.id and state='scheduled';end if;
  when 'dnc' then
   update contacts_private.records set do_not_contact=true,dnc_recorded_at=coalesce(dnc_recorded_at,clock_timestamp()),lifecycle='closed' where id=c.id;
   update contacts_private.follow_ups set state='cancelled',cancel_reason='do_not_contact' where contact_id=c.id and state='scheduled';
  when 'archive' then
   if c.lifecycle<>'closed' then raise exception using errcode='42501',message='Contacts unavailable';end if;
   update contacts_private.records set archived_at=clock_timestamp() where id=c.id;
   update contacts_private.follow_ups set state='cancelled',cancel_reason='archived' where contact_id=c.id and state='scheduled';
  when 'restore' then update contacts_private.records set archived_at=null where id=c.id;
  when 'edit' then
   if not (p_data ? 'name' or p_data ? 'preferred') or (p_data ? 'name' and length(btrim(p_data->>'name')) not between 2 and 120) or (p_data ? 'preferred' and p_data->>'preferred' not in ('unknown','text','phone','email')) then raise exception using errcode='22023',message='Invalid Contacts command';end if;
   if p_data ? 'name' then update contacts_private.identities set display_name=btrim(p_data->>'name') where contact_id=c.id;end if;
   if p_data ? 'preferred' then update contacts_private.records set preferred_method=p_data->>'preferred' where id=c.id;end if;
  when 'duplicate-distinct' then
   if tgt is null or tgt=c.id or not exists(select 1 from contacts_private.records d where d.id=tgt and contacts_private.review_access(a,d)) then raise exception using errcode='42501',message='Contacts unavailable';end if;
   insert into contacts_private.duplicate_reviews(first_contact_id,second_contact_id,reviewer_member_id,outcome) values(least(c.id,tgt),greatest(c.id,tgt),a,'keep_separate');
  else raise exception using errcode='42501',message='Contacts unavailable';
  end case;
  update contacts_private.records set version=version+1,updated_at=clock_timestamp() where id=c.id and version=p_version;
  if not found then raise exception using errcode='40001',message='Contacts version conflict';end if;
 end if;
 insert into contacts_private.audit_events(request_id,actor_member_id,contact_id,action,before_version,after_version) values(p_request,a,p_id,p_op,old_version,old_version+1);
 insert into contacts_private.command_receipts(actor_member_id,request_id,payload_digest,contact_id,resulting_version) values(a,p_request,digest,p_id,old_version+1);
 return jsonb_build_object('id',p_id,'version',old_version+1);
exception
 when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or check_violation or not_null_violation then raise exception using errcode='22023',message='Invalid Contacts command';
 when unique_violation then raise exception using errcode='40001',message='Contacts version conflict';
 when foreign_key_violation then raise exception using errcode='42501',message='Contacts unavailable';
end$$;
-- Still no live entry points or client grants. Source changes + approved policy are required to activate.
revoke execute on all functions in schema contacts_private from public,anon,authenticated,service_role;
commit;
