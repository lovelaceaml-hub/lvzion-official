import {body,reply} from '../../../../lib/server/http';
import {parseGroupAccess} from '../../../../lib/study-rooms/group-access';
import {memberClient,signInRequired} from '../../../../lib/study-rooms/server';
export const dynamic='force-dynamic';

const GROUP_LEADER_REQUIRED='Group leader access required.';

export async function GET(){
 const client=await memberClient();
 if(!client)return signInRequired();
 const {data,error}=await client.rpc('study_group_access',{p_command:{action:'list'}});
 if(error)return reply({error:error.code==='42501'?GROUP_LEADER_REQUIRED:'Member access is unavailable.'},error.code==='42501'?403:503);
 return reply(data);
}

export async function POST(request:Request){
 const client=await memberClient();
 if(!client)return signInRequired();
 let command;
 try{command=parseGroupAccess(await body(request));}catch(e){return reply({error:e instanceof Error?e.message:'Invalid change.'},400);}
 const {data,error}=await client.rpc('study_group_access',{p_command:command});
 if(error){
  const status=error.code==='42501'?403:error.code==='22023'?400:503;
  return reply({error:status===403?'You can only change members of a group you lead.':status===400?'Invalid change.':'Unable to save. Please try again.'},status);
 }
 return reply(data);
}
