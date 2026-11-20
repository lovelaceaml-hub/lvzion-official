import {after} from 'next/server';
import {randomUUID} from 'node:crypto';
import {body} from '../../../../lib/server/http';
import {verifyHuman} from '../../../../lib/server/bot-protection';
import {consumeLoginLimit} from '../../../../lib/server/login';
import {ConcertError, identifier, inviterNameValue, object} from '../../../../lib/concert/domain';
import {attendeeNames, field, guestName, inviteRecipients, memberDetails, registrationEmail} from '../../../../lib/concert/registration';
import {
  deliverConcertMail, issueProof, namedInvitation, namedInviteToken, namedInviteUrl, redeemProof,
  requireProof, rpc, sessionProof, setupPinMatches, ticketList, type ProofPurpose,
} from '../../../../lib/concert/registration-server';
import {digest, qrSvg, ticketTokenFor} from '../../../../lib/concert/server';
import {call, failure, json} from '../../../../lib/concert/routes';
import {allowedSignupEmail, signupSettings} from '../../../../lib/signup';
import {userClient} from '../../../../lib/server/supabase';
import {completeEnrollment} from '../../../../lib/server/enrollment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function displayTickets(records: unknown) {
  return Promise.all(ticketList(records).map(async ticket => ({...ticket, svg:await qrSvg(ticket.url)})));
}


type Admin = Awaited<ReturnType<typeof consumeLoginLimit>>;
type Input = Record<string, unknown>;

function proofPurpose(value: unknown): Exclude<ProofPurpose, 'setup'> {
  if (value === 'sender' || value === 'recipient' || value === 'recovery') return value;
  throw new ConcertError('Invalid verification request.');
}

async function startSetup(admin: Admin, input: Input, email: string) {
  const response = {message: 'If this email has a pending account, we’ll send a setup link. Existing members can sign in or reset their password.'};
  if (!setupPinMatches(input.pin)) throw new ConcertError('Check the setup PIN and try again.', 403);
  const c = signupSettings(process.env);
  if (allowedSignupEmail(email, process.env, c.local) && await rpc(admin, 'concert_member_intake', {email})) {
    await issueProof(admin, 'setup', email, 'member').catch(() => undefined);
  }
  return response;
}

async function finishSetup(admin: Admin, input: Input) {
  const password = input.password;
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    throw new ConcertError('Choose a password with 6 to 128 characters.');
  }
  const c = signupSettings(process.env);
  const {email} = await redeemProof(admin, 'setup', identifier(input.challenge), field(input.code, 'the verification code', 80));
  const raw = await rpc(admin, 'concert_member_intake', {email});
  if (!raw || !allowedSignupEmail(email, process.env, c.local)) {
    throw new ConcertError('Use your existing LV Zion sign-in or password recovery.', 409);
  }
  const intake = object(raw);

  const client = await userClient();
  const firstName = String(intake.first_name);
  const lastName = String(intake.last_name);
  const signUpTicket = c.production || process.env.LVZ_LOCAL_SIGNUP_HOOK === 'true'
    ? await call(admin, 'issue_signup_ticket', {p_email: email, p_mode: 'signup'})
    : null;
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: {display_name: firstName+' '+lastName, first_name: firstName, last_name: lastName,
      ...(typeof signUpTicket === 'string' ? {lvz_signup_ticket: signUpTicket} : {})},
  });
  // Existing accounts are never reset or overwritten by concert enrollment.
  if (created.error || !created.data.user) throw new ConcertError('Use your existing LV Zion sign-in or password recovery.', 409);
  const signedIn = await client.auth.signInWithPassword({email, password});
  if (signedIn.error || signedIn.data.user?.id !== created.data.user.id) throw new ConcertError('Your account is ready. Sign in with your new password.', 409);
  const memberId = await completeEnrollment(client);
  await rpc(admin, 'concert_member_intake', {email, memberId, ticketId:intake.ticket_id});
  return {next: '/members'};
}

async function invited(admin: Admin, input: Input) {
  const invitation = await namedInvitation(admin, input.invitation);
  if (!invitation?.available) throw new ConcertError('This invitation is unavailable.', 404);
  return invitation;
}

