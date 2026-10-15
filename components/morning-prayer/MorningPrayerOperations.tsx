'use client';
import {useEffect,useState} from 'react';
import {scheduleCandidates,vegasToday,vegasInstant} from '../../lib/morning-prayer/time';
import css from './operations.module.css';
import {dayLabel,lines,postJSON} from './shared';
import type {Capability,Kind,ManageArea,Material,Occurrence,Workspace} from './shared';

type Member={id:string;name:string;status:string;placement:string;enabled:boolean;capabilities:Capability[];hostEligible:boolean;moduleAccess:boolean};
type Roster={ownerId:string;version:number;members:Member[]};
const CAPS:Capability[]=['view_schedule','join_gathering','view_materials','volunteer_host','review_requests','manage_schedule','edit_materials','publish_materials'];
const CAP_LABELS:Record<Capability,string>={
 view_schedule:'View schedule',join_gathering:'Join meetings',view_materials:'Read materials',volunteer_host:'Volunteer to host',
 review_requests:'Review host requests',manage_schedule:'Manage schedule',edit_materials:'Edit materials',publish_materials:'Publish materials'
};
const CAP_DESCRIPTIONS:Record<Capability,string>={
 view_schedule:'View gathering times and personal requests',
 join_gathering:'Open verified Zoom access during meeting window',
 view_materials:'Read published PWP and daily readings',
 volunteer_host:'Request available hosting dates',
 review_requests:'Approve or decline hosting requests',
 manage_schedule:'Configure the schedule and assign hosts',
 edit_materials:'Prepare source-checked drafts',
 publish_materials:'Publish reviewed material versions'
};
const PRESETS:Record<string,Capability[]>={
 'Member':['view_schedule','join_gathering','view_materials'],
 'Host':['view_schedule','join_gathering','view_materials','volunteer_host'],
 'Coordinator':['view_schedule','join_gathering','view_materials','review_requests','manage_schedule'],
 'Reading editor':['view_schedule','view_materials','edit_materials'],
 'Publisher':['view_schedule','view_materials','publish_materials']
};
const WEEKDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
/** Saves one write, then refreshes. Resolves true only when the refreshed workspace confirms it. */
type Save=(path:string,payload:unknown,success:string)=>Promise<boolean>;
type Panel={visible:boolean;data:Workspace;busy:boolean;save:Save;future:Occurrence[];versioned:(action:Record<string,unknown>)=>unknown;onNotice:(message:string)=>void};

function useOwnerRoster(version:number){
 const [roster,setRoster]=useState<Roster|null>(null),[denied,setDenied]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  void (async()=>{
   try{
    const r=await fetch('/api/morning-prayer/access',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
    if(r.status===403){setDenied(true);setRoster(null);return;}
    if(!r.ok)throw new Error('Member permissions could not be loaded.');
    const value=await r.json() as Roster;
    if(!controller.signal.aborted){setDenied(false);setError('');setRoster(value);}
   }catch(e){if(!controller.signal.aborted){setRoster(null);setError(e instanceof Error?e.message:'Permission service unavailable.');}}
  })();
  return()=>controller.abort();
 },[version]);
 return {roster,denied,error};
}

/**
 * Owner and manager tools below the main Manage sections. Each panel stays mounted while hidden,
 * so its draft input survives switching between Manage sections.
 */
export default function MorningPrayerOperations({data,area,onOwnerAccess,onReload,onNotice}:{
 data:Workspace;area?:ManageArea;onOwnerAccess?:(allowed:boolean)=>void;onReload:()=>Promise<boolean>;onNotice:(message:string)=>void;
}){
 const allowed=(cap:Capability)=>data.capabilities.includes(cap);
 const manage=allowed('manage_schedule');
 const {roster,denied,error:rosterError}=useOwnerRoster(data.version);
 useEffect(()=>{onOwnerAccess?.(!!roster&&!denied);},[roster,denied,onOwnerAccess]);
 const [busy,setBusy]=useState(false);
 const save:Save=async(path,payload,success)=>{
  if(busy)return false;
  setBusy(true);
  try{
   await postJSON(path,payload,'Action could not be saved.');
   const refreshed=await onReload();
   onNotice(refreshed?success:'Change accepted. Refresh to confirm the result.');
   return refreshed;
  }catch(e){onNotice(e instanceof Error?e.message:'Unable to save your changes.');await onReload().catch(()=>{});return false;}
  finally{setBusy(false);}
 };
 const panel={data,busy,save,onNotice,
  future:data.occurrences.filter(x=>x.kind==='gathering'&&x.date>=vegasToday()),
  versioned:(action:Record<string,unknown>)=>({key:crypto.randomUUID(),expectedVersion:data.version,action})};
 return <div className={css.root}>
  <BulkSchedule {...panel} visible={area==='schedule'&&manage}/>
  <Reschedule {...panel} visible={area==='schedule'&&manage}/>
  <MeetingAccess {...panel} visible={area==='schedule'&&manage}/>
  <RevisionEditor {...panel} visible={area==='materials'&&allowed('edit_materials')}/>
  <MemberAccess {...panel} visible={area==='people'&&!denied} roster={roster} rosterError={rosterError}/>
 </div>;
}

