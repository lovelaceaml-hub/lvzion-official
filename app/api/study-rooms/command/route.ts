import {requireMember}from'../../../../lib/server/supabase';
import {body,reply}from'../../../../lib/server/http';
import {parseBookingCommand}from'../../../../lib/study-rooms/domain';
export async function POST(request:Request){
 try{const command=parseBookingCommand(await body(request));const client=await requireMember();const{data,error}=await client.rpc('study_room_command',{p_command:command});if(error)return reply({error:error.code==='42501'?'You do not have permission for this action.':'Availability changed or the request is invalid. Refresh before retrying.'},error.code==='42501'?403:409);return reply(data);}catch{return reply({error:'Invalid or unauthorized reservation request.'},400);}
}
