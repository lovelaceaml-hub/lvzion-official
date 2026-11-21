/** Shared input rules for named event registrations. */
import {ConcertError, MAX_PARTY, object, partyValue} from './domain.ts';
import {signupNames} from '../signup-name.ts';

export const CHURCH_TITLES = ['Pastor', 'Elder', 'Missionary', 'Deacon/ness', 'Brother', 'Sister'] as const;
export type InviteDraft = {
  name: string;
  relationship: string;
  email: string;
  firstVisit: boolean;
  vip: {title: string; organization: string; category: string} | null;
};
export type InviteSummary = {
  id: string;
  name: string;
  vip: boolean;
  hasEmail: boolean;
  accepted: boolean;
  withdrawn: boolean;
  delivery: 'pending' | 'sending' | 'sent' | 'failed' | null;
  url: string;
};
export type NamedTicket = {id: string; name: string; partySize: number; svg?: string; checkedInAt?: string | null; url: string};

export function field(value: unknown, label: string, max = 120) {
  if (typeof value !== 'string') throw new ConcertError(`Enter ${label}.`);
  const normalized = value.trim().replace(/ +/g, ' ').normalize('NFC');
  if (!normalized || normalized.length > max || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new ConcertError(`Enter ${label} using up to ${max} characters.`);
  }
  return normalized;
}

export function guestName(value: unknown) {
  const name = field(value, 'a name');
  if (name.length < 2) throw new ConcertError('Enter a name with at least two characters.');
  return name;
}

export function registrationEmail(value: unknown) {
  const email = field(value, 'an email address', 254).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new ConcertError('Enter a valid email address.');
  return email;
}

export function memberDetails(value: unknown) {
  const input = object(value);
  const title = input.title ? CHURCH_TITLES.find(item => item === input.title) : '';
  if (title === undefined) throw new ConcertError('Choose a church title.');
  let names;
  try {
    if ('fullName' in input) {
      const fullName = field(input.fullName, 'your full name').replace(/\s+/gu, ' ');
      const split = fullName.lastIndexOf(' ');
      if (split < 0) throw new ConcertError('Enter your first and last name.');
      names = signupNames({firstName: fullName.slice(0, split), lastName: fullName.slice(split + 1)});
    } else {
      names = signupNames(input);
    }
  } catch {
    throw new ConcertError('Enter a valid full name with a first and last name.');
  }
  return {...names, title, location: input.location ? field(input.location, 'your Zion location') : '', leader: field(input.leader, 'your group leader’s name')};
}

export function attendeeNames(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_PARTY) throw new ConcertError('Choose a party of 1 to 10.');
  return value.map(guestName);
}

export function inviteRecipients(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_PARTY) throw new ConcertError('Enter 1 to 10 invitations at a time.');
  return value.map(item => {
    const input = object(item);
    const vip = input.vip ? object(input.vip) : null;
    return {
      name: guestName(input.name),
      relationship: field(input.relationship, 'your relationship'),
      email: input.email ? registrationEmail(input.email) : null,
      firstVisit: input.firstVisit === true,
      vip: vip && {title: field(vip.title, 'a VIP title'), organization: field(vip.organization, 'a VIP organization'), category: field(vip.category, 'a VIP category')},
    };
  });
}

export function ticketRecords(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    const record = object(item);
    return {id: String(record.id), name: String(record.name), partySize: partyValue(record.partySize),
      checkedInAt:typeof record.checkedInAt === 'string' ? record.checkedInAt : null,
      companionToken:typeof record.companionToken === 'string' && /^[\w-]{43}$/.test(record.companionToken) ? record.companionToken : undefined};
  });
}
