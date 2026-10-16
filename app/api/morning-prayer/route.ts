import {requireMember} from '../../../lib/server/supabase';
import {NextResponse} from 'next/server';
import {privateHeaders as headers} from '../../../lib/morning-prayer/server';
import {validDate} from '../../../lib/morning-prayer/time';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const p=new URL(request.url).searchParams;
 const from=p.get('from')??'',to=p.get('to')??'';
 if(!validDate(from)||!validDate(to)||Date.parse(to)<Date.parse(from)||Date.parse(to)-Date.parse(from)>62*86400000)
  return NextResponse.json({error:'Select a valid range of up to 62 days.'},{status:400,headers});
 let client;
 try{client=await requireMember();}catch{return NextResponse.json({error:'Sign in to LV Zion Official to continue.'},{status:401,headers});}
 const {data,error}=await client.rpc('mpg_live_home',{p_from:from,p_to:to});
 if(error)return NextResponse.json({error:error.code==='42501'?'Morning Prayer has not been assigned to your account.':'Morning Prayer cannot load right now.'},{status:error.code==='42501'?403:503,headers});
 return NextResponse.json(data,{headers});
}