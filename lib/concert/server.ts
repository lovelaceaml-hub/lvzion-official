import 'server-only';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import QRCode from 'qrcode';
import {settings} from '../server/config';
import {mailConfigured,sendConcertEmail} from '../server/mail';
import {ticketGroupHtml, type HostConfirmation} from './email';
import {ticketRecords, type NamedTicket} from './registration';
import {concertDisplayTitle, concertWhen} from './branding';
import type {PublicEvent} from './domain';

/** Separate secret for concert links, so rotating sign-in secrets never voids printed tickets. */
function secret(){const s=process.env.LVZ_CONCERT_TOKEN_SECRET;if(!s||s.length<32)throw new Error('Concert tickets are not configured.');return s;}
const mac=(label:string)=>createHmac('sha256',secret()).update(label).digest('base64url');
export const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
/** One stable 22-character invite link per member. */
export const inviteTokenFor=(memberId:string)=>mac('concert-invite:v1:'+memberId).slice(0,22);
/** 43-character ticket token derived from the ticket id; only its digest is stored. */
export const ticketTokenFor=(ticketId:string)=>mac('concert-ticket:v1:'+ticketId);
export const newTicket=()=>{const id=randomUUID();const token=ticketTokenFor(id);return {id,token,digest:digest(token)};};
export const ticketUrl=(token:string)=>settings().origin+'/concert/ticket/'+token;
export const inviteUrl=(token:string)=>settings().origin+'/concert/i/'+token;
const qrOptions={errorCorrectionLevel:'M' as const,margin:4,color:{dark:'#09285c',light:'#ffffff'}};
export const qrSvg=(url:string)=>QRCode.toString(url,{...qrOptions,type:'svg'});
export const qrPng=(url:string)=>QRCode.toBuffer(url,{...qrOptions,type:'png',width:440});

export function ticketList(records:unknown):NamedTicket[] {
  return ticketRecords(records).map(({companionToken,...ticket}) => ({
    ...ticket,url:ticketUrl(companionToken ?? ticketTokenFor(ticket.id)),
  }));
}

export async function sendPassReceipt(to:string,event:PublicEvent,tickets:NamedTicket[],host?:HostConfirmation) {
  if (!mailConfigured() || !to || !tickets.length) return false;
  const cards=tickets.map((t,index)=>({...t,qrCid:'ticket-'+index}));
  try {
    const attachments=await Promise.all(cards.map(async (t,index)=>({
      filename:'ticket-'+(index+1)+'.png',content:await qrPng(t.url),cid:t.qrCid,contentType:'image/png',
    })));
    const title=concertDisplayTitle(event);
    const subject=host ? 'Your guest confirmed · '+host.name : 'Your tickets · '+title;
    const text=[subject,concertWhen(event),event.venue,...(host?[host.email,host.statusUrl]:[]),
      'Show one QR code per attendee.',...cards.map(t=>t.name+'\n'+t.url)].join('\n\n');
    await sendConcertEmail(to,subject,text,{html:ticketGroupHtml(event,cards,host),attachments});
    return true;
  } catch { return false; }
}
