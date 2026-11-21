import {scheduleConcertSheetSync} from '../../../lib/concert/sheet-sync';
import {parseEvent,parseMemberCommand,parseProgramEntries,ConcertError,object,identifier,type Workspace} from '../../../lib/concert/domain';
import {body} from '../../../lib/server/http';
import {digest,inviteTokenFor,inviteUrl,newTicket,qrSvg,ticketTokenFor,ticketUrl} from '../../../lib/concert/server';
import {call,failure,json,member,sendTicket,ticketByToken} from '../../../lib/concert/routes';
import {settings} from '../../../lib/server/config';
export const runtime='nodejs';
export const dynamic='force-dynamic';

async function workspace(client:Awaited<ReturnType<typeof member>>):Promise<Workspace&{email:string}>{
 const me=identifier(await call(client,'my_membership_id'));
 const invite=inviteTokenFor(me);
 const p=object(await call(client,'concert_workspace',{p_invite_digest:digest(invite)}));
 if(typeof p.canManage!=='boolean'||!Number.isInteger(p.invitedCount))throw new ConcertError('Concert could not be verified.',503,'unavailable');
 let myTicket=null;
 if(p.myTicket){const t=object(p.myTicket),id=identifier(t.id),url=ticketUrl(ticketTokenFor(id));
  const wallet=await ticketByToken(ticketTokenFor(id));
  const passes=wallet.valid ? await Promise.all(wallet.passes.map(async pass=>({...pass,svg:await qrSvg(pass.url)}))) : undefined;
  myTicket={id,passes,name:String(t.name),email:String(t.email),partySize:Number(t.partySize),checkedInAt:typeof t.checkedInAt==='string'?t.checkedInAt:null,url,qrSvg:await qrSvg(url)};}
 const user=await client.auth.getUser();
 const event=p.event?parseEvent(p.event):null;
 return {viewerId:me,name:String(p.name??''),canManage:p.canManage,event,myTicket,invitedCount:p.invitedCount as number,inviteUrl:event?.publicRsvp?settings().origin+'/concert/rsvp':inviteUrl(invite),email:user.data.user?.email??''};
}
export async function GET(request:Request){
 try{
  const client=await member();
  if(new URL(request.url).searchParams.get('program')==='full'){
   const p=object(await call(client,'concert_program_full'));
   return json({items:parseProgramEntries(p.items)});
  }
  return json(await workspace(client));
 }catch(e){return failure(e);}
}
export async function POST(request:Request){
 try{
  const client=await member();
  let input;try{input=await body(request);}catch{throw new ConcertError('A same-origin JSON request is required.');}
  const command=parseMemberCommand(input);
  if(command.op==='rsvp'){
   const t=newTicket();
   const r=object(await call(client,'concert_member_rsvp',{p_ticket:t.id,p_digest:t.digest,p_email:command.email,p_party:command.partySize}));
   const ticketId=identifier(r.ticketId);
   if(r.created===true)scheduleConcertSheetSync();
   const emailed=r.created===true?await sendTicket(ticketId):false;
   return json({ok:true,created:r.created===true,emailed});
  }
  if(command.op==='resend'){
   object(await call(client,'concert_ticket_owner_email',{p_ticket:command.ticketId}));
   const emailed=await sendTicket(command.ticketId);
   if(!emailed)throw new ConcertError('The email could not be sent right now. The ticket on screen still works.',503,'mail');
   return json({ok:true,emailed});
  }
  if(command.op==='program'){
   const r=object(await call(client,'concert_program_save',{p_items:command.items}));
   if(r.ok!==true)throw new ConcertError('The save could not be confirmed.',503,'unavailable');
   return json({ok:true});
  }
  const r=object(await call(client,'concert_command',{p_command:command}));
  if(r.ok!==true)throw new ConcertError('The save could not be confirmed.',503,'unavailable');
  if(command.op==='checkin'||command.op==='undo'||command.op==='cancel')scheduleConcertSheetSync();
  return json({ok:true});
 }catch(e){return failure(e);}
}
