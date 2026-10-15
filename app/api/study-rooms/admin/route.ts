import {requireMember} from '../../../../lib/server/supabase';
import {body,reply} from '../../../../lib/server/http';
import {parseAdminCommand} from '../../../../lib/study-rooms/admin';
import {MANAGER_REQUIRED,SIGN_IN_REQUIRED} from '../../../../lib/study-rooms/server';
export const dynamic='force-dynamic';

export async function GET(){
 try{
  const client=await requireMember();
  const {data,error}=await client.rpc('study_room_admin',{p_command:null});
  if(error)return reply({error:MANAGER_REQUIRED},403);
  return reply(data);
 }catch{return reply({error:SIGN_IN_REQUIRED},401);}
}

/** The body is validated before sign-in here; any failure before the RPC is a 400. */
export async function POST(request:Request){
 try{
  const command=parseAdminCommand(await body(request));
  const client=await requireMember();
  const {data,error}=await client.rpc('study_room_admin',{p_command:command});
  if(error){
   const message=error.code==='40001'?'Configuration changed. Refresh before retrying.':error.code==='23505'?'This change conflicts with existing reservations. Resolve them explicitly first.':'Management change rejected.';
   return reply({error:message},error.code==='42501'?403:409);
  }
  return reply(data);
 }catch{return reply({error:'Invalid or unauthorized configuration request.'},400);}
}
