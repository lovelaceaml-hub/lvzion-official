import {reply} from '../../../lib/server/http';
import {memberClient,signInRequired} from '../../../lib/gospel-planning/server';
import {commandFailure,weekKey} from '../../../lib/gospel-planning/contract';
export const dynamic='force-dynamic';

export async function GET(request:Request){
 const client=await memberClient();
 if(!client)return signInRequired();
 let week:string;
 try{week=weekKey(new URL(request.url).searchParams.get('week')??'');}catch{return reply({error:'Choose a valid week.'},400);}
 const {data,error}=await client.rpc('gospel_planning_workspace',{p_week:week});
 if(error){
  const failure=commandFailure(error);
  return reply(failure.status===403?{code:'FORBIDDEN',error:'Groups & Gospel Planning has not been assigned to your account.'}:failure,failure.status);
 }
 return reply(data);
}
