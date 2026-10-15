import {requireMember} from '../../../../lib/server/supabase';
import {NextResponse} from 'next/server';
import {privateHeaders as headers,uuid} from '../../../../lib/morning-prayer/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Not authorized.'},{status:403,headers});
 if(Number(request.headers.get('content-length')||0)>16000)return NextResponse.json({error:'Request too large.'},{status:413,headers});
 let data;try{data=await request.json();}catch{return NextResponse.json({error:'Invalid JSON.'},{status:400,headers});}
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>!['key','expectedVersion','action'].includes(k))
 ||!uuid(data.key)||!Number.isSafeInteger(data.expectedVersion)||data.expectedVersion<1
 ||!data.action||typeof data.action!=='object'||Array.isArray(data.action))
 return NextResponse.json({error:'Invalid command envelope.'},{status:400,headers});
 let client;try{client=await requireMember();}catch{return NextResponse.json({error:'Sign in required.'},{status:401,headers});}
 const {data:result,error}=await client.rpc('mpg_live_setup',{p_expected:data.expectedVersion,p_key:data.key,p_action:data.action});
 if(error){const forbidden=error.code==='42501',conflict=['23505','40001'].includes(error.code);
 return NextResponse.json({error:forbidden?'This action is not permitted.':conflict?'The schedule or material already exists or has changed. Refresh and review.':'Invalid or unverified schedule/material. Review your input.'},{status:forbidden?403:conflict?409:400,headers});}
 return NextResponse.json(result,{headers});
}