function BulkSchedule({visible,data,busy,save,onNotice}:Panel){
 const [from,setFrom]=useState(vegasToday()),[until,setUntil]=useState(vegasToday());
 const [weekdays,setWeekdays]=useState<number[]>([]),[kind,setKind]=useState<Kind>('gathering');
 const [start,setStart]=useState('07:00'),[end,setEnd]=useState('07:30');
 const [planned,setPlanned]=useState<ReturnType<typeof scheduleCandidates>>([]),[acknowledged,setAcknowledged]=useState(false);
 if(!visible)return null;
 /** Any input change discards the reviewed date list. */
 const change=<T,>(set:(value:T)=>void)=>(value:T)=>{set(value);setPlanned([]);};
 function previewDates(){
  setPlanned([]);setAcknowledged(false);
  try{const list=scheduleCandidates(from,until,weekdays,start,end,kind);setPlanned(list);onNotice('Review '+list.length+' exact dates before saving. All new dates remain unverified.');}
  catch(e){onNotice(e instanceof Error?e.message:'Choose a valid schedule.');}
 }
 return <details className={css.panel} data-testid="wm-bulk-schedule">
  <summary>Add several dates</summary><div className={css.content}>
   <p>Choose a date range and weekdays, then review the dates.</p>
   <div className={css.gridTwo}>
    <label>First date<input type="date" value={from} min={vegasToday()} onChange={e=>change(setFrom)(e.target.value)}/></label>
    <label>Last date<input type="date" value={until} min={from} onChange={e=>change(setUntil)(e.target.value)}/></label>
   </div>
   <p className={css.help}>Select the weekdays that are really scheduled (up to 180 days ahead).</p>
   <fieldset className={css.weekdays}><legend>Gathering weekdays</legend>{WEEKDAYS.map((day,n)=>
    <label key={day}><input type="checkbox" checked={weekdays.includes(n)} onChange={e=>change(setWeekdays)(e.target.checked?[...weekdays,n]:weekdays.filter(x=>x!==n))}/>{day}</label>)}
   </fieldset>
   <div className={css.gridTwo}>
    <label>Starts (Las Vegas)<input type="time" value={start} onChange={e=>change(setStart)(e.target.value)}/></label>
    <label>Ends (Las Vegas)<input type="time" value={end} onChange={e=>change(setEnd)(e.target.value)}/></label>
   </div>
   <label>Type<select value={kind} onChange={e=>change(setKind)(e.target.value as Kind)}>
    <option value="gathering">Zoom gathering</option><option value="app_day">Pray Daily app day, no Zoom</option><option value="cancelled">No gathering / cancelled</option>
   </select></label>
   <button className={css.secondary} onClick={previewDates}>Preview selected dates</button>
   {planned.length>0&&<div className={css.preview} aria-live="polite">
    <strong>{planned.length} proposed dates</strong>
    <div className={css.datePreview}>{planned.map(x=><span key={x.date}>{dayLabel(x.date)}</span>)}</div>
    <p>New dates will be saved as <strong>Unverified</strong>. Existing dates are never overwritten; any conflict rejects the entire batch.</p>
    <label className={css.check}><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/>I verified this selected range against the official schedule.</label>
    <button className={css.primary} disabled={!acknowledged||busy} onClick={()=>void save('/api/morning-prayer/batch',{expectedVersion:data.version,key:crypto.randomUUID(),occurrences:planned},
     'Dates saved. Review each date before enabling participation.').then(saved=>{if(saved){setPlanned([]);setAcknowledged(false);}})}>Save {planned.length} dates</button>
   </div>}
  </div>
 </details>;
}

