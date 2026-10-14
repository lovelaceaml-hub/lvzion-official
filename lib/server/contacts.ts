import 'server-only';
import {handleContactsRequest} from '../contacts/http-service';
import {requireMember} from './supabase';
import {settings} from './config';

/** Not an environment toggle. Change only with approved access rules and verified release evidence.
 * The independent SQL gate, app approval and member grant checks must ALSO pass.
 * Public R3 RPC wrappers are not installed in the hosted project.
 */
export function contactsReleaseEnabled():boolean{
 try{
  const c=settings();
  return c.production===true && process.env.VERCEL_ENV==='production'
   && process.env.LVZ_CONTACTS_OWNER_PILOT==='true';
 }catch{return false;}
}

export async function contactsRequest(request:Request):Promise<Response>{
 return handleContactsRequest(request,{
  released:contactsReleaseEnabled,
  trustedOrigin:()=>settings().origin,
  requireSession:async()=>{
   const client=await requireMember();
   return {rpc:async(name,args)=>{const result=await client.rpc(name,args);return {data:result.data,error:result.error?{code:result.error.code}:null};}};
  }
 });
}
