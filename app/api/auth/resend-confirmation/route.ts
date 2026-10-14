import {verifyHuman} from '../../../../lib/server/bot-protection';
import {body,reply} from '../../../../lib/server/http';
import {userClient} from '../../../../lib/server/supabase';
import {consumeLoginLimit} from '../../../../lib/server/login';
import {allowedSignupEmail,signupSettings} from '../../../../lib/signup';

const responseMessage='If an eligible account still needs email confirmation, a fresh link may arrive. If you already confirmed, sign in with your password.';
export async function POST(request:Request){
 let config;
 try{config=signupSettings(process.env);}
 catch{return reply({error:'Confirmation emails are temporarily unavailable.'},503);}
 const started=Date.now();
 const finish=async(status=200,message=responseMessage)=>{
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,700-(Date.now()-started))));
  return status===200?reply({message}):reply({error:message},status);
 };
 try{await verifyHuman();}
 catch{return finish(403,'Verification unavailable. Refresh and try again.');}
 let email:string;
 try{
  const input=await body(request);
  if(typeof input.email!=='string')throw new Error('Invalid address.');
  email=input.email.trim().toLowerCase();
  if(email.length>254||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
   throw new Error('Invalid address.');
 }catch{return finish(400,'Enter a valid email address.');}
 try{
  const admin=await consumeLoginLimit(request,'confirm-resend:'+email);
  const readiness=await admin.rpc('self_service_signup_enabled');
  if(readiness.error||readiness.data!==true)
   return finish(503,'Confirmation emails are temporarily unavailable.');
  if(!allowedSignupEmail(email,process.env,config.local))return finish();
  const client=await userClient();
  const result=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:config.origin+'/signup/confirm'}});
  // Avoid leaking whether this email belongs to an existing or verified account.
  if(result.error?.status&&result.error.status>=500)
   return finish(503,'Confirmation emails are temporarily unavailable.');
  if(result.error?.status===429)
   return finish(429,'Please wait before requesting another confirmation email.');
  return finish();
 }catch{
  // Invalid/existing/nonexistent addresses must share one generic response.
  return finish();
 }
}
