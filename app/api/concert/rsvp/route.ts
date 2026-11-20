import {after} from 'next/server';
import {deliverConcertMail} from '../../../../lib/concert/registration-server';
import {createHmac} from 'node:crypto';
import {ConcertError,identifier,object,parseGuestRsvp} from '../../../../lib/concert/domain';
import {body} from '../../../../lib/server/http';
import {verifyHuman} from '../../../../lib/server/bot-protection';
import {authAdminClient} from '../../../../lib/server/supabase';
import {settings} from '../../../../lib/server/config';
import {digest,newTicket,ticketTokenFor,ticketUrl} from '../../../../lib/concert/server';
import {call,failure,json,sendTicket} from '../../../../lib/concert/routes';
export const runtime='nodejs';
export const dynamic='force-dynamic';

/** Own buckets in the shared limiter: 50 tries per network and 10 per email address each 15 minutes. */
async function limit(request:Request,email:string){
 const c=settings();const ip=process.env.VERCEL==='1'?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim():'isolated-local';
 if(!ip||!c.rateSecret)throw new ConcertError('RSVP is unavailable right now.',503,'unavailable');
 const hash=(v:string)=>createHmac('sha256',c.rateSecret!).update(v).digest('hex');
 const admin=authAdminClient();
 const r=await admin.rpc('consume_auth_limits',{p_ip_hash:hash('concert-ip:'+ip),p_identifier_hash:hash('concert-email:'+email)});
 if(r.error||r.data!==true)throw new ConcertError('Too many tries. Please wait a few minutes and try again.',429,'limited');
 return admin;
}
export async function POST(request:Request){
 try{
  let input;try{input=await body(request);}catch{throw new ConcertError('Please reload the page and try again.');}
  const rsvp=parseGuestRsvp(input);
  try{await verifyHuman();}catch{throw new ConcertError('We could not verify this request. Reload the page and try again.',403,'verification');}
  const admin=await limit(request,rsvp.email);
  const t=newTicket();
  const r=object(await call(admin,'concert_register_guest_party',{p:{
   ...('invite' in rsvp ? {inviteDigest:digest(rsvp.invite)} : {eventId:rsvp.eventId}),
   ticketId:t.id,digest:t.digest,name:rsvp.name,email:rsvp.email,phone:rsvp.phone,partySize:rsvp.partySize,
   inviterName:rsvp.inviterName,attendeeNames:rsvp.attendeeNames,
  }}));
  const ticketId=identifier(r.ticketId);
  if ('invite' in rsvp) after(async () => { await deliverConcertMail('host_party',ticketId); });
  const emailed=await sendTicket(ticketId);
  // A repeat email never reveals the existing ticket; it is re-sent to the address on file instead.
  if(r.created!==true)return json({ok:true,existing:true,emailed});
  return json({ok:true,existing:false,emailed,ticketUrl:ticketUrl(ticketTokenFor(ticketId)),ticketPath:'/concert/ticket/'+ticketTokenFor(ticketId)});
 }catch(e){return failure(e);}
}
