import {requireMember} from '../../../../lib/server/supabase';
import {reply,body} from '../../../../lib/server/http';
import {parseStudyOperation} from '../../../../lib/study-rooms/operations';
export const dynamic='force-dynamic';
export async function GET(){
 let client;try{client=await requireMember();}catch{return reply({error:'Authorized sign-in required.'},401);}
 const {data,error}=await client.rpc('study_room_operations',{p_command:null});
 if(error)return reply({error:error.code==='42501'?'Reservation-manager access required.':'Operations are unavailable.'},error.code==='42501'?403:503);
 return reply(data);
}
export async function POST(request:Request){
 let client;try{client=await requireMember();}catch{return reply({error:'Authorized sign-in required.'},401);}
 let command;try{command=parseStudyOperation(await body(request));}catch(e){return reply({error:e instanceof Error?e.message:'Invalid operation.'},400);}
 const {data,error}=await client.rpc('study_room_operations',{p_command:command});
 if(error){
  const status=error.code==='42501'?403:error.code==='40001'||error.code==='23505'?409:error.code==='22023'||error.code==='22007'?400:503;
  return reply({error:status===403?'Reservation-manager access required.':status===409?'The configuration changed or conflicts with existing reservations. Refresh before retrying.':status===400?'Invalid management change.':'Unable to update the operations calendar.'},status);
 }
 return reply(data);
}
