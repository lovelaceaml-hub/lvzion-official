import {requireMember}from'../../../lib/server/supabase';
import {reply}from'../../../lib/server/http';
import {dayKey}from'../../../lib/study-rooms/domain';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 let day:string;try{day=dayKey(new URL(request.url).searchParams.get('day')??'');}catch{return reply({error:'Choose a valid date.'},400);}
 try{const client=await requireMember();const{data,error}=await client.rpc('study_room_schedule',{p_day:day});if(error)return reply({error:error.code==='42501'?'Study Room Reservation access has not been assigned.':'Reservation service is not activated for this date.'},error.code==='42501'?403:503);return reply(data);}catch{return reply({error:'An active, authorized member sign-in is required.'},401);}
}
