'use client';
import {useState} from 'react';
import MemberHome from '../../components/member-home';
import {demoWorkspace,id,initialDemo}from'../../lib/demo';
import AuthShell from '../../components/auth-shell';
import '../../components/members.css';
export default function ExperiencePreview(){
 const[actor,setActor]=useState(id(4,105));
 const[demo,setDemo]=useState(initialDemo);
 let workspace;
 try{workspace=demoWorkspace(demo,actor);}catch(e){
  return <AuthShell mark={false} eyebrow="Fictional preview" title="Account unavailable"><p role="status" className="ui-notice">{(e as Error).message}</p>
    <button type="button" className="ui-button ui-button-block" onClick={()=>{setActor(id(4,105));setDemo(initialDemo());}}>Return to fictional preview</button></AuthShell>;
 }
 return <><div className="demo-selector"><label>Preview a fictional member role<select aria-label="Fictional home identity" value={actor} onChange={e=>setActor(e.target.value)}>
  {demo.people.map(p=><option key={p.id} value={p.id}>{p.name} · {demo.roles.filter(r=>r.memberId===p.id&&!r.endedAt).map(r=>r.role.replaceAll('_',' ')).join(', ')||p.status}</option>)}
  </select></label></div><MemberHome key={actor} workspace={workspace} demo manageHref="/member-preview"/></>;
}
