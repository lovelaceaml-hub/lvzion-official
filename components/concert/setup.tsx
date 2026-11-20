'use client';

import {useEffect, useState, type FormEvent} from 'react';

export default function ConcertSetup() {
  const [proof, setProof] = useState<{challenge:string;code:string}|null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const [challenge, code] = location.hash.slice(1).split('.');
    if (/^[0-9a-f-]{36}$/.test(challenge) && /^[\w-]{43}$/.test(code??'')) {
      setProof({challenge,code});
      history.replaceState(null,'',location.pathname);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/concert/registration', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(proof?{op:'finishSetup',...proof,password:values.password}:{op:'startSetup',email:values.email,pin:values.pin}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error??'Try again.');
      if (result.next==='/members') { location.assign(result.next); return; }
      setMessage(result.message);
      setSent(true);
    } catch (error) { setError(error instanceof Error?error.message:'Please try again.'); }
    finally { setBusy(false); }
  }

  return <main className="ui-main ui-narrow cc-page cc-public">
    <section className="cc-panel cc-public-head">
      <h1>{proof?'Create your password':'Set up your LV Zion account'}</h1>
      {sent?<p role="status">{message}</p>:<form className="cc-reg-form" onSubmit={submit}>
        {proof?<label className="ui-field">New password<input className="ui-input" type="password" name="password" autoComplete="new-password" minLength={6} maxLength={128} required/></label>:<>
          <label className="ui-field">Email address<input className="ui-input" type="email" name="email" autoComplete="email" required/></label>
          <label className="ui-field">Setup PIN<input className="ui-input" type="password" name="pin" inputMode="numeric" maxLength={12} required/></label>
        </>}
        <button className="ui-button" disabled={busy}>{busy?'Please wait…':proof?'Create password':'Email a verification link'}</button>
      </form>}
      {error?<p className="cc-error" role="alert">{error}</p>:null}
      <div className="cc-reg-tools"><a href="/sign-in">Sign in</a><a href="/reset-password">Reset password</a><a href="/concert/rsvp">Concert page</a></div>
    </section>
  </main>;
}
