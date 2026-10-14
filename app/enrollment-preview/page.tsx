'use client';
import {useState} from 'react';
import UnassignedMember from '../../components/unassigned-member';
import MemberHome from '../../components/member-home';
import MemberWorkspace from '../../components/member-workspace';
import {unassignedPreview,enrollmentLeaderPreview,applyEnrollmentPreview,fictionalEnrollment} from '../../lib/enrollment-demo';
export default function EnrollmentPreview(){const [leader,setLeader]=useState(false),[w,setW]=useState(enrollmentLeaderPreview);const person=w.managedMembers.find(m=>m.id===fictionalEnrollment.id);const own=unassignedPreview();
 return <>
 <div className="demo-selector"><label>Fictional signup lifecycle<select value={leader?'leader':'member'} onChange={e=>setLeader(e.target.value==='leader')}><option value="member">New member: Unassigned</option><option value="leader">Authorized membership leader</option></select></label><button onClick={()=>setW(enrollmentLeaderPreview())}>Reset fictional signup</button><p><a href="/sign-up">View signup form and activation status</a></p></div>
 {leader?<MemberWorkspace data={w} demo execute={async c=>{const result=applyEnrollmentPreview(w,c);setW(result);}}/>:person?.status==='active'?<MemberHome manageHref="/enrollment-preview" workspace={{...own,self:{...person,groupId:person.groupId??null,unitId:person.unitId??null},groups:w.groups.filter(g=>g.id===person.groupId),units:w.units.filter(u=>u.parentId===person.groupId),directory:[person],enrollment:{state:'assigned',placementHistory:[]}}} demo/>:person?.status==='inactive'?<main className="auth-box"><h1>Signup declined.</h1><p>This fictional account no longer has member access. The leader decision remains in history.</p></main>:<UnassignedMember data={own} demo/>}
 </>;}
