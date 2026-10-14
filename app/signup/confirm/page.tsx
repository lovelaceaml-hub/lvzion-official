'use client';
import {useEffect,useRef,useState} from 'react';
import '../../../components/members.css';
export default function ConfirmSignup(){
 const code=useRef<string|null>(null);const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[signIn,setSignIn]=useState(false);
 useEffect(()=>{code.current=new URLSearchParams(location.search).get('code');history.replaceState(null,'',location.pathname);setReady(!!code.current);},[]);
 return <main className="auth-box"><small>LV ZION OFFICIAL</small><h1>Confirm your email.</h1><p>Confirm only if you created this account. Your profile will start with age category, group, and unit Unassigned.</p>
 <button disabled={!ready||busy} onClick={async()=>{setBusy(true);try{const r=await fetch('/api/auth/signup-confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code.current})});const d=await r.json();if(r.ok)location.replace('/members');else {setMessage(d.error);setSignIn(d.next==='/sign-in');}}catch{setMessage('Connection unavailable. Try again.');}finally{setBusy(false);}}}>{busy?'Confirming...':'Confirm and create my profile'}</button>
 {!ready&&<p>Open the newest confirmation email in the browser where you signed up.</p>}{message&&<p role="status">{message}</p>}{signIn&&<p><a href="/sign-in">Sign in to finish my profile</a></p>}<p><a href="/sign-in">Return to sign in</a></p></main>;
}
