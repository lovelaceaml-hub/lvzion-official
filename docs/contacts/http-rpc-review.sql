-- CONTACTS R3: UNAPPLIED HTTP RPC REVIEW, NOT A RELEASE MIGRATION.
-- Requires schema-review.sql, runtime-review.sql and runtime-entrypoint-review.sql.
-- This file does not enable Contacts, publish its module, grant a member access,
-- create an Auth account, or authorize any public/client function execution.
begin;
create function contacts_private.http_workspace(p_after uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=contacts_private.review_actor();placement uuid;scope uuid;ids uuid[];items jsonb;
begin
 placement:=contacts_private.review_placement(actor);
 select group_id into scope from public.member_placements where id=placement;
 select array_agg(page.id order by page.id) into ids from (
  select r.id from contacts_private.records r
  where (p_after is null or r.id>p_after) and contacts_private.review_access(actor,r)
  order by r.id limit 101
 ) page;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',r.id,'version',r.version,'name',i.display_name,'owner',r.owner_member_id,
  'lifecycle',r.lifecycle,'preferred',r.preferred_method,
  'do_not_contact',r.do_not_contact,'archived',r.archived_at is not null
 ) order by r.id),'[]'::jsonb) into items
 from contacts_private.records r join contacts_private.identities i on i.contact_id=r.id
 where r.id=any(ids[1:100]);
 return jsonb_build_object('member_id',actor,'can_create',contacts_private.review_capability(actor,'create',scope),
  'contacts',items,'next_cursor',case when cardinality(ids)>100 then ids[100] else null end);
end$$;

-- SECURITY INVOKER public wrappers preserve the reviewed private authorization path.
-- Execute grants are deliberately absent: both this boundary and the literal-false
-- private review gate must be independently released after permission verification.
create function public.contacts_workspace_r3(p_after uuid default null)
returns jsonb language sql security invoker set search_path='' as $$select contacts_private.http_workspace(p_after)$$;
create function public.contacts_detail_r3(p_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select contacts_private.review_read(p_id)$$;
create function public.contacts_command_r3(p_id uuid,p_version bigint,p_request uuid,p_op text,p_data jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$select contacts_private.review_command_guarded(p_id,p_version,p_request,p_op,p_data)$$;
create function public.contacts_duplicates_r3(p_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select contacts_private.review_duplicates(p_id)$$;
create function public.contacts_agenda_r3()
returns jsonb language sql security invoker set search_path='' as $$select contacts_private.review_agenda()$$;

revoke execute on function contacts_private.http_workspace(uuid) from public,anon,authenticated,service_role;
revoke execute on function public.contacts_workspace_r3(uuid),public.contacts_detail_r3(uuid),
 public.contacts_command_r3(uuid,bigint,uuid,text,jsonb),public.contacts_duplicates_r3(uuid),
 public.contacts_agenda_r3() from public,anon,authenticated,service_role;
commit;
