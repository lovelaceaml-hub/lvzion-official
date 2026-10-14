'use client';
import {useEffect,useState} from 'react';
import type {DisplaySlide} from '../lib/continuous-display/live-contract';
import {churchLocal,churchTimeToUtc,offsetForChurchTime} from '../lib/continuous-display/live-contract';
import type {DisplayScreenR2,OperatingDay,OperatingHours} from '../lib/continuous-display/operations';
import {minuteValue,parseOperatingHours,standardOperatingHours,timeValue} from '../lib/continuous-display/operations';
type Command=(action:string,extra?:Record<string,unknown>)=>Promise<void>;
const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const isoFromWall=(wall:string,current:string)=> {
 const preferred=offsetForChurchTime(current);
 try{return churchTimeToUtc(wall,preferred);}
 catch{return churchTimeToUtc(wall,preferred==='-07:00'?'-08:00':'-07:00');}
};
export function SlideEligibilityEditor({slide,onChange,onError}:{
 slide:DisplaySlide;onChange:(patch:Partial<DisplaySlide>)=>void;onError:(message:string)=>void;
}){
 const active=Boolean(slide.startsAt&&slide.endsAt);
 const toggle=(checked:boolean)=>{
  if(!checked){onChange({startsAt:undefined,endsAt:undefined});return;}
  const n=Date.now()+60000;onChange({startsAt:new Date(n).toISOString(),endsAt:new Date(n+86400000).toISOString()});
 };
 const update=(field:'startsAt'|'endsAt',value:string,offset?:'-07:00'|'-08:00')=>{
  if(!value)return;
  try{
   const current=slide[field]||new Date().toISOString();
   const time=offset?churchTimeToUtc(value,offset):isoFromWall(value,current);
   onChange({[field]:time});
   onError('');
  }catch(e){onError(e instanceof Error?e.message:'Invalid church-local time.');}
 };
 return <fieldset className="cd-operation-fieldset"><legend>Slide eligibility</legend>
  <label className="cd-operation-toggle"><input type="checkbox" checked={active} onChange={e=>toggle(e.target.checked)}/>
   Show only during specific dates and times</label>
  {active&&<div className="cd-operation-grid">
   {(['startsAt','endsAt'] as const).map(field=><div key={field}>
    <label>{field==='startsAt'?'Show from':'Stop showing'}
     <input type="datetime-local" value={churchLocal(slide[field]!)} onChange={e=>update(field,e.target.value)}/>
    </label>
    <label className="cd-utc-label">DST offset
     <select value={offsetForChurchTime(slide[field]!)} onChange={e=>update(field,churchLocal(slide[field]!),e.target.value as '-07:00'|'-08:00')}>
      <option value="-07:00">PDT −07</option><option value="-08:00">PST −08</option>
     </select>
    </label>
   </div>)}
  </div>}
  <p>These limits are checked independently while the TV runs, including offline. They must fit within the overall publication window.</p>
 </fieldset>;
}
export function OperatingHoursEditor({screen,busy,command}:{screen:DisplayScreenR2;busy:boolean;command:Command}){
 const [hours,setHours]=useState<OperatingHours>(screen.operatingHours??[]);
 const [dirty,setDirty]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{setHours(screen.operatingHours??[]);setDirty(false);setError('');},[screen.id,screen.configVersion]);
 const update=(day:number,patch:Partial<OperatingDay>)=>{
  setHours(before=>before.map(x=>x.day===day?{...x,...patch}:x));setDirty(true);
 };
 const valid=(()=>{try{parseOperatingHours(hours);return true;}catch{return false;}})();
 const save=async()=>{if(!valid){setError('Each active day needs an end time after the start.');return;}
  await command('hours',{expectedVersion:screen.configVersion,hours});setError('');
 };
 return <section className="cd-operations" aria-labelledby="cd-hours-title">
  <h3 id="cd-hours-title">Operating hours</h3>
  <p>Outside these Las Vegas-local hours the player shows a neutral screen. This does not turn the television off.</p>
  <label className="cd-operation-toggle">
   <input type="checkbox" checked={hours.length>0} onChange={e=>{setHours(e.target.checked?standardOperatingHours():[]);setDirty(true);}}/>
   Limit playback to selected hours
  </label>
  {hours.length===7&&<div className="cd-day-list">
   {weekdays.map((label,day)=>{const h=hours.find(x=>x.day===day)!;
    return <div className="cd-day" key={day}>
     <label className="cd-operation-toggle"><input type="checkbox" checked={h.enabled} onChange={e=>update(day,{enabled:e.target.checked})}/>{label}</label>
     <label>From<input type="time" disabled={!h.enabled} value={timeValue(h.start)} onChange={e=>{try{update(day,{start:minuteValue(e.target.value)})}catch{setError('Select a valid start time.');}}}/></label>
     <label>Until<input type="time" disabled={!h.enabled} value={timeValue(h.end)} onChange={e=>{try{update(day,{end:minuteValue(e.target.value)})}catch{setError('Select a valid end time.');}}}/></label>
    </div>;
   })}
  </div>}
  {error&&<p role="alert" className="cd-operation-error">{error}</p>}
  <button type="button" className="cd-button cd-primary cd-wide" disabled={busy||!dirty||!valid} onClick={()=>void save()}>Save operating hours</button>
 </section>;
}
export function PublicationControls({screen,busy,command,draftDirty}:{
 screen:DisplayScreenR2;busy:boolean;command:Command;draftDirty:boolean;
}){
 const [selected,setSelected]=useState(screen.publishedItems?.[0]?.id??'');
 const [minutes,setMinutes]=useState(5);
 useEffect(()=>{setSelected(screen.publishedItems?.[0]?.id??'');},[screen.id,screen.publishedVersion]);
 const available=(screen.publishedItems??[]).filter(item=>{
  const now=Date.now();return (!item.startsAt||Date.parse(item.startsAt)<=now)&&(!item.endsAt||now<Date.parse(item.endsAt));
 });
 const canOverride=available.some(x=>x.id===selected)&&!busy&&
  Boolean(screen.publishedUntil&&Date.parse(screen.publishedUntil)>Date.now()+minutes*60000);
 const overrideActive=!!screen.overrideSlideId&&!!screen.overrideUntil&&Date.parse(screen.overrideUntil)>Date.now();
 return <section className="cd-operations" aria-labelledby="cd-override-title">
  <h3 id="cd-override-title">On the TV now</h3>
  <p>The following is the approved published playlist, not unsaved draft content. A TV rotates its own eligible items, so an exact position is not inferred from this management page.</p>
  {screen.publishedItems?.length?<ol className="cd-published-list">{screen.publishedItems.map(s=><li key={s.id}>
    <strong>{s.title}</strong><span>{s.duration}s · {s.kind}</span></li>)}</ol>:<p className="cd-subtle">No approved content is currently published.</p>}
  <h3>Temporary emphasis</h3>
  <p>Feature an existing approved slide for a short notice. This cannot publish new wording or bypass expiration.</p>
  {overrideActive&&<p className="cd-operation-alert">Currently featuring: <strong>{screen.publishedItems?.find(s=>s.id===screen.overrideSlideId)?.title||'Approved slide'}</strong> until {new Date(screen.overrideUntil!).toLocaleTimeString('en-US',{timeZone:'America/Los_Angeles'})}.</p>}
  <div className="cd-operation-grid">
   <label>Approved slide<select value={selected} disabled={!available.length} onChange={e=>setSelected(e.target.value)}>
    {available.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
   </select></label>
   <label>Duration<select value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>
    {[1,5,10,15,30].map(m=><option key={m} value={m}>{m} minute{m===1?'':'s'}</option>)}
   </select></label>
  </div>
  <div className="cd-operation-actions">
   <button className="cd-button cd-primary" disabled={!canOverride} onClick={()=>{
    if(window.confirm('Feature this already approved slide on paired screens temporarily?'))
     void command('override',{slideId:selected,durationSeconds:minutes*60,expectedGeneration:screen.publishedVersion});
   }}>Feature approved slide</button>
   <button className="cd-button cd-light" disabled={busy||!overrideActive} onClick={()=>void command('clearOverride')}>End emphasis</button>
  </div>
  <h3>Restore a known-good publication</h3>
  <p>Restore previously approved wording using its ORIGINAL dates. An expired version cannot be reactivated.</p>
  <div className="cd-restore-list">{screen.history.map(h=><div key={h.id} className="cd-restore-row">
   <span>v{h.generation} · {new Date(h.publishedAt).toLocaleDateString('en-US',{timeZone:'America/Los_Angeles'})}</span>
   <button className="cd-button cd-light" disabled={busy||h.generation===screen.publishedVersion||Date.parse(h.until)<=Date.now()}
    onClick={()=>{if(window.confirm('Restore this previously approved publication as a NEW version?'))
      void command('restore',{publicationId:h.id,expectedGeneration:screen.publishedVersion});}}>Restore v{h.generation}</button>
  </div>)}</div>
  {draftDirty&&<p className="cd-subtle">Unsaved edits are not part of any featured or restored publication.</p>}
 </section>;
}
export function NewScreenEditor({busy,command}:{busy:boolean;command:Command}){
 const [name,setName]=useState('');
 return <section className="cd-operations" aria-labelledby="cd-new-screen-title">
  <h3 id="cd-new-screen-title">Additional displays</h3>
  <p>The initial Lobby Display remains independent. New screens start disabled, empty and unpaired. Only the verified initial owner can create another screen.</p>
  <label>Display name<input value={name} maxLength={80} placeholder="Example: Fellowship Hall TV"
    onChange={e=>setName(e.target.value)}/></label>
  <button className="cd-button cd-light cd-wide" disabled={busy||name.trim().length<3}
    onClick={()=>{void command('createScreen',{label:name.trim()});setName('');}}>
   + Add an unpaired display</button>
 </section>;
}
