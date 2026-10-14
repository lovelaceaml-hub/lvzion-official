'use client';
import {useState} from 'react';
import CaptchaChallenge from './captcha-challenge';
import './members.css';
export default function SignupForm({enabled,local,siteKey}:{enabled:boolean;local:boolean;siteKey:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[show,setShow]=useState(false),[captcha,setCaptcha]=useState('');
 const [resetVersion,setResetVersion]=useState(0);
 return <main className="auth-box"><small>LV ZION OFFICIAL</small><h1>Create your account.</h1><p>Use your personal email. After confirmation, your age category, group, and unit will be <strong>Unassigned</strong> until an authorized leader verifies and places you.</p>
 {!enabled&&<p role="status">Signup is prepared but is not activated in this development preview.</p>}
 <form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;setBusy(true);setMessage('');try{const p=Object.fromEntries(new FormData(form));const r=await fetch('/api/auth/sign-up',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,captchaToken:captcha||undefined})});const d=await r.json();setMessage(d.message??d.error);const password=form.elements.namedItem('password');if(password instanceof HTMLInputElement)password.value='';}catch{setMessage('Connection unavailable. Please try again.');}finally{setBusy(false);setCaptcha('');setResetVersion(x=>x+1);}}}>
 <label htmlFor="signup-name">Your name</label><input id="signup-name" name="name" autoComplete="name" minLength={2} maxLength={120} required disabled={!enabled}/>
 <label htmlFor="signup-email">Personal email</label><input id="signup-email" name="email" type="email" autoComplete="username" inputMode="email" spellCheck={false} maxLength={254} required disabled={!enabled}/>
 <label htmlFor="new-password">Password</label><input id="new-password" name="password" type={show?'text':'password'} autoComplete="new-password" minLength={12} maxLength={128} required disabled={!enabled} aria-describedby="password-help"/>
 <button type="button" className="secondary" aria-pressed={show} onClick={()=>setShow(!show)} disabled={!enabled}>{show?'Hide password':'Show password'}</button><p id="password-help" className="fine-print">Use at least 12 characters. Your password manager can suggest and save a strong password.</p>
 <div hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
 {enabled&&!local&&<CaptchaChallenge siteKey={siteKey} onToken={setCaptcha} onError={()=>setMessage('Verification unavailable. Reload and try again.')} resetVersion={resetVersion}/>}
 <button type="submit" disabled={!enabled||busy||(!local&&!captcha)}>{busy?'Creating account...':'Create account'}</button>
 </form>{message&&<p role="status" aria-live="polite">{message}</p>}<p>Already have a member record or invitation? Use your invitation or <a href="/request-access">ask your leader to verify access</a>.</p><p><a href="/sign-in">Sign in</a> · <a href="/reset-password">Password recovery</a></p><p>No personal email? Contact your authorized leader.</p></main>;
}
