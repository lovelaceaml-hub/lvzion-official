import {requireMember} from '../../../../lib/server/supabase';
import {reply} from '../../../../lib/server/http';
import {parseHistoryQuery} from '../../../../lib/study-rooms/history';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 let client;try{client=await requireMember();}catch{return reply({error:'Authorized sign-in required.'},401);}
 let query;try{query=parseHistoryQuery(new URL(request.url).searchParams);}catch{return reply({error:'Choose a valid history range of up to 31 days.'},400);}
 const {data,error}=await client.rpc('study_room_history',{p_from:query.from,p_to:query.to,p_offset:query.offset,p_managed:query.managed});
 if(error)return reply({error:error.code==='42501'?'Reservation access required.':'Reservation history is temporarily unavailable.'},error.code==='42501'?403:503);
 return reply(data);
}
