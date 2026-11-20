/** Ticket email text and HTML. Pure functions so they can be tested without sending mail. */
import {formatDate, formatTime, type PublicEvent} from './domain.ts';
import {concertDisplayTitle, concertTimeLabel, concertVenueLines, isPeaceConcert, PEACE_CONCERT_TITLE_LINES} from './branding.ts';

export type TicketMail = {name: string; partySize: number; event: PublicEvent; ticketUrl: string};
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!));

export function ticketSubject({event}: TicketMail) {
  return 'Your ticket: ' + concertDisplayTitle(event);
}

export function ticketText({name, partySize, event, ticketUrl}: TicketMail) {
  const when = concertTimeLabel(event);
  return [
    `Hi ${name},`, '',
    `You are registered for ${concertDisplayTitle(event)}.`,
    formatDate(event.date),
    event.doorsTime ? `Doors open ${formatTime(event.doorsTime)}. ${when}.` : `${when}.`,
    ...concertVenueLines(event.venue),
    `Party of ${partySize}`, '',
    'Show the QR code in this email at the door, or open your ticket here:',
    ticketUrl, '',
    'Save this email so your ticket is easy to find on the day.', '',
    'LV Zion',
  ].join('\n');
}

type EmailTicket = {name: string; url: string; qrCid: string; partySize?: number};

function emailHeader(event: PublicEvent) {
  if (!isPeaceConcert(event)) return escape(concertDisplayTitle(event));
  const [intro, love, peace] = PEACE_CONCERT_TITLE_LINES;
  return `<span style="display:block;font-size:18px;line-height:24px">${escape(intro)}</span>
<span style="display:block;font-style:italic;color:#ad303e;font-size:34px;line-height:38px">${escape(love)}</span>
<span style="display:block;color:#09285c;font-size:26px;line-height:32px">${escape(peace)}</span>`;
}

function emailFrame(kicker: string, heading: string, rows: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(kicker)} · LV Zion</title></head>
<body style="margin:0;background:#f5e3d7;color:#182b48;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5e3d7"><tr><td align="center" style="padding:18px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fff8ed" style="max-width:480px;border:1px solid #d7ba95;border-radius:18px">
<tr><td align="center" bgcolor="#faeddc" style="padding:22px 16px 24px;border-radius:18px 18px 0 0;border-bottom:4px solid #f6cb79;background-image:linear-gradient(155deg,#f6ddce,#fff7eb 65%,#f3ddcd)">
<p style="margin:0 0 10px;color:#8b2840;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${escape(kicker)}</p>
<h1 style="margin:0;color:#171d40;font-family:Georgia,serif;font-size:26px;line-height:32px">${heading}</h1>
</td></tr>
${rows}
</table><p style="margin:16px 0 0;color:#655764;font-size:13px">LV Zion</p></td></tr></table></body></html>`;
}

function eventFacts(event: PublicEvent) {
  const time = concertTimeLabel(event);
  const when = event.doorsTime ? `${time} · Doors open ${formatTime(event.doorsTime)}` : time;
  const where = concertVenueLines(event.venue).map(escape).join('<br>');
  return `<tr><td align="center" style="padding:17px 16px;border-top:1px solid #d7ba95;font-size:15px;line-height:23px;color:#45536a">
<strong style="color:#182b48">${escape(formatDate(event.date))}</strong><br>${escape(when)}<br>${where}
</td></tr>`;
}

function actionLink(url: string, label: string) {
  return `<a href="${escape(url)}" style="display:inline-block;box-sizing:border-box;max-width:100%;overflow-wrap:anywhere;background:#93263f;color:#fff;text-decoration:none;font-size:15px;font-weight:700;line-height:22px;padding:11px 20px;border-radius:22px">${escape(label)}</a>`;
}

function ticketRow({name, partySize, url, qrCid}: EmailTicket, group: boolean, event: PublicEvent) {
  return `<tr><td align="center" style="padding:18px 16px;border-top:1px solid #d7ba95">
