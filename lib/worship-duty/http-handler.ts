import {WorshipError,parseCandidates,parseCommand,parseLookup,parseSongs,parseWorkspace,sqlError} from './api-contract.ts';
export type RpcClient={rpc:(name:string,args?:Record<string,unknown>)=>PromiseLike<{data:unknown;error:{code?:string}|null}>};
export type HandlerDependencies={authorize:()=>Promise<RpcClient>;readBody:(request:Request)=>Promise<Record<string,unknown>>};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
// Dependency injection keeps HTTP behavior testable without creating a bypass or accepting an actor.
// The production route supplies only the existing verified-member client and trusted-origin body reader.
export async function handleWorshipRequest(request:Request,dependencies:HandlerDependencies):Promise<Response>{
 try{
  if(request.method!=='GET'&&request.method!=='POST')return reply({error:'Method not allowed.',code:'method'},405);
  const client=await dependencies.authorize();
  const url=new URL(request.url);
  if(request.method==='POST'){
   if(url.search)throw new WorshipError('Unexpected query parameters.');
   let input:Record<string,unknown>;try{input=await dependencies.readBody(request);}catch{throw new WorshipError('A same-origin JSON request within the size limit is required.',400,'invalid');}
   const command=parseCommand(input);
   const {error}=await client.rpc(command.op==='batch'?'worship_batch':'worship_command',{p_command:command});
   if(error)throw sqlError(error.code);
   // Do not return raw command/audit data. A successful write and a later refresh are separate outcomes.
   return reply({ok:true});
  }
  const entries=[...url.searchParams.entries()];
  if(new Set(entries.map(([key])=>key)).size!==entries.length)throw new WorshipError('Duplicate query parameters.');
  if(entries.length===0){
   const result=await client.rpc('worship_workspace_v2');if(result.error)throw sqlError(result.error.code);
   try{return reply(parseWorkspace(result.data));}catch{throw new WorshipError('The workspace format could not be verified.',503,'unavailable');}
  }
  const query=parseLookup(Object.fromEntries(entries));
  const result=await client.rpc('worship_lookup',{p_query:query});if(result.error)throw sqlError(result.error.code);
  try{
   const data=query.kind==='candidates'?parseCandidates(result.data):parseSongs(result.data);
   if(data.serviceId!==query.serviceId||(query.kind==='candidates'&&data.kind==='candidates'&&data.dutyId!==query.dutyId))throw new Error('Mismatched lookup');
   return reply(data);
  }catch{throw new WorshipError('The service options could not be verified.',503,'unavailable');}
 }catch(e){const error=e instanceof WorshipError?e:new WorshipError('Worship Duty is unavailable. No success has been confirmed.',503,'unavailable');return reply({error:error.message,code:error.code},error.status||503);}
}
