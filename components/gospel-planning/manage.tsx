'use client';
import {useState} from 'react';
import type {Capability,Workspace} from '../../lib/gospel-planning/contract';
import {Section,type Send} from './shared';

const roleLabel:Record<Capability,string>={publish:'Publisher',schedule:'Scheduler',oversee:'Overseer'};
const roleHelp:Record<Capability,string>={
 publish:'A current group leader who may publish the group plan.',
 schedule:'May plan sessions for a whole group or one unit.',
 oversee:'Answers Requests for Overseer sent from one group.'};

/** Setup for module managers. Being a manager does not open plans, updates, requests or sessions. */
export default function Manage({data,send,busy}:{data:Workspace;send:Send;busy:boolean}){
 const m=data.manage;
 const [label,setLabel]=useState(''),[memberId,setMemberId]=useState(''),[capability,setCapability]=useState<Capability>('schedule'),[groupId,setGroupId]=useState(''),[unitId,setUnitId]=useState('');
 if(!m)return null;
 const member=m.members.find(x=>x.id===memberId);
 const scheduleUnits=m.groups.find(g=>g.id===member?.groupId)?.units??[];
 return <div className="gp-tab-body">
  <p className="ui-notice">Setup only. Managing this app does not open any group plan, member update, request or session.</p>
  <Section title="Approved meeting places" note="Sessions can be planned only at places listed here. Use public meeting places, not home addresses.">
   {m.locations.length?<ul className="ui-list">{m.locations.map(l=><li key={l.id} className="ui-row"><span className="ui-row-body"><strong>{l.label}</strong></span>
    <button type="button" className="ui-button ui-button-quiet" disabled={busy} onClick={()=>{if(window.confirm('Stop offering '+l.label+' for new sessions?'))void send('location.retire',{id:l.id});}}>Retire</button></li>)}</ul>
    :<p className="ui-hint">No places yet. Add the first one to let members plan sessions.</p>}
   <form className="gp-form gp-inline" onSubmit={async e=>{e.preventDefault();if(await send('location.add',{label}))setLabel('');}}>
    <label className="ui-field">New place<input className="ui-input" required minLength={2} maxLength={120} value={label} onChange={e=>setLabel(e.target.value)}/></label>
    <button className="ui-button" disabled={busy}>Add place</button>
   </form>
  </Section>
  <Section title="Gospel roles" note="Leadership comes from member appointments. These roles add Gospel Planning authority on top.">
   {m.grants.length?<ul className="ui-list">{m.grants.map(g=><li key={g.id} className="ui-row">
    <span className="ui-row-body"><strong>{g.member} · {roleLabel[g.capability]}</strong>
     <small>{g.group}{g.unit?' · '+g.unit:''}{g.effective?'':' · not active now (check placement or appointment)'}</small></span>
    <button type="button" className="ui-button ui-button-quiet" disabled={busy} onClick={()=>{if(window.confirm('End this role for '+g.member+'?'))void send('capability.end',{id:g.id});}}>End</button>
   </li>)}</ul>:<p className="ui-hint">No Gospel roles assigned yet.</p>}
   <form className="gp-form" onSubmit={async e=>{e.preventDefault();
    const payload:Record<string,unknown>={memberId,capability};
    if(capability==='oversee')payload.groupId=groupId;
    if(capability==='schedule'&&unitId)payload.unitId=unitId;
    if(await send('capability.grant',payload)){setMemberId('');setUnitId('');}}}>
    <label className="ui-field">Member<select className="ui-input" required value={memberId} onChange={e=>{setMemberId(e.target.value);setUnitId('');}}>
     <option value="">Choose a member with access</option>
     {m.members.map(x=><option key={x.id} value={x.id}>{x.name}{x.group?' · '+x.group:' · not placed'}{x.groupLeader?' · group leader':''}</option>)}</select></label>
    <label className="ui-field">Role<select className="ui-input" value={capability} onChange={e=>setCapability(e.target.value as Capability)}>
     {(['schedule','publish','oversee'] as const).map(c=><option key={c} value={c}>{roleLabel[c]}</option>)}</select></label>
    <p className="ui-hint">{roleHelp[capability]}</p>
    {capability==='schedule'&&member?.groupId&&<label className="ui-field">Scope<select className="ui-input" value={unitId} onChange={e=>setUnitId(e.target.value)}>
     <option value="">Whole group ({member.group})</option>{scheduleUnits.map(u=><option key={u.id} value={u.id}>{u.name} only</option>)}</select></label>}
    {capability==='oversee'&&<label className="ui-field">Group they oversee<select className="ui-input" required value={groupId} onChange={e=>setGroupId(e.target.value)}>
     <option value="">Choose a group</option>{m.groups.map(g=><option key={g.id} value={g.id}>{g.category} · {g.name}</option>)}</select></label>}
    {capability==='publish'&&member&&!member.groupLeader&&<p className="ui-notice" data-tone="warning">Publisher needs a current group leader appointment.</p>}
    <button className="ui-button" disabled={busy||!memberId}>Assign role</button>
   </form>
  </Section>
 </div>;
}