async function registrations(admin: Admin, input: Input) {
  const id = identifier(input.requestId);
  const invitation = input.invitation ? await invited(admin, input) : null;
  const eventId = invitation?.eventId ?? identifier(input.eventId);
  const intake = input.member ? memberDetails(input.member) : undefined;
  const inviterName = intake ? undefined : inviterNameValue(input.inviterName);
  const proof = input.proof ? requireProof(input.proof, 'recipient', invitation?.id ?? '') : undefined;
  const email = proof ?? registrationEmail(input.email);
  if (invitation?.email && proof !== invitation.email) {
    throw new ConcertError('Verify the email this invitation was sent to.', 403, 'verification');
  }
  if (invitation && guestName(input.name).toLowerCase() !== invitation.name.toLowerCase()) {
    throw new ConcertError('Enter the name as it appears on your invitation.');
  }
  const names = invitation ? [invitation.name] : intake ? [intake.name] : attendeeNames(input.names);
  const tickets = names.map((name, index) => {
    const ticketId = index === 0 ? id : randomUUID();
    return {id: ticketId, name, digest: digest(ticketTokenFor(ticketId))};
  });
  const result = object(await rpc(admin, 'concert_register_named', {
    id, eventId, email, tickets, ...(intake ? {intake} : {inviterName}), inviteId: invitation?.id, verified: Boolean(proof),
  }));
  const notification = typeof result.notification === 'string' ? result.notification : null;
  const delivery = typeof result.delivery === 'string' ? result.delivery : null;
  if (delivery || notification) after(async () => {
    await Promise.allSettled([
      delivery && deliverConcertMail('tickets', delivery),
      notification && deliverConcertMail('registered', notification),
    ]);
  });
  return {tickets: await displayTickets(result.tickets), existing: result.existing === true, emailed: Boolean(delivery)};
}

async function senderInvitations(admin: Admin, input: Input) {
  const eventId = identifier(input.eventId);
  const sender = requireProof(input.proof, 'sender', eventId);
  const action = input.op;
  const query: Input = {eventId, sender, action};
  if (action === 'create') {
    query.batch = identifier(input.requestId);
    query.name = guestName(input.senderName);
    query.recipients = inviteRecipients(input.recipients).map(recipient => {
      const id = randomUUID();
      return {...recipient, id, digest: digest(namedInviteToken(id))};
    });
  }
  if (action === 'resend' || action === 'withdraw') query.id = identifier(input.id);
  let rows = await rpc(admin, 'concert_named_invitation', query);
  if (Array.isArray(rows) && (action === 'create' || action === 'resend' || action === 'list')) {
    await Promise.allSettled(rows.filter(row => row.hasEmail && !row.accepted && !row.withdrawn &&
      (action === 'resend' ? row.id === query.id : row.delivery === 'pending'))
      .map(row => deliverConcertMail('invitation', String(row.id))));
    rows = await rpc(admin, 'concert_named_invitation', {eventId, sender, action: 'list'});
  }
  const invitations = Array.isArray(rows) ? rows : [];
  if (invitations.some(row => row.accepted && ['pending','failed'].includes(row.notification))) after(async () => {
    await Promise.allSettled(invitations.filter(row => row.accepted && ['pending','failed'].includes(row.notification))
      .map(row => deliverConcertMail('registered', String(row.id))));
  });
  return {invitations: invitations.map(({notification: _notification, ...row}) => ({...row, url: namedInviteUrl(String(row.id))}))};
}

export async function POST(request: Request) {
  try {
    let input: Input;
    try { input = await body(request,32_768); await verifyHuman(); }
    catch { throw new ConcertError('Please reload the page and try again.', 403, 'verification'); }

    const key = input.email ? registrationEmail(input.email) : digest(String(input.challenge ?? input.proof ?? input.invitation ?? input.requestId ?? 'anonymous'));
    let admin: Admin;
    try { admin = await consumeLoginLimit(request, key, 'concert-registration'); }
    catch { throw new ConcertError('Too many attempts. Try again in a few minutes.', 429, 'limited'); }

    switch (input.op) {
      case 'startSetup':
        return json(await startSetup(admin, input, registrationEmail(input.email)));
      case 'finishSetup':
        return json(await finishSetup(admin, input));
      case 'requestCode': {
        const purpose = proofPurpose(input.purpose);
        const invitation = purpose === 'recipient' ? await invited(admin, input) : null;
        const email = invitation?.email ?? registrationEmail(input.email);
        const scope = invitation?.id ?? identifier(input.eventId);
        // Never accept a public email field as proof of the named recipient's inbox.
        if (purpose === 'recipient' && !invitation?.email) throw new ConcertError('No verification code is required.');
        if (!invitation) {
          const shared = await call(admin, 'concert_shared_view');
          if (!shared || object(object(shared).event).id !== scope) throw new ConcertError('Registration is unavailable.', 404);
        }
        return json({challenge: await issueProof(admin, purpose, email, scope)});
      }
      case 'verifyCode': {
        const purpose = proofPurpose(input.purpose);
        const code = field(input.code, 'the verification code', 8);
        if (!/^\d{8}$/.test(code)) throw new ConcertError('Enter the eight-digit email code.');
        const verified = await redeemProof(admin, purpose, identifier(input.challenge), code);
        if (purpose === 'recovery') {
          const records = await rpc(admin, 'concert_recover_tickets', {email: verified.email, eventId: verified.scope});
          return json({tickets: await displayTickets(records)});
        }
        return json({proof: sessionProof(purpose, verified.email, verified.scope)});
      }
      case 'register':
        return json(await registrations(admin, input));
      case 'create':
      case 'list':
      case 'withdraw':
      case 'resend':
        return json(await senderInvitations(admin, input));
      default:
        throw new ConcertError('Invalid registration request.');
    }
  } catch (error) {
    return failure(error);
  }
}