function Reschedule({visible,busy,save,future,versioned,onNotice}:Panel){
 const [moveId,setMoveId]=useState(''),[moveDate,setMoveDate]=useState(vegasToday());
 const [moveStart,setMoveStart]=useState('07:00'),[moveEnd,setMoveEnd]=useState('07:30'),[confirmed,setConfirmed]=useState(false);
 if(!visible)return null;
 /** Any input change requires the coordinator confirmation again. */
 const change=(set:(value:string)=>void)=>(value:string)=>{set(value);setConfirmed(false);};
 function saveMove(){
  try{
   const startsAt=vegasInstant(moveDate,moveStart),endsAt=vegasInstant(moveDate,moveEnd);
   if(Date.parse(endsAt)<=Date.parse(startsAt))throw new Error('The end time must follow the start time.');
   void save('/api/morning-prayer/command',versioned({type:'schedule',mode:'move',occurrenceId:moveId,startsAt,endsAt}),
    'Gathering rescheduled. Verify its date/time again, then re-confirm the host and Zoom link.').then(saved=>{if(saved)setConfirmed(false);});
  }catch(e){onNotice(e instanceof Error?e.message:'Choose a valid time.');}
 }
 return <details className={css.panel} data-testid="wm-reschedule">
  <summary>Change a gathering time</summary><div className={css.content}>
   <p>Confirm the new time afterward. The host and meeting link will need to be checked again.</p>
   <label>Scheduled occurrence<select value={moveId} onChange={e=>change(setMoveId)(e.target.value)}>
    <option value="">Select a future occurrence</option>{future.map(o=><option key={o.id} value={o.id}>{dayLabel(o.date)} · {o.host}</option>)}
   </select></label>
   <div className={css.gridTwo}>
    <label>New Las Vegas date<input type="date" min={vegasToday()} value={moveDate} onChange={e=>change(setMoveDate)(e.target.value)}/></label>
    <label>New start<input type="time" value={moveStart} onChange={e=>change(setMoveStart)(e.target.value)}/></label>
   </div>
   <label>New end<input type="time" value={moveEnd} onChange={e=>change(setMoveEnd)(e.target.value)}/></label>
   <label className={css.check}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirmed the new time with the gathering coordinator.</label>
   <button className={css.primary} disabled={!moveId||!confirmed||busy} onClick={saveMove}>Save rescheduled date</button>
  </div>
 </details>;
}

function MeetingAccess({visible,data,busy,save,future,versioned}:Panel){
 const [windowMinutes,setWindowMinutes]=useState(String(data.joinWindowMinutes??10));
 const [occurrence,setOccurrence]=useState(''),[url,setUrl]=useState(''),[sourceVerified,setSourceVerified]=useState(false);
 useEffect(()=>{setWindowMinutes(String(data.joinWindowMinutes??10));},[data.joinWindowMinutes]);
 if(!visible)return null;
 const minutes=Number(windowMinutes),validWindow=Number.isInteger(minutes)&&minutes>=0&&minutes<=30;
 const windowSet=data.joinWindowMinutes!==null&&data.joinWindowMinutes!==undefined;
 const configured=data.meetingStates?.some(x=>x.occurrenceId===occurrence&&x.configured);
 const canSave=!busy&&!!occurrence&&sourceVerified&&!!url&&windowSet&&!!future.find(o=>o.id===occurrence)?.verified;
 return <details className={css.panel} data-testid="wm-meeting-access">
  <summary>Meeting link</summary><div className={css.content}>
   <p>Choose a confirmed gathering and add its Zoom link. Only people with joining access can open it.</p>
   <label>Join window (0 to 30 minutes before start)<input type="number" min="0" max="30" step="1" value={windowMinutes} onChange={e=>setWindowMinutes(e.target.value)}/></label>
   <button className={css.secondary} disabled={busy||!validWindow} onClick={()=>void save('/api/morning-prayer/meeting',versioned({type:'set_window',windowMinutes:minutes}),'Joining window saved.')}>Save joining window</button>
   <label>Verified upcoming gathering<select value={occurrence} onChange={e=>{setOccurrence(e.target.value);setUrl('');setSourceVerified(false);}}>
    <option value="">Select a gathering</option>{future.map(o=><option key={o.id} value={o.id}>{dayLabel(o.date)} · {o.verified?'Verified date':'Date unverified'}</option>)}
   </select></label>
   {occurrence&&<p className={css.help}>{configured?'Encrypted meeting access is configured.':'Meeting link not configured or has been revoked.'}</p>}
   <label>Official Zoom join link<input type="password" value={url} autoComplete="off" spellCheck={false} placeholder="https://us06web.zoom.us/j/..." onChange={e=>{setUrl(e.target.value);setSourceVerified(false);}}/></label>
   <label className={css.check}><input type="checkbox" checked={sourceVerified} onChange={e=>setSourceVerified(e.target.checked)}/>I verified this link and the exact occurrence against an authorized source.</label>
   <div className={css.actions}>
    <button className={css.primary} disabled={!canSave} onClick={()=>void save('/api/morning-prayer/meeting',versioned({type:'configure_meeting',occurrenceId:occurrence,url}),'Encrypted link saved for this occurrence.')
     .then(saved=>{if(saved){setUrl('');setSourceVerified(false);}})}>Save verified Zoom link</button>
    <button className={css.secondary} disabled={busy||!occurrence} onClick={()=>{
     if(window.confirm('Revoke joining access for this occurrence?'))void save('/api/morning-prayer/meeting',versioned({type:'revoke_meeting',occurrenceId:occurrence}),'Joining access revoked.');
    }}>Revoke access</button>
   </div>
  </div>
 </details>;
}

