'use client';

import {useEffect,useRef,useState} from 'react';
import {forgetConfirmation,pendingConfirmation} from '../../../lib/confirmation-cache';
import '../../../components/members.css';
import {postJson} from '../../../lib/post-json';

const PENDING_KEY='lvz:confirmation:email';
export default function ContinueAuth(){
 const payload=useRef<Record<string,string>|null>(null);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');

 useEffect(()=>{
  const hash=new URLSearchParams(location.hash.slice(1));
  payload.current=pendingConfirmation(PENDING_KEY,hash,'token_hash');
  history.replaceState(null,'',location.pathname);
  setReady(!!payload.current);
 },[]);

 async function confirm(){
  if(busy||!payload.current)return;
  setBusy(true);setMessage('');
  try{
   const r=await postJson('/api/auth/confirm',payload.current,{credentials:'same-origin',cache:'no-store'});
   const d=await r.json() as {next?:string;error?:string};
   if(r.ok&&d.next&&['/activate','/reset-password','/members'].includes(d.next)){
    forgetConfirmation(PENDING_KEY);
    location.replace(d.next);
    return;
   }
   if(r.status>=400&&r.status<500){
    forgetConfirmation(PENDING_KEY);
    payload.current=null;
    setReady(false);
   }
   setMessage(d.error??'Confirmation failed. Try signing in or use the newest email link.');
  }catch{setMessage('Connection failed. Refresh this page and try again.');}
  finally{setBusy(false);}
 }

 return <main className="auth-box">
  <h1>Confirm your request</h1>
  <p>Continue only if you requested signup, account access, or password recovery. This confirmation signs you in to the account associated with the email.</p>
  <button type="button" disabled={!ready||busy} onClick={confirm}>{busy?'Confirming…':'Confirm and continue'}</button>
  {!ready&&!message&&<p>Open the complete link from your current signup, invitation, or recovery email.</p>}
  {message&&<p role="alert" aria-live="assertive">{message}</p>}
  <p><a href="/sign-in" onClick={()=>forgetConfirmation(PENDING_KEY)}>Return to sign in</a></p>
 </main>;
}
