'use client';
import {useEffect,useState,useRef} from 'react';
import {CATALOG,PERIODS} from '../../lib/worship-duty/domain';
import {parseSetupState,parseSetupCommand} from '../../lib/worship-duty/setup-contract';
import type {SetupState,SetupService,SetupSong} from '../../lib/worship-duty/setup-contract';
import {serviceInstant,serviceLabel,serviceLocalTime} from '../../lib/worship-duty/service-time';
import AppHeader from '../app-header';
import ServiceTime from './service-time';
import './worship-duty.css';
type Save=(c:Record<string,unknown>)=>Promise<boolean>;
export default function SetupWorkspace(){
 const [data,setData]=useState<SetupState|null>(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[memberId,setMemberId]=useState('');
 const alive=useRef(true),write=useRef(false);
 async function request(c?:Record<string,unknown>){
  const r=await fetch('/api/worship-duty/setup',{method:c?'POST':'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000),headers:c?{'Content-Type':'application/json'}:undefined,body:c?JSON.stringify(parseSetupCommand(c)):undefined});
  if(!r.headers.get('content-type')?.includes('application/json'))throw new Error('Setup response could not be verified.');
  const v=await r.json();if(!r.ok){if(r.status===401||r.status===403){setData(null);setMemberId('');}throw new Error(typeof v.error==='string'?v.error:'Setup is unavailable.');}return v;
 }
 async function load(){try{const d=parseSetupState(await request());if(alive.current){setData(d);setLocked(false);setError('');}return true;}catch(e){if(alive.current){setError(e instanceof Error?e.message:'Unable to load setup.');setLocked(true);}return false;}}
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[]);
 const save:Save=async c=>{
  if(write.current||locked)return false;write.current=true;setBusy(true);setMessage('');setError('');let accepted=false;
  try{await request(c);accepted=true;const ok=await load();if(alive.current)setMessage(ok?'Saved and verified.':'Saved, but the refreshed state is unavailable. Reload before another change.');return ok;}
  catch(e){if(alive.current){setError(e instanceof Error?e.message:'Save could not be verified.');setLocked(true);if(!accepted)setMessage('Reload to verify the saved state before trying again.');}return false;}
  finally{write.current=false;if(alive.current)setBusy(false);}
 };
 const m=data?.members.find(m=>m.id===memberId);
 const toggle=(on:boolean,yes:string,no:string)=>on?no:yes;
 return <div className="ui-page wd-page"><AppHeader homeHref="/members"><div className="wd-header-actions"><a className="ui-link" href="/modules/worship-duty">Worship Duty</a><button type="button" className="ui-button ui-button-quiet" disabled={busy} onClick={()=>void load()}>Reload setup</button></div></AppHeader><main className="ui-main ui-narrow wd-main">
  <p className="ui-kicker">Worship Duty</p><h1 className="ui-title">Setup</h1><p className="ui-lede">Services, approved participation and separate department permissions.</p>
  {message&&<p role="status" className="ui-notice" data-tone={message==='Saved and verified.'?'success':'warning'}>{message}</p>}{error&&<p role="alert" className="ui-notice" data-tone="danger">{error}</p>}
  {!data&&!error&&<p className="ui-empty" role="status">Loading authorized setup…</p>}
  {data&&<fieldset className="wd-controls" disabled={busy||locked}>
   <h2 className="ui-section-title">Create service</h2><p className="ui-hint">Times are always Las Vegas time. New services start as drafts.</p><ServiceForm save={save}/>
   <h2 className="ui-section-title">Services</h2>{data.servicesHasMore&&<p className="ui-notice" data-tone="warning">Only the first 120 services in the coming year are shown.</p>}{!data.services.length&&<p className="ui-empty">No services have been created.</p>}<ul className="ui-list">{data.services.map(s=><ServiceRow key={`${s.id}:${s.version}`} s={s} save={save}/>)}</ul>
   <h2 className="ui-section-title">Approved personnel</h2><p className="ui-hint">Members must first be verified and placed through <a className="ui-link" href="/members/manage">member administration</a>. The Unassigned owner can configure this module without being scheduled for a duty.</p>
    {data.membersHasMore&&<p className="ui-notice" data-tone="warning">The first 200 active members are shown. An omitted member is not confirmed ineligible.</p>}
    <label className="ui-field">Member<select className="ui-input" value={memberId} onChange={e=>setMemberId(e.target.value)}><option value="">Choose a verified member</option>{data.members.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    {m&&<div className="ui-surface wd-form" key={`${m.id}:${data.version}`}><h3 className="wd-subhead">{m.name}</h3><p className="ui-hint">Approve a serving department, then module access, then individual qualifications.</p>
     <div className="ui-row wd-row-action"><div className="ui-row-body"><strong>Module access</strong><small>{m.hasAccess?'Approved':'Not approved'}</small></div><button type="button" className="ui-button ui-button-secondary" onClick={()=>void save({op:'access',memberId:m.id,enabled:!m.hasAccess,expectedVersion:data.version})}>{toggle(m.hasAccess,'Approve module access','Revoke module access')}</button></div>
     {data.departments.map(d=><details className="wd-details" key={d}><summary>{d}{m.departments.includes(d)?' (serving)':''}</summary><div className="wd-actions">
      <button type="button" className="ui-button ui-button-secondary" onClick={()=>void save({op:'participation',memberId:m.id,department:d,enabled:!m.departments.includes(d),expectedVersion:data.version})}>{toggle(m.departments.includes(d),'Approve participation','End participation')}</button>
      {m.departments.includes(d)&&<><button type="button" className="ui-button ui-button-secondary" onClick={()=>void save({op:'manager',memberId:m.id,department:d,enabled:!m.managerDepartments.includes(d),expectedVersion:data.version})}>{toggle(m.managerDepartments.includes(d),'Grant department scheduling','End department scheduling')}</button><button type="button" className="ui-button ui-button-secondary" onClick={()=>void save({op:'manual',memberId:m.id,department:d,enabled:!m.manualDepartments.includes(d),expectedVersion:data.version})}>{toggle(m.manualDepartments.includes(d),'Manual assignments only','Allow reviewed suggestions')}</button></>}
     </div>{m.departments.includes(d)&&<div className="wd-checks">{CATALOG.filter(c=>c.department===d).map(c=><label key={c.id}><input type="checkbox" checked={m.duties.includes(c.id)} onChange={e=>void save({op:'qualify',memberId:m.id,dutyId:c.id,enabled:e.target.checked,expectedVersion:data.version})}/>{c.label}</label>)}</div>}</details>)}
     <div className="ui-row wd-row-action"><div className="ui-row-body"><strong>Song editing</strong><small>Separate from department scheduling and assigned Presider access.</small></div><button type="button" className="ui-button ui-button-secondary" onClick={()=>void save({op:'song_editor',memberId:m.id,enabled:!m.songEditor,expectedVersion:data.version})}>{toggle(m.songEditor,'Appoint song editor','End song-editor appointment')}</button></div>
     <h3 className="wd-subhead">Service availability</h3><p className="ui-hint">A service exception overrides the member's day or weekly setting. Existing assignments stay in place and show a conflict.</p>
     {data.services.filter(s=>s.status!=='cancelled'&&Date.parse(s.startsAt)>Date.now()).map(s=>{const a=m.serviceAvailability.find(a=>a.serviceId===s.id);return <label className="ui-field" key={s.id}>{s.worship} · {serviceLabel(s.startsAt)}<select className="ui-input" value={a===undefined?'':a.available?'true':'false'} onChange={e=>void save({op:'service_availability',memberId:m.id,serviceId:s.id,available:e.target.value==='true',expectedAvailabilityVersion:m.availabilityVersion,expectedVersion:data.version})}><option value="" disabled>Use member's normal availability</option><option value="true">Available for this service</option><option value="false">Unavailable for this service</option></select></label>;})}
    </div>}
   <h2 className="ui-section-title">Approved song catalog</h2><SongForm version={data.version} save={save}/>{data.songsHasMore&&<p className="ui-notice" data-tone="warning">Only the first 500 catalog entries are shown.</p>}<ul className="ui-list">{data.songs.map(s=><li key={`${s.id}:${data.version}`}><details className="wd-details"><summary>{s.code} | {s.title}{s.active?'':' (archived)'}</summary><SongForm song={s} version={data.version} save={save}/></details></li>)}</ul><p className="ui-hint">Used song details remain historical. Add a new catalog revision to change a used song. Archiving keeps saved plans.</p>
  </fieldset>}
 </main></div>;
}
function ServiceForm({s,save}:{s?:SetupService;save:Save}){
 const [error,setError]=useState('');
 return <form className="ui-surface wd-form wd-grid-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setError('');try{await save({op:s?'move':'create',...(s?{serviceId:s.id,expectedVersion:s.version}:{}),worship:f.get('worship'),period:f.get('period'),startsAt:serviceInstant(String(f.get('start'))),endsAt:serviceInstant(String(f.get('end')))});}catch(e){setError(e instanceof Error?e.message:'Choose valid service details.');}}}>
  <label className="ui-field">Worship type<input className="ui-input" name="worship" required minLength={2} maxLength={80} defaultValue={s?.worship??'Sabbath Day'}/></label>
  <label className="ui-field">Period<select className="ui-input" name="period" defaultValue={s?.period??'Morning'}>{PERIODS.map(p=><option key={p}>{p}</option>)}</select></label>
  <label className="ui-field">Starts (Las Vegas)<input className="ui-input" type="datetime-local" name="start" required defaultValue={s?serviceLocalTime(s.startsAt):undefined}/></label><label className="ui-field">Ends (Las Vegas)<input className="ui-input" type="datetime-local" name="end" required defaultValue={s?serviceLocalTime(s.endsAt):undefined}/></label>
  {error&&<p role="alert" className="ui-notice" data-tone="danger">{error}</p>}<button type="submit" className="ui-button">{s?'Save service details':'Create draft service'}</button>
 </form>;
}
function ServiceRow({s,save}:{s:SetupService;save:Save}){
 const [edit,setEdit]=useState(false);const closed=s.status==='cancelled'||Date.parse(s.startsAt)<=Date.now();
 return <li className="wd-editor"><div className="ui-row wd-entry"><ServiceTime startsAt={s.startsAt}/><div className="ui-row-body"><strong>{s.worship} · {s.period}</strong><small>{s.status==='draft'?'Draft':s.status==='published'?'Published':'Cancelled'}</small></div></div>{!closed&&<><div className="wd-actions"><button type="button" className="ui-button ui-button-secondary" onClick={()=>setEdit(!edit)}>{edit?'Close editor':'Edit service'}</button>{s.status==='draft'&&<button type="button" className="ui-button ui-button-secondary" onClick={()=>{if(window.confirm('Publish this service and its reviewed assignments to members?'))void save({op:'publish',serviceId:s.id,expectedVersion:s.version});}}>Publish service</button>}<button type="button" className="ui-button ui-button-quiet" onClick={()=>{if(window.confirm('Cancel this service? Its assignments and history will be retained.'))void save({op:'cancel',serviceId:s.id,expectedVersion:s.version});}}>Cancel service</button></div>{edit&&<ServiceForm s={s} save={save}/>}</>}</li>;
}
function SongForm({song,version,save}:{song?:SetupSong;version:number;save:Save}){
 return <form className="ui-surface wd-form wd-grid-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void save({op:song?'song_update':'song',...(song?{songId:song.id,active:f.get('active')==='on'}:{}),code:f.get('code'),title:f.get('title'),seconds:Number(f.get('seconds')),expectedVersion:version});}}>
  <label className="ui-field">Song code<input className="ui-input" name="code" required maxLength={30} defaultValue={song?.code}/></label><label className="ui-field">Song title<input className="ui-input" name="title" required maxLength={150} defaultValue={song?.title}/></label><label className="ui-field">Duration (seconds)<input className="ui-input" name="seconds" type="number" min={1} max={3600} required defaultValue={song?.seconds}/></label>
  {song&&<label className="wd-check"><input type="checkbox" name="active" defaultChecked={song.active}/>Active catalog entry</label>}<button type="submit" className="ui-button ui-button-secondary">{song?'Save catalog entry':'Add approved song'}</button>
 </form>;
}
