'use client';
import {useEffect,useMemo,useState} from 'react';
import {scheduleCandidates,vegasToday,vegasInstant} from '../../lib/morning-prayer/time';
import css from './operations.module.css';

export type WMCapability='view_schedule'|'join_gathering'|'volunteer_host'|'review_requests'|'manage_schedule'|'view_materials'|'edit_materials'|'publish_materials';
export type WMOcc={id:string;date:string;startsAt:string;endsAt:string;kind:'gathering'|'app_day'|'cancelled';host:string;verified:boolean;hostConfirmed:boolean;revision:number;readingKey?:string|null};
export type WMMaterial={key:string;kind:'pwp'|'reading';revision:number;body:{title:string;summary:string;items:string[];sourceLabel:string}};
export type WMScope={version:number;occurrences:WMOcc[];materials?:WMMaterial[];materialCatalog?:WMMaterial[];capabilities:WMCapability[];meetingStates?:{occurrenceId:string;ready:boolean;configured:boolean}[];joinWindowMinutes?:number|null};
type WMMember={id:string;name:string;status:string;placement:string;enabled:boolean;capabilities:WMCapability[];hostEligible:boolean;moduleAccess:boolean};
type WMRoster={ownerId:string;version:number;members:WMMember[]};
const caps:WMCapability[]=['view_schedule','join_gathering','view_materials','volunteer_host','review_requests','manage_schedule','edit_materials','publish_materials'];
const descriptions:Record<WMCapability,string>={
 view_schedule:'View gathering times and personal requests',
 join_gathering:'Open verified Zoom access during meeting window',
 view_materials:'Read published PWP and daily readings',
 volunteer_host:'Request available hosting dates',
 review_requests:'Approve or decline hosting requests',
 manage_schedule:'Configure the schedule and assign hosts',
 edit_materials:'Prepare source-checked drafts',
 publish_materials:'Publish reviewed material versions'
};
const presets:Record<string,WMCapability[]>={
 'Member':['view_schedule','join_gathering','view_materials'],
 'Host':['view_schedule','join_gathering','view_materials','volunteer_host'],
 'Coordinator':['view_schedule','join_gathering','view_materials','review_requests','manage_schedule'],
 'Reading editor':['view_schedule','view_materials','edit_materials'],
 'Publisher':['view_schedule','view_materials','publish_materials']
};
const dateText=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
async function post<T>(path:string,payload:unknown):Promise<T>{
 const response=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await response.json().catch(()=>({error:'Unable to read the server response.'}));
 if(!response.ok)throw new Error(data.error||'Action could not be saved.');
 return data as T;
}
const makeKey=()=>crypto.randomUUID();
function useOwnerRoster(version:number){
 const [roster,setRoster]=useState<WMRoster|null>(null),[denied,setDenied]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  void (async()=>{
   try{
    const r=await fetch('/api/morning-prayer/access',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
    if(r.status===403){setDenied(true);setRoster(null);return;}
    if(!r.ok)throw new Error('Member permissions could not be loaded.');
    const value=await r.json() as WMRoster;
    if(!controller.signal.aborted){setDenied(false);setError('');setRoster(value);}
   }catch(e){if(!controller.signal.aborted){setRoster(null);setError(e instanceof Error?e.message:'Permission service unavailable.');}}
  })();
  return()=>controller.abort();
 },[version]);
 return {roster,denied,error};
}
export default function MorningPrayerOperations({data,onReload,onNotice}:{data:WMScope;onReload:()=>Promise<void>;onNotice:(message:string)=>void}){
 const allowed=(cap:WMCapability)=>data.capabilities.includes(cap);
 const manage=allowed('manage_schedule'),canEdit=allowed('edit_materials');
 const {roster,denied,error:rosterError}=useOwnerRoster(data.version);
 const [busy,setBusy]=useState(false);
 const [moveId,setMoveId]=useState(''),[moveDate,setMoveDate]=useState(vegasToday()),[moveStart,setMoveStart]=useState('07:00'),[moveEnd,setMoveEnd]=useState('07:30'),[confirmMove,setConfirmMove]=useState(false);
 const [from,setFrom]=useState(vegasToday()),[until,setUntil]=useState(vegasToday());
 const [weekdays,setWeekdays]=useState<number[]>([]);
 const [kind,setKind]=useState<'gathering'|'app_day'|'cancelled'>('gathering');
 const [start,setStart]=useState('07:00'),[end,setEnd]=useState('07:30');
 const [planned,setPlanned]=useState<ReturnType<typeof scheduleCandidates>>([]);
 const [acknowledged,setAcknowledged]=useState(false);
 const [chosenMember,setChosenMember]=useState(''),[grantCaps,setGrantCaps]=useState<WMCapability[]>([]);
 const [memberSearch,setMemberSearch]=useState('');
 const [windowMinutes,setWindowMinutes]=useState(String(data.joinWindowMinutes??10));
 const [meetingOccurrence,setMeetingOccurrence]=useState(''),[meetingUrl,setMeetingUrl]=useState(''),[sourceVerified,setSourceVerified]=useState(false);
 const [revisionKey,setRevisionKey]=useState(''),[revisionTitle,setRevisionTitle]=useState(''),[revisionSummary,setRevisionSummary]=useState(''),
 [revisionItems,setRevisionItems]=useState(''),[revisionSource,setRevisionSource]=useState(''),[revisionChecked,setRevisionChecked]=useState(false);
 const selected=roster?.members.find(x=>x.id===chosenMember);
 const availableMembers=(roster?.members||[]).filter(x=>x.id!==roster?.ownerId);
 const listed=availableMembers.filter(m=>m.name.toLocaleLowerCase().includes(memberSearch.toLocaleLowerCase())||
 m.placement.toLocaleLowerCase().includes(memberSearch.toLocaleLowerCase()));
 const catalog=data.materialCatalog||data.materials||[];
 const current=useMemo(()=>catalog.find(x=>x.key===revisionKey),[catalog,revisionKey]);
 const future=data.occurrences.filter(x=>x.kind==='gathering'&&x.date>=vegasToday());
 useEffect(()=>{setWindowMinutes(String(data.joinWindowMinutes??10));},[data.joinWindowMinutes]);
 useEffect(()=>{if(!roster)return;const pick=roster.members.find(x=>x.id===chosenMember&&x.id!==roster.ownerId);if(pick)setGrantCaps(pick.capabilities);},[roster,chosenMember]);
 async function save(path:string,payload:unknown,success:string){
  if(busy)return;setBusy(true);
  try{await post(path,payload);onNotice(success);await onReload();}
  catch(e){onNotice(e instanceof Error?e.message:'Unable to save your changes.');await onReload().catch(()=>{});}
  finally{setBusy(false);}
 }
 const withVersion=(action:Record<string,unknown>)=>({key:makeKey(),expectedVersion:data.version,action});
 function previewDates(){
  setPlanned([]);setAcknowledged(false);
  try{const list=scheduleCandidates(from,until,weekdays,start,end,kind);setPlanned(list);onNotice('Review '+list.length+' exact dates before saving. All new dates remain unverified.');}
  catch(e){onNotice(e instanceof Error?e.message:'Choose a valid schedule.');}
 }
 const inputMaterial=(m:WMMaterial)=>{
  setRevisionKey(m.key);setRevisionTitle(m.body.title);setRevisionSummary(m.body.summary);
  setRevisionItems(m.body.items.join('\n'));setRevisionSource(m.body.sourceLabel);setRevisionChecked(false);
 };
 const roleLabel=(m:WMMember)=>m.status==='active'?(m.moduleAccess?'Has module access':'Not assigned'):'Not eligible for new access';
 return <div className={css.root}>
  {manage&&<section className={css.panel} data-testid="wm-bulk-schedule">
   <div className={css.heading}><div><h2>Build a recurring schedule</h2><p>Select the actual dates. Nothing repeats automatically or goes live without review.</p></div></div>
   <div className={css.gridTwo}><label>First date<input type="date" value={from} min={vegasToday()} onChange={e=>{setFrom(e.target.value);setPlanned([]);}}/></label>
    <label>Last date<input type="date" value={until} min={from} onChange={e=>{setUntil(e.target.value);setPlanned([]);}}/></label></div>
   <p className={css.help}>Select the weekdays that are really scheduled (up to 180 days ahead).</p>
   <fieldset className={css.weekdays}><legend>Gathering weekdays</legend>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day,n)=>
    <label key={day}><input type="checkbox" checked={weekdays.includes(n)} onChange={e=>{setWeekdays(v=>e.target.checked?[...v,n]:v.filter(x=>x!==n));setPlanned([]);}}/>{day}</label>)}</fieldset>
   <div className={css.gridTwo}><label>Starts (Las Vegas)<input type="time" value={start} onChange={e=>{setStart(e.target.value);setPlanned([]);}}/></label>
    <label>Ends (Las Vegas)<input type="time" value={end} onChange={e=>{setEnd(e.target.value);setPlanned([]);}}/></label></div>
   <label>Type<select value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setPlanned([]);}}>
    <option value="gathering">Zoom gathering</option><option value="app_day">Pray Daily app day, no Zoom</option><option value="cancelled">No gathering / cancelled</option>
   </select></label>
   <button className={css.secondary} onClick={previewDates}>Preview selected dates</button>
   {planned.length>0&&<div className={css.preview} aria-live="polite"><strong>{planned.length} proposed dates</strong>
    <div className={css.datePreview}>{planned.map(x=><span key={x.date}>{dateText(x.date)}</span>)}</div>
    <p>New dates will be saved as <strong>Unverified</strong>. Existing dates are never overwritten; any conflict rejects the entire batch.</p>
    <label className={css.check}><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/>I verified this selected range against the official schedule.</label>
    <button className={css.primary} disabled={!acknowledged||busy} onClick={()=>void save('/api/morning-prayer/batch',{expectedVersion:data.version,key:makeKey(),occurrences:planned},'Dates saved. Review each date before enabling participation.').then(()=>{setPlanned([]);setAcknowledged(false);})}>Save {planned.length} dates</button>
   </div>}
  </section>}
  {manage&&<section className={css.panel} data-testid="wm-reschedule">
   <h2>Reschedule an existing gathering</h2>
   <p>Changes retain the same occurrence and assignment history but invalidate Zoom access, host confirmation, and pending volunteer requests until reviewed.</p>
   <label>Scheduled occurrence<select value={moveId} onChange={e=>{setMoveId(e.target.value);setConfirmMove(false);}}>
    <option value="">Select a future occurrence</option>{future.map(o=><option key={o.id} value={o.id}>{dateText(o.date)} · {o.host}</option>)}
   </select></label>
   <div className={css.gridTwo}><label>New Las Vegas date<input type="date" min={vegasToday()} value={moveDate} onChange={e=>{setMoveDate(e.target.value);setConfirmMove(false);}}/></label>
    <label>New start<input type="time" value={moveStart} onChange={e=>{setMoveStart(e.target.value);setConfirmMove(false);}}/></label></div>
   <label>New end<input type="time" value={moveEnd} onChange={e=>{setMoveEnd(e.target.value);setConfirmMove(false);}}/></label>
   <label className={css.check}><input type="checkbox" checked={confirmMove} onChange={e=>setConfirmMove(e.target.checked)}/>I confirmed the new time with the gathering coordinator.</label>
   <button className={css.primary} disabled={!moveId||!confirmMove||busy} onClick={()=>{
    try{
     const startIso=vegasInstant(moveDate,moveStart),endIso=vegasInstant(moveDate,moveEnd);
     if(Date.parse(endIso)<=Date.parse(startIso))throw new Error('The end time must follow the start time.');
     void save('/api/morning-prayer/command',withVersion({type:'schedule',mode:'move',occurrenceId:moveId,startsAt:startIso,endsAt:endIso}),
      'Gathering rescheduled. Verify its date/time again, then re-confirm the host and Zoom link.').then(()=>setConfirmMove(false));
    }catch(e){onNotice(e instanceof Error?e.message:'Choose a valid time.');}
   }}>Save rescheduled date</button>
  </section>}
  {manage&&<section className={css.panel} data-testid="wm-meeting-access">
   <h2>Private Zoom access</h2>
   <p>Meeting links are stored encrypted in Supabase Vault and are never part of the schedule or member directory. Only permitted members can open them during the verified gathering window.</p>
   <label>Join window (0 to 30 minutes before start)<input type="number" min="0" max="30" step="1" value={windowMinutes} onChange={e=>setWindowMinutes(e.target.value)}/></label>
   <button className={css.secondary} disabled={busy||!Number.isInteger(Number(windowMinutes))||Number(windowMinutes)<0||Number(windowMinutes)>30} onClick={()=>void save('/api/morning-prayer/meeting',withVersion({type:'set_window',windowMinutes:Number(windowMinutes)}),'Joining window saved.')}>Save joining window</button>
   <label>Verified upcoming gathering<select value={meetingOccurrence} onChange={e=>{setMeetingOccurrence(e.target.value);setMeetingUrl('');setSourceVerified(false);}}>
    <option value="">Select a gathering</option>{future.map(o=><option key={o.id} value={o.id}>{dateText(o.date)} · {o.verified?'Verified date':'Date unverified'}</option>)}
   </select></label>
   {meetingOccurrence&&<p className={css.help}>{data.meetingStates?.some(x=>x.occurrenceId===meetingOccurrence&&x.configured)?'Encrypted meeting access is configured.':'Meeting link not configured or has been revoked.'}</p>}
   <label>Official Zoom join link<input type="password" value={meetingUrl} autoComplete="off" spellCheck={false} placeholder="https://us06web.zoom.us/j/..." onChange={e=>{setMeetingUrl(e.target.value);setSourceVerified(false);}}/></label>
   <label className={css.check}><input type="checkbox" checked={sourceVerified} onChange={e=>setSourceVerified(e.target.checked)}/>I verified this link and the exact occurrence against an authorized source.</label>
   <div className={css.actions}>
    <button className={css.primary} disabled={busy||!meetingOccurrence||!sourceVerified||!meetingUrl||data.joinWindowMinutes===null||data.joinWindowMinutes===undefined||!future.find(o=>o.id===meetingOccurrence)?.verified} onClick={()=>void save('/api/morning-prayer/meeting',withVersion({type:'configure_meeting',occurrenceId:meetingOccurrence,url:meetingUrl}),'Encrypted link saved for this occurrence.').then(()=>{setMeetingUrl('');setSourceVerified(false);})}>Save verified Zoom link</button>
    <button className={css.secondary} disabled={busy||!meetingOccurrence} onClick={()=>{if(window.confirm('Revoke joining access for this occurrence?'))void save('/api/morning-prayer/meeting',withVersion({type:'revoke_meeting',occurrenceId:meetingOccurrence}),'Joining access revoked.');}}>Revoke access</button>
   </div>
  </section>}
  {canEdit&&<section className={css.panel} data-testid="wm-revision-editor">
   <h2>Revise a draft or published material</h2>
   <p>Existing PWP and readings keep their current published version until the new source-checked revision is explicitly published.</p>
   <label>Material to revise<select value={revisionKey} onChange={e=>{const m=catalog.find(x=>x.key===e.target.value);if(m)inputMaterial(m);else setRevisionKey('');}}>
    <option value="">Choose a draft, reading or PWP</option>{catalog.map(m=><option key={m.key} value={m.key}>{m.body.title} · r{m.revision}</option>)}</select></label>
   {current&&<>
    <label>Title<input value={revisionTitle} maxLength={100} onChange={e=>{setRevisionTitle(e.target.value);setRevisionChecked(false);}}/></label>
    <label>Source-supported summary<textarea value={revisionSummary} maxLength={400} rows={3} onChange={e=>{setRevisionSummary(e.target.value);setRevisionChecked(false);}}/></label>
    <label>Points (one per line)<textarea rows={4} value={revisionItems} onChange={e=>{setRevisionItems(e.target.value);setRevisionChecked(false);}}/></label>
    <label>Source reference<input value={revisionSource} maxLength={100} onChange={e=>{setRevisionSource(e.target.value);setRevisionChecked(false);}}/></label>
    <label className={css.check}><input type="checkbox" checked={revisionChecked} onChange={e=>setRevisionChecked(e.target.checked)}/>I checked this revision against the approved source.</label>
    <button className={css.primary} disabled={busy} onClick={()=>void save('/api/morning-prayer/command',withVersion({type:'material_draft',key:current.key,sourceChecked:revisionChecked,body:{title:revisionTitle,summary:revisionSummary,items:revisionItems.split('\n').map(x=>x.trim()).filter(Boolean),sourceLabel:revisionSource}}),'A reviewable material correction was created; the old version remains published.')}>Create reviewable correction</button>
   </>}
  </section>}
  {!denied&&<section className={css.panel} data-testid="wm-member-access">
   <h2>Member access and hosting eligibility</h2>
   <p>Each person requires an explicit Morning Prayer grant. A leadership or department title alone does not grant access.</p>
   {rosterError&&<p role="status">{rosterError}</p>}
   {!roster&&!rosterError&&<p>Checking whether your account can manage member access…</p>}
   {roster&&<>
    <p className={css.help}>Only the confirmed LV Zion owner may grant or revoke access. The owner’s own permissions cannot be modified here.</p>
    <label>Find a member<input value={memberSearch} placeholder="Name or assigned group" onChange={e=>setMemberSearch(e.target.value)}/></label>
    <label>Member<select value={chosenMember} onChange={e=>{setChosenMember(e.target.value);const m=roster.members.find(x=>x.id===e.target.value);setGrantCaps(m?.capabilities||[]);}}>
     <option value="">Choose an eligible member</option>{listed.map(m=><option key={m.id} value={m.id}>{m.name} · {m.status==='active'?m.placement:'Not active'}</option>)}</select></label>
    {availableMembers.length===0&&<p className={css.empty}>No other members are active yet. Once members complete enrollment and their placements are verified, they can be granted access here.</p>}
    {selected&&<div className={css.accessEditor}>
     <strong>{selected.name}</strong><p>{selected.placement} · {roleLabel(selected)}</p>
     <label>Quick permission set<select value="" onChange={e=>setGrantCaps(presets[e.target.value]||[])}>
      <option value="">Choose a preset</option>{Object.keys(presets).map(p=><option key={p} value={p}>{p}</option>)}</select></label>
     <fieldset className={css.permissions}><legend>Individual capabilities</legend>{caps.map(c=><label key={c}><input type="checkbox" checked={grantCaps.includes(c)} onChange={e=>setGrantCaps(v=>e.target.checked?[...v,c]:v.filter(x=>x!==c))}/><span><strong>{c.replaceAll('_',' ')}</strong><small>{descriptions[c]}</small></span></label>)}</fieldset>
     <button className={css.primary} disabled={busy||selected.status!=='active'||!selected.enabled||!grantCaps.includes('view_schedule')} onClick={()=>void save('/api/morning-prayer/access',withVersion({type:'grant',memberId:selected.id,capabilities:grantCaps}),'Saved explicit member permissions.')} >Save member capabilities</button>
     <div className={css.actions}><button className={css.secondary} disabled={busy||!selected.capabilities.includes('volunteer_host')||selected.hostEligible} onClick={()=>void save('/api/morning-prayer/access',withVersion({type:'eligibility',memberId:selected.id,enabled:true}),'Host eligibility enabled.')}>Allow hosting</button>
      <button className={css.secondary} disabled={busy||!selected.hostEligible} onClick={()=>void save('/api/morning-prayer/access',withVersion({type:'eligibility',memberId:selected.id,enabled:false}),'Host eligibility ended.')}>Pause hosting</button>
      <button className={css.danger} disabled={busy||!selected.moduleAccess} onClick={()=>{if(window.confirm('Revoke all Morning Prayer permissions for '+selected.name+'? Existing assignment history remains.'))void save('/api/morning-prayer/access',withVersion({type:'revoke',memberId:selected.id}),'Morning Prayer access revoked.');}}>Revoke access</button>
     </div>
     <p className={css.help}>Revoking a host does not silently reassign their existing dates. Coordinators should review those assignments.</p>
    </div>}
   </>}
  </section>}
 </div>;
}
