'use client';

import {useEffect,useRef,useState} from 'react';
import {forgetConfirmation,pendingConfirmation} from '../../../lib/confirmation-cache';
import '../../../components/members.css';
import {postJson} from '../../../lib/post-json';

const PENDING_KEY='lvz:confirmation:pkce';
export default function ConfirmSignup(){
 const code=useRef<string|null>(null);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [signIn,setSignIn]=useState(false);
 useEffect(()=>{
  const pending=pendingConfirmation(PENDING_KEY,new URLSearchParams(location.search),'code');
  code.current=pending?.code??null;
  history.replaceState(null,'',location.pathname);
  setReady(!!code.current);
 },[]);

 async function confirm(){
  if(busy||!code.current)return;
  setBusy(true);setMessage('');
  try{
   const r=await postJson('/api/auth/signup-confirm',{code:code.current},{credentials:'same-origin',cache:'no-store'});
   const d=await r.json() as {error?:string;next?:string};
   if(r.ok){
    forgetConfirmation(PENDING_KEY);
    location.replace(d.next==='/members'?d.next:'/members');
    return;
   }
   if(r.status>=400&&r.status<500){
    forgetConfirmation(PENDING_KEY);
    code.current=null;
    setReady(false);
   }
   setMessage(d.error??'Confirmation could not be completed. Try signing in.');
   setSignIn(d.next==='/sign-in');
  }catch{setMessage('Connection unavailable. Refresh and try again.');}
  finally{setBusy(false);}
 }

 return <main className="auth-box">
  <small>LV ZION OFFICIAL</small>
  <h1>Confirm your email.</h1>
  <p>Confirm only if you created this account. Your profile will start with age category, group, and unit Unassigned.</p>
  <button type="button" disabled={!ready||busy} onClick={confirm}>{busy?'Confirming…':'Confirm and create my profile'}</button>
  {!ready&&!message&&<p>Open the newest confirmation email in the browser where you signed up.</p>}
  {message&&<p role="alert" aria-live="assertive">{message}</p>}
  {signIn&&<p><a href="/sign-in" onClick={()=>forgetConfirmation(PENDING_KEY)}>Sign in to finish my profile</a></p>}
  <p><a href="/sign-in" onClick={()=>forgetConfirmation(PENDING_KEY)}>Return to sign in</a></p>
 </main>;
}
