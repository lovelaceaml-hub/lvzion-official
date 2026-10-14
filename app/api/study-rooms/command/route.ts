import {requireMember} from '../../../../lib/server/supabase';
import {body,reply} from '../../../../lib/server/http';
import {parseBookingCommand} from '../../../../lib/study-rooms/domain';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let client;try{client=await requireMember();}catch{return reply({error:'Authorized sign-in required.'},401);}
 let command;try{command=parseBookingCommand(await body(request));}catch{return reply({error:'Invalid reservation request.'},400);}
 const {data,error}=await client.rpc('study_room_command',{p_command:command});
 if(error){const stale=error.code==='40001',denied=error.code==='42501';return reply({code:stale?'STALE_VERSION':denied?'FORBIDDEN':'UNAVAILABLE',error:stale?'This reservation changed on another screen. Close the form and reopen the refreshed reservation.':denied?'Reservation access required.':'One or more resources are unavailable, or the booking rules changed. Refresh and review all selected resources.'},denied?403:409);}
 return reply(data);
}
