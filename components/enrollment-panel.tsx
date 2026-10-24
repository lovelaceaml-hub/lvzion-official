'use client';
import {useRef,useState} from 'react';
import type {Command,Workspace} from '../lib/contracts';
import PlacementPicker from './placement-picker';
export default function EnrollmentPanel({data:w,execute,demo=false}:{data:Workspace;execute:(c:Command)=>Promise<void>;demo?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const retry=useRef<{body:string;id:string}|null>(null);
 async function submit(e:React.FormEvent<HTMLFormElement>,action:'enrollment.assign'|'enrollment.reject',memberId:string){
  e.preventDefault();const payload={...Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>,memberId};
  const body=JSON.stringify({action,payload});if(retry.current?.body!==body)retry.current={body,id:crypto.randomUUID()};
  setBusy(true);setMessage('');try{await execute({action,payload,requestId:retry.current.id});retry.current=null;setMessage(demo?'Fictional decision recorded.':action==='enrollment.assign'?'Member verified and assigned.':'Signup declined. History retained.');}catch(e){setMessage(e instanceof Error?e.message:'Change unavailable. Retry the unchanged form.');}finally{setBusy(false);}
 }
 if(!w.permissions.organization)return null;
 return <section className="member-card"><h2>Unassigned members</h2><p>Confirm the person is a member and check for an existing record. Email confirmation proves ownership of the address. It does not verify church membership.</p>
 {message&&<p role="status" className="member-message">{message}</p>}
 {(w.unassignedMembers??[]).map(m=>{return <article className="sub-card" key={m.id}><strong>{m.name}</strong>{m.firstName&&m.lastName&&<p>Submitted first name: <strong>{m.firstName}</strong><br/>Submitted last name: <strong>{m.lastName}</strong></p>}<p>{m.email}</p><span className="badge">Unassigned</span>
 <form onSubmit={e=>void submit(e,'enrollment.assign',m.id)}>
 <PlacementPicker data={w} manageableOnly/>
 <label>Membership and identity verified<select name="verified" required defaultValue="no"><option value="no">Not yet verified</option><option value="yes">I independently verified membership and identity</option></select></label>
 <label>Verification and placement reason<input name="reason" required minLength={5} maxLength={500}/></label><button disabled={busy||!(w.units.some(u=>u.canManage)||w.groups.some(g=>g.canManage))}>Verify and assign member</button></form>
 <details><summary>Decline this signup</summary><p>Use this for an unverified person or a duplicate profile. Existing member records stay separate, and the decision is retained.</p><form onSubmit={e=>void submit(e,'enrollment.reject',m.id)}><label>Reason for declining<input name="reason" required minLength={5} maxLength={500}/></label><button className="secondary" disabled={busy}>Decline signup</button></form></details></article>;})}
 {!w.unassignedMembers?.length&&<p>No members are waiting for initial placement.</p>}
 </section>;
}
