import {body,reply} from '../../../../lib/server/http';
import {memberClient,signInRequired} from '../../../../lib/gospel-planning/server';
import {commandFailure,ContractError,parseCommand} from '../../../../lib/gospel-planning/contract';
export const dynamic='force-dynamic';

export async function POST(request:Request){
 const client=await memberClient();
 if(!client)return signInRequired();
 let command;
 // Same-origin JSON only (body enforces origin, content type and size), then the strict parser.
 try{command=parseCommand(await body(request));}
 catch(e){return reply({code:'INVALID',error:e instanceof ContractError?e.message:'Invalid request.'},400);}
 const {data,error}=await client.rpc('gospel_planning_command',{p_action:command.action,p_payload:command.payload,p_request_id:command.requestId});
 if(error){const failure=commandFailure(error);return reply(failure,failure.status);}
 return reply(data);
}
