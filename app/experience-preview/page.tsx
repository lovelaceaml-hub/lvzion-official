'use client';
import {useState} from 'react';
import MemberHome from '../../components/member-home';
import {demoWorkspace,id,initialDemo}from'../../lib/demo';
import '../../components/members.css';
export default function ExperiencePreview(){
 const[actor,setActor]=useState(id(4,105));
 const[demo,setDemo]=useState(initialDemo);
 let workspace;
 try{workspace=demoWorkspace(demo,actor);}catch(e){
  return <main className="auth-box"><h1>Account unavailable</h1><p role="status">{(e as Error).message}</p>
    <button type="button" onClick={()=>{setActor(id(4,105));setDemo(initialDemo());}}>Return to fictional preview</button></main>;
 }
 return <><div className="demo-selector"><label>Preview a fictional member role<select aria-label="Fictional home identity" value={actor} onChange={e=>setActor(e.target.value)}>
  {demo.people.map(p=><option key={p.id} value={p.id}>{p.name} · {demo.roles.filter(r=>r.memberId===p.id&&!r.endedAt).map(r=>r.role.replaceAll('_',' ')).join(', ')||p.status}</option>)}
  </select></label></div><MemberHome key={actor} workspace={workspace} demo manageHref="/member-preview"/></>;
}
