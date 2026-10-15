'use client';
import {useState} from 'react';
import {vegasInstant,vegasToday} from '../../lib/morning-prayer/time';
import styles from './morning-prayer.module.css';
import MorningPrayerOperations from './MorningPrayerOperations';
import {MONTH_PATTERN,ZONE,dayLabel,lines} from './shared';
import type {Kind,ManageArea} from './shared';
import type {Screen} from './MorningPrayerLive';
const AREA_LABELS:Record<ManageArea,string>={schedule:'Schedule',materials:'Materials',people:'People'};

// Form state lives in the shell so drafts survive tab switches and month reloads.
export function useGatheringForm(){
 const [form,setForm]=useState(()=>({date:vegasToday(),start:'07:00',end:'07:30',kind:'gathering' as Kind}));
 return {...form,set:(patch:Partial<typeof form>)=>setForm(f=>({...f,...patch}))};
}
type MaterialFields={kind:'pwp'|'reading';month:string;week:number;readingKey:string;title:string;summary:string;items:string;sourceLabel:string;sourceChecked:boolean};
export function useMaterialForm(){
 const [form,setForm]=useState<MaterialFields>(()=>({kind:'pwp',month:vegasToday().slice(0,7),week:1,readingKey:'',title:'',summary:'',items:'',sourceLabel:'',sourceChecked:false}));
 return {
  ...form,
  /** Any content edit clears the source attestation. */
  edit:(patch:Partial<MaterialFields>)=>setForm(f=>({...f,...patch,sourceChecked:false})),
  set:(patch:Partial<MaterialFields>)=>setForm(f=>({...f,...patch})),
  clear:()=>setForm(f=>({...f,readingKey:'',title:'',summary:'',items:'',sourceLabel:'',sourceChecked:false}))
 };
}

