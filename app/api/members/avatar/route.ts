import {requireMember} from '../../../../lib/server/supabase';
import {reply} from '../../../../lib/server/http';
export const dynamic='force-dynamic';
/** Return only the signed-in member's avatar initials, never directory/profile fields. */
export async function GET(){
 try{
  const client=await requireMember();
  const {data,error}=await client.rpc('member_workspace');
  if(error||typeof data?.self?.name!=='string')return reply({error:'Profile unavailable.'},503);
  return reply({initials:data.self.name.trim().split(/\s+/).filter(Boolean).map((part:string)=>part[0]).slice(0,2).join('').toUpperCase()});
 }catch{return reply({error:'Sign in to continue.'},401);}
}
