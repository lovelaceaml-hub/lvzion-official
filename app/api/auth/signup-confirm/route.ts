import {body,reply} from '../../../../lib/server/http';
import {userClient} from '../../../../lib/server/supabase';
import {completeEnrollment} from '../../../../lib/server/enrollment';
import {signupSettings} from '../../../../lib/signup';
export async function POST(request:Request){
 let client;try{
  signupSettings(process.env);const input=await body(request);
  if(typeof input.code!=='string'||input.code.length<20||input.code.length>1024)throw new Error('Invalid confirmation.');
  client=await userClient();const result=await client.auth.exchangeCodeForSession(input.code);
  if(result.error)throw new Error('This confirmation expired or was opened in another browser.');
  await completeEnrollment(client);return reply({ok:true,next:'/members'});
 }catch{if(client)await client.auth.signOut({scope:'local'});return reply({error:'Confirmation could not be completed. Use the newest email in the browser where you signed up, or contact your authorized leader.'},400);}
}
