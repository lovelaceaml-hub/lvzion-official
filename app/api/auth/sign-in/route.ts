import {verifyHuman} from '../../../../lib/server/bot-protection';
import {loginCaptcha} from '../../../../lib/signup';
import { normalizeIdentifier } from '../../../../lib/contracts';
import { body,reply } from '../../../../lib/server/http';
import { settings } from '../../../../lib/server/config';
import { userClient } from '../../../../lib/server/supabase';
import {completeEnrollment} from '../../../../lib/server/enrollment';
import { consumeLoginLimit } from '../../../../lib/server/login';
export async function POST(request:Request) {
 const started=Date.now();
 let c;try {c=settings();} catch {return reply({error:'Member sign-in is not activated yet.'},503);}
 try {
  await verifyHuman();
  const input=await body(request); const identifier=normalizeIdentifier(input.identifier);
  const captchaToken=loginCaptcha(input.captchaToken,!c.local&&process.env.LVZ_SIGNUP_CAPTCHA_VERIFIED==='true');
  if(typeof input.password!=='string' || input.password.length<1 || input.password.length>256) throw new Error('Invalid credentials.');
  const admin=await consumeLoginLimit(request,identifier);
  const resolved=await admin.rpc('resolve_login_identifier',{p_identifier:identifier});
  if(resolved.error) throw new Error('Authentication unavailable.');
  const client=await userClient();
  const attempt=await client.auth.signInWithPassword({email:typeof resolved.data==='string'?resolved.data:identifier.includes('@')?identifier:'unknown-login@example.invalid',password:input.password,options:{captchaToken}});
  if(attempt.error || !attempt.data.user) throw new Error('Invalid credentials.');
  let member=await client.rpc('my_membership_id');
  if(!member.error&&!member.data){try{await completeEnrollment(client);member=await client.rpc('my_membership_id');}catch{/* Membership remains unavailable. */}}
  if(member.error || !member.data) {await client.auth.signOut({scope:'local'}); throw new Error('Membership unavailable.');}
  return reply({ok:true,next:'/members'});
 } catch {
  // A floor reduces obvious fast-fail differences; it is not a constant-time guarantee.
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,700-(Date.now()-started))));
  return reply({error:'Unable to sign in. Check your credentials or contact your authorized leader.'},401);
 }
}