${isPeaceConcert(event) ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fff8eb" style="border:3px double #c6a373"><tr><td align="center" style="padding:14px"><span aria-hidden="true" style="color:#94572e;font:26px Georgia,serif">&#9829;</span><p style="margin:8px 0;font:italic 20px Georgia,serif;color:#74384a">${escape(concertDisplayTitle(event))}</p><p style="margin:6px 0 12px;color:#493444">${escape(formatDate(event.date))}</p>` : ''}
<h2 style="margin:0;color:#182b48;font-size:19px;line-height:25px;overflow-wrap:anywhere">${escape(name)}</h2>
${partySize ? `<p style="margin:4px 0 0;color:#45536a;font-size:14px">Party of ${partySize}</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px auto"><tr>
<td bgcolor="#fff5e8" style="padding:7px;border:1px solid #c8a06b;border-radius:14px">
<img src="cid:${escape(qrCid)}" width="204" height="204" alt="${escape('Ticket QR code for '+name)}" style="display:block;max-width:100%;height:auto;background:#fff;border-radius:7px">
</td></tr></table>
${actionLink(url, group ? 'Open ticket for '+name : 'Open my ticket')}
${isPeaceConcert(event) ? '</td></tr></table>' : ''}
</td></tr>`;
}

type HostConfirmation = {name:string; email:string; additionalNames:string[]; statusUrl:string};
export function hostReceiptHtml(event:PublicEvent, name:string, delivery:string, statusUrl:string) {
  return emailFrame('Your concert invitations',emailHeader(event),`
<tr><td align="center" style="padding:20px;color:#182b48"><strong>${escape(name)}</strong><p>${escape(delivery)}</p>
${actionLink(statusUrl,'View my invitation statuses')}</td></tr>${eventFacts(event)}`);
}

export function ticketGroupHtml(event: PublicEvent, tickets: EmailTicket[], host?:HostConfirmation) {
  return emailFrame(host ? 'Your guest confirmed attendance' : tickets.length === 1 ? 'Admission ticket' : 'Admission tickets', emailHeader(event), `
${host ? `<tr><td align="center" style="padding:18px"><strong>${escape(host.name)} confirmed attendance.</strong>
<p>${escape(host.email)}</p>${host.additionalNames.length ? '<p>With '+host.additionalNames.map(escape).join(', ')+'</p>' : ''}
<p>Your copy of the party’s ticket is below. Both copies use the same QR code.</p>
${actionLink(host.statusUrl,'View my invitation statuses')}</td></tr>` : ''}
<tr><td align="center" style="padding:16px;color:#182b48;font-size:15px;font-weight:700">Show ${tickets.length === 1 ? 'this QR code' : 'each attendee’s QR code'} at the door.</td></tr>
${tickets.map(ticket => ticketRow(ticket, tickets.length > 1, event)).join('')}
${eventFacts(event)}`);
}

export function ticketHtml({name, partySize, event, ticketUrl}: TicketMail, qrCid: string) {
  return ticketGroupHtml(event, [{name, partySize, url:ticketUrl, qrCid}]);
}

export function invitationHtml({event, name, sender, url}: {event: PublicEvent; name: string; sender: string; url: string}) {
  return emailFrame('You’re invited', emailHeader(event), `
<tr><td align="center" style="padding:20px 16px;color:#182b48;font-size:16px;line-height:24px">
<p style="margin:0 0 6px">Hi ${escape(name)},</p>
<p style="margin:0"><strong>${escape(sender)}</strong> invited you to the concert.</p>
</td></tr>${eventFacts(event)}
<tr><td align="center" style="padding:0 16px 22px">${actionLink(url, 'Open your invitation')}</td></tr>`);
}

export function concertVerificationHtml(code: string) {
  return emailFrame('Event Invitation and Registration', 'Verify your email', `
<tr><td align="center" style="padding:20px 16px;color:#182b48;font-size:16px;line-height:24px">
<p style="margin:0 0 10px">Enter this code in the concert registration window.</p>
<p style="display:inline-block;margin:0;padding:12px 16px;background:#faeddc;border-radius:10px;color:#09285c;font-size:27px;font-weight:700;letter-spacing:.12em">${escape(code)}</p>
<p style="margin:12px 0 0;color:#45536a;font-size:14px">It expires in 15 minutes. If you didn’t request a code, you can ignore this email.</p>
</td></tr>`);
}

export function guestRegisteredHtml(name: string) {
  return emailFrame('Event Invitation and Registration', 'Your guest registered', `
<tr><td align="center" style="padding:20px 16px;color:#182b48;font-size:16px;line-height:24px">
<strong>${escape(name)}</strong> registered through your concert invitation.
</td></tr>`);
}
