'use client';
import {useState} from 'react';
import AuthShell from '../../components/auth-shell';
import {postJson} from '../../lib/post-json';
export default function Recovery(){
 const[message,setMessage]=useState('');const[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>,path:string){e.preventDefault();setBusy(true);const payload=Object.fromEntries(new FormData(e.currentTarget));try{const r=await postJson(path,payload);const d=await r.json();if(r.ok&&d.next)location.assign(d.next);else setMessage(d.message??d.error);}catch{setMessage('Recovery is temporarily unavailable.');}finally{setBusy(false);}}
 return <AuthShell eyebrow="Account recovery" title="Password recovery" lede="After opening a valid recovery confirmation, set your new password here."
  after={<div className="lvz-auth-after"><p>Without a deliverable personal email, contact an authorized leader for identity verification. Passwords are never disclosed.</p><p><a className="ui-link" href="/sign-in">Return to sign in</a></p></div>}>
  <form className="lvz-auth-form" onSubmit={e=>void submit(e,'/api/auth/password')}>
   <label className="ui-field">New password<input className="ui-input" name="password" type="password" autoComplete="new-password" minLength={6} maxLength={128} required/></label>
   <label className="ui-field">Confirm new password<input className="ui-input" name="confirm" type="password" autoComplete="new-password" minLength={6} maxLength={128} required/></label>
   <button className="ui-button ui-button-block" disabled={busy}>Set new password and sign out</button>
  </form>
  <details><summary>Request a recovery email</summary>
   <form className="lvz-auth-form" onSubmit={e=>void submit(e,'/api/auth/recover')}>
    <label className="ui-field">Username or verified email<input className="ui-input" name="identifier" autoComplete="username" required maxLength={254}/></label>
    <button className="ui-button ui-button-secondary ui-button-block" disabled={busy}>Request recovery instructions</button>
   </form>
  </details>
  {message&&<p role="status" className="ui-notice">{message}</p>}
 </AuthShell>;
}
