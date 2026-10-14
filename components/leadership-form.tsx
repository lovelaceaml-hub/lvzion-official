'use client';
import {useId,useState} from 'react';
import type {Workspace} from '../lib/contracts';
import {groupPath,unitPath} from '../lib/organization';
export default function LeadershipForm({data:w,busy,onSubmit}:{data:Workspace;busy:boolean;onSubmit:(e:React.FormEvent<HTMLFormElement>)=>void}){
 const prefix=useId();
 const [memberId,setMemberId]=useState(''),[role,setRole]=useState('unit_leader');
 const members=w.managedMembers.filter(p=>p.id!==w.self.id&&p.status==='active');
 const member=members.find(m=>m.id===memberId);
 const unit=w.units.find(u=>u.id===member?.unitId),group=w.groups.find(g=>g.id===member?.groupId);
 return <form onSubmit={onSubmit}><label htmlFor={prefix+'-member'}>Member</label><select id={prefix+'-member'} name="memberId" required value={member?.id??''} onChange={e=>setMemberId(e.target.value)}><option value="">Choose an active member</option>{members.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
 <label htmlFor={prefix+'-role'}>Role</label><select id={prefix+'-role'} name="role" value={role} onChange={e=>setRole(e.target.value)}><option value="unit_leader">Unit leader</option><option value="group_leader">Group leader</option><option value="pastoral_staff">Pastoral staff</option><option value="member_administrator">Member administrator</option></select>
 {role==='unit_leader'&&<><label htmlFor={prefix+'-unit'}>Unit scope</label><select id={prefix+'-unit'} name="unitId" required value={unit?.id??''} onChange={()=>{}}><option value="">Place this member in a unit first</option>{unit&&<option value={unit.id}>{unitPath(w,unit.id)}</option>}</select></>}
 {role==='group_leader'&&<><label htmlFor={prefix+'-group'}>Group scope</label><select id={prefix+'-group'} name="groupId" required value={group?.id??''} onChange={()=>{}}><option value="">Place this member in a group first</option>{group&&<option value={group.id}>{groupPath(w,group.id)}</option>}</select></>}
 {!members.length&&<p>No other active members are available. Verify and assign members before appointing leaders.</p>}
 <label>Reason for this change<input name="reason" required minLength={5} maxLength={500}/></label><button disabled={busy||!members.length}>Record appointment</button>
 <p className="fine-print">Unit and group leadership follow the member's current placement. Appointments continue until an authorized person ends them.</p></form>;
}