export default function ManageTab(props:Screen&{
 canManage:boolean;area:ManageArea;onArea:(area:ManageArea)=>void;ownerAccess:boolean;onOwnerAccess:(allowed:boolean)=>void;
 monthDraft:string;onMonthDraft:(value:string)=>void;onMonth:(month:string)=>void;
 gathering:ReturnType<typeof useGatheringForm>;material:ReturnType<typeof useMaterialForm>;
 hostSelection:string;onHostSelection:(id:string)=>void;readingSelection:string;onReadingSelection:(key:string)=>void;
 onReload:()=>Promise<boolean>;onNotice:(message:string)=>void;
}){
 const {data,rows,today,published,busy,cap,post,canManage,ownerAccess,gathering:g,material:m}=props;
 if(!canManage)return <section className={styles.empty}>
  <h2>No management permission</h2><p>Management is assigned independently of group and department positions.</p>
 </section>;
 const areas:ManageArea[]=[
  ...(cap('manage_schedule')||cap('review_requests')?['schedule' as const]:[]),
  ...(cap('edit_materials')||cap('publish_materials')?['materials' as const]:[]),
  ...(ownerAccess?['people' as const]:[])
 ];
 const area=areas.includes(props.area)?props.area:areas[0];
 const readings=published.filter(x=>x.kind==='reading');
 const pending=(data.requests||[]).filter(r=>r.status==='pending');
 function saveGathering(){
  try{void post({type:'create_occurrence',date:g.date,startsAt:vegasInstant(g.date,g.start),endsAt:vegasInstant(g.date,g.end),timezone:ZONE,kind:g.kind},true);}
  catch(e){props.onNotice(e instanceof Error?e.message:'Check the time.');}
 }
 function saveMaterial(){
  const key=m.kind==='pwp'?'pwp-'+m.month+'-week-'+m.week:m.readingKey||'reading-'+crypto.randomUUID();
  if(m.kind==='reading')m.set({readingKey:key});
  void post({type:'create_material',key,kind:m.kind,body:{title:m.title,summary:m.summary,items:lines(m.items),sourceLabel:m.sourceLabel},sourceChecked:m.sourceChecked},true)
   .then(saved=>{if(saved)m.clear();});
 }
 return <>
  <div className={styles.sectionHeading}><h2>Manage</h2></div>
  <nav className={styles.manageTabs} aria-label="Manage sections">{areas.map(x=>
   <button key={x} aria-pressed={area===x} onClick={()=>props.onArea(x)}>{AREA_LABELS[x]}</button>)}
  </nav>
  {area==='schedule'&&<label className={styles.monthFilter}>Month<input type="month" value={props.monthDraft} placeholder="YYYY-MM" pattern="[0-9]{4}-(0[1-9]|1[0-2])" onChange={e=>{
   const value=e.target.value;props.onMonthDraft(value);
   if(MONTH_PATTERN.test(value)){props.onMonth(value);g.set({date:value===vegasToday().slice(0,7)?vegasToday():value+'-01'});}
  }}/></label>}

  {area==='schedule'&&cap('manage_schedule')&&<details className={styles.editor}><summary>Add a gathering</summary><div className={styles.editorBody}>
   <p className={styles.muted}>Enter the date and Las Vegas time. Confirm it after saving.</p>
   <label>Date<input className={styles.input} type="date" value={g.date} onChange={e=>g.set({date:e.target.value})}/></label>
   <div className={styles.two}>
    <label>Start (Las Vegas)<input className={styles.input} type="time" value={g.start} onChange={e=>g.set({start:e.target.value})}/></label>
    <label>End (Las Vegas)<input className={styles.input} type="time" value={g.end} onChange={e=>g.set({end:e.target.value})}/></label>
   </div>
   <label>Occurrence type<select value={g.kind} onChange={e=>g.set({kind:e.target.value as Kind})}>
    <option value="gathering">Live gathering</option><option value="app_day">Pray Daily app day</option><option value="cancelled">Cancelled occurrence</option>
   </select></label>
   <button disabled={busy} className={styles.primary} onClick={saveGathering}>Save gathering</button>
  </div></details>}

  {area==='schedule'&&cap('manage_schedule')&&rows.length>0&&<section className={styles.card}><h2>Gatherings</h2>{rows.filter(o=>o.date>=today).map(o=>
   <details key={o.id} className={styles.dateEditor}>
    <summary><strong>{dayLabel(o.date)} · {o.host}</strong><span>{o.verified?'Confirmed':'To confirm'} <span aria-hidden="true">›</span></span></summary>
    <div className={styles.editorBody}>
     {readings.length>0&&<div>
      <label>Reading for this date<select value={props.readingSelection} onChange={e=>props.onReadingSelection(e.target.value)}>
       <option value="">Choose approved reading</option>{readings.map(x=><option key={x.key} value={x.key}>{x.body.title}</option>)}
      </select></label>
      <button className={styles.secondary} disabled={busy||!props.readingSelection} onClick={()=>void post({type:'link_reading',occurrenceId:o.id,readingKey:props.readingSelection},true)}>Link reading</button>
     </div>}
     <div className={styles.actions}>
      <button className={styles.primary} disabled={busy||o.verified||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'verify'})}>Confirm date</button>
      <button disabled={busy||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'app_day'})}>App day</button>
      <button disabled={busy||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'cancel'})}>Cancel</button>
      {o.kind!=='gathering'&&<button disabled={busy} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'restore'})}>Restore as unverified gathering</button>}
     </div>
     {data.eligibleHosts.length>0&&o.verified&&o.kind==='gathering'&&<div>
      <label>Eligible host<select value={props.hostSelection} onChange={e=>props.onHostSelection(e.target.value)}>
       <option value="">Choose an eligible host</option>{data.eligibleHosts.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
      </select></label>
      <button className={styles.secondary} disabled={!props.hostSelection||busy} onClick={()=>void post({type:'assign',occurrenceId:o.id,memberId:props.hostSelection})}>Assign host</button>
     </div>}
    </div>
   </details>)}
  </section>}

  {area==='schedule'&&cap('review_requests')&&pending.length>0&&<section className={styles.card}><h2>Hosting requests</h2>{pending.map(r=>
   <div key={r.id} className={styles.requestRow}>
    <strong>{r.requester} · {r.kind==='volunteer'?'Volunteer':'Change'}</strong>
    <p>{dayLabel(r.date||rows.find(o=>o.id===r.occurrenceId)?.date||today)}{r.note?' · Private note: '+r.note:''}</p>
    <div className={styles.actions}>
     <button disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'approve'})}>Approve</button>
     <button disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'decline'})}>Decline</button>
    </div>
   </div>)}
  </section>}

  {area==='materials'&&cap('edit_materials')&&<details className={styles.editor}><summary>New reading or PWP</summary>
   <form className={styles.editorBody} action="/api/morning-prayer/setup" method="post" onSubmit={event=>{event.preventDefault();saveMaterial();}}>
    <p className={styles.muted}>Prepare the wording from an approved source. Publishing is a separate step.</p>
    <label>Type<select value={m.kind} onChange={e=>m.edit({kind:e.target.value as typeof m.kind})}>
     <option value="pwp">PWP</option><option value="reading">Daily reading</option>
    </select></label>
    {m.kind==='pwp'&&<div className={styles.two}>
     <label>PWP month<input className={styles.input} type="month" required name="month" placeholder="YYYY-MM" pattern="[0-9]{4}-(0[1-9]|1[0-2])" value={m.month} onChange={e=>m.edit({month:e.target.value})}/></label>
     <label>Week<select value={m.week} onChange={e=>m.edit({week:Number(e.target.value)})}>{[1,2,3,4,5].map(n=><option key={n} value={n}>Week {n}</option>)}</select></label>
    </div>}
    <label>Title<input className={styles.input} required name="title" maxLength={100} value={m.title} onChange={e=>m.edit({title:e.target.value})}/></label>
    <label>Summary<textarea className={styles.input} required name="summary" maxLength={400} rows={3} value={m.summary} onChange={e=>m.edit({summary:e.target.value})}/></label>
    <label>Activities or points (one per line, up to five)<textarea className={styles.input} required name="items" rows={4} value={m.items} onChange={e=>m.edit({items:e.target.value})}/></label>
    <label>Source<input className={styles.input} required name="source" maxLength={100} value={m.sourceLabel} onChange={e=>m.edit({sourceLabel:e.target.value})}/></label>
    <label><input type="checkbox" checked={m.sourceChecked} onChange={e=>m.set({sourceChecked:e.target.checked})}/> I have checked the content against the permitted source.</label>
    <button className={styles.primary} disabled={busy} type="submit">Save draft</button>
   </form>
  </details>}

  {area==='materials'&&cap('publish_materials')&&<section className={styles.card}><h2>Ready to publish</h2>{data.drafts.length?data.drafts.map(d=>
   <div key={d.id} className={styles.requestRow}>
    <strong>{d.body.title}</strong>
    <p>{d.sourceState==='checked'?'Source checked':'Source needs checking'}</p>
    <details className={styles.review}><summary>Review draft</summary>
     <p>{d.body.summary}</p>
     <ul>{d.body.items.map((item,i)=><li key={i}>{item}</li>)}</ul>
     <p className={styles.muted}>Source: {d.body.sourceLabel}</p>
     <button className={styles.primary} disabled={busy||d.sourceState!=='checked'} onClick={()=>void post({type:'material_publish',materialId:d.id})}>Publish</button>
    </details>
   </div>):<p className={styles.muted}>No material drafts awaiting publication.</p>}
  </section>}

  <MorningPrayerOperations data={data} area={area} onOwnerAccess={props.onOwnerAccess} onReload={props.onReload} onNotice={props.onNotice}/>
 </>;
}
