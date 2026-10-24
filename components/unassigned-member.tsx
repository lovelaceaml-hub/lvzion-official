'use client';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import type {Workspace} from '../lib/contracts';
import './members.css';
import AppHeader from './app-header';
import {FrameControls} from './app-frame';
import {postJson} from '../lib/post-json';
export default function UnassignedMember({data:w,demo=false}:{data:Workspace;demo?:boolean}){
 const [message,setMessage]=useState('');
 const onProfile=usePathname()!=='/members';
 return <main className="members-app unassigned-profile"><FrameControls module={null} title={onProfile?'Profile':undefined} left={{label:'My Week',icon:'calendar',href:'/members'}} right={{label:'Profile',icon:'user',href:'/members/manage?tab=profile',active:onProfile}}/><AppHeader homeHref="/members"><span className="badge">Unassigned</span></AppHeader>
 {demo&&<p className="demo-note">Fictional preview. No account, email, or database changes.</p>}
 <section className="member-welcome"><span className="overline">Email confirmed</span><h1>Welcome, {w.self.firstName??w.self.name.split(' ')[0]}.</h1><p>Your account is ready. An authorized leader will verify your membership and choose your placement.</p></section>
 <section className="member-card"><h2>My placement</h2><dl className="unassigned-placement"><div><dt>Age category</dt><dd>Unassigned</dd></div><div><dt>Group</dt><dd>Unassigned</dd></div><div><dt>Unit</dt><dd>Unassigned</dd></div></dl><p>You can already open the approved apps from Apps. Your group directory and leadership tools become available after you are placed or appointed.</p></section>
 <section className="member-card"><h2>My profile</h2><p><strong>{w.self.name}</strong></p>{w.self.firstName&&w.self.lastName&&<dl className="unassigned-placement"><div><dt>First name</dt><dd>{w.self.firstName}</dd></div><div><dt>Last name</dt><dd>{w.self.lastName}</dd></div></dl>}<p>{w.contacts.email}</p><p className="fine-print">Only you and authorized membership leaders can see your pending profile. If a record already exists for you, ask your leader to resolve it before assigning this profile.</p></section>
 <section className="member-card"><h2>My history</h2>{w.audit.map(e=><article className="audit-row" key={e.id}><strong>{e.action==='enrollment.created'?'Email confirmed, awaiting placement':e.action.replaceAll('.',' / ')}</strong><p>{e.reason}</p></article>)}{!w.audit.length&&<p>No changes recorded yet.</p>}</section>
 {!demo&&<button onClick={async()=>{try{const r=await postJson('/api/auth/sign-out',{});if(r.ok)location.assign('/sign-in');else setMessage('Sign-out failed. Please try again.');}catch{setMessage('Connection unavailable. Please try again.');}}}>Sign out</button>}{message&&<p role="status">{message}</p>}
 </main>;
}
