import {requireMember} from '../../../../lib/server/supabase';
import {NextResponse} from 'next/server';
import {privateHeaders,errorReply,badDatabaseReply,guardedJSON,envelope} from '../../../../lib/morning-prayer/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let value;try{value=envelope(await guardedJSON(request,2500));}
 catch{return errorReply(400,'Invalid meeting settings.');}
 if(!['set_window','configure_meeting','revoke_meeting'].includes(String(value.action.type)))
   return errorReply(400,'Invalid meeting operation.');
 let client;try{client=await requireMember();}catch{return errorReply(401,'Sign in required.');}
 const {data,error}=await client.rpc('mpg_meeting_settings',{
  p_expected:value.expectedVersion,p_key:value.key,p_action:value.action
 });
 if(error)return badDatabaseReply(error.code);
 return NextResponse.json(data,{headers:privateHeaders});
}