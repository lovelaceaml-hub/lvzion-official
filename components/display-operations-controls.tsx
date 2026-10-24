'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {CalendarDays,Clock3,FileText,Heart,MapPin,Plus,Settings,Sun} from './home-icons';
import {EmptyState,Glass,IconBox,SectionHeader,Tag} from './ui-kit';
import type {ChurchOffset,DisplayKind,DisplaySlide} from '../lib/continuous-display/live-contract';
import {CHURCH_TIME_ZONE,churchDateTime,churchLocal,churchTimeToUtc,offsetForChurchTime,slideEligible} from '../lib/continuous-display/live-contract';
import type {DisplayMotionMode,DisplayScreenR2,OperatingDay,OperatingHours} from '../lib/continuous-display/operations';
import {minuteValue,parseDisplayMotionMode,parseOperatingHours,standardOperatingHours,timeValue} from '../lib/continuous-display/operations';
export type Command=(action:string,extra?:Record<string,unknown>)=>Promise<void>;
/** Leading icon for a slide row or tile, by content type. */
export function KindIcon({kind,size=22}:{kind:DisplayKind;size?:number}){
 if(kind==='schedule')return <CalendarDays size={size}/>;
 if(kind==='event')return <MapPin size={size}/>;
 if(kind==='campaign')return <Heart size={size}/>;
 return <FileText size={size}/>;
}
/** Glass disclosure card: icon box, title and a short note; the chevron comes from CSS. */
function Disclosure({id,icon,title,note,children}:{id:string;icon:ReactNode;title:string;note?:ReactNode;children:ReactNode}){
 return <details className="cd-disclosure">
  <summary><IconBox>{icon}</IconBox><span className="cd-disclosure-title" id={id}>{title}</span>{note?<small>{note}</small>:null}</summary>
  <div className="cd-disclosure-body">{children}</div>
 </details>;
}
const weekdays=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const isoFromWall=(wall:string,current:string)=> {
 const preferred=offsetForChurchTime(current);
 try{return churchTimeToUtc(wall,preferred);}
 catch{return churchTimeToUtc(wall,preferred==='-07:00'?'-08:00':'-07:00');}
};
export function SlideEligibilityEditor({slide,overallStartsAt,overallEndsAt,onChange,onError}:{
 slide:DisplaySlide;overallStartsAt?:string;overallEndsAt?:string;onChange:(patch:Partial<DisplaySlide>)=>void;onError:(message:string)=>void;
}){
 const active=Boolean(slide.startsAt&&slide.endsAt);
 const toggle=(checked:boolean)=>{
  if(!checked){onChange({startsAt:undefined,endsAt:undefined});return;}
  const start=Math.max(Date.now()+60000,overallStartsAt?Date.parse(overallStartsAt):0);
  const end=Math.min(start+86400000,overallEndsAt?Date.parse(overallEndsAt):Number.POSITIVE_INFINITY);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start){onError('The overall publication window must include a future interval.');return;}
  onChange({startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString()});onError('');
 };
 const update=(field:'startsAt'|'endsAt',value:string,offset?:ChurchOffset)=>{
  if(!value)return;
  try{
   const current=slide[field]||new Date().toISOString();
   const time=offset?churchTimeToUtc(value,offset):isoFromWall(value,current);
   onChange({[field]:time});
   onError('');
  }catch(e){onError(e instanceof Error?e.message:'Invalid church-local time.');}
 };
 return <fieldset className="cd-fieldset"><legend>Dates for this slide</legend>
  <label className="cd-check"><input type="checkbox" checked={active} onChange={e=>toggle(e.target.checked)}/>
   Show only during specific dates and times</label>
  {active&&<div className="cd-fields">
   {(['startsAt','endsAt'] as const).map(field=><div key={field} className="cd-pair-fields">
    <label className="ui-field">{field==='startsAt'?'Show from':'Stop showing'}
     <input className="ui-input" type="datetime-local" value={churchLocal(slide[field]!)} onChange={e=>update(field,e.target.value)}/>
    </label>
    <label className="ui-field">Clock
     <select className="ui-input" value={offsetForChurchTime(slide[field]!)} onChange={e=>update(field,churchLocal(slide[field]!),e.target.value as ChurchOffset)}>
      <option value="-07:00">Daylight time (PDT)</option><option value="-08:00">Standard time (PST)</option>
     </select>
    </label>
   </div>)}
  </div>}
  <p className="ui-hint">The TV checks these dates itself, even offline. They must fit inside the dates for the whole playlist.</p>
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
 return <Disclosure id="cd-hours-title" icon={<Clock3/>} title="Operating hours" note={(screen.operatingHours??[]).length?'Limited':'Any time'}>
  <p className="ui-hint">Outside these Las Vegas hours the TV shows a quiet welcome. It does not turn the TV off.</p>
  <label className="cd-check">
   <input type="checkbox" checked={hours.length>0} onChange={e=>{setHours(e.target.checked?standardOperatingHours():[]);setDirty(true);}}/>
   Limit playback to selected hours
  </label>
  {hours.length===7&&<ul className="ui-list cd-days">
   {weekdays.map((label,day)=>{const h=hours.find(x=>x.day===day)!;
    return <li className="ui-row cd-day" key={day}>
     <label className="cd-check"><input type="checkbox" checked={h.enabled} onChange={e=>update(day,{enabled:e.target.checked})}/>{label}</label>
     <label className="ui-field">From<input className="ui-input" type="time" disabled={!h.enabled} value={timeValue(h.start)} onChange={e=>{try{update(day,{start:minuteValue(e.target.value)})}catch{setError('Select a valid start time.');}}}/></label>
     <label className="ui-field">Until<input className="ui-input" type="time" disabled={!h.enabled} value={timeValue(h.end)} onChange={e=>{try{update(day,{end:minuteValue(e.target.value)})}catch{setError('Select a valid end time.');}}}/></label>
    </li>;
   })}
  </ul>}
  {error&&<p role="alert" className="ui-notice" data-tone="danger">{error}</p>}
  <button type="button" className="ui-button ui-button-secondary ui-button-block" disabled={busy||!dirty||!valid} onClick={()=>void save()}>Save operating hours</button>
 </Disclosure>;
}
export function PublicationControls({screen,busy,command,draftDirty}:{
 screen:DisplayScreenR2;busy:boolean;command:Command;draftDirty:boolean;
}){
 const [selected,setSelected]=useState(screen.publishedItems?.[0]?.id??'');
 const [minutes,setMinutes]=useState(5);
 useEffect(()=>{setSelected(screen.publishedItems?.[0]?.id??'');},[screen.id,screen.publishedVersion]);
 const available=(screen.publishedItems??[]).filter(item=>slideEligible(item,Date.now()));
 const canOverride=available.some(x=>x.id===selected)&&!busy&&
  Boolean(screen.publishedUntil&&Date.parse(screen.publishedUntil)>Date.now()+minutes*60000);
 const overrideActive=!!screen.overrideSlideId&&!!screen.overrideUntil&&Date.parse(screen.overrideUntil)>Date.now();
 return <>
  <section className="cd-group" aria-labelledby="cd-override-title">
   <SectionHeader id="cd-override-title" title="On the TV now" note={screen.publishedItems?.length?`Published v${screen.publishedVersion}`:undefined}/>
   <p className="ui-hint cd-lead-hint">The published playlist, not your unsaved draft. Each TV moves through it on its own, so this page cannot show the exact slide on screen.</p>
   {screen.publishedItems?.length?<Glass tight as="div"><ol className="ui-list">{screen.publishedItems.map((s,i)=><li key={s.id} className="ui-row">
    <IconBox><KindIcon kind={s.kind}/></IconBox><span className="ui-row-body"><strong>{s.title}</strong><small>{s.duration}s · {s.kind.slice(0,1).toUpperCase()+s.kind.slice(1)}</small></span>
    {overrideActive&&screen.overrideSlideId===s.id?<Tag tone="success">Featured</Tag>:<Tag>{String(i+1).padStart(2,'0')}</Tag>}</li>)}</ol></Glass>
   :<Glass as="div" className="cd-state"><EmptyState icon={<FileText/>} title="Nothing is published yet">Approve and publish a draft to put it on paired TVs.</EmptyState></Glass>}
  </section>
  <Glass className="cd-card" aria-labelledby="cd-feature-title">
   <div className="cd-card-head"><IconBox><Sun/></IconBox><div><h2 id="cd-feature-title">Feature a slide for a while</h2>
   <p className="ui-hint">Keep one published slide on screen for a short time. This cannot add new wording or run past the publication end.</p></div></div>
   {overrideActive&&<p className="ui-notice">Featuring <strong>{screen.publishedItems?.find(s=>s.id===screen.overrideSlideId)?.title||'a published slide'}</strong> until {new Date(screen.overrideUntil!).toLocaleTimeString('en-US',{timeZone:CHURCH_TIME_ZONE})}.</p>}
   <div className="cd-fields">
    <label className="ui-field">Approved slide<select className="ui-input" value={selected} disabled={!available.length} onChange={e=>setSelected(e.target.value)}>
     {available.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}
    </select></label>
    <label className="ui-field">Duration<select className="ui-input" value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>
     {[1,5,10,15,30].map(m=><option key={m} value={m}>{m} minute{m===1?'':'s'}</option>)}
    </select></label>
   </div>
   <div className="cd-actions">
    <button type="button" className="ui-button ui-button-secondary" disabled={!canOverride} onClick={()=>{
     if(window.confirm('Feature this already approved slide on paired screens temporarily?'))
      void command('override',{slideId:selected,durationSeconds:minutes*60,expectedGeneration:screen.publishedVersion});
    }}>Feature approved slide</button>
    <button type="button" className="ui-button ui-button-quiet" disabled={busy||!overrideActive} onClick={()=>void command('clearOverride')}>End emphasis</button>
   </div>
  </Glass>
  <section className="cd-group" aria-labelledby="cd-restore-title">
   <SectionHeader id="cd-restore-title" title="Earlier versions"/>
   <p className="ui-hint cd-lead-hint">Restoring brings back earlier approved wording with its original dates. A version whose dates have passed cannot come back.</p>
   {screen.history.length?<Glass tight as="div"><ul className="ui-list">{screen.history.map(h=><li key={h.id} className="ui-row cd-version">
    <IconBox>v{h.generation}</IconBox><span className="ui-row-body"><strong>Published {churchDateTime(h.publishedAt)}</strong><small>Ends {churchDateTime(h.until)}</small></span>
    <button type="button" className="ui-button ui-button-secondary cd-small-button" disabled={busy||h.generation===screen.publishedVersion||Date.parse(h.until)<=Date.now()}
     onClick={()=>{if(window.confirm('Restore this previously approved publication as a NEW version?'))
       void command('restore',{publicationId:h.id,expectedGeneration:screen.publishedVersion});}}>Restore v{h.generation}</button>
   </li>)}</ul></Glass>:<p className="ui-hint">Nothing has been published yet.</p>}
   {draftDirty&&<p className="ui-hint">Unsaved edits are not part of a featured or restored version.</p>}
  </section>
 </>;
}
export function NewScreenEditor({busy,command}:{busy:boolean;command:Command}){
 const [name,setName]=useState('');
 return <Disclosure id="cd-new-screen-title" icon={<Plus/>} title="Add another display">
  <p className="ui-hint">Each display is separate. A new one starts off, empty and unpaired. Only the display owner can add one.</p>
  <label className="ui-field">Display name<input className="ui-input" value={name} maxLength={80} placeholder="Example: Fellowship Hall TV"
    onChange={e=>setName(e.target.value)}/></label>
  <button type="button" className="ui-button ui-button-secondary ui-button-block" disabled={busy||name.trim().length<3}
    onClick={()=>{void command('createScreen',{label:name.trim()});setName('');}}>
   Add display</button>
 </Disclosure>;
}
const motionModes:{id:DisplayMotionMode;label:string;description:string}[]=[
 {id:'standard',label:'Standard',description:'Slow, steady movement'},
 {id:'calm',label:'Calm',description:'Barely moves, for quiet rooms'},
 {id:'lively',label:'Lively',description:'More movement, text stays still'},
 {id:'still',label:'Still',description:'No movement at all'}
];
export function DisplayMotionEditor({screen,busy,command}:{screen:DisplayScreenR2;busy:boolean;command:Command}){
 const current=parseDisplayMotionMode(screen.motionMode);
 const [selected,setSelected]=useState<DisplayMotionMode>(current);
 useEffect(()=>setSelected(parseDisplayMotionMode(screen.motionMode)),[screen.id,screen.motionMode,screen.configVersion]);
 return <Disclosure id="cd-motion-title" icon={<Settings/>} title="Motion on this TV" note={motionModes.find(m=>m.id===current)?.label}>
  <p className="ui-hint">How much the background moves on {screen.label}. This never changes or publishes content, and a TV set to reduce motion always stays still.</p>
  <fieldset className="cd-fieldset cd-motion">
   <legend className="ui-visually-hidden">Motion for {screen.label}</legend>
   {motionModes.map(m=><label key={m.id} className="ui-row cd-choice">
    <input type="radio" name={'motion-'+screen.id} checked={selected===m.id} onChange={()=>setSelected(m.id)} />
    <span className="ui-row-body"><strong>{m.label}{m.id===current?' (current)':''}</strong><small>{m.description}</small></span>
   </label>)}
  </fieldset>
  <p className="ui-hint">A paired TV picks up the change within about 12 seconds.</p>
  <button type="button" className="ui-button ui-button-secondary ui-button-block" disabled={busy||selected===current}
   onClick={()=>void command('motion',{expectedVersion:screen.configVersion,motionMode:selected})}>
   Save screen motion
  </button>
 </Disclosure>;
}
