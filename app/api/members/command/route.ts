import { requireMember } from '../../../../lib/server/supabase';
import { body,reply } from '../../../../lib/server/http';
import { parseCommand } from '../../../../lib/contracts';
export async function POST(request: Request) {
 try {const raw=await body(request); const command=parseCommand(raw); const client=await requireMember();
  const {data,error}=await client.rpc(['access.review','invitation.revoke','account.access','organization.rename','organization.archive'].includes(command.action)?'admin_command':'member_command',{p_action:command.action,p_payload:command.payload,p_request_id:command.requestId});
  if(error) return reply({error:'Change rejected. Check your scope, current information, and required fields.'},error.code==='42501'?403:409);
  return reply(data);
 } catch {return reply({error:'Change could not be accepted. Sign in and check the request.'},400);}
}
