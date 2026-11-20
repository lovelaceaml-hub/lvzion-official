import 'server-only';
import {createHmac, randomInt, randomUUID, timingSafeEqual} from 'node:crypto';
import {settings} from '../server/config';
import {sendAccountEmail, sendConcertEmail} from '../server/mail';
import {authAdminClient} from '../server/supabase';
import {concertDisplayTitle, concertWhen} from './branding';
import {ConcertError, object, parsePublicEvent} from './domain';
import {concertVerificationHtml, guestRegisteredHtml, invitationHtml, ticketGroupHtml} from './email';
import {ticketRecords} from './registration';
import {call, ticketByToken, type Rpc} from './routes';
import {digest, qrPng, ticketTokenFor, ticketUrl} from './server';

export type ProofPurpose = 'sender' | 'recipient' | 'recovery' | 'setup';

function mac(value: string) {
  const secret = process.env.LVZ_CONCERT_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new ConcertError('Registration is unavailable.', 503);
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function matches(expected: string, supplied: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function rpc(client: Rpc, name: string, parameters: Record<string, unknown>) {
  return call(client, name, {p: parameters});
}

export const namedInviteToken = (id: string) => mac('named-concert-invite:v1:'+id);
export const namedInviteUrl = (id: string) => settings().origin + '/concert/invitation/' + namedInviteToken(id);
export const ticketList = (value: unknown) => ticketRecords(value).map(ticket => ({...ticket, url: ticketUrl(ticketTokenFor(ticket.id))}));

export async function namedInvitation(client: Rpc, token: unknown) {
  if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) return null;
  const value = await rpc(client, 'concert_named_invitation', {action: 'view', digest: digest(token)});
  if (!value) return null;
  const row = object(value);
  return {
    id: String(row.id), name: String(row.name), email: typeof row.email === 'string' ? row.email : null,
    senderName: String(row.senderName), available: row.available === true, accepted: row.accepted === true,
    event: parsePublicEvent(row.event), eventId: String(object(row.event).id),
  };
}

export async function issueProof(client: Rpc, purpose: ProofPurpose, email: string, scope: string) {
  const id = randomUUID();
  const code = purpose === 'setup' ? mac('concert-setup:v1:'+id) : String(randomInt(0, 100_000_000)).padStart(8, '0');
  await rpc(client, 'concert_verify', {action: 'issue', id, email, purpose, scope, digest: digest(mac(`proof:${id}:${code}`))});
  const text = purpose === 'setup'
    ? ['Set up your LV Zion account.', '', settings().origin+'/concert/setup#'+id+'.'+code, '', 'This link expires in 15 minutes.'].join('\n')
    : `Your Event Invitation and Registration code is ${code}. It expires in 15 minutes.\n\nIf you did not request this code, you can ignore this message.`;
  try {
    if (purpose === 'setup') await sendAccountEmail(email, 'Set up your LV Zion account', text);
    else await sendConcertEmail(email, 'Your concert verification code', text, {html: concertVerificationHtml(code)});
  } catch {
    throw new ConcertError('Email could not be sent. Check the address and try again.', 503);
  }
  return id;
}

export async function redeemProof(client: Rpc, purpose: ProofPurpose, id: string, code: string) {
  const result = await rpc(client, 'concert_verify', {action: 'redeem', id, purpose, digest: digest(mac(`proof:${id}:${code}`))});
  if (!result) throw new ConcertError('This verification has expired or the code is incorrect.', 400, 'verification');
  const verified = object(result);
  return {email: String(verified.email), scope: String(verified.scope)};
}

export function sessionProof(purpose: ProofPurpose, email: string, scope: string) {
  const expiry = Date.now() + (purpose === 'sender' ? 60 : 15)*60_000;
  const payload = Buffer.from(JSON.stringify({purpose, email, scope, expiry})).toString('base64url');
  return payload+'.'+mac('concert-session:'+payload);
}

export function requireProof(token: unknown, purpose: ProofPurpose, scope: string) {
  if (typeof token === 'string' && token.length < 1024) {
    const [payload, signature, extra] = token.split('.');
    if (payload && signature && !extra && matches(mac('concert-session:'+payload), signature)) {
      const value = object(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
      if (value.purpose === purpose && value.scope === scope && typeof value.expiry === 'number' &&
          value.expiry > Date.now() && typeof value.email === 'string') return value.email;
    }
  }
  throw new ConcertError('Verify your email to continue.', 403, 'verification');
}

export function setupPinMatches(pin: unknown) {
  const expected = process.env.LVZ_CONCERT_SETUP_PIN;
  if (!expected) throw new ConcertError('Account setup is temporarily unavailable.', 503);
  return typeof pin === 'string' && matches(expected, pin);
}

export async function deliverConcertMail(kind: 'invitation' | 'registered' | 'tickets', reference: string) {
  const client = authAdminClient();
  const result = await rpc(client, 'concert_delivery', {kind, reference});
  if (!result) return false;
  const message = object(result);
  const email = String(message.email);
  let sent = false;
  try {
    if (kind === 'tickets') {
      const tickets = ticketList(message.tickets);
      const lead = await ticketByToken(ticketTokenFor(reference));
      if (!lead.valid || !tickets.length) throw new Error('Ticket unavailable');
      const title = concertDisplayTitle(lead.event);
      const when = concertWhen(lead.event);
      const texts = tickets.map(ticket => `${ticket.name}\n${ticket.url}`);
      const cards = tickets.map((ticket, index) => ({...ticket, qrCid: `ticket-${index}`}));
      const attachments = await Promise.all(cards.map(async (ticket, index) => ({
        filename: `ticket-${index+1}.png`, content: await qrPng(ticket.url), cid: ticket.qrCid, contentType: 'image/png',
      })));
      await sendConcertEmail(email, 'Your tickets · '+title,
        [title, when, lead.event.venue, 'Show your QR at the door.', ...texts].join('\n\n'),
        {attachments, html: ticketGroupHtml(lead.event, cards)});
    } else if (kind === 'invitation') {
      const invitation = await namedInvitation(client, namedInviteToken(reference));
      if (!invitation?.available) throw new Error('Invitation unavailable');
      const title = concertDisplayTitle(invitation.event);
      const url = namedInviteUrl(reference);
      await sendConcertEmail(email, 'You’re invited · '+title,
        [`Hi ${invitation.name},`, `${invitation.senderName} invited you to ${title}.`, concertWhen(invitation.event), invitation.event.venue, url].join('\n\n'),
        {html: invitationHtml({event:invitation.event, name:invitation.name, sender:invitation.senderName, url})});
    } else {
      const name = String(message.name);
      await sendConcertEmail(email, 'Your guest registered', `${name} registered through your concert invitation.`, {html: guestRegisteredHtml(name)});
    }
    sent = true;
  } catch {
    // The persisted attempt can be retried without recreating the registration.
  }
  await rpc(client, 'concert_delivery', {action: 'finish', id: message.id, attempt: message.attempt, sent});
  return sent;
}