function RevisionEditor({visible,data,busy,save,versioned}:Panel){
 const [key,setKey]=useState(''),[title,setTitle]=useState(''),[summary,setSummary]=useState('');
 const [items,setItems]=useState(''),[source,setSource]=useState(''),[checked,setChecked]=useState(false);
 const catalog=data.materialCatalog||data.materials||[];
 if(!visible)return null;
 const current=catalog.find(x=>x.key===key);
 /** Any wording change clears the source attestation. */
 const change=(set:(value:string)=>void)=>(value:string)=>{set(value);setChecked(false);};
 function load(m:Material){
  setKey(m.key);setTitle(m.body.title);setSummary(m.body.summary);
  setItems(m.body.items.join('\n'));setSource(m.body.sourceLabel);setChecked(false);
 }
 return <details className={css.panel} data-testid="wm-revision-editor">
  <summary>Edit a reading or PWP</summary><div className={css.content}>
   <p>Save a new draft. The current published version stays in place until the replacement is reviewed.</p>
   <label>Material to revise<select value={key} onChange={e=>{const m=catalog.find(x=>x.key===e.target.value);if(m)load(m);else setKey('');}}>
    <option value="">Choose a draft, reading or PWP</option>{catalog.map(m=><option key={m.key} value={m.key}>{m.body.title}</option>)}
   </select></label>
   {current&&<>
    <label>Title<input value={title} maxLength={100} onChange={e=>change(setTitle)(e.target.value)}/></label>
    <label>Source-supported summary<textarea value={summary} maxLength={400} rows={3} onChange={e=>change(setSummary)(e.target.value)}/></label>
    <label>Points (one per line)<textarea rows={4} value={items} onChange={e=>change(setItems)(e.target.value)}/></label>
    <label>Source reference<input value={source} maxLength={100} onChange={e=>change(setSource)(e.target.value)}/></label>
    <label className={css.check}><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>I checked this revision against the approved source.</label>
    <button className={css.primary} disabled={busy} onClick={()=>void save('/api/morning-prayer/command',
     versioned({type:'material_draft',key:current.key,sourceChecked:checked,body:{title,summary,items:lines(items),sourceLabel:source}}),
     'A reviewable material correction was created; the old version remains published.')}>Create reviewable correction</button>
   </>}
  </div>
 </details>;
}

