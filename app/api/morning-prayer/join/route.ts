import {requireMember} from '../../../../lib/server/supabase';
import {NextResponse} from 'next/server';
import {privateHeaders,errorReply,badDatabaseReply,guardedJSON,uuid} from '../../../../lib/morning-prayer/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let input;try{input=await guardedJSON(request,1000);}
 catch{return errorReply(400,'Invalid join request.');}
 if(!input||typeof input!=='object'||Array.isArray(input))return errorReply(400,'Choose a valid gathering.');
 const v=input as Record<string,unknown>;
 if(Object.keys(v).length!==1||!uuid(v.occurrenceId))return errorReply(400,'Choose a valid gathering.');
 let client;try{client=await requireMember();}catch{return errorReply(401,'Sign in required.');}
 const {data,error}=await client.rpc('mpg_live_join',{p_occurrence:v.occurrenceId});
 if(error)return badDatabaseReply(error.code);
 if(!data||typeof data.joinUrl!=='string'||!/^https:\/\/([a-z0-9-]+\.)?zoom\.us\/j\/[0-9]{8,12}(\?pwd=[A-Za-z0-9_-]{1,128})?$/.test(data.joinUrl))
   return errorReply(503,'The verified meeting link is not available.');
 return NextResponse.json({joinUrl:data.joinUrl},{headers:privateHeaders});
}