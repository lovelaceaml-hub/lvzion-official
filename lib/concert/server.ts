import 'server-only';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import QRCode from 'qrcode';
import {settings} from '../server/config';
import {mailConfigured,sendConcertEmail} from '../server/mail';
import {ticketHtml,ticketSubject,ticketText} from './email';
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

/** Sends the ticket email. Returns false (never throws) when mail is off or delivery fails. */
export async function emailTicket(to:string,m:{name:string;partySize:number;event:PublicEvent;token:string}):Promise<boolean>{
 if(!mailConfigured())return false;
 try{
  const url=ticketUrl(m.token),mail={name:m.name,partySize:m.partySize,event:m.event,ticketUrl:url};
  await sendConcertEmail(to,ticketSubject(mail),ticketText(mail),{html:ticketHtml(mail,'ticket-qr'),attachments:[{filename:'ticket-qr.png',content:await qrPng(url),cid:'ticket-qr',contentType:'image/png'}]});
  return true;
 }catch{return false;}
}
