'use client';
import{useState}from'react';
import AuthShell from '../../components/auth-shell';
import {postJson} from '../../lib/post-json';
export default function RequestAccess(){
 const[message,setMessage]=useState('');const[busy,setBusy]=useState(false);
 return <AuthShell eyebrow="Existing member record" title="Request account access" lede="An authorized leader will verify your identity and match your existing member record. Submitting this form does not create a login or grant access."
  after={<div className="lvz-auth-after"><p>No personal email? Contact your authorized leader for an approved identity-verification process. No shared or fabricated email account will be created.</p><p><a className="ui-link" href="/sign-in">Return to sign in</a></p></div>}>
  <form className="lvz-auth-form" onSubmit={async e=>{e.preventDefault();const input=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);try{const r=await postJson('/api/auth/access-request',input);const d=await r.json();setMessage(d.message??d.error);}catch{setMessage('Request unavailable. Try again later.');}finally{setBusy(false);}}}>
   <label className="ui-field">Your name<input className="ui-input" name="name" autoComplete="name" minLength={2} maxLength={120} required/></label>
   <label className="ui-field">Personal email<input className="ui-input" name="email" type="email" autoComplete="email" maxLength={254} required/></label>
   <div hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
   <button className="ui-button ui-button-block" disabled={busy}>Submit for review</button>
  </form>
  {message&&<p role="status" className="ui-notice">{message}</p>}
 </AuthShell>;
}
