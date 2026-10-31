import {GuidanceError,databaseError,dateValue,identifier,parseCommand,parseWorkspace,parseCandidates,object} from './domain.ts';
export type RpcClient={rpc:(name:string,args?:Record<string,unknown>)=>PromiseLike<{data:unknown;error:{code?:string}|null}>};
export type Dependencies={authorize:()=>Promise<RpcClient>;readBody:(request:Request)=>Promise<Record<string,unknown>>};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
export async function handleGuidanceRequest(request:Request,deps:Dependencies):Promise<Response>{
 try{
  if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed.'},405);
  const client=await deps.authorize(),url=new URL(request.url);
  const entries=[...url.searchParams.entries()];
  if(new Set(entries.map(([k])=>k)).size!==entries.length)throw new GuidanceError('Duplicate query parameters.');
  if(request.method==='POST'){
   if(entries.length)throw new GuidanceError('Unexpected query parameters.');
   let input;try{input=await deps.readBody(request);}catch{throw new GuidanceError('A same-origin JSON request is required.');}
   const command=parseCommand(input),r=await client.rpc('guidance_teachers_command',{p_command:command});
   if(r.error)throw databaseError(r.error.code);
   const result=object(r.data);if(result.ok!==true)throw new GuidanceError('The save could not be confirmed.',503,'unavailable');
   return reply({ok:true,serviceId:identifier(result.serviceId)});
  }
  const p=Object.fromEntries(entries);
  if(p.kind==='candidates'){
   if(entries.some(([k])=>!['kind','serviceId','q'].includes(k)))throw new GuidanceError('Unexpected query parameters.');
   const serviceId=identifier(p.serviceId),q=p.q??'';if(q.length>80)throw new GuidanceError('Search is too long.');
   const r=await client.rpc('guidance_teachers_candidates',{p_service:serviceId,p_query:q});if(r.error)throw databaseError(r.error.code);
   const data=parseCandidates(r.data);if(data.serviceId!==serviceId)throw new GuidanceError('Member search did not match this service.',503,'unavailable');
   return reply(data);
  }
  if(entries.length!==1||!p.date)throw new GuidanceError('Select one calendar date.');
  const date=dateValue(p.date),r=await client.rpc('guidance_teachers_workspace',{p_date:date});if(r.error)throw databaseError(r.error.code);
  const data=parseWorkspace(r.data);if(data.date!==date)throw new GuidanceError('Schedule date did not match.',503,'unavailable');
  return reply(data);
 }catch(e){const x=e instanceof GuidanceError?e:new GuidanceError('The schedule is unavailable. No save has been confirmed.',503,'unavailable');return reply({error:x.message,code:x.code},x.status);}
}
