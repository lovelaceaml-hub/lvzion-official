'use client';
import {useState} from 'react';
import {vegasInstant,vegasToday} from '../../lib/morning-prayer/time';
import {CalendarDays,ClipboardList,FileText,Plus,ShieldCheck,UsersRound} from '../home-icons';
import {EmptyState,IconBox,PageHeading,SectionHeader,Segmented,Tag} from '../ui-kit';
import styles from './morning-prayer.module.css';
import MorningPrayerOperations from './MorningPrayerOperations';
import {CardSummary} from './parts';
import {MONTH_PATTERN,ZONE,dayLabel,lines,statusTag} from './shared';
import type {Kind,ManageArea} from './shared';
import type {Screen} from './MorningPrayerLive';
const AREA_LABELS:Record<ManageArea,string>={schedule:'Schedule',materials:'Materials',people:'People'};
const AREA_HEADINGS:Record<ManageArea,[string,string]>={
 schedule:['Plan the schedule.','Every date, host and meeting link is set deliberately.'],
 materials:['Prepare materials.','Drafts are checked against an approved source, then published separately.'],
 people:['Choose who takes part.','Only the app owner can change access.']
};

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

/**
 * Atlas mission-manage in Liquid Opal: pill Schedule/Materials/People control and
 * glass form cards. Each form stays closed until opened; every capability gate is unchanged.
 */
