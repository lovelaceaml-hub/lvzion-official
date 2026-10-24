'use client';
/** A new member's own profile while they wait for placement (Atlas main-profile, base palette). */
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import type {Workspace} from '../lib/contracts';
import './members.css';
import {FrameControls} from './app-frame';
import {postJson} from '../lib/post-json';
import {Glass,IconBox,PageHeading,Row,SectionHeader,Tag,initialsOf} from './ui-kit';
import {Contrast,FileText} from './home-icons';
export default function UnassignedMember({data:w,demo=false}:{data:Workspace;demo?:boolean}){
 const [message,setMessage]=useState('');
 const onProfile=usePathname()!=='/members';
 return <main className="members-app unassigned-profile"><FrameControls module={null} title={onProfile?'Profile':undefined} left={{label:'My Week',icon:'calendar',href:'/members'}} right={{label:'Profile',icon:'user',href:'/members/manage?tab=profile',active:onProfile}}/>
 {demo&&<p className="demo-note">Fictional preview. No account, email, or database changes.</p>}
 <PageHeading eyebrow="Email confirmed" title={`Welcome, ${w.self.firstName??w.self.name.split(' ')[0]}.`} lede="An authorized leader will verify your membership and choose your placement."/>
 <div className="member-view">
 <Glass className="member-identity"><span className="member-avatar" aria-hidden="true">{initialsOf(w.self.name)}</span><h2 className="member-identity-name">{w.self.name}</h2>{w.contacts.email&&<p>{w.contacts.email}</p>}<Tag tone="warning">Unassigned</Tag></Glass>
 <Glass className="member-card" aria-labelledby="unassigned-placement-title"><SectionHeader id="unassigned-placement-title" title="My placement"/><dl className="unassigned-placement ui-pairs"><div><dt>Age category</dt><dd>Unassigned</dd></div><div><dt>Group</dt><dd>Unassigned</dd></div><div><dt>Unit</dt><dd>Unassigned</dd></div></dl><p className="member-quiet">You can already open the approved apps from Apps. Your group directory and leadership tools become available after you are placed or appointed.</p></Glass>
 <Glass className="member-card" aria-labelledby="unassigned-profile-title"><SectionHeader id="unassigned-profile-title" title="My profile"/>{w.self.firstName&&w.self.lastName?<dl className="unassigned-placement ui-pairs"><div><dt>First name</dt><dd>{w.self.firstName}</dd></div><div><dt>Last name</dt><dd>{w.self.lastName}</dd></div></dl>:<p><strong>{w.self.name}</strong></p>}<p className="fine-print">Only you and authorized membership leaders can see your pending profile. If a record already exists for you, ask your leader to resolve it before assigning this profile.</p></Glass>
 <Glass tight><ul className="ui-list"><li><Row href="/appearance" lead={<IconBox><Contrast size={22}/></IconBox>} title="Appearance" detail="Light, dark or match this device"/></li></ul></Glass>
 <Glass className="member-card member-audit" aria-labelledby="unassigned-history-title"><SectionHeader id="unassigned-history-title" title="My history"/>{w.audit.length?<ul className="ui-list">{w.audit.map(e=><li className="audit-row" key={e.id}><IconBox><FileText size={20}/></IconBox><span className="ui-row-body"><strong>{e.action==='enrollment.created'?'Email confirmed, awaiting placement':e.action.replaceAll('.',' / ')}</strong><small>{e.reason}</small></span></li>)}</ul>:<p className="member-quiet">No changes recorded yet.</p>}</Glass>
 {!demo&&<button type="button" className="ui-button ui-button-secondary ui-button-block member-cta" onClick={async()=>{try{const r=await postJson('/api/auth/sign-out',{});if(r.ok)location.assign('/sign-in');else setMessage('Sign-out failed. Please try again.');}catch{setMessage('Connection unavailable. Please try again.');}}}>Sign out</button>}{message&&<p role="status" className="ui-notice">{message}</p>}
 </div>
 </main>;
}
