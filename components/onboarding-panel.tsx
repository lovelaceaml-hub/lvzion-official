'use client';
import EnrollmentPanel from './enrollment-panel';
import {useRef,useState} from 'react';
import type {Action,Command,Workspace} from '../lib/contracts';
export type InvitationInput={memberId:string;email:string;reason:string;requestId:string};
type Props={data:Workspace;execute:(c:Command)=>Promise<void>;invite:(p:InvitationInput)=>Promise<void>;demo:boolean};
export default function OnboardingPanel({data:w,execute,invite,demo}:Props){
 const [decisions,setDecisions]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const retry=useRef<{body:string;id:string}|null>(null);
 const data=w.onboarding??{requests:[],invitations:[],accounts:[],linkedMemberIds:[]};
 const unlinked=w.managedMembers.filter(m=>m.status==='active'&&!data.linkedMemberIds.includes(m.id));
 async function submit(e:React.FormEvent<HTMLFormElement>,action:Action,extra:Record<string,string>={}){
  e.preventDefault();const payload={...Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>,...extra};
  setBusy(true);setMessage('');try{await execute({action,payload,requestId:crypto.randomUUID()});setMessage(demo?'Fictional operation recorded.':'Operation recorded.');}catch(e){setMessage(e instanceof Error?e.message:'Operation could not be completed.');}finally{setBusy(false);}
 }
 async function deliver(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const p=Object.fromEntries(new FormData(e.currentTarget)) as Omit<InvitationInput,'requestId'>;
  const body=JSON.stringify(p);if(retry.current?.body!==body)retry.current={body,id:crypto.randomUUID()};
  setBusy(true);setMessage('');try{await invite({...p,requestId:retry.current.id});setMessage(demo?'Invitation delivery simulated. No email was sent.':'Invitation accepted by the mail server. Delivery status is recorded below.');retry.current=null;}catch(e){setMessage(e instanceof Error?e.message:'Delivery failed. Retry the unchanged form to reuse the same request.');}finally{setBusy(false);}
 }
 return <>
 <EnrollmentPanel data={w} execute={execute} demo={demo}/>
 {message&&<p role="status" className="member-message">{message}</p>}
 {w.permissions.organization&&<section className="member-card"><h2>Account access requests</h2><p>Verify the person before matching an existing record. Approval alone never signs anyone in.</p>
 {data.requests.filter(r=>r.status==='pending').map(r=><form className="sub-card" key={r.id} onSubmit={e=>void submit(e,'access.review',{id:r.id})}><strong>{r.name}</strong><p>{r.email}</p>
 <label>Decision<select name="decision" value={decisions[r.id]??'approved'} onChange={e=>setDecisions({...decisions,[r.id]:e.target.value})}><option value="approved">Approve after verification</option><option value="rejected">Reject request</option></select></label>
 <label>Existing unlinked member<select name="memberId" required={decisions[r.id]!=='rejected'} disabled={decisions[r.id]==='rejected'}>{unlinked.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
 <label>Identity verified<select name="verified"><option value="no">Not yet verified</option><option value="yes">I independently verified this person's identity</option></select></label><Reason/>
 <button disabled={busy||(!unlinked.length&&decisions[r.id]!=='rejected')}>Record review</button></form>)}
 {!data.requests.some(r=>r.status==='pending')&&<p>No pending requests.</p>}
 {data.requests.filter(r=>r.status!=='pending').slice(0,10).map(r=><div className="simple-row" key={r.id}><span>{r.name}<small className="block">{r.email}</small></span><span className="badge">{r.status}</span></div>)}
 </section>}
 {w.permissions.memberManagement&&<section className="member-card"><h2>Member invitations</h2><p>Invite only a verified person using their own email. Each invitation links one existing member record.</p>
 {!!unlinked.length&&<form onSubmit={e=>void deliver(e)}><label>Existing member<select name="memberId" required>{unlinked.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Verified personal email<input type="email" name="email" maxLength={254} required placeholder={demo?'test-109@example.invalid':'Personal email'}/></label><Reason/>
 <button disabled={busy}>{demo?'Simulate invitation':'Send invitation'}</button><p className="fine-print">If delivery fails, retry the unchanged form. Changing the member, email, or reason creates a new invitation and revokes the previous one.</p></form>}
 {!unlinked.length&&<p>No active unlinked members in your scope.</p>}
 {data.invitations.map(i=><article className="sub-card" key={i.id}><strong>{w.managedMembers.find(m=>m.id===i.memberId)?.name??'Authorized member'}</strong><p>{i.email}</p><span className="badge">{i.consumedAt?'Activated':i.revokedAt?'Revoked':i.delivery}</span><p className="fine-print">Expires {new Date(i.expiresAt).toLocaleString()}</p>{!i.consumedAt&&!i.revokedAt&&<form onSubmit={e=>void submit(e,'invitation.revoke',{id:i.id})}><Reason/><button disabled={busy}>Revoke invitation</button></form>}</article>)}
 </section>}
 {w.permissions.technical&&<section className="member-card"><h2>Sign-in account controls</h2><p>Technical access is separate from membership status. Names, contacts, and ministry details are not added to this account list.</p>
 {data.accounts.map(a=><details key={a.memberId}><summary>{a.username} · {a.enabled?'Enabled':'Suspended'}</summary><form onSubmit={e=>void submit(e,'account.access',{memberId:a.memberId,enabled:a.enabled?'false':'true'})}><Reason/><button disabled={busy||a.memberId===w.self.id}>{a.enabled?'Suspend sign-in access':'Enable fresh sign-in'}</button><p className="fine-print">Self-suspension is blocked. Re-enabling requires a fresh sign-in and does not change church membership status.</p></form></details>)}
 </section>}
 {w.permissions.departmentAdmin&&<section className="member-card"><h2>Department administration</h2><p>These tools require a separately assigned department-administrator appointment.</p>
 <details><summary>Create a department</summary><form onSubmit={e=>void submit(e,'organization.create',{kind:'department'})}><label>Department name<input name="name" required minLength={2} maxLength={80}/></label><Reason/><button disabled={busy}>Create department</button></form></details>
 <details><summary>Appoint a department manager</summary><form onSubmit={e=>void submit(e,'role.appoint',{role:'department_manager'})}><label>Visible member<select name="memberId">{[...new Map([...w.directory,...w.departments.flatMap(d=>d.members)].map(m=>[m.id,m])).values()].filter(m=>m.id!==w.self.id).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><label>Department<select name="departmentId">{w.departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><Reason/><button disabled={busy}>Record department appointment</button></form></details>
 <details><summary>End a department appointment</summary><form onSubmit={e=>void submit(e,'role.end')}><label>Appointment<select name="id">{w.appointments.filter(r=>r.departmentId&&!r.endedAt&&r.memberId!==w.self.id).map(r=><option key={r.id} value={r.id}>{w.departments.find(d=>d.id===r.departmentId)?.name??'Department'} · {r.memberId.slice(-4)}</option>)}</select></label><Reason/><button disabled={busy}>End department appointment</button></form></details>
 </section>}
 {(w.permissions.organization||w.permissions.departmentAdmin)&&<section className="member-card"><h2>Maintain organizational entries</h2><p>Renaming preserves identifiers and history. Archival is blocked while an entry has active children, placements, memberships, or appointments.</p>
 {[...(w.permissions.organization?[...w.categories.map(x=>({...x,kind:'category'})),...w.groups.map(x=>({...x,kind:'group'})),...w.units.map(x=>({...x,kind:'unit'}))]:[]),...(w.permissions.departmentAdmin?w.departments.map(x=>({...x,kind:'department'})):[])].map(x=><details key={x.id}><summary>{x.name} · {x.kind}</summary><form onSubmit={e=>void submit(e,'organization.rename',{id:x.id,kind:x.kind})}><label>New name<input name="name" defaultValue={x.name} required minLength={1} maxLength={80}/></label><Reason/><button disabled={busy}>Rename entry</button></form><form onSubmit={e=>void submit(e,'organization.archive',{id:x.id,kind:x.kind})}><Reason/><button className="secondary" disabled={busy}>Archive empty entry</button></form></details>)}
 </section>}
 </>;
}
function Reason(){return <label>Reason for this change<input name="reason" minLength={5} maxLength={500} required placeholder="Document verification or the change"/></label>;}
