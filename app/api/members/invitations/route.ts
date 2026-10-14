import {settings} from '../../../../lib/server/config';
import {randomUUID} from 'node:crypto';import {body,reply} from '../../../../lib/server/http';
import {requireMember,authAdminClient} from '../../../../lib/server/supabase';import {parseCommand,normalizeIdentifier} from '../../../../lib/contracts';
import {invitationTicket,ticketDigest,confirmationLink} from '../../../../lib/server/flow';import {sendAccountEmail,mailConfigured} from '../../../../lib/server/mail';
export async function POST(request:Request){
 let client:Awaited<ReturnType<typeof requireMember>>|undefined;let requestId='';const attemptId=randomUUID();let claimed=false;
 try{
  const input=await body(request);const email=normalizeIdentifier(input.email);if(!email.includes('@'))throw new Error('Email required.');
  const c=parseCommand({action:'invitation.create',requestId:input.requestId,payload:{memberId:input.memberId,email,reason:input.reason}});requestId=c.requestId;
  client=await requireMember();if(!mailConfigured())return reply({error:'Invitation delivery is not enabled yet.'},503);
  const ticket=invitationTicket(c.payload.memberId,requestId);
  const created=await client.rpc('member_command',{p_action:'invitation.create',p_payload:{...c.payload,tokenDigest:ticketDigest(ticket)},p_request_id:requestId});
  if(created.error)return reply({error:'Invitation rejected. Check member scope and existing account.'},403);
  const reservation=await client.rpc('invitation_delivery',{p_request_id:requestId,p_attempt_id:attemptId,p_state:'claim'});
  if(reservation.error)return reply({error:'Invitation unavailable or delivery already in progress.'},409);
  if(reservation.data?.sent)return reply({ok:true,alreadySent:true});claimed=true;
  const admin=authAdminClient();let signupTicket:string|undefined;
  if(settings().production||(settings().local&&process.env.LVZ_LOCAL_SIGNUP_HOOK==='true')){const t=await admin.rpc('issue_signup_ticket',{p_email:email,p_mode:'invitation'});if(t.error||typeof t.data!=='string')throw new Error('Invitation unavailable.');signupTicket=t.data;}
  const generated=await admin.auth.admin.generateLink({type:'magiclink',email,options:{data:signupTicket?{lvz_signup_ticket:signupTicket}:{}}});
  if(generated.error||!generated.data.properties?.hashed_token)throw new Error('Identity link unavailable.');
  const link=confirmationLink(generated.data.properties.hashed_token,generated.data.properties.verification_type,ticket);
  await sendAccountEmail(email,'Activate your LV Zion Official account',`An authorized leader invited you to activate your existing member record.\n\nOpen this link, then confirm that you wish to continue:\n${link}\n\nChoose your own username and password. Do not forward this message. The invitation expires in 24 hours; the identity confirmation may expire sooner. If you did not expect this invitation, do not continue.`);
  const recorded=await client.rpc('invitation_delivery',{p_request_id:requestId,p_attempt_id:attemptId,p_state:'sent'});
  if(recorded.error)return reply({error:'Email accepted by the mail server, but delivery-status recording failed. Check status before retrying.'},503);
  return reply({ok:true});
 }catch{
  if(claimed&&client)await client.rpc('invitation_delivery',{p_request_id:requestId,p_attempt_id:attemptId,p_state:'failed'});
  return reply({error:'Invitation could not be completed. Check approved delivery configuration and retry with the same request.'},503);
 }
}
