import {body,reply} from '../../../../lib/server/http';
import {userClient} from '../../../../lib/server/supabase';
import {completeEnrollment} from '../../../../lib/server/enrollment';
import {signupSettings} from '../../../../lib/signup';
export async function POST(request:Request){
 let client;try{
  signupSettings(process.env);const input=await body(request);
  if(typeof input.code!=='string'||input.code.length<20||input.code.length>1024)throw new Error('Invalid confirmation.');
  client=await userClient();const result=await client.auth.exchangeCodeForSession(input.code);
  if(result.error||!result.data.session)return reply({error:'This link could not finish sign-in in this browser. If you already confirmed your email, sign in with the password you chose to finish your profile. Otherwise open the newest confirmation email.',next:'/sign-in'},400);
  await completeEnrollment(client);return reply({ok:true,next:'/members'});
 }catch{if(client)await client.auth.signOut({scope:'local'});return reply({error:'Profile setup could not finish here. If you already confirmed your email, sign in with the password you chose. Otherwise open the newest confirmation email.',next:'/sign-in'},400);}
}
