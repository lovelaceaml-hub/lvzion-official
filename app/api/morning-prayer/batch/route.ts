import {requireMember} from '../../../../lib/server/supabase';
import {NextResponse} from 'next/server';
import {privateHeaders,errorReply,badDatabaseReply,guardedJSON,uuid} from '../../../../lib/morning-prayer/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let value;try{value=await guardedJSON(request,64000);}
 catch{return errorReply(400,'Invalid schedule batch.');}
 if(!value||typeof value!=='object'||Array.isArray(value))return errorReply(400,'Invalid schedule batch.');
 const p=value as Record<string,unknown>;
 if(Object.keys(p).some(k=>!['key','expectedVersion','occurrences'].includes(k))||
 !uuid(p.key)||!Number.isSafeInteger(p.expectedVersion)||(p.expectedVersion as number)<1||
 !Array.isArray(p.occurrences)||p.occurrences.length<1||p.occurrences.length>62)
  return errorReply(400,'Provide 1–62 explicit future dates.');
 let client;try{client=await requireMember();}catch{return errorReply(401,'Sign in required.');}
 const {data,error}=await client.rpc('mpg_bulk_schedule',{
  p_expected:p.expectedVersion,p_key:p.key,p_occurrences:p.occurrences
 });
 if(error)return badDatabaseReply(error.code);
 return NextResponse.json(data,{headers:privateHeaders});
}