'use client';
import {useId,useState} from 'react';
import type {Workspace} from '../lib/contracts';
import {groupPath,unitPath} from '../lib/organization';
export default function LeadershipForm({data:w,busy,onSubmit}:{data:Workspace;busy:boolean;onSubmit:(e:React.FormEvent<HTMLFormElement>)=>void}){
 const prefix=useId();
 const [memberId,setMemberId]=useState(''),[role,setRole]=useState('unit_leader'),[scope,setScope]=useState({member:'',unit:'',group:''});
 const members=w.managedMembers.filter(p=>p.id!==w.self.id&&p.status==='active');
 const member=members.find(m=>m.id===memberId);
 // Leadership is independent of the member's own placement: any active unit or group may be chosen.
 // The member's own unit and group are only the starting choice.
 const chosen=scope.member===memberId?scope:{member:memberId,unit:member?.unitId??'',group:member?.groupId??''};
 const unit=w.units.find(u=>u.id===chosen.unit),group=w.groups.find(g=>g.id===chosen.group);
 return <form onSubmit={onSubmit}><label htmlFor={prefix+'-member'}>Member</label><select id={prefix+'-member'} name="memberId" required value={member?.id??''} onChange={e=>setMemberId(e.target.value)}><option value="">Choose an active member</option>{members.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
 <label htmlFor={prefix+'-role'}>Role</label><select id={prefix+'-role'} name="role" value={role} onChange={e=>setRole(e.target.value)}><option value="unit_leader">Unit leader</option><option value="group_leader">Group leader</option><option value="pastoral_staff">Pastoral staff</option><option value="member_administrator">Member administrator</option></select>
 {role==='unit_leader'&&<><label htmlFor={prefix+'-unit'}>Unit scope</label><select id={prefix+'-unit'} name="unitId" required value={unit?.id??''} onChange={e=>setScope({...chosen,unit:e.target.value})}><option value="">Choose the unit they lead</option>{w.units.map(u=><option key={u.id} value={u.id}>{unitPath(w,u.id)}</option>)}</select></>}
 {role==='group_leader'&&<><label htmlFor={prefix+'-group'}>Group scope</label><select id={prefix+'-group'} name="groupId" required value={group?.id??''} onChange={e=>setScope({...chosen,group:e.target.value})}><option value="">Choose the group they lead</option>{w.groups.map(g=><option key={g.id} value={g.id}>{groupPath(w,g.id)}</option>)}</select></>}
 {!members.length&&<p>No other active members are available. Verify and assign members before appointing leaders.</p>}
 <label>Reason for this change<input name="reason" required minLength={5} maxLength={500}/></label><button disabled={busy||!members.length}>Record appointment</button>
 <p className="fine-print">A leader can lead a group or unit outside their own placement. Appointments continue until an authorized person ends them.</p></form>;
}
