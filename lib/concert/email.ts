/** Ticket email text and HTML. Pure functions so they can be tested without sending mail. */
import {formatDate, formatTime, type PublicEvent} from './domain.ts';
import {concertCalendar, concertDisplayTitle, concertTimeLabel, concertVenueLines, isPeaceConcert, PEACE_CONCERT_TITLE_LINES} from './branding.ts';

export type TicketMail = {name: string; partySize: number; event: PublicEvent; ticketUrl: string};
const mailPaper = '#fffdf9';
const mailInk = '#10275b';
const mailLine = '#b8c5da';
const mailAction = '#263b63';
const mailGold = '#ab8960';
const mailSky = '#d7e5f7';
const mailLove = '#b72e50';

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
  return `<span style="font-size:16px;line-height:20px;font-weight:600">${escape(intro)}</span><br>
<span style="color:${mailLove};font-size:32px;line-height:36px;letter-spacing:-.6px">${escape(love)}</span><br>
<span style="color:${mailInk};font-size:23px;line-height:27px">${escape(peace)}</span>`;
}

function emailFrame(kicker: string, heading: string, rows: string) {
  return `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(kicker)} · LV Zion</title></head>
<body style="margin:0;background:#edf2f9;color:${mailInk};font-family:Arial,Helvetica,sans-serif">
<table role="presentation" lang="en" dir="ltr" width="100%" cellpadding="0" cellspacing="0" bgcolor="#edf2f9"><tr><td align="center" style="padding:16px 8px">
<table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" bgcolor="${mailPaper}" style="max-width:480px;table-layout:fixed;border:1px solid ${mailLine};border-radius:16px">
<tr><td align="center" bgcolor="${mailSky}" style="background:linear-gradient(170deg,${mailSky},#f7faff 55%,#fff0df);padding:16px 12px;border-bottom:1px solid ${mailLine};border-radius:15px 15px 0 0">
<p style="margin:0 0 7px;color:${mailAction};font-size:13px;line-height:18px;font-weight:700">${escape(kicker)}</p>
<h1 style="margin:0;color:${mailInk};font:700 24px/29px Arial,Helvetica,sans-serif;overflow-wrap:anywhere">${heading}</h1>
</td></tr>
${rows}
<tr><td align="center" bgcolor="${mailAction}" style="padding:12px;color:#fff7da;font-size:13px;border-radius:0 0 15px 15px">LV Zion</td></tr>
</table></td></tr></table></body></html>`;
}

function eventFacts(event: PublicEvent) {
  const time = concertTimeLabel(event);
  const when = event.doorsTime ? `${time} · Doors open ${formatTime(event.doorsTime)}` : time;
  const where = concertVenueLines(event.venue).map(escape).join('<br>');
  return `<tr><td align="center" style="padding:18px 16px;border-top:1px solid ${mailLine};font-size:15px;line-height:23px;color:${mailInk};overflow-wrap:anywhere">
<strong style="color:${mailInk}">${escape(formatDate(event.date))}</strong><br>${escape(when)}<br>${where}
</td></tr>`;
}

function actionLink(url: string, label: string) {
  return `<a href="${escape(url)}" style="display:inline-block;box-sizing:border-box;max-width:100%;overflow-wrap:anywhere;background:${mailAction};border:1px solid ${mailGold};color:#fff7da;text-decoration:underline;font-size:15px;font-weight:700;line-height:22px;padding:11px 20px;border-radius:10px">${escape(label)}</a>`;
}

function ticketRow({name, partySize, url, qrCid}: EmailTicket, group: boolean, event: PublicEvent) {
  return `<tr><td align="center" style="padding:0 10px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${mailPaper}" style="border:1px solid ${mailLine};border-radius:12px;table-layout:fixed">
<tr><td align="center" style="padding:14px 8px">
<h2 style="margin:0;color:${mailInk};font-size:22px;line-height:28px;overflow-wrap:anywhere">${escape(name)}</h2>
${partySize && partySize > 1 ? `<p style="margin:4px 0;color:#45536a;font-size:14px">Party of ${partySize}</p>` : ''}
${isPeaceConcert(event) ? `<p style="margin:4px 0;color:#36516b;font-size:14px;line-height:19px">${escape(concertDisplayTitle(event))}<br>${escape(formatDate(event.date))}</p>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="center" style="max-width:332px;margin:8px auto;table-layout:fixed"><tr>
<td align="center" bgcolor="#ffffff" style="padding:4px;border:1px solid ${mailLine};border-radius:8px">
<a href="${escape(url)}" style="display:block;color:${mailInk}"><img src="cid:${escape(qrCid)}" width="320" height="320" alt="${escape('Ticket QR code for '+name)}" style="display:block;width:100%;max-width:320px;height:auto;margin:0 auto;border:0;background:#fff;color:${mailInk}"></a>
</td></tr></table>
${actionLink(url, group ? 'Open ticket for '+name : 'Open my ticket')}
</td></tr></table></td></tr>`;
}

export type HostConfirmation = {name:string; email:string; additionalNames:string[]; statusUrl:string};
export function hostReceiptHtml(event:PublicEvent, name:string, delivery:string, statusUrl:string) {
  return emailFrame('Your concert invitations',emailHeader(event),`
<tr><td align="center" style="padding:20px;color:${mailInk};overflow-wrap:anywhere"><strong>${escape(name)}</strong><p>${escape(delivery)}</p>
${actionLink(statusUrl,'View my invitation statuses')}</td></tr>${eventFacts(event)}`);
}

export function ticketGroupHtml(event: PublicEvent, tickets: EmailTicket[], host?:HostConfirmation) {
  const calendar=concertCalendar(event);
  return emailFrame(host ? 'Your guest confirmed attendance' : tickets.length === 1 ? 'Admission ticket' : 'Admission tickets', emailHeader(event), `
${host ? `<tr><td align="center" style="padding:18px;overflow-wrap:anywhere"><strong>${escape(host.name)} confirmed attendance.</strong>
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
<tr><td align="center" style="padding:20px 16px;color:${mailInk};font-size:16px;line-height:24px;overflow-wrap:anywhere">
<p style="margin:0 0 6px">Hi ${escape(name)},</p>
<p style="margin:0"><strong>${escape(sender)}</strong> invited you to the concert.</p>
</td></tr>${eventFacts(event)}
<tr><td align="center" style="padding:0 16px 22px">${actionLink(url, 'Open your invitation')}</td></tr>`);
}

export function concertVerificationHtml(code: string) {
  return emailFrame('Event Invitation and Registration', 'Verify your email', `
<tr><td align="center" style="padding:20px 16px;color:${mailInk};font-size:16px;line-height:24px;overflow-wrap:anywhere">
<p style="margin:0 0 10px">Enter this code in the concert registration window.</p>
<p style="display:inline-block;margin:0;padding:12px 16px;background:#e8eff8;border-radius:10px;color:${mailInk};font-size:27px;font-weight:700;letter-spacing:.12em">${escape(code)}</p>
<p style="margin:12px 0 0;color:#45536a;font-size:14px">It expires in 15 minutes. If you didn’t request a code, you can ignore this email.</p>
</td></tr>`);
}

export function guestRegisteredHtml(name: string) {
  return emailFrame('Event Invitation and Registration', 'Your guest registered', `
<tr><td align="center" style="padding:20px 16px;color:${mailInk};font-size:16px;line-height:24px;overflow-wrap:anywhere">
<strong>${escape(name)}</strong> registered through your concert invitation.
</td></tr>`);
}
