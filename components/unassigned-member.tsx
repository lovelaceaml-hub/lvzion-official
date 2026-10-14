'use client';
import {useState} from 'react';
import type {Workspace} from '../lib/contracts';
import './members.css';
export default function UnassignedMember({data:w,demo=false}:{data:Workspace;demo?:boolean}){
 const [message,setMessage]=useState('');
 return <main className="members-app unassigned-profile"><header className="members-header"><a className="members-brand" href="/">LV ZION<span>MY PROFILE</span></a><span className="badge">Unassigned</span></header>
 {demo&&<p className="demo-note">Fictional preview. No account, email, or database changes.</p>}
 <section className="member-welcome"><span className="overline">EMAIL CONFIRMED</span><h1>Welcome, {w.self.name.split(' ')[0]}.</h1><p>Your account is ready. An authorized leader will verify your membership and choose your placement.</p></section>
 <section className="member-card"><h2>My placement</h2><dl className="unassigned-placement"><div><dt>Age category</dt><dd>Unassigned</dd></div><div><dt>Group</dt><dd>Unassigned</dd></div><div><dt>Unit</dt><dd>Unassigned</dd></div></dl><p>Group directories, schedules, apps, and leadership tools become available only when you have the required access.</p></section>
 <section className="member-card"><h2>My profile</h2><p><strong>{w.self.name}</strong></p><p>{w.contacts.email}</p><p className="fine-print">Only you and authorized membership leaders can see your pending profile. If a record already exists for you, ask your leader to resolve it before assigning this profile.</p></section>
 <section className="member-card"><h2>My history</h2>{w.audit.map(e=><article className="audit-row" key={e.id}><strong>{e.action==='enrollment.created'?'Email confirmed, awaiting placement':e.action.replaceAll('.',' / ')}</strong><p>{e.reason}</p></article>)}{!w.audit.length&&<p>No changes recorded yet.</p>}</section>
 {!demo&&<button onClick={async()=>{try{const r=await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok)location.assign('/sign-in');else setMessage('Sign-out failed. Please try again.');}catch{setMessage('Connection unavailable. Please try again.');}}}>Sign out</button>}{message&&<p role="status">{message}</p>}
 </main>;
}
