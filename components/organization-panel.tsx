'use client';
import {useRef,useState} from 'react';
import type {Action,Command,Entry,Workspace} from '../lib/contracts';
import {groupPath,unitPath} from '../lib/organization';

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
 return <section className="member-card organization-panel" aria-label="Organization setup"><h2>Age categories, groups and units</h2>
 <p>Open an age category to see its groups and units. Members stay Unassigned until you verify and place them.</p>
 <dl className="organization-totals"><div><dt>Age categories</dt><dd>{w.categories.length}</dd></div><div><dt>Groups</dt><dd>{w.groups.length}</dd></div><div><dt>Units</dt><dd>{w.units.length}</dd></div></dl>
 {message&&<p ref={status} role="status" tabIndex={-1} className="member-message">{message}</p>}
 <details className="organization-add"><summary>Add an age category</summary><CreateEntry kind="category" title="New age category" busy={busy} run={run}/></details>
 {!w.categories.length&&<p>No age categories yet. Add one, then add its groups and units.</p>}
 {w.categories.map(category=>{const groups=w.groups.filter(g=>g.parentId===category.id);const unitCount=w.units.filter(u=>groups.some(g=>g.id===u.parentId)).length;return <details className="organization-category" key={category.id}>
 <summary><span>{category.name}</span><small>{groups.length} groups · {unitCount} units</small></summary>
 <EntryEditor entry={category} kind="category" path={category.name} busy={busy} run={run}/>
 <details><summary>Add a group to {category.name}</summary><CreateEntry kind="group" parentId={category.id} title={'New group in '+category.name} busy={busy} run={run}/></details>
 {!groups.length&&<p>No groups in this age category yet.</p>}
 {groups.map(group=>{const units=w.units.filter(u=>u.parentId===group.id);const path=groupPath(w,group.id);return <article className="organization-group" key={group.id} aria-label={path}>
 <div className="section-heading"><h3>{group.name}</h3><span className="badge">{units.length} units</span></div>
 <EntryEditor entry={group} kind="group" path={path} busy={busy} run={run}/>
 <ul className="organization-units">{units.map(unit=><li key={unit.id}><strong>{unit.name}</strong><EntryEditor entry={unit} kind="unit" path={unitPath(w,unit.id)} busy={busy} run={run}/></li>)}</ul>
 {!units.length&&<p>No units yet. Add one before assigning members here.</p>}
 <details><summary>Add a unit to {group.name}</summary><CreateEntry kind="unit" parentId={group.id} title={'New unit in '+path} busy={busy} run={run}/></details>
 </article>;})}</details>;})}
 </section>;
}
function CreateEntry({kind,parentId,title,busy,run}:{kind:Kind;parentId?:string;title:string;busy:boolean;run:Run}){
 return <form aria-label={title} onSubmit={e=>void run(e,'organization.create',{kind,...(parentId?{parentId}:{})})}><fieldset disabled={busy}><legend>{title}</legend><label>Name<input name="name" required minLength={2} maxLength={80}/></label><Reason/><button type="submit">{kind==='category'?'Create age category':kind==='group'?'Create group':'Create unit'}</button></fieldset></form>;
}
function EntryEditor({entry,kind,path,busy,run}:{entry:Entry;kind:Kind;path:string;busy:boolean;run:Run}){
 return <details className="organization-editor"><summary>Rename or archive {path}</summary>
 <form aria-label={'Rename '+path} onSubmit={e=>void run(e,'organization.rename',{id:entry.id,kind})}><fieldset disabled={busy}><legend>Rename {entry.name}</legend><label>New name<input key={entry.name} name="name" defaultValue={entry.name} required minLength={2} maxLength={80}/></label><Reason/><button type="submit">Save name</button></fieldset></form>
 <details><summary>Archive this {kind==='category'?'age category':kind}</summary><p>Only empty entries can be archived. Move members and remove active child entries or appointments first. History is retained.</p><form aria-label={'Archive '+path} onSubmit={e=>void run(e,'organization.archive',{id:entry.id,kind})}><fieldset disabled={busy}><legend>Archive {entry.name}</legend><Reason/><button type="submit" className="secondary">Archive empty entry</button></fieldset></form></details>
 </details>;
}
function Reason(){return <label>Reason for this change<input name="reason" required minLength={5} maxLength={500}/></label>;}