export default function ManageTab(props:Screen&{
 canManage:boolean;area:ManageArea;onArea:(area:ManageArea)=>void;ownerAccess:boolean;onOwnerAccess:(allowed:boolean)=>void;
 monthDraft:string;onMonthDraft:(value:string)=>void;onMonth:(month:string)=>void;
 gathering:ReturnType<typeof useGatheringForm>;material:ReturnType<typeof useMaterialForm>;
 hostSelection:string;onHostSelection:(id:string)=>void;readingSelection:string;onReadingSelection:(key:string)=>void;
 onReload:()=>Promise<boolean>;onNotice:(message:string)=>void;
}){
 const {data,rows,today,published,busy,cap,post,canManage,ownerAccess,gathering:g,material:m}=props;
 if(!canManage)return <div className={styles.screen}>
  <PageHeading eyebrow="Authorized management" title="Manage"/>
  <div className="ui-glass"><EmptyState icon={<ShieldCheck/>} title="You do not manage Morning Prayer">The app owner assigns management separately from group and department roles.</EmptyState></div>
 </div>;
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
 const [heading,lede]=AREA_HEADINGS[area];
 return <div className={styles.screen+' '+styles.form}>
  <PageHeading eyebrow="Authorized management" title={heading} lede={lede}/>
  {areas.length>1&&<Segmented label="Manage sections" value={area} onChange={props.onArea} options={areas.map(x=>[x,AREA_LABELS[x]] as const)}/>}

  {area==='schedule'&&<label className={'ui-glass ui-glass-tight '+styles.monthRow}><span>Month</span><input className={input} type="month" value={props.monthDraft} placeholder="YYYY-MM" pattern="[0-9]{4}-(0[1-9]|1[0-2])" onChange={e=>{
   const value=e.target.value;props.onMonthDraft(value);
   if(MONTH_PATTERN.test(value)){props.onMonth(value);g.set({date:value===vegasToday().slice(0,7)?vegasToday():value+'-01'});}
  }}/></label>}

  {area==='schedule'&&cap('manage_schedule')&&<details className={styles.disclosure}><CardSummary icon={<Plus size={22}/>} title="Add a gathering"/><div className={styles.disclosureBody}>
   <p className={styles.quiet}>Enter the date and Las Vegas time. Confirm the date after saving.</p>
   <label className={field}>Date<input className={input} type="date" value={g.date} onChange={e=>g.set({date:e.target.value})}/></label>
   <div className={styles.two}>
    <label className={field}>Start (Las Vegas)<input className={input} type="time" value={g.start} onChange={e=>g.set({start:e.target.value})}/></label>
    <label className={field}>End (Las Vegas)<input className={input} type="time" value={g.end} onChange={e=>g.set({end:e.target.value})}/></label>
   </div>
   <label className={field}>Occurrence type<select className={input} value={g.kind} onChange={e=>g.set({kind:e.target.value as Kind})}>
    <option value="gathering">Live gathering</option><option value="app_day">Pray Daily app day</option><option value="cancelled">Cancelled occurrence</option>
   </select></label>
   <button type="button" disabled={busy} className="ui-button ui-button-block" onClick={saveGathering}>Save gathering</button>
  </div></details>}

  {area==='schedule'&&cap('review_requests')&&pending.length>0&&<section aria-labelledby="wm-requests-title">
   <SectionHeader id="wm-requests-title" title={<>Hosting requests <span className="ui-count">{pending.length}</span></>}/>
   <div className="ui-glass ui-glass-tight"><ul className="ui-list">{pending.map(r=><li key={r.id} className={'ui-row '+styles.rowWrap}>
    <IconBox><UsersRound size={22}/></IconBox>
    <span className="ui-row-body">
     <strong>{r.requester}</strong>
     <small>{r.kind==='volunteer'?'Wants to host':'Asks for a change'} · {dayLabel(r.date||rows.find(o=>o.id===r.occurrenceId)?.date||today)}{r.note?' · Private note: '+r.note:''}</small>
    </span>
    <span className={styles.actions}>
     <button type="button" className="ui-button" disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'approve'})}>Approve</button>
     <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={()=>void post({type:'review',requestId:r.id,decision:'decline'})}>Decline</button>
    </span>
   </li>)}</ul></div>
  </section>}

  {area==='schedule'&&cap('manage_schedule')&&rows.length>0&&<section aria-labelledby="wm-gatherings-title">
   <SectionHeader id="wm-gatherings-title" title="Gatherings this month"/>
   {rows.some(o=>o.date>=today)?<div className="ui-glass ui-glass-tight">{rows.filter(o=>o.date>=today).map(o=>{const tag=statusTag(o);return <details key={o.id} className={styles.rowDisclosure}>
    <summary><IconBox><CalendarDays size={22}/></IconBox><span className="ui-row-body"><strong>{dayLabel(o.date)}</strong><small>{o.kind==='gathering'?o.host:o.kind==='app_day'?'Pray Daily app day':'Cancelled'}</small></span><Tag tone={tag.tone}>{o.verified?tag.label:'To confirm'}</Tag></summary>
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
   </details>;})}</div>
   :<div className="ui-glass"><EmptyState icon={<CalendarDays/>} title="No upcoming dates this month">Past dates stay in the schedule history.</EmptyState></div>}
  </section>}

  {area==='materials'&&cap('publish_materials')&&<section aria-labelledby="wm-publish-title">
   <SectionHeader id="wm-publish-title" title="Ready to publish" note={data.drafts.length?String(data.drafts.length):undefined}/>
   {data.drafts.length?<div className="ui-glass ui-glass-tight"><ul className="ui-list">{data.drafts.map(d=><li key={d.id} className={styles.draft}>
    <div className="ui-row">
     <IconBox>{d.kind==='reading'?<ClipboardList size={22}/>:<FileText size={22}/>}</IconBox>
     <span className="ui-row-body"><strong>{d.body.title}</strong><small>{d.sourceState==='checked'?'Source checked':'Source needs checking before publishing'}</small></span>
     <Tag tone={d.sourceState==='checked'?'success':'warning'}>{d.kind==='reading'?'Reading':'PWP'}</Tag>
    </div>
    <details className={styles.review}><summary>Review draft</summary>
     <div className={styles.material}>
      <p>{d.body.summary}</p>
      <ul>{d.body.items.map((item,i)=><li key={i}>{item}</li>)}</ul>
      <p className={styles.quiet}>Source: {d.body.sourceLabel}</p>
     </div>
     <button type="button" className="ui-button" disabled={busy||d.sourceState!=='checked'} onClick={()=>void post({type:'material_publish',materialId:d.id})}>Publish</button>
    </details>
   </li>)}</ul></div>:<div className="ui-glass"><EmptyState icon={<FileText/>} title="Nothing waiting">No drafts are waiting to be published.</EmptyState></div>}
  </section>}

  {area==='materials'&&cap('edit_materials')&&<details className={styles.disclosure}><CardSummary icon={<Plus size={22}/>} title="New reading or PWP"/>
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
    <button className="ui-button ui-button-block" disabled={busy} type="submit">Save draft</button>
   </form>
  </details>}

  <MorningPrayerOperations data={data} area={area} onOwnerAccess={props.onOwnerAccess} onReload={props.onReload} onNotice={props.onNotice}/>
 </div>;
}
