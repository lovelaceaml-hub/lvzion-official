import 'server-only';
import {createHmac, randomInt, randomUUID, timingSafeEqual} from 'node:crypto';
import {settings} from '../server/config';
import {sendAccountEmail, sendConcertEmail} from '../server/mail';
import {authAdminClient} from '../server/supabase';
import {concertDisplayTitle, concertWhen} from './branding';
import {ConcertError, object, parsePublicEvent} from './domain';
import {concertVerificationHtml, guestRegisteredHtml, hostReceiptHtml, invitationHtml} from './email';
export {ticketList} from './server';
import {call, ticketByToken, type Rpc} from './routes';
import {digest, sendPassReceipt, ticketList, ticketTokenFor} from './server';

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

export async function namedInvitation(client: Rpc, token: unknown) {
  if (typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) return null;
  const value = await rpc(client, 'concert_named_invitation', {action: 'view', digest: digest(token)});
  if (!value) return null;
  const row = object(value);
  return {
    id: String(row.id), name: String(row.name), email: typeof row.email === 'string' ? row.email : null,
    confirmedTicket: typeof row.confirmedTicket === 'string' ? row.confirmedTicket : null,
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

export function sessionProof(purpose: ProofPurpose | 'batch', email: string, scope: string) {
  const expiry = Date.now() + (purpose === 'sender' || purpose === 'batch' ? 60 : 15)*60_000;
  const payload = Buffer.from(JSON.stringify({purpose, email, scope, expiry})).toString('base64url');
  return payload+'.'+mac('concert-session:'+payload);
}

export function requireProof(token: unknown, purpose: ProofPurpose | 'batch', scope: string) {
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

type HostSource = 'named' | 'member';
async function hostContext(reference:string, source:HostSource) {
  const row = await rpc(authAdminClient(),'concert_host_context',{reference,source});
  if (!row) return null;
  const data = object(row);
  return {reference, source, email:String(data.email), eventId:String(data.eventId), event:parsePublicEvent(data.event),
    name:String(data.name), delivery:data.delivery, ticketId:data.ticketId ? String(data.ticketId) : null,
    guestEmail:String(data.guestEmail ?? ''), partySize:Number(data.partySize ?? 0),
    additionalNames:Array.isArray(data.additionalNames) ? data.additionalNames.map(String) : []};
}
type Host = NonNullable<Awaited<ReturnType<typeof hostContext>>>;
function statusSignature(host:Host) {
  return mac(JSON.stringify(['concert-status-v1',host.source,host.reference,host.eventId,host.email]));
}
function statusUrl(host:Host) {
  return settings().origin+'/concert/status/'+host.source+'.'+host.reference+'.'+statusSignature(host);
}
export async function readInvitationStatus(token:string) {
  const match=/^(named|member)\.([0-9a-f-]{36})\.([\w-]{43})$/.exec(token);
  if (!match) return null;
  const host=await hostContext(match[2],match[1] as HostSource);
  if (!host || !matches(statusSignature(host),match[3])) return null;
  const rows=await rpc(authAdminClient(),'concert_sender_status',{eventId:host.eventId,email:host.email});
  if (!Array.isArray(rows)) throw new Error('Invitation status unavailable');
  return {event:host.event, invitations:rows.map(row=>({name:String(row.name), status:String(row.status), partySize:Number(row.partySize ?? 0)}))};
}

export async function deliverConcertMail(kind: 'invitation' | 'registered' | 'tickets' | 'host_receipt' | 'host_party', reference: string) {
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
      if (!await sendPassReceipt(email,lead.event,tickets)) throw new Error('Delivery failed');
    } else if (kind === 'invitation') {
      const invitation = await namedInvitation(client, namedInviteToken(reference));
      if (!invitation?.available) throw new Error('Invitation unavailable');
      const title = concertDisplayTitle(invitation.event);
      const url = namedInviteUrl(reference);
      await sendConcertEmail(email, 'You’re invited · '+title,
        [`Hi ${invitation.name},`, `${invitation.senderName} invited you to ${title}.`, concertWhen(invitation.event), invitation.event.venue, url].join('\n\n'),
        {html: invitationHtml({event:invitation.event, name:invitation.name, sender:invitation.senderName, url})});
    } else {
      const host = await hostContext(reference,kind === 'host_party' ? 'member' : 'named');
      if (!host || host.email !== email) throw new Error('Invitation unavailable');
      const url = statusUrl(host);
      if (kind === 'host_receipt') {
        const delivery = host.delivery === 'sent' ? 'Your invitation was emailed.' : host.delivery === 'failed'
          ? 'Your invitation was created, but the guest email could not be delivered.' : host.delivery ? 'Guest email delivery is pending.' : 'Your personal invitation link is ready to share.';
        await sendConcertEmail(email,'Your invitation for '+host.name,
          [host.name,delivery,'View all your invitation statuses:',url].join('\n'),
          {html:hostReceiptHtml(host.event,host.name,delivery,url)});
      } else if (host.ticketId) {
        const lead=await ticketByToken(ticketTokenFor(host.ticketId));
        if (!lead.valid || !await sendPassReceipt(email,host.event,lead.passes,{
          name:host.name,email:host.guestEmail,additionalNames:host.additionalNames,statusUrl:url,
        })) throw new Error('Delivery failed');
      } else {
        // Older registrations may predate invitation-specific tickets.
        await sendConcertEmail(email,'Your guest registered',host.name+' registered through your concert invitation.\n'+url,{html:guestRegisteredHtml(host.name)});
      }
    }
    sent = true;
  } catch {
    // The persisted attempt can be retried without recreating the registration.
  }
  await rpc(client, 'concert_delivery', {action: 'finish', id: message.id, attempt: message.attempt, sent});
  return sent;
}
