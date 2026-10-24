import 'server-only';
import {handleContactsRequest} from '../contacts/http-service';
import {requireMember} from './supabase';
import {settings} from './config';

/** Release switch for Contacts in production. Despite its historical name, once the 2026-10-24 open-access
 * migration is applied every signed-in member gets their own private Contacts workspace when this is true.
 * The independent SQL gate (approved app, signed-in member, owner-only records) must ALSO pass.
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
