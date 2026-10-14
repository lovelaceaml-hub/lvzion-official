/** Server transport core. Dependencies are injected for tests; no preview persona or fixture is accepted. */
import {ContactsContractError,parseDatabaseCommand,parseRecordId,parseWorkspaceRequest,parseContactDetail,parseWorkspace,parseReceipt,parseDuplicateResults,parseAgenda} from './server-contract.ts';
export type ContactsRpc='contacts_workspace_r3'|'contacts_detail_r3'|'contacts_command_r3'|'contacts_duplicates_r3'|'contacts_agenda_r3';
export type RpcResult={data:unknown;error:{code?:string}|null};
export type ContactsSession={rpc:(name:ContactsRpc,args:Record<string,unknown>)=>PromiseLike<RpcResult>};
export type ContactsDependencies={released:()=>boolean;trustedOrigin:()=>string;requireSession:()=>Promise<ContactsSession>};
const headers={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers});
const unavailable=()=>reply({error:'Contacts is not activated.'},403);
class RequestError extends Error {status:number;constructor(status:number){super('Invalid Contacts request.');this.status=status;}}
async function boundedBody(request:Request):Promise<unknown>{
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new RequestError(415);
 if(request.headers.has('content-encoding')&&request.headers.get('content-encoding')!=='identity')throw new RequestError(415);
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>8192))throw new RequestError(413);
 const reader=request.body?.getReader();if(!reader)throw new RequestError(400);
 const chunks:Uint8Array[]=[];let length=0;let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;void reader.cancel().catch(()=>{});},5000);
 try{
  while(true){const {done,value}=await reader.read();if(timedOut)throw new RequestError(408);if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();throw new RequestError(413);}chunks.push(value);}
 }finally{clearTimeout(timer);reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new RequestError(400);}
}
const sqlError=(code?:string)=>code==='40001'||code==='23505'?reply({error:'This record changed. Reload and review before saving.'},409):code==='42501'?reply({error:'This record or action is not available.'},403):['22023','22P02','22007'].includes(code??'')?reply({error:'Review the request and try again.'},400):reply({error:'Contacts is temporarily unavailable.'},503);
export async function handleContactsRequest(request:Request,dependencies:ContactsDependencies):Promise<Response>{
 // This check runs before parsing input, opening a session or accessing the database.
 // Missing activation never falls back to fictional data or another project.
 if(!dependencies.released())return unavailable();
 const url=new URL(request.url);
 const paths=['workspace','detail','command','duplicates','agenda'];
 const path=url.pathname.split('/').filter(Boolean);
 if(url.search||path.length!==3||path[0]!=='api'||path[1]!=='contacts'||!paths.includes(path[2]))return reply({error:'Contacts endpoint unavailable.'},404);
 if(request.method!=='POST')return reply({error:'Use an authorized Contacts request.'},405);
 let origin:string;try{origin=dependencies.trustedOrigin();if(new URL(origin).origin!==origin)throw Error();}catch{return reply({error:'Contacts is temporarily unavailable.'},503);}
 if(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Request origin rejected.'},403);
 let session:ContactsSession;try{session=await dependencies.requireSession();}catch{return reply({error:'Sign in required.'},401);}
 try{
  const body=await boundedBody(request);
  let rpc:ContactsRpc,args:Record<string,unknown>,project:(v:unknown)=>unknown;
  switch(path[2]){
   case 'workspace':rpc='contacts_workspace_r3';args={p_after:parseWorkspaceRequest(body)};project=parseWorkspace;break;
   case 'detail':rpc='contacts_detail_r3';args={p_id:parseRecordId(body)};project=parseContactDetail;break;
   case 'command':{const parsed=parseDatabaseCommand(body);rpc='contacts_command_r3';args=parsed;project=value=>parseReceipt(value,parsed.p_id);break;}
   case 'duplicates':rpc='contacts_duplicates_r3';args={p_id:parseRecordId(body)};project=parseDuplicateResults;break;
   case 'agenda':{const v=body;if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length)throw new ContactsContractError();rpc='contacts_agenda_r3';args={};project=parseAgenda;break;}
   default:return reply({error:'Contacts endpoint unavailable.'},404);
  }
  const result=await session.rpc(rpc,args);
  if(result.error)return sqlError(result.error.code);
  // Do not forward arbitrary RPC JSON; explicit projection strips unapproved extra fields.
  try{return reply(project(result.data));}catch{return reply({error:'Contacts is temporarily unavailable.'},503);}
 }catch(error){
  if(error instanceof RequestError)return reply({error:'Invalid Contacts request.'},error.status);
  if(error instanceof ContactsContractError)return reply({error:'Review the request and try again.'},400);
  // Never log or echo database messages, request bodies, note text, URLs or credentials.
  return reply({error:'Contacts is temporarily unavailable.'},503);
 }
}
