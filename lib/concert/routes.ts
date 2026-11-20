import 'server-only';
import {authAdminClient,requireMember} from '../server/supabase';
import {ConcertError,databaseError,object,parsePublicEvent,partyValue,type PublicEvent} from './domain';
import {digest,sendPassReceipt,ticketList,ticketTokenFor} from './server';

export const noStore={'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
export const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json',...noStore}});
export function failure(e:unknown){
 const x=e instanceof ConcertError?e:new ConcertError('The concert service is unavailable. Nothing has been confirmed.',503,'unavailable');
 return json({error:x.message,code:x.code},x.status);
}
export async function member(){try{return await requireMember();}catch{throw new ConcertError('Sign in to your LV Zion account.',401,'session');}}
export type Rpc={rpc:(name:string,args?:Record<string,unknown>)=>PromiseLike<{data:unknown;error:{code?:string}|null}>};
export async function call(client:Rpc,name:string,args?:Record<string,unknown>){const r=await client.rpc(name,args);if(r.error)throw databaseError(r.error.code);return r.data;}

export type TicketView={valid:true;ticketId:string;passes:ReturnType<typeof ticketList>;name:string;email:string;partySize:number;status:'active'|'cancelled';checkedInAt:string|null;event:PublicEvent&{archived:boolean}}|{valid:false};
export function parseTicketView(value:unknown):TicketView{
 const p=object(value);if(p.valid!==true)return {valid:false};
 const e=object(p.event);if(typeof e.archived!=='boolean'||(p.status!=='active'&&p.status!=='cancelled'))throw new ConcertError('Ticket could not be verified.',503,'unavailable');
 return {valid:true,ticketId:String(p.ticketId),passes:ticketList(p.passes ?? [p.ticketId && {id:p.ticketId,name:p.name,partySize:p.partySize}]),name:String(p.name),email:typeof p.email==='string'?p.email:'',partySize:partyValue(p.partySize),status:p.status,
  checkedInAt:typeof p.checkedInAt==='string'?p.checkedInAt:null,event:{...parsePublicEvent(e),archived:e.archived}};
}
/** Server-trusted read of a ticket by its token (service role). */
export async function ticketByToken(token:string){return parseTicketView(await call(authAdminClient(),'concert_ticket_view',{p_digest:digest(token)}));}
/** Emails a ticket the caller is already authorized for. */
export async function sendTicket(ticketId:string){
 const token=ticketTokenFor(ticketId),t=await ticketByToken(token);
 if(!t.valid||t.status!=='active')return false;
 return sendPassReceipt(t.email,t.event,t.passes);
}
