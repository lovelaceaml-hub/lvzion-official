-- Validate commands inside PostgreSQL, including direct RPC calls that bypass Next.js.
begin;
alter function app_private.member_command(text,jsonb,uuid) rename to apply_member_command;
revoke all on function app_private.apply_member_command(text,jsonb,uuid) from public,anon,authenticated;
create function app_private.member_command(p_action text,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare allowed text[]; k text; v jsonb; normalized jsonb:=p_payload;
begin
 if app_private.current_member_id() is null then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8192 then raise exception 'Invalid command payload' using errcode='22023'; end if;
 allowed:=case p_action
  when 'member.create' then array['name','unitId']
  when 'member.rename' then array['memberId','name']
  when 'member.status' then array['memberId','status']
  when 'member.move' then array['memberId','unitId']
  when 'transfer.request' then array['memberId','unitId']
  when 'transfer.decide' then array['id','decision']
  when 'department.membership' then array['memberId','departmentId','operation']
  when 'role.appoint' then array['memberId','role','unitId','groupId','departmentId']
  when 'role.end' then array['id']
  when 'organization.create' then array['kind','name','parentId']
  when 'profile.contacts' then array['memberId','email','phone']
  when 'invitation.create' then array['memberId','email','tokenDigest'] end;
 if allowed is null then raise exception 'Unknown command' using errcode='22023'; end if;
 allowed:=allowed||array['reason'];
 for k,v in select * from jsonb_each(p_payload) loop
  if not(k=any(allowed)) or jsonb_typeof(v)<>'string' or length(v#>>'{}')>500 then raise exception 'Unexpected command field' using errcode='22023'; end if;
 end loop;
 -- Only department appointments carry a department audit scope. Never trust spare input.
 if p_action='role.appoint' then
  if (p_payload->>'role') is distinct from 'department_manager' then normalized:=normalized-'departmentId'; end if;
  if (p_payload->>'role') is distinct from 'unit_leader' then normalized:=normalized-'unitId'; end if;
  if (p_payload->>'role') is distinct from 'group_leader' then normalized:=normalized-'groupId'; end if;
 end if;
 return app_private.apply_member_command(p_action,normalized,p_request_id);
end $$;
revoke all on function app_private.member_command(text,jsonb,uuid) from public,anon;
grant execute on function app_private.member_command(text,jsonb,uuid) to authenticated;
create or replace function public.member_command(p_action text,p_payload jsonb,p_request_id uuid)
returns jsonb language sql security invoker set search_path='' as $$ select app_private.member_command(p_action,p_payload,p_request_id) $$;
create or replace function app_private.current_member_id() returns uuid language sql stable security definer set search_path='' as $$
 select l.member_id from app_private.account_links l join public.members m on m.id=l.member_id
 join auth.sessions s on s.user_id=l.auth_user_id and s.id::text=(auth.jwt()->>'session_id')
 where l.auth_user_id=(select auth.uid()) and l.enabled and m.status='active'
 and s.created_at>=l.session_valid_after and (s.not_after is null or s.not_after>now()) limit 1
$$;
commit;
