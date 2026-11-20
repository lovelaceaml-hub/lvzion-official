'use client';

import {useState, type FormEvent} from 'react';
import {MAX_PARTY, type RsvpEntry} from '../../lib/concert/domain';
import ConcertDialog from './concert-dialog';

export default function GuestRsvp({entry, invitedBy, showPoster}: {entry: RsvpEntry; invitedBy?: string; showPoster?: boolean}) {
  const [busy, setBusy] = useState(false);
  const [partySize, setPartySize] = useState(1);
  const [error, setError] = useState('');
  const [repeat, setRepeat] = useState<{emailed: boolean; email: string} | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get('name') ?? '');
    const email = String(fields.get('email') ?? '');
    const inviterName = fields.get('inviterName');
    const attendeeNames = fields.getAll('attendeeName');
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/concert/rsvp', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...entry, name, email, partySize, inviterName, attendeeNames}),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw Error(typeof result?.error === 'string' ? result.error : 'Your RSVP could not be saved. Please try again.');
      }
      if (result?.existing === true) {
        setRepeat({emailed: result.emailed === true, email});
        return;
      }
      if (typeof result?.ticketPath === 'string' && /^\/concert\/ticket\/[\w-]{43}$/.test(result.ticketPath)) {
        window.location.assign(result.ticketPath + (result.emailed ? '?sent=1' : ''));
        return;
      }
      throw Error('Your ticket could not be opened. Please try again.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your RSVP could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return <ConcertDialog label="Tap here to register" title="Event Invitation and Registration" primary presentation="registration" invitedBy={invitedBy} showPoster={showPoster}>
    {repeat ? <section className="cc-form" role="status">
      <h3>You’re already on the list</h3>
      <p className="cc-hint">{repeat.emailed
        ? `We sent your ticket again to ${repeat.email}. Check your inbox and spam folder.`
        : 'Use the QR ticket you saved when you registered.'}</p>
    </section> :
      <form className="cc-registration cc-reg-form cc-guest-form" onSubmit={submit} aria-label="Concert RSVP" aria-busy={busy}>
        <label className="ui-field"><span>Full name</span>
          <input className="ui-input" name="name" required minLength={2} maxLength={120} autoComplete="name"/>
        </label>
        <label className="ui-field"><span>Email for your ticket</span>
          <input className="ui-input" name="email" type="email" required maxLength={254} autoComplete="email"/>
        </label>
        <label className="ui-field"><span>Who invited you?</span>
          <input className="ui-input" name="inviterName" required pattern=".*\S.*" maxLength={120} defaultValue={invitedBy}/>
        </label>
        <label className="ui-field"><span>How many people, including you?</span>
          <select className="ui-input" value={partySize} onChange={e => setPartySize(Number(e.target.value))}>
            {Array.from({length: MAX_PARTY}, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
          </select>
        </label>
        {Array.from({length: partySize - 1}, (_, index) => <label className="ui-field" key={index}>
          <span>Attendee {index + 2} full name</span>
          <input className="ui-input" name="attendeeName" required minLength={2} maxLength={120}/>
        </label>)}
        <button className="ui-button ui-button-block" disabled={busy}>{busy ? 'Saving…' : 'Get my QR ticket'}</button>
        {error ? <p className="cc-error" role="alert">{error}</p> : null}
      </form>}
  </ConcertDialog>;
}
