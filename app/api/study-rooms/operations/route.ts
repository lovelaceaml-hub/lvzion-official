import {body,reply} from '../../../../lib/server/http';
import {parseStudyOperation} from '../../../../lib/study-rooms/operations';
import {MANAGER_REQUIRED,memberClient,signInRequired} from '../../../../lib/study-rooms/server';
export const dynamic='force-dynamic';

export async function GET(){
 const client=await memberClient();
 if(!client)return signInRequired();
 const {data,error}=await client.rpc('study_room_operations',{p_command:null});
 if(error)return reply({error:error.code==='42501'?MANAGER_REQUIRED:'Operations are unavailable.'},error.code==='42501'?403:503);
 return reply(data);
}

export async function POST(request:Request){
 const client=await memberClient();
 if(!client)return signInRequired();
 let command;
 try{command=parseStudyOperation(await body(request));}catch(e){return reply({error:e instanceof Error?e.message:'Invalid operation.'},400);}
 const {data,error}=await client.rpc('study_room_operations',{p_command:command});
 if(error){
  const status=error.code==='42501'?403:error.code==='40001'||error.code==='23505'?409:error.code==='22023'||error.code==='22007'?400:503;
  const message=status===403?MANAGER_REQUIRED:status===409?'The configuration changed or conflicts with existing reservations. Refresh before retrying.':status===400?'Invalid management change.':'Unable to update the operations calendar.';
  return reply({error:message},status);
 }
 return reply(data);
}
