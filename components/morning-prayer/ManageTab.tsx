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
 if(!canManage)return <p className="ui-empty"><strong>You do not manage Morning Prayer</strong>The app owner assigns management separately from group and department roles.</p>;
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
 const field='ui-field',input='ui-input';
 return <div className={styles.form}>
  <nav className={'ui-tabs '+styles.subTabs} aria-label="Manage sections">{areas.map(x=>
   <button key={x} type="button" className="ui-tab" aria-pressed={area===x} onClick={()=>props.onArea(x)}>{AREA_LABELS[x]}</button>)}
  </nav>
  {area==='schedule'&&<label className={styles.inline}>Month<input className={input} type="month" value={props.monthDraft} placeholder="YYYY-MM" pattern="[0-9]{4}-(0[1-9]|1[0-2])" onChange={e=>{
   const value=e.target.value;props.onMonthDraft(value);
   if(MONTH_PATTERN.test(value)){props.onMonth(value);g.set({date:value===vegasToday().slice(0,7)?vegasToday():value+'-01'});}
  }}/></label>}

  {area==='schedule'&&cap('manage_schedule')&&<details className={styles.disclosure}><summary>Add a gathering</summary><div className={styles.disclosureBody}>
   <p className={styles.quiet}>Enter the date and Las Vegas time. Confirm the date after saving.</p>
   <label className={field}>Date<input className={input} type="date" value={g.date} onChange={e=>g.set({date:e.target.value})}/></label>
   <div className={styles.two}>
    <label className={field}>Start (Las Vegas)<input className={input} type="time" value={g.start} onChange={e=>g.set({start:e.target.value})}/></label>
    <label className={field}>End (Las Vegas)<input className={input} type="time" value={g.end} onChange={e=>g.set({end:e.target.value})}/></label>
   </div>
   <label className={field}>Occurrence type<select className={input} value={g.kind} onChange={e=>g.set({kind:e.target.value as Kind})}>
    <option value="gathering">Live gathering</option><option value="app_day">Pray Daily app day</option><option value="cancelled">Cancelled occurrence</option>
   </select></label>
   <button type="button" disabled={busy} className="ui-button" onClick={saveGathering}>Save gathering</button>
  </div></details>}

  {area==='schedule'&&cap('review_requests')&&pending.length>0&&<section aria-labelledby="wm-requests-title">
   <h2 className={styles.heading} id="wm-requests-title">Hosting requests <span className="ui-count">{pending.length}</span></h2>
   <ul className="ui-list">{pending.map(r=><li key={r.id} className={'ui-row '+styles.rowWrap}>
    <span className="ui-row-body">
     <strong>{r.requester}</strong>
     <small>{r.kind==='volunteer'?'Wants to host':'Asks for a change'} · {dayLabel(r.date||rows.find(o=>o.id===r.occurrenceId)?.date||today)}{r.note?' · Private note: '+r.note:''}</small>
    </span>
    <span className={styles.actions}>
     <button type="button" className="ui-button" disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'approve'})}>Approve</button>
     <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'decline'})}>Decline</button>
    </span>
   </li>)}</ul>
  </section>}

  {area==='schedule'&&cap('manage_schedule')&&rows.length>0&&<section aria-labelledby="wm-gatherings-title">
   <h2 className={styles.heading} id="wm-gatherings-title">Gatherings this month</h2>
   {rows.filter(o=>o.date>=today).map(o=><details key={o.id} className={styles.disclosure}>
    <summary>{dayLabel(o.date)} · {o.host}<small>{o.verified?'Confirmed':'To confirm'}</small></summary>
    <div className={styles.disclosureBody}>
     <div className={styles.actions}>
      <button type="button" className="ui-button" disabled={busy||o.verified||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'verify'})}>Confirm date</button>
      <button type="button" className="ui-button ui-button-secondary" disabled={busy||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'app_day'})}>App day</button>
      <button type="button" className="ui-button ui-button-secondary" disabled={busy||o.kind!=='gathering'} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'cancel'})}>Cancel</button>
      {o.kind!=='gathering'&&<button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void post({type:'schedule',occurrenceId:o.id,mode:'restore'})}>Restore as unverified gathering</button>}
     </div>
     {data.eligibleHosts.length>0&&o.verified&&o.kind==='gathering'&&<div className={styles.actions}>
      <label className={field}>Eligible host<select className={input} value={props.hostSelection} onChange={e=>props.onHostSelection(e.target.value)}>
       <option value="">Choose an eligible host</option>{data.eligibleHosts.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
      </select></label>
      <button type="button" className="ui-button ui-button-secondary" disabled={!props.hostSelection||busy} onClick={()=>void post({type:'assign',occurrenceId:o.id,memberId:props.hostSelection})}>Assign host</button>
     </div>}
     {readings.length>0&&<div className={styles.actions}>
      <label className={field}>Reading for this date<select className={input} value={props.readingSelection} onChange={e=>props.onReadingSelection(e.target.value)}>
       <option value="">Choose approved reading</option>{readings.map(x=><option key={x.key} value={x.key}>{x.body.title}</option>)}
      </select></label>
      <button type="button" className="ui-button ui-button-secondary" disabled={busy||!props.readingSelection} onClick={()=>void post({type:'link_reading',occurrenceId:o.id,readingKey:props.readingSelection},true)}>Link reading</button>
     </div>}
    </div>
   </details>)}
  </section>}

  {area==='materials'&&cap('publish_materials')&&<section aria-labelledby="wm-publish-title">
   <h2 className={styles.heading} id="wm-publish-title">Ready to publish</h2>
   {data.drafts.length?<ul className="ui-list">{data.drafts.map(d=><li key={d.id} className={styles.disclosure}>
    <div className={styles.material}>
     <h3>{d.body.title}</h3>
     <p className={styles.quiet}>{d.sourceState==='checked'?'Source checked':'Source needs checking before publishing'}</p>
    </div>
    <details className={styles.review}><summary>Review draft</summary>
     <div className={styles.material}>
      <p>{d.body.summary}</p>
      <ul>{d.body.items.map((item,i)=><li key={i}>{item}</li>)}</ul>
      <p className={styles.quiet}>Source: {d.body.sourceLabel}</p>
     </div>
     <button type="button" className="ui-button" disabled={busy||d.sourceState!=='checked'} onClick={()=>void post({type:'material_publish',materialId:d.id})}>Publish</button>
    </details>
   </li>)}</ul>:<p className={styles.quiet}>No drafts are waiting to be published.</p>}
  </section>}

  {area==='materials'&&cap('edit_materials')&&<details className={styles.disclosure}><summary>New reading or PWP</summary>
   <form className={styles.disclosureBody} action="/api/morning-prayer/setup" method="post" onSubmit={event=>{event.preventDefault();saveMaterial();}}>
    <p className={styles.quiet}>Copy the wording from an approved source. Publishing is a separate step.</p>
    <label className={field}>Type<select className={input} value={m.kind} onChange={e=>m.edit({kind:e.target.value as typeof m.kind})}>
     <option value="pwp">PWP</option><option value="reading">Daily reading</option>
    </select></label>
    {m.kind==='pwp'&&<div className={styles.two}>
     <label className={field}>PWP month<input className={input} type="month" required name="month" placeholder="YYYY-MM" pattern="[0-9]{4}-(0[1-9]|1[0-2])" value={m.month} onChange={e=>m.edit({month:e.target.value})}/></label>
     <label className={field}>Week<select className={input} value={m.week} onChange={e=>m.edit({week:Number(e.target.value)})}>{[1,2,3,4,5].map(n=><option key={n} value={n}>Week {n}</option>)}</select></label>
    </div>}
    <label className={field}>Title<input className={input} required name="title" maxLength={100} value={m.title} onChange={e=>m.edit({title:e.target.value})}/></label>
    <label className={field}>Summary<textarea className={input} required name="summary" maxLength={400} rows={3} value={m.summary} onChange={e=>m.edit({summary:e.target.value})}/></label>
    <label className={field}>Activities or points (one per line, up to five)<textarea className={input} required name="items" rows={4} value={m.items} onChange={e=>m.edit({items:e.target.value})}/></label>
    <label className={field}>Source<input className={input} required name="source" maxLength={100} value={m.sourceLabel} onChange={e=>m.edit({sourceLabel:e.target.value})}/></label>
    <label className={styles.check}><input type="checkbox" checked={m.sourceChecked} onChange={e=>m.set({sourceChecked:e.target.checked})}/> I have checked the content against the permitted source.</label>
    <button className="ui-button" disabled={busy} type="submit">Save draft</button>
   </form>
  </details>}

  <MorningPrayerOperations data={data} area={area} onOwnerAccess={props.onOwnerAccess} onReload={props.onReload} onNotice={props.onNotice}/>
 </div>;
}
