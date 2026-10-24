'use client';
import {useState} from 'react';
import type {Capability,Workspace} from '../../lib/gospel-planning/contract';
import {MapPin,Plus,ShieldCheck,UsersRound} from '../home-icons';
import {IconBox,Row,Segmented,Tag,initialsOf} from '../ui-kit';
import {Callout,Empty,Section,type Send} from './shared';

const roleLabel:Record<Capability,string>={publish:'Publisher',schedule:'Scheduler',oversee:'Overseer'};
const roleHelp:Record<Capability,string>={
 publish:'A current group leader who may publish the group plan.',
 schedule:'May plan sessions for a whole group or one unit.',
 oversee:'Answers Requests for Overseer sent from one group.'};
type View='places'|'roles';

/** Setup for module managers (Atlas mission-manage): a pill control over glass list and form cards.
 * Being a manager does not open plans, updates, requests or sessions. */
export default function Manage({data,send,busy}:{data:Workspace;send:Send;busy:boolean}){
 const m=data.manage;
 const [view,setView]=useState<View>('places');
 const [label,setLabel]=useState(''),[memberId,setMemberId]=useState(''),[capability,setCapability]=useState<Capability>('schedule'),[groupId,setGroupId]=useState(''),[unitId,setUnitId]=useState('');
 if(!m)return null;
 const member=m.members.find(x=>x.id===memberId);
 // Publish and schedule may cover a group the member leads by appointment, not only their own group.
 const roleGroup=capability!=='oversee'&&groupId?m.groups.find(g=>g.id===groupId):m.groups.find(g=>g.id===member?.groupId);
 const scheduleUnits=roleGroup?.units??[];
 return <div className="gp-tab-body">
  <Callout icon={<ShieldCheck size={22}/>} title="Setup only">Managing this app does not open any group plan, member update, request or session.</Callout>
  <Segmented label="Manage view" className="gp-manage-switch" value={view} onChange={setView}
   options={[['places','Places'],['roles','Roles']] as const}/>

  {view==='places'&&<>
   <Section title="Approved meeting places" note="Sessions can be planned only at places listed here. Use public meeting places, not home addresses.">
    {m.locations.length?<ul className="ui-list">{m.locations.map(l=><li key={l.id}><Row lead={<IconBox><MapPin size={22}/></IconBox>} title={l.label}
     end={<button type="button" className="ui-button ui-button-quiet gp-row-action" disabled={busy} onClick={()=>{if(window.confirm('Stop offering '+l.label+' for new sessions?'))void send('location.retire',{id:l.id});}}>Retire</button>}/></li>)}</ul>
     :<Empty icon={<MapPin/>} title="No places yet">Add the first one to let members plan sessions.</Empty>}
   </Section>
   <Section title="Add a place" className="gp-form-card">
    <form className="gp-form" onSubmit={async e=>{e.preventDefault();if(await send('location.add',{label}))setLabel('');}}>
     <label className="ui-field">New place<input className="ui-input" required minLength={2} maxLength={120} placeholder="A public meeting place" value={label} onChange={e=>setLabel(e.target.value)}/></label>
     <button className="ui-button ui-button-block" disabled={busy}><Plus size={20}/>Add place</button>
    </form>
   </Section>
  </>}

  {view==='roles'&&<>
   <Section title="Gospel roles" note="Leadership comes from member appointments. These roles add Gospel Planning authority on top.">
    {m.grants.length?<ul className="ui-list">{m.grants.map(g=><li key={g.id}><Row lead={<IconBox round>{initialsOf(g.member)}</IconBox>}
     title={g.member+' · '+roleLabel[g.capability]} detail={<>{g.group}{g.unit?' · '+g.unit:''}{g.effective?null:<><br/><Tag tone="warning">Not active now</Tag> Check placement or appointment.</>}</>}
     end={<button type="button" className="ui-button ui-button-quiet gp-row-action" disabled={busy} onClick={()=>{if(window.confirm('End this role for '+g.member+'?'))void send('capability.end',{id:g.id});}}>End</button>}/></li>)}</ul>
     :<Empty icon={<UsersRound/>} title="No Gospel roles yet">Assign Publisher, Scheduler or Overseer below.</Empty>}
   </Section>
   <Section title="Assign a role" className="gp-form-card">
    <form className="gp-form" onSubmit={async e=>{e.preventDefault();
     const payload:Record<string,unknown>={memberId,capability};
     if(groupId&&(capability==='oversee'||groupId!==member?.groupId))payload.groupId=groupId;
     if(capability==='schedule'&&unitId)payload.unitId=unitId;
     if(await send('capability.grant',payload)){setMemberId('');setUnitId('');setGroupId('');}}}>
     <label className="ui-field">Member<select className="ui-input" required value={memberId} onChange={e=>{setMemberId(e.target.value);setUnitId('');}}>
      <option value="">Choose a member with access</option>
      {m.members.map(x=><option key={x.id} value={x.id}>{x.name}{x.group?' · '+x.group:' · not placed'}{x.groupLeader?' · group leader':''}</option>)}</select></label>
     <label className="ui-field">Role<select className="ui-input" value={capability} onChange={e=>setCapability(e.target.value as Capability)}>
      {(['schedule','publish','oversee'] as const).map(c=><option key={c} value={c}>{roleLabel[c]}</option>)}</select></label>
     <p className="gp-fine gp-field-note">{roleHelp[capability]}</p>
     {capability!=='oversee'&&member?.groupId&&<label className="ui-field">Group<select className="ui-input" value={groupId} onChange={e=>{setGroupId(e.target.value);setUnitId('');}}>
      <option value="">Their own group ({member.group})</option>{m.groups.filter(g=>g.id!==member.groupId).map(g=><option key={g.id} value={g.id}>{g.category} · {g.name} (a group they lead)</option>)}</select></label>}
     {capability==='schedule'&&member?.groupId&&<label className="ui-field">Scope<select className="ui-input" value={unitId} onChange={e=>setUnitId(e.target.value)}>
      <option value="">Whole group ({roleGroup?.name??member.group})</option>{scheduleUnits.map(u=><option key={u.id} value={u.id}>{u.name} only</option>)}</select></label>}
     {capability==='oversee'&&<label className="ui-field">Group they oversee<select className="ui-input" required value={groupId} onChange={e=>setGroupId(e.target.value)}>
      <option value="">Choose a group</option>{m.groups.map(g=><option key={g.id} value={g.id}>{g.category} · {g.name}</option>)}</select></label>}
     {capability==='publish'&&member&&!member.groupLeader&&<p className="ui-notice" data-tone="warning">Publisher needs a current group leader appointment.</p>}
     <button className="ui-button ui-button-block" disabled={busy||!memberId}>Assign role</button>
    </form>
   </Section>
  </>}
 </div>;
}
