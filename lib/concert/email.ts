/** Ticket email text and HTML. Pure functions so they can be tested without sending mail. */
import {formatDate,formatTime,type PublicEvent} from './domain.ts';
export type TicketMail={name:string;partySize:number;event:PublicEvent;ticketUrl:string};
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function ticketSubject(m:TicketMail){return 'Your ticket: '+m.event.title;}
export function ticketText(m:TicketMail){
 const e=m.event;
 return [
  `Hi ${m.name},`,'',
  `You are registered for ${e.title}.`,
  formatDate(e.date),
  (e.doorsTime?`Doors open ${formatTime(e.doorsTime)}. `:'')+`Starts ${formatTime(e.startTime)}.`,
  e.venue,
  `Party of ${m.partySize}`,'',
  'Show the QR code in this email at the door, or open your ticket here:',
  m.ticketUrl,'',
  'Save this email so your ticket is easy to find on the day.','',
  'LV Zion'
 ].join('\n');
}
export function ticketHtml(m:TicketMail,qrCid:string){
 const e=m.event;const when=formatDate(e.date)+'<br>'+(e.doorsTime?`Doors open ${escape(formatTime(e.doorsTime))} · `:'')+`Starts ${escape(formatTime(e.startTime))}`;
 return `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#0e1025;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#f4f2ff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#191b38;border-radius:20px;border:1px solid #494675">
<tr><td style="padding:28px 24px 8px;text-align:center">
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b9b9e1">Your ticket</p>
<h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#f4f2ff">${escape(e.title)}</h1>
<p style="margin:0 0 4px;font-size:15px;line-height:1.5;color:#f4f2ff">${when}</p>
<p style="margin:0 0 18px;font-size:15px;color:#b9b9e1">${escape(e.venue)}</p>
</td></tr>
<tr><td align="center" style="padding:0 24px"><div style="background:#ffffff;border-radius:16px;padding:14px;display:inline-block"><img src="cid:${qrCid}" width="220" height="220" alt="Ticket QR code" style="display:block"></div></td></tr>
<tr><td style="padding:16px 24px 6px;text-align:center"><p style="margin:0;font-size:18px;font-weight:600;color:#f4f2ff">${escape(m.name)}</p><p style="margin:4px 0 0;font-size:14px;color:#b9b9e1">Party of ${m.partySize}</p></td></tr>
<tr><td align="center" style="padding:18px 24px 8px"><a href="${escape(m.ticketUrl)}" style="display:inline-block;background:#a08aff;color:#101125;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:999px">Open my ticket</a></td></tr>
<tr><td style="padding:10px 24px 26px;text-align:center;font-size:13px;line-height:1.5;color:#b9b9e1">Show this QR code at the door. Save this email so your ticket is easy to find on the day.</td></tr>
</table><p style="margin:16px 0 0;font-size:12px;color:#6c6c9c">LV Zion</p></td></tr></table></body></html>`;
}
