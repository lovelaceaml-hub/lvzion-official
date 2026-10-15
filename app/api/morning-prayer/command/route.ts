import {requireMember} from '../../../../lib/server/supabase';
import {parseCommand,PrayerError} from '../../../../lib/morning-prayer/domain';
import {NextResponse} from 'next/server';
import {privateHeaders as headers,uuid} from '../../../../lib/morning-prayer/server';
export const dynamic='force-dynamic';
function problem(code:string){const conflict=['40001','23505'].includes(code),unauthorized=code==='42501';return NextResponse.json({error:unauthorized?'This operation is not permitted.':conflict?'The schedule changed or this request has already been processed. Refresh before retrying.':code==='22023'?'Review the input and confirm the current source details.':'Morning Prayer could not save the request.'},{status:unauthorized?403:conflict?409:code==='22023'?400:503,headers});}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return problem('42501');
 if(Number(request.headers.get('content-length')||0)>16000)return problem('22023');
 let command;try{command=parseCommand(await request.json());}catch(e){return NextResponse.json({error:e instanceof PrayerError?'This command is invalid.':'Invalid request body.'},{status:400,headers});}
 let client;try{client=await requireMember();}catch{return NextResponse.json({error:'Sign in required.'},{status:401,headers});}
 if(!uuid(command.key))return problem('22023');
 const {data,error}=await client.rpc('mpg_live_command',{p_expected:command.expectedVersion,p_key:command.key,p_action:command.action});
 if(error)return problem(error.code);
 return NextResponse.json(data,{headers});
}