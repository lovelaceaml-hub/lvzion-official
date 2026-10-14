import {body,reply} from '../../../../lib/server/http';
import {userClient} from '../../../../lib/server/supabase';
import {consumeLoginLimit} from '../../../../lib/server/login';
import {allowedSignupEmail,parseSignup,signupMessage,signupSettings} from '../../../../lib/signup';
export async function POST(request:Request){
 let c;try{c=signupSettings(process.env);}catch{return reply({error:'Member signup is not activated in this preview.'},503);}
 const started=Date.now();
 try{
  const input=await body(request);if(input.website)return reply({message:signupMessage});
  const p=parseSignup(input);
  const admin=await consumeLoginLimit(request,'signup:'+p.email);
  const readiness=await admin.rpc('self_service_signup_enabled');
  if(readiness.error||readiness.data!==true)return reply({error:'Member signup is not activated in this preview.'},503);
  if(!allowedSignupEmail(p.email,process.env,c.local))throw new Error('Isolated testing address required.');
  if(!c.local&&!p.captchaToken)throw new Error('Verification required.');
  const client=await userClient();
  const result=await client.auth.signUp({email:p.email,password:p.password,options:{data:{display_name:p.name},captchaToken:p.captchaToken,emailRedirectTo:c.origin+'/signup/confirm'}});
  // Misconfigured auto-confirm is never allowed to create a membership record.
  if(result.data.session){await client.auth.signOut({scope:'local'});return reply({error:'Email confirmation setup needs review. Signup is temporarily unavailable.'},503);}
  // Do not reveal duplicate emails, account existence, provider errors or delivery details.
 }catch{/* Never log signup inputs or Auth responses. */}
 await new Promise(r=>setTimeout(r,Math.max(0,700-(Date.now()-started))));
 return reply({message:signupMessage});
}
