import {reply} from '../../../lib/server/http';
import {memberClient,signInRequired} from '../../../lib/gospel-planning/server';
import {commandFailure,weekKey} from '../../../lib/gospel-planning/contract';
export const dynamic='force-dynamic';

export async function GET(request:Request){
 const client=await memberClient();
 if(!client)return signInRequired();
 let week:string;const params=new URL(request.url).searchParams;
 try{week=weekKey(params.get('week')??'');}catch{return reply({error:'Choose a valid week.'},400);}
 // Optional: a group the member leads by appointment. The database decides whether it may be opened.
 const group=params.get('group');
 if(group!==null&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(group))return reply({error:'Choose a valid group.'},400);
 const {data,error}=await client.rpc('gospel_planning_workspace',group?{p_week:week,p_group:group}:{p_week:week});
 if(error){
  const failure=commandFailure(error);
  return reply(failure.status===403?{code:'FORBIDDEN',error:'Groups & Gospel Planning is not available for this account or group.'}:failure,failure.status);
 }
 return reply(data);
}
