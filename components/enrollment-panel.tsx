'use client';
import {useRef,useState} from 'react';
import type {Command,Workspace} from '../lib/contracts';
import PlacementPicker from './placement-picker';
import {EmptyState,IconBox,Row,SectionHeader,Tag,initialsOf} from './ui-kit';
import {UsersRound} from './home-icons';
/** Atlas organization-placement: a member summary card, then the placement fields and one primary action. */
export default function EnrollmentPanel({data:w,execute,demo=false}:{data:Workspace;execute:(c:Command)=>Promise<void>;demo?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const retry=useRef<{body:string;id:string}|null>(null);
 async function submit(e:React.FormEvent<HTMLFormElement>,action:'enrollment.assign'|'enrollment.reject',memberId:string){
  e.preventDefault();const payload={...Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>,memberId};
  const body=JSON.stringify({action,payload});if(retry.current?.body!==body)retry.current={body,id:crypto.randomUUID()};
  setBusy(true);setMessage('');try{await execute({action,payload,requestId:retry.current.id});retry.current=null;setMessage(demo?'Fictional decision recorded.':action==='enrollment.assign'?'Member verified and assigned.':'Signup declined. History retained.');}catch(e){setMessage(e instanceof Error?e.message:'Change unavailable. Retry the unchanged form.');}finally{setBusy(false);}
 }
 if(!w.permissions.organization)return null;
 const waiting=w.unassignedMembers??[];
 return <section className="member-card member-enrollment" aria-labelledby="enrollment-title"><SectionHeader id="enrollment-title" title="Unassigned members" note={waiting.length?waiting.length+' waiting':undefined}/>
  {message&&<p role="status" className="ui-notice member-message">{message}</p>}
 {waiting.map(m=><article className="member-enrollee" key={m.id} aria-label={m.name}>
  <div className="ui-glass ui-glass-tight"><Row lead={<IconBox>{initialsOf(m.name)}</IconBox>} title={m.name} detail={m.email??'Unassigned'} end={<Tag>Review</Tag>}/>
   {m.firstName&&m.lastName&&<dl className="ui-pairs"><dt>First name</dt><dd>{m.firstName}</dd><dt>Last name</dt><dd>{m.lastName}</dd></dl>}</div>
  <form className="ui-glass" onSubmit={e=>void submit(e,'enrollment.assign',m.id)}>
   <PlacementPicker data={w} manageableOnly/>
   <label>Membership and identity verified<select name="verified" required defaultValue="no"><option value="no">Not yet verified</option><option value="yes">I independently verified membership and identity</option></select></label>
   <label>Verification and placement reason<input name="reason" required minLength={5} maxLength={500} placeholder="Record the verified placement context"/></label><button className="member-primary" disabled={busy||!w.units.some(u=>u.canManage)}>Verify and assign member</button>
   <p className="fine-print">Confirm the person is a member and check for an existing record. Email confirmation proves ownership of the address. It does not verify church membership.</p>
  </form>
  <details className="member-disclosure ui-glass ui-glass-tight"><summary>Decline this signup</summary><p className="member-quiet">Use this for an unverified person or a duplicate profile. Existing member records stay separate, and the decision is retained.</p><form onSubmit={e=>void submit(e,'enrollment.reject',m.id)}><label>Reason for declining<input name="reason" required minLength={5} maxLength={500}/></label><button className="secondary" disabled={busy}>Decline signup</button></form></details>
 </article>)}
 {!waiting.length&&<div className="ui-glass ui-glass-tight"><EmptyState icon={<UsersRound/>} title="No members are waiting for initial placement.">New signups appear here after they confirm their email.</EmptyState></div>}
 </section>;
}
