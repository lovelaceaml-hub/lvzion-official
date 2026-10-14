import {requireMember} from '../../../../lib/server/supabase';
import {NextResponse} from 'next/server';
import {privateHeaders,errorReply,badDatabaseReply,guardedJSON,envelope} from '../../../../lib/morning-prayer/server';
export const dynamic='force-dynamic';
export async function GET(){
 let client;try{client=await requireMember();}catch{return errorReply(401,'Sign in required.');}
 const {data,error}=await client.rpc('mpg_owner_roster');
 if(error)return badDatabaseReply(error.code);
 return NextResponse.json(data,{headers:privateHeaders});
}
export async function POST(request:Request){
 let input;try{input=envelope(await guardedJSON(request,16000));}
 catch{return errorReply(400,'Invalid access-management request.');}
 let client;try{client=await requireMember();}catch{return errorReply(401,'Sign in required.');}
 const {data,error}=await client.rpc('mpg_owner_access',{
  p_expected:input.expectedVersion,p_key:input.key,p_action:input.action
 });
 if(error)return badDatabaseReply(error.code);
 return NextResponse.json(data,{headers:privateHeaders});
}