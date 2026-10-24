'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {signupNames} from '../lib/signup-name';
import CaptchaChallenge from './captcha-challenge';
import AuthShell from './auth-shell';
import {ArrowRight} from './home-icons';
import {postJson} from '../lib/post-json';

const SUBMITTED_KEY='lvz:signup:check-email';
const SUBMITTED_FOR_MS=30*60*1000;
const CHECK_EMAIL='If this address is eligible, a confirmation email will arrive. Confirm it to create your Unassigned profile. If you already have an account, sign in or recover your password.';

export default function SignupForm({enabled,local,siteKey}:{enabled:boolean;local:boolean;siteKey:string}){
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState(CHECK_EMAIL);
 const [submitted,setSubmitted]=useState(false);
 const [show,setShow]=useState(false);
 const [resendBusy,setResendBusy]=useState(false);
 const [resendStatus,setResendStatus]=useState('');
 const [resendError,setResendError]=useState('');
 const [resendCooldown,setResendCooldown]=useState(false);
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
   const response=await postJson('/api/auth/sign-up',{...input,...names,captchaToken:captcha||undefined},{credentials:'same-origin',cache:'no-store'});
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

 async function resend(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(resendBusy||resendCooldown)return;
  const form=e.currentTarget;
  const email=new FormData(form).get('resendEmail');
  if(typeof email!=='string'||!email.trim())return;
  setResendBusy(true);setResendError('');setResendStatus('');
  try{
   const response=await postJson('/api/auth/resend-confirmation',{email:email.trim()},{credentials:'same-origin',cache:'no-store'});
   const data=await response.json() as {message?:string;error?:string};
   if(!response.ok)throw new Error(data.error||'Resend unavailable. Try again later.');
   setResendStatus(data.message||'Check your inbox for the newest confirmation email.');
   setResendCooldown(true);
   window.setTimeout(()=>setResendCooldown(false),60000);
   form.reset();
  }catch(e){setResendError(e instanceof Error?e.message:'Connection unavailable. Please try again.');}
  finally{setResendBusy(false);}
 }

 function startOver(){
  try{sessionStorage.removeItem(SUBMITTED_KEY);}catch{}
  setSubmitted(false);
  setMessage(CHECK_EMAIL);
  setError('');
  setCaptcha('');
  setResetVersion(v=>v+1);
 }

 if(submitted)return <AuthShell eyebrow="Almost there" title="Check your email." lede="Confirm your address to finish creating your account."
  after={<ul className="lvz-auth-links"><li><a className="ui-link" href="/sign-in">Already confirmed? Sign in</a></li></ul>}>
  <section aria-live="polite">
   <p role="status" className="ui-notice">{message}</p>
   <p>Your age category, group, and unit will remain <strong>Unassigned</strong> until an authorized leader verifies and places you.</p>
   <p>Check your inbox and spam folder. Open the newest confirmation link and choose <strong>Confirm and continue</strong>.</p>
   <details className="signup-resend">
    <summary>Didn't receive the email?</summary>
    <p>Delivery can take a few minutes. Enter your signup email to request another link. Your account must still be awaiting email confirmation.</p>
    <form className="lvz-auth-form" onSubmit={resend}>
     <div className="ui-field"><label htmlFor="signup-resend-email">Email used to sign up</label>
      <input className="ui-input" id="signup-resend-email" type="email" name="resendEmail" autoComplete="email" autoCapitalize="none" maxLength={254} required disabled={resendBusy||resendCooldown}/></div>
     <button type="submit" className="ui-button ui-button-block" disabled={resendBusy||resendCooldown}>{resendBusy?'Requesting…':resendCooldown?'Please wait one minute':'Resend confirmation'}</button>
    </form>
    {resendStatus&&<p role="status" className="ui-notice">{resendStatus}</p>}
    {resendError&&<p role="alert" className="ui-notice" data-tone="danger">{resendError}</p>}
   </details>
   <button type="button" className="ui-button ui-button-secondary ui-button-block" onClick={startOver}>Create another account</button>
  </section>
 </AuthShell>;

 return <AuthShell eyebrow="Join your community" title="Create your account." lede="Use your personal email, then confirm it to finish."
  after={<div className="lvz-auth-after">
   <p><a className="ui-link" href="/sign-in">Already have an account? Sign in</a></p>
   <p>Already have a member record or invitation? Use your invitation or <a className="ui-link" href="/request-access">ask your leader to verify access</a>.</p>
   <p><a className="ui-link" href="/reset-password">Password recovery</a>. No personal email? Contact your authorized leader.</p>
  </div>}>
  {!enabled&&<p role="status" className="ui-notice lvz-auth-closed" data-tone="warning">Account signup will open once email delivery is ready. Please check back soon.</p>}
  <form className="lvz-auth-form" onSubmit={submit}>
   <fieldset disabled={!enabled||busy} className="signup-fields">
    <div className="lvz-auth-pair">
     <div className="ui-field"><label htmlFor="signup-first-name">First name</label>
      <input className="ui-input" id="signup-first-name" name="firstName" type="text" autoComplete="given-name" autoCapitalize="words" maxLength={80} placeholder="First name" required/></div>
     <div className="ui-field"><label htmlFor="signup-last-name">Last name</label>
      <input className="ui-input" id="signup-last-name" name="lastName" type="text" autoComplete="family-name" autoCapitalize="words" maxLength={80} placeholder="Last name" required/></div>
    </div>
    <p className="lvz-auth-help">First and last name are both required and appear together on your member profile.</p>
    <div className="ui-field"><label htmlFor="signup-email">Personal email</label>
     <input className="ui-input" id="signup-email" name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={254} placeholder="you@example.com" required/></div>
    <div className="ui-field"><div className="lvz-auth-labelrow"><label htmlFor="new-password">Password</label>
      <button type="button" className="ui-button ui-button-quiet" aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide password':'Show password'}</button></div>
     <input className="ui-input" id="new-password" name="password" type={show?'text':'password'} autoComplete="new-password" minLength={6} maxLength={128} placeholder="Create a password" required aria-describedby="password-help"/></div>
    <p id="password-help" className="lvz-auth-help">Use at least 6 characters. Your password manager can suggest and save a strong password.</p>
    <p className="lvz-auth-note">New profiles begin <strong>Unassigned</strong> to age category, group, and unit. An authorized leader verifies your membership and placement.</p>
    <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
    {enabled&&!local&&<CaptchaChallenge siteKey={siteKey} onToken={setCaptcha} onError={()=>setError('Verification unavailable. Reload and try again.')} resetVersion={resetVersion}/>}
    <button type="submit" className="ui-button ui-button-block" disabled={!enabled||busy||(!local&&!captcha)}>{busy?'Creating account…':<>Create account <ArrowRight size={20}/></>}</button>
   </fieldset>
  </form>
  {error&&<p role="alert" aria-live="assertive" className="ui-notice" data-tone="danger">{error}</p>}
 </AuthShell>;
}
