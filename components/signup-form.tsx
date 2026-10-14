'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {signupNames} from '../lib/signup-name';
import CaptchaChallenge from './captcha-challenge';
import './members.css';

const SUBMITTED_KEY='lvz:signup:check-email';
const SUBMITTED_FOR_MS=30*60*1000;
const CHECK_EMAIL='If this address is eligible, a confirmation email will arrive. Confirm it to create your Unassigned profile. If you already have an account, sign in or recover your password.';

export default function SignupForm({enabled,local,siteKey}:{enabled:boolean;local:boolean;siteKey:string}){
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState(CHECK_EMAIL);
 const [submitted,setSubmitted]=useState(false);
 const [show,setShow]=useState(false);
 const [captcha,setCaptcha]=useState('');
 const [resetVersion,setResetVersion]=useState(0);
 const inFlight=useRef(false);

 // Persist only the completion state for this browser tab, never an email or password.
 // Refreshing after submission should not look like the account request was lost.
 useEffect(()=>{
  try{
   const saved=Number(sessionStorage.getItem(SUBMITTED_KEY));
   if(saved>0&&Date.now()-saved<SUBMITTED_FOR_MS)setSubmitted(true);
   else sessionStorage.removeItem(SUBMITTED_KEY);
  }catch{/* Private browsing may block storage; signup still works. */}
 },[]);

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!enabled||inFlight.current)return;
  const form=e.currentTarget;
  const input=Object.fromEntries(new FormData(form));
  let names:ReturnType<typeof signupNames>;
  try{
   names=signupNames(input);
  }catch(err){
   setError(err instanceof Error?err.message:'Enter both your first and last name.');
   const key=typeof input.firstName==='string'&&input.firstName.trim()?'lastName':'firstName';
   const field=form.elements.namedItem(key);
   if(field instanceof HTMLInputElement)field.focus();
   return;
  }

  inFlight.current=true;
  setBusy(true);
  setError('');
  try{
   const response=await fetch('/api/auth/sign-up',{
    method:'POST',headers:{'Content-Type':'application/json'},
    credentials:'same-origin',cache:'no-store',
    body:JSON.stringify({...input,...names,captchaToken:captcha||undefined})
   });
   const data:unknown=await response.json();
   if(!data||typeof data!=='object')throw new Error('Unexpected signup response. Please try again.');
   const result=data as {message?:string;error?:string};
   if(!response.ok)throw new Error(result.error||'Signup is temporarily unavailable. Please try again.');
   setMessage(result.message||CHECK_EMAIL);
   form.reset();
   setShow(false);
   setSubmitted(true);
   try{sessionStorage.setItem(SUBMITTED_KEY,String(Date.now()));}catch{}
  }catch(err){
   setError(err instanceof TypeError
    ?'Connection interrupted. Check whether a confirmation email arrives before trying again.'
    :err instanceof Error?err.message:'Something went wrong. Please try again.');
  }finally{
   inFlight.current=false;
   setBusy(false);
   setCaptcha('');
   setResetVersion(v=>v+1);
  }
 }

 function startOver(){
  try{sessionStorage.removeItem(SUBMITTED_KEY);}catch{}
  setSubmitted(false);
  setMessage(CHECK_EMAIL);
  setError('');
  setCaptcha('');
  setResetVersion(v=>v+1);
 }

 return <main className="auth-box">
  <small>LV ZION OFFICIAL</small>
  {submitted?<section aria-live="polite">
   <h1>Check your email.</h1>
   <p role="status">{message}</p>
   <p>Your age category, group, and unit will remain <strong>Unassigned</strong> until an authorized leader verifies and places you.</p>
   <p>Check your inbox and spam folder. Open the newest confirmation link and choose <strong>Confirm and continue</strong>.</p>
   <p><a href="/sign-in">Already confirmed? Sign in</a></p>
   <button type="button" className="secondary" onClick={startOver}>Create another account</button>
  </section>:<>
   <h1>Create your account.</h1>
   <p>Use your personal email. After confirmation, your age category, group, and unit will be <strong>Unassigned</strong> until an authorized leader verifies and places you.</p>
   {!enabled&&<p role="status">Account signup will open once email delivery is ready. Please check back soon.</p>}
   <form onSubmit={submit}>
    <fieldset disabled={!enabled||busy} className="signup-fields">
     <label htmlFor="signup-first-name">First name</label>
     <input id="signup-first-name" name="firstName" type="text" autoComplete="given-name" autoCapitalize="words" maxLength={80} required/>
     <label htmlFor="signup-last-name">Last name</label>
     <input id="signup-last-name" name="lastName" type="text" autoComplete="family-name" autoCapitalize="words" maxLength={80} required/>
     <label htmlFor="signup-email">Personal email</label>
     <input id="signup-email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={254} required/>
     <label htmlFor="new-password">Password</label>
     <input id="new-password" name="password" type={show?'text':'password'} autoComplete="new-password" minLength={6} maxLength={128} required aria-describedby="password-help"/>
     <button type="button" className="secondary" aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide password':'Show password'}</button>
     <p id="password-help" className="fine-print">Use at least 6 characters. Your password manager can suggest and save a strong password.</p>
     <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
     {enabled&&!local&&<CaptchaChallenge siteKey={siteKey} onToken={setCaptcha} onError={()=>setError('Verification unavailable. Reload and try again.')} resetVersion={resetVersion}/>}
     <button type="submit" disabled={!enabled||busy||(!local&&!captcha)}>{busy?'Creating account…':'Create account'}</button>
    </fieldset>
   </form>
   {error&&<p role="alert" aria-live="assertive">{error}</p>}
   <p>Already have a member record or invitation? Use your invitation or <a href="/request-access">ask your leader to verify access</a>.</p>
   <p><a href="/sign-in">Sign in</a> · <a href="/reset-password">Password recovery</a></p>
   <p>No personal email? Contact your authorized leader.</p>
  </>}
 </main>;
}
