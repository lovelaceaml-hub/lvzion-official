'use client';
import {useRef,useState} from 'react';
import type {Action,Command,Entry,Workspace} from '../lib/contracts';
import {groupPath,unitPath} from '../lib/organization';
import {initialsOf} from './ui-kit';

type Kind='category'|'group'|'unit';
type Run=(e:React.FormEvent<HTMLFormElement>,action:Action,extra:Record<string,string>)=>Promise<void>;
export default function OrganizationPanel({data:w,execute}:{data:Workspace;execute:(c:Command)=>Promise<void>}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const inFlight=useRef(false),retry=useRef<{body:string;id:string}|null>(null);
 const status=useRef<HTMLParagraphElement>(null);
 async function run(e:React.FormEvent<HTMLFormElement>,action:Action,extra:Record<string,string>){
  e.preventDefault();if(inFlight.current)return;
  const form=e.currentTarget,payload={...Object.fromEntries(new FormData(form)) as Record<string,string>,...extra};
  const body=JSON.stringify({action,payload});if(retry.current?.body!==body)retry.current={body,id:crypto.randomUUID()};
  inFlight.current=true;setBusy(true);setMessage('');
  try{await execute({action,payload,requestId:retry.current.id});retry.current=null;if(action==='organization.create')form.reset();setMessage(action==='organization.archive'?'Entry archived. History retained.':action==='organization.rename'?'Name updated. Existing placements are preserved.':'Entry created.');}
  catch(error){setMessage(error instanceof Error?error.message:'The change could not be saved. Retry the unchanged form.');}
  finally{inFlight.current=false;setBusy(false);requestAnimationFrame(()=>status.current?.focus());}
 }
 if(!w.permissions.organization)return null;
 return <section className="member-card organization-panel" aria-label="Organization setup"><div className="ui-section-head"><h2>Age categories, groups and units</h2></div>
 <p className="member-quiet">Open an age category to see its groups and units. Members stay Unassigned until you verify and place them.</p>
 <dl className="organization-totals"><div className="ui-stat"><dt>Age categories</dt><dd>{w.categories.length}</dd></div><div className="ui-stat"><dt>Groups</dt><dd>{w.groups.length}</dd></div><div className="ui-stat"><dt>Units</dt><dd>{w.units.length}</dd></div></dl>
 {message&&<p ref={status} role="status" tabIndex={-1} className="ui-notice member-message">{message}</p>}
 <details className="organization-add member-disclosure ui-glass ui-glass-tight"><summary>Add an age category</summary><CreateEntry kind="category" title="New age category" busy={busy} run={run}/></details>
 {!w.categories.length&&<div className="ui-glass ui-glass-tight"><p className="member-quiet member-pad">No age categories yet. Add one, then add its groups and units.</p></div>}
 {w.categories.map(category=>{const groups=w.groups.filter(g=>g.parentId===category.id);const unitCount=w.units.filter(u=>groups.some(g=>g.id===u.parentId)).length;return <details className="organization-category ui-glass" key={category.id}>
 <summary><span className="ui-icon-box" aria-hidden="true">{initialsOf(category.name)}</span><span className="organization-summary"><span>{category.name}</span><small>{groups.length} groups · {unitCount} units</small></span></summary>
 <EntryEditor entry={category} kind="category" path={category.name} busy={busy} run={run}/>
 <details className="member-disclosure"><summary>Add a group to {category.name}</summary><CreateEntry kind="group" parentId={category.id} title={'New group in '+category.name} busy={busy} run={run}/></details>
 {!groups.length&&<p className="member-quiet">No groups in this age category yet.</p>}
 {groups.map(group=>{const units=w.units.filter(u=>u.parentId===group.id);const path=groupPath(w,group.id);return <article className="organization-group" key={group.id} aria-label={path}>
 <div className="ui-section-head"><h3>{group.name}</h3><span className="ui-tag">{units.length} units</span></div>
 <EntryEditor entry={group} kind="group" path={path} busy={busy} run={run}/>
 <ul className="organization-units">{units.map(unit=><li key={unit.id}><span className="organization-unit"><span className="ui-icon-box" aria-hidden="true">{initialsOf(unit.name)}</span><strong>{unit.name}</strong></span><EntryEditor entry={unit} kind="unit" path={unitPath(w,unit.id)} busy={busy} run={run}/></li>)}</ul>
 {!units.length&&<p className="member-quiet">No units yet. Add one before assigning members here.</p>}
 <details className="member-disclosure"><summary>Add a unit to {group.name}</summary><CreateEntry kind="unit" parentId={group.id} title={'New unit in '+path} busy={busy} run={run}/></details>
 </article>;})}</details>;})}
 </section>;
}
function CreateEntry({kind,parentId,title,busy,run}:{kind:Kind;parentId?:string;title:string;busy:boolean;run:Run}){
 return <form aria-label={title} onSubmit={e=>void run(e,'organization.create',{kind,...(parentId?{parentId}:{})})}><fieldset disabled={busy}><legend>{title}</legend><label>Name<input name="name" required minLength={2} maxLength={80}/></label><Reason/><button type="submit">{kind==='category'?'Create age category':kind==='group'?'Create group':'Create unit'}</button></fieldset></form>;
}
function EntryEditor({entry,kind,path,busy,run}:{entry:Entry;kind:Kind;path:string;busy:boolean;run:Run}){
 return <details className="organization-editor member-disclosure"><summary>Rename or archive {path}</summary>
 <form aria-label={'Rename '+path} onSubmit={e=>void run(e,'organization.rename',{id:entry.id,kind})}><fieldset disabled={busy}><legend>Rename {entry.name}</legend><label>New name<input key={entry.name} name="name" defaultValue={entry.name} required minLength={2} maxLength={80}/></label><Reason/><button type="submit">Save name</button></fieldset></form>
 <details className="member-disclosure"><summary>Archive this {kind==='category'?'age category':kind}</summary><p className="member-quiet">Only empty entries can be archived. Move members and remove active child entries or appointments first. History is retained.</p><form aria-label={'Archive '+path} onSubmit={e=>void run(e,'organization.archive',{id:entry.id,kind})}><fieldset disabled={busy}><legend>Archive {entry.name}</legend><Reason/><button type="submit" className="secondary">Archive empty entry</button></fieldset></form></details>
 </details>;
}
function Reason(){return <label>Reason for this change<input name="reason" required minLength={5} maxLength={500}/></label>;}
