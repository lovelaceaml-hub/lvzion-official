/** Ticket email text and HTML. Pure functions so they can be tested without sending mail. */
import {formatDate, formatTime, type PublicEvent} from './domain.ts';
import {concertCalendar, concertDisplayTitle, concertTimeLabel, concertVenueLines, isPeaceConcert, PEACE_CONCERT_TITLE_LINES} from './branding.ts';

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
  return `<span style="font-size:17px;line-height:23px">${escape(intro)}</span><br>
<span style="color:#c53158;font-size:36px;line-height:40px">${escape(love)}</span><br>
<span style="font-size:26px;line-height:32px">${escape(peace)}</span>`;
}

function emailFrame(kicker: string, heading: string, rows: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(kicker)} · LV Zion</title></head>
<body style="margin:0;background:#edf1e9;color:#192e51;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#edf1e9"><tr><td align="center" style="padding:16px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fffaee" style="max-width:480px;border:1px solid #bfcab9;border-top:6px solid #193459">
<tr><td align="center" style="padding:22px 12px 18px;border-bottom:1px solid #bfcab9">
<p aria-hidden="true" style="margin:0 0 6px;color:#39704d;font:22px Georgia,serif">&#10087;&nbsp; &#9835; &nbsp;&#10087;</p>
<h1 style="margin:0;color:#193459;font:700 27px/32px Arial,Helvetica,sans-serif">${heading}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:14px auto 0"><tr>
<td bgcolor="#bf3058" style="padding:6px 18px;border-left:5px solid #e76a82;border-right:5px solid #e76a82;color:#ffffff;text-align:center;font-size:13px;line-height:18px;font-weight:700;letter-spacing:.05em">${escape(kicker)}</td>
</tr></table></td></tr>
${rows}
<tr><td align="center" bgcolor="#193459" style="padding:12px;color:#fffaee;font-size:13px">LV Zion</td></tr>
</table></td></tr></table></body></html>`;
}

function eventFacts(event: PublicEvent) {
  const time = concertTimeLabel(event);
  const when = event.doorsTime ? `${time} · Doors open ${formatTime(event.doorsTime)}` : time;
  const where = concertVenueLines(event.venue).map(escape).join('<br>');
  return `<tr><td align="center" style="padding:18px 16px;border-top:1px solid #bfcab9;font-size:15px;line-height:23px;color:#284b36">
<strong style="color:#193459">${escape(formatDate(event.date))}</strong><br>${escape(when)}<br>${where}
</td></tr>`;
}

function actionLink(url: string, label: string) {
  return `<a href="${escape(url)}" style="display:inline-block;box-sizing:border-box;max-width:100%;overflow-wrap:anywhere;background:#193459;color:#fff;text-decoration:underline;font-size:15px;font-weight:700;line-height:22px;padding:11px 20px;border-radius:6px">${escape(label)}</a>`;
}

function ticketRow({name, partySize, url, qrCid}: EmailTicket, group: boolean, event: PublicEvent) {
  return `<tr><td align="center" style="padding:0 10px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fffffa" style="border:1px solid #bfcab9;border-top:3px solid #d94268;table-layout:fixed">
<tr><td align="center" style="padding:14px 8px">
<h2 style="margin:0;color:#193459;font-size:22px;line-height:28px;overflow-wrap:anywhere">${escape(name)}</h2>
${partySize && partySize > 1 ? `<p style="margin:4px 0;color:#45536a;font-size:14px">Party of ${partySize}</p>` : ''}
${isPeaceConcert(event) ? `<p style="margin:6px 0;color:#365c42;font-size:14px;line-height:20px">${escape(concertDisplayTitle(event))}<br>${escape(formatDate(event.date))}</p>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:292px;margin:12px auto;table-layout:fixed"><tr>
<td align="center" bgcolor="#ffffff" style="padding:10px;border:1px solid #ced7c9">
<img src="cid:${escape(qrCid)}" width="268" height="268" alt="${escape('Ticket QR code for '+name)}" style="display:block;width:100%;max-width:268px;height:auto;background:#fff;color:#193459">
</td></tr></table>
${actionLink(url, group ? 'Open ticket for '+name : 'Open my ticket')}
</td></tr></table></td></tr>`;
}

export type HostConfirmation = {name:string; email:string; additionalNames:string[]; statusUrl:string};
export function hostReceiptHtml(event:PublicEvent, name:string, delivery:string, statusUrl:string) {
  return emailFrame('Your concert invitations',emailHeader(event),`
<tr><td align="center" style="padding:20px;color:#182b48"><strong>${escape(name)}</strong><p>${escape(delivery)}</p>
${actionLink(statusUrl,'View my invitation statuses')}</td></tr>${eventFacts(event)}`);
}

export function ticketGroupHtml(event: PublicEvent, tickets: EmailTicket[], host?:HostConfirmation) {
  const calendar=concertCalendar(event);
  return emailFrame(host ? 'Your guest confirmed attendance' : tickets.length === 1 ? 'Admission ticket' : 'Admission tickets', emailHeader(event), `
${host ? `<tr><td align="center" style="padding:18px"><strong>${escape(host.name)} confirmed attendance.</strong>
<p>${escape(host.email)}</p>${host.additionalNames.length ? '<p>With '+host.additionalNames.map(escape).join(', ')+'</p>' : ''}
<p>Your copies of the admission tickets are below. Each person has their own QR code.</p>
${actionLink(host.statusUrl,'View my invitation statuses')}</td></tr>` : ''}
<tr><td align="center" style="padding:16px;color:#182b48;font-size:15px;font-weight:700">Show ${tickets.length === 1 ? 'this QR code' : 'each attendee’s QR code'} at the door.</td></tr>
${tickets.map(ticket => ticketRow(ticket, tickets.length > 1, event)).join('')}
${eventFacts(event)}
${calendar ? '<tr><td align="center" style="padding:16px">Add to calendar · <a href="https://lvz.app'+calendar.apple+'">Apple Calendar</a> · <a href="'+escape(calendar.google)+'">Google Calendar</a></td></tr>' : ''}`);
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
<p style="display:inline-block;margin:0;padding:12px 16px;background:#eaf0e4;border-radius:10px;color:#09285c;font-size:27px;font-weight:700;letter-spacing:.12em">${escape(code)}</p>
<p style="margin:12px 0 0;color:#45536a;font-size:14px">It expires in 15 minutes. If you didn’t request a code, you can ignore this email.</p>
</td></tr>`);
}

export function guestRegisteredHtml(name: string) {
  return emailFrame('Event Invitation and Registration', 'Your guest registered', `
<tr><td align="center" style="padding:20px 16px;color:#182b48;font-size:16px;line-height:24px">
<strong>${escape(name)}</strong> registered through your concert invitation.
</td></tr>`);
}
