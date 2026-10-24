'use client';
import {useState} from 'react';
import CaptchaChallenge from './captcha-challenge';
import AuthShell from './auth-shell';
import {ArrowRight} from './home-icons';
import {postJson} from '../lib/post-json';
export default function SignIn({captchaRequired=false,siteKey=''}:{captchaRequired?:boolean;siteKey?:string}){
 const[message,setMessage]=useState('');const[busy,setBusy]=useState(false);const[captcha,setCaptcha]=useState('');const[resetVersion,setResetVersion]=useState(0);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);
  try{const r=await postJson('/api/auth/sign-in',{...Object.fromEntries(new FormData(e.currentTarget)),captchaToken:captcha||undefined});const d=await r.json();if(r.ok)location.assign('/members');else setMessage(d.error);}
  catch{setMessage('Sign-in is temporarily unavailable.');}
  finally{setBusy(false);setCaptcha('');setResetVersion(x=>x+1);}
 }
 return <AuthShell eyebrow="Welcome to LV Zion" title="Good to see you." lede="Sign in with your email and password, or an existing invitation username."
  after={<p className="lvz-auth-foot">A quiet place for your community to connect.</p>}>
  <form className="lvz-auth-form" onSubmit={submit}>
   <label className="ui-field">Username or email<input className="ui-input" name="identifier" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} placeholder="you@example.com" required/></label>
   <label className="ui-field">Password<input className="ui-input" name="password" type="password" autoComplete="current-password" maxLength={256} placeholder="Password" required/></label>
   <a className="ui-link lvz-auth-forgot" href="/reset-password">Forgot your password?</a>
   {captchaRequired&&<CaptchaChallenge siteKey={siteKey} onToken={setCaptcha} onError={()=>setMessage('Verification unavailable. Reload and try again.')} resetVersion={resetVersion}/>}
   <button className="ui-button ui-button-block" disabled={busy||(captchaRequired&&!captcha)}>{busy?'Signing in…':<>Sign in <ArrowRight size={20}/></>}</button>
  </form>
  {message&&<p role="status" className="ui-notice">{message}</p>}
  <p className="lvz-auth-alt">New here? <a className="ui-link" href="/sign-up">Create an account</a></p>
  <p className="lvz-auth-alt"><a className="ui-link" href="/request-access">Access an existing member record</a></p>
 </AuthShell>;
}