function MemberAccess({visible,busy,save,versioned,roster,rosterError}:Panel&{roster:Roster|null;rosterError:string}){
 const [chosen,setChosen]=useState(''),[grantCaps,setGrantCaps]=useState<Capability[]>([]),[search,setSearch]=useState('');
 useEffect(()=>{if(!roster)return;const pick=roster.members.find(x=>x.id===chosen&&x.id!==roster.ownerId);if(pick)setGrantCaps(pick.capabilities);},[roster,chosen]);
 if(!visible)return null;
 const accessLevel=grantCaps.length?(Object.keys(PRESETS).find(level=>PRESETS[level].length===grantCaps.length&&PRESETS[level].every(cap=>grantCaps.includes(cap)))||'Custom'):'';
 const selected=roster?.members.find(x=>x.id===chosen);
 const others=(roster?.members||[]).filter(x=>x.id!==roster?.ownerId);
 const query=search.toLocaleLowerCase();
 const listed=others.filter(m=>m.name.toLocaleLowerCase().includes(query)||m.placement.toLocaleLowerCase().includes(query));
 const roleLabel=(m:Member)=>m.status==='active'?(m.moduleAccess?'Has module access':'Not assigned'):'Not eligible for new access';
 const access=(action:Record<string,unknown>,success:string)=>void save('/api/morning-prayer/access',versioned(action),success);
 return <section className={css.panel} data-testid="wm-member-access">
  <h2>People</h2>
  <p>Choose who can use Morning Prayer and who can host.</p>
  {rosterError&&<p role="status">{rosterError}</p>}
  {!roster&&!rosterError&&<p>Checking whether your account can manage member access…</p>}
  {roster&&<>
   <p className={css.help}>Only the app owner can change access.</p>
   <label>Find a member<input value={search} placeholder="Name or assigned group" onChange={e=>setSearch(e.target.value)}/></label>
   <label>Member<select value={chosen} onChange={e=>{setChosen(e.target.value);setGrantCaps(roster.members.find(x=>x.id===e.target.value)?.capabilities||[]);}}>
    <option value="">Choose an eligible member</option>{listed.map(m=><option key={m.id} value={m.id}>{m.name} · {m.status==='active'?m.placement:'Not active'}</option>)}
   </select></label>
   {others.length===0&&<p className={css.empty}>No members to manage yet. Members appear after their enrollment is confirmed.</p>}
   {selected&&<div className={css.accessEditor}>
    <strong>{selected.name}</strong><p>{selected.placement} · {roleLabel(selected)}</p>
    <label>Access level<select value={accessLevel} onChange={e=>setGrantCaps(PRESETS[e.target.value]||[])}>
     <option value="">Choose an access level</option><option value="Custom" disabled>Custom access</option>{Object.keys(PRESETS).map(p=><option key={p} value={p}>{p}</option>)}
    </select></label>
    <details className={css.custom}><summary>Customize access</summary><fieldset className={css.permissions}><legend>Individual capabilities</legend>{CAPS.map(c=>
     <label key={c}><input type="checkbox" checked={grantCaps.includes(c)} onChange={e=>setGrantCaps(v=>e.target.checked?[...v,c]:v.filter(x=>x!==c))}/>
      <span><strong>{CAP_LABELS[c]}</strong><small>{CAP_DESCRIPTIONS[c]}</small></span></label>)}
    </fieldset></details>
    <button className={css.primary} disabled={busy||selected.status!=='active'||!selected.enabled||!grantCaps.includes('view_schedule')}
     onClick={()=>access({type:'grant',memberId:selected.id,capabilities:grantCaps},'Saved explicit member permissions.')}>Save access</button>
    <div className={css.actions}>
     <button className={css.secondary} disabled={busy||!selected.capabilities.includes('volunteer_host')||selected.hostEligible}
      onClick={()=>access({type:'eligibility',memberId:selected.id,enabled:true},'Host eligibility enabled.')}>Allow hosting</button>
     <button className={css.secondary} disabled={busy||!selected.hostEligible}
      onClick={()=>access({type:'eligibility',memberId:selected.id,enabled:false},'Host eligibility ended.')}>Pause hosting</button>
     <button className={css.danger} disabled={busy||!selected.moduleAccess} onClick={()=>{
      if(window.confirm('Revoke all Morning Prayer permissions for '+selected.name+'? Existing assignment history remains.'))access({type:'revoke',memberId:selected.id},'Morning Prayer access revoked.');
     }}>Revoke access</button>
    </div>
    <p className={css.help}>Removing access keeps past records. Review any future hosting assignments separately.</p>
   </div>}
  </>}
 </section>;
}
