'use client';
import{useState}from'react';
import AuthShell from '../../components/auth-shell';
import {postJson} from '../../lib/post-json';
export default function Activate(){
 const[message,setMessage]=useState('');const[busy,setBusy]=useState(false);
 return <AuthShell eyebrow="Your invitation" title="Activate your account" lede="Choose your username and password. Your verified invitation connects this login to your existing member record.">
  <form className="lvz-auth-form" onSubmit={async e=>{e.preventDefault();setBusy(true);const input=Object.fromEntries(new FormData(e.currentTarget));try{const r=await postJson('/api/auth/activate',input);const d=await r.json();if(r.ok)location.assign('/members');else setMessage(d.error);}catch{setMessage('Activation is temporarily unavailable.');}finally{setBusy(false);}}}>
   <label className="ui-field">Choose a username<input className="ui-input" name="username" autoComplete="username" autoCapitalize="none" pattern="[a-z][a-z0-9._-]{2,31}" required/></label>
   <label className="ui-field">New password<input className="ui-input" name="password" type="password" autoComplete="new-password" minLength={6} maxLength={128} required/></label>
   <button className="ui-button ui-button-block" disabled={busy}>Activate account</button>
  </form>
  {message&&<p role="status" className="ui-notice">{message}</p>}
 </AuthShell>;
}
