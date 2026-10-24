import {WorshipError,sqlError} from './api-contract.ts';
import {parseSetupCommand,parseSetupState} from './setup-contract.ts';
import {reply} from './http-handler.ts';
import type {HandlerDependencies} from './http-handler.ts';
export async function handleSetupRequest(request:Request,deps:HandlerDependencies):Promise<Response>{
 try{
  if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
  if(new URL(request.url).search)throw new WorshipError('Unexpected query parameters.');
  const client=await deps.authorize();
  if(request.method==='GET'){const r=await client.rpc('worship_setup_workspace');if(r.error)throw sqlError(r.error.code);try{return reply(parseSetupState(r.data));}catch{throw new WorshipError('Setup state could not be verified.',503,'unavailable');}}
  let raw;try{raw=await deps.readBody(request);}catch{throw new WorshipError('A same-origin JSON request is required.');}
  const r=await client.rpc('worship_setup_command',{p_command:parseSetupCommand(raw)});if(r.error)throw sqlError(r.error.code);return reply({ok:true});
 }catch(e){const v=e instanceof WorshipError?e:new WorshipError('Setup is unavailable. Reload to verify.',503,'unavailable');return reply({error:v.message,code:v.code},v.status);}
}
