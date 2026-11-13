'use client';
import {useState,type FormEvent} from 'react';
import {MAX_PARTY} from '../../lib/concert/domain';

export default function GuestRsvp({invite}:{invite:string}){
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[party,setParty]=useState(1);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState<{existing:boolean;emailed:boolean;email:string}|null>(null);
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{
   const response=await fetch('/api/concert/rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({invite,name,email,phone,partySize:party})});
   const data=await response.json().catch(()=>null);
   if(!response.ok)throw Error(typeof data?.error==='string'?data.error:'Your RSVP could not be saved. Please try again.');
   if(!data.existing&&typeof data.ticketPath==='string'&&data.ticketPath.startsWith('/concert/ticket/')){window.location.assign(data.ticketPath+(data.emailed?'?sent=1':''));return;}
   setDone({existing:data.existing===true,emailed:data.emailed===true,email});
  }catch(x){setError(x instanceof Error?x.message:'Your RSVP could not be saved.');}
  finally{setBusy(false);}
 }
 if(done)return <section className="cc-form" role="status">
  <h2>You are already on the list</h2>
  <p className="cc-hint">{done.emailed?`We sent your ticket again to ${done.email}. Check your inbox and spam folder.`:`${done.email} already has a ticket. Look for the ticket email we sent earlier.`}</p>
 </section>;
 return <form className="cc-form" onSubmit={submit}>
  <h2>RSVP for your free ticket</h2>
  <label className="ui-field"><span>Full name</span><input className="ui-input" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
  <label className="ui-field"><span>Email</span><input className="ui-input" type="email" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
  <label className="ui-field"><span>Phone (optional)</span><input className="ui-input" type="tel" maxLength={30} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
  <label className="ui-field"><span>How many people, including you</span><select className="ui-input" value={party} onChange={e=>setParty(Number(e.target.value))}>{Array.from({length:MAX_PARTY},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
  <button className="ui-button ui-button-block" disabled={busy}>{busy?'Saving…':'Get my ticket'}</button>
  {error?<p className="cc-error" role="alert">{error}</p>:null}
  <p className="cc-hint">Your ticket with its QR code appears right away and is emailed to you. Your details are only used for this concert.</p>
 </form>;
}
