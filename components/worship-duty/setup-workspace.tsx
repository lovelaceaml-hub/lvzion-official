'use client';
import {useEffect,useState,useRef} from 'react';
import {CATALOG,PERIODS} from '../../lib/worship-duty/domain';
import {parseSetupState,parseSetupCommand} from '../../lib/worship-duty/setup-contract';
import type {SetupState,SetupService,SetupSong} from '../../lib/worship-duty/setup-contract';
import {serviceInstant,serviceLocalTime} from '../../lib/worship-duty/service-time';
import './worship-duty.css';
import './setup-workspace.css';
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
 return <div className="wd-stage"><div className="wd-shell"><header className="wd-header"><a href="/modules/worship-duty">‹ Worship Duty</a><button type="button" disabled={busy} onClick={()=>void load()}>Reload setup</button></header><main className="wd-main">
  <div className="wd-heading"><span className="wd-kicker">WORSHIP DUTY</span><h1>Setup</h1><p>Services, approved participation and independent department permissions.</p></div>
  {message&&<p role="status" className="wd-notice">{message}</p>}{error&&<p role="alert" className="wd-notice wd-error">{error}</p>}
  {!data&&!error&&<p role="status">Loading authorized setup...</p>}
  {data&&<fieldset className="ws-controls" disabled={busy||locked}>
   <section className="wd-card"><h2>Create service</h2><p>Times are always Las Vegas time. New services start as drafts.</p><ServiceForm save={save}/></section>
   <section className="wd-card"><h2>Services</h2>{data.servicesHasMore&&<p className="wd-warning">Only the first 120 services in the coming year are shown.</p>}{!data.services.length&&<p>No services have been created.</p>}{data.services.map(s=><ServiceRow key={`${s.id}:${s.version}`} s={s} save={save}/>)}</section>
   <section className="wd-card"><h2>Approved personnel</h2><p>Members must first be verified and placed through <a href="/members/manage">member administration</a>. The Unassigned owner can configure this module without being scheduled for a duty.</p>
    {data.membersHasMore&&<p className="wd-warning">The first 200 active members are shown. An omitted member is not confirmed ineligible.</p>}
    <label>Member<select value={memberId} onChange={e=>setMemberId(e.target.value)}><option value="">Choose a verified member</option>{data.members.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    {m&&<div key={`${m.id}:${data.version}`}><h3>{m.name}</h3><p>Approve a serving department, then module access, then individual qualifications.</p>
     <button type="button" onClick={()=>void save({op:'access',memberId:m.id,enabled:!m.hasAccess,expectedVersion:data.version})}>{m.hasAccess?'Revoke module access':'Approve module access'}</button>
     {data.departments.map(d=><details key={d}><summary>{d}{m.departments.includes(d)?' (serving)':''}</summary><div className="wd-actions">
      <button type="button" onClick={()=>void save({op:'participation',memberId:m.id,department:d,enabled:!m.departments.includes(d),expectedVersion:data.version})}>{m.departments.includes(d)?'End participation':'Approve participation'}</button>
      {m.departments.includes(d)&&<><button type="button" onClick={()=>void save({op:'manager',memberId:m.id,department:d,enabled:!m.managerDepartments.includes(d),expectedVersion:data.version})}>{m.managerDepartments.includes(d)?'End department scheduling':'Grant department scheduling'}</button><button type="button" onClick={()=>void save({op:'manual',memberId:m.id,department:d,enabled:!m.manualDepartments.includes(d),expectedVersion:data.version})}>{m.manualDepartments.includes(d)?'Allow reviewed suggestions':'Manual assignments only'}</button></>}
     </div>{m.departments.includes(d)&&<div className="ws-qualifications">{CATALOG.filter(c=>c.department===d).map(c=><label key={c.id}><input type="checkbox" checked={m.duties.includes(c.id)} onChange={e=>void save({op:'qualify',memberId:m.id,dutyId:c.id,enabled:e.target.checked,expectedVersion:data.version})}/>{c.label}</label>)}</div>}</details>)}
     <h3>Song editing</h3><p>This permission is independent of department scheduling and assigned Presider access.</p><button type="button" onClick={()=>void save({op:'song_editor',memberId:m.id,enabled:!m.songEditor,expectedVersion:data.version})}>{m.songEditor?'End song-editor appointment':'Appoint song editor'}</button>
     <h3>Service availability</h3><p>A service exception overrides the member's day or weekly setting. Existing assignments remain in place and display a conflict.</p>
     {data.services.filter(s=>s.status!=='cancelled'&&Date.parse(s.startsAt)>Date.now()).map(s=>{const a=m.serviceAvailability.find(a=>a.serviceId===s.id);return <label key={s.id}>{s.worship} | {serviceLocalTime(s.startsAt).replace('T',' ')}<select value={a===undefined?'':a.available?'true':'false'} onChange={e=>void save({op:'service_availability',memberId:m.id,serviceId:s.id,available:e.target.value==='true',expectedAvailabilityVersion:m.availabilityVersion,expectedVersion:data.version})}><option value="" disabled>Use member's normal availability</option><option value="true">Available for this service</option><option value="false">Unavailable for this service</option></select></label>;})}
    </div>}
   </section>
   <section className="wd-card"><h2>Approved song catalog</h2><SongForm version={data.version} save={save}/>{data.songsHasMore&&<p className="wd-warning">Only the first 500 catalog entries are shown.</p>}{data.songs.map(s=><details key={`${s.id}:${data.version}`}><summary>{s.code} | {s.title}{s.active?'':' (archived)'}</summary><SongForm song={s} version={data.version} save={save}/></details>)}<p className="wd-muted">Used song details remain historical. Add a new catalog revision to change a used song. Archiving retains saved plans.</p></section>
  </fieldset>}
 </main></div></div>;
}
function ServiceForm({s,save}:{s?:SetupService;save:Save}){
 const [error,setError]=useState('');
 return <form className="ws-form" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setError('');try{await save({op:s?'move':'create',...(s?{serviceId:s.id,expectedVersion:s.version}:{}),worship:f.get('worship'),period:f.get('period'),startsAt:serviceInstant(String(f.get('start'))),endsAt:serviceInstant(String(f.get('end')))});}catch(e){setError(e instanceof Error?e.message:'Choose valid service details.');}}}>
  <label>Worship type<input name="worship" required minLength={2} maxLength={80} defaultValue={s?.worship??'Sabbath Day'}/></label>
  <label>Period<select name="period" defaultValue={s?.period??'Morning'}>{PERIODS.map(p=><option key={p}>{p}</option>)}</select></label>
  <label>Starts (Las Vegas)<input type="datetime-local" name="start" required defaultValue={s?serviceLocalTime(s.startsAt):undefined}/></label><label>Ends (Las Vegas)<input type="datetime-local" name="end" required defaultValue={s?serviceLocalTime(s.endsAt):undefined}/></label>
  {error&&<p role="alert">{error}</p>}<button type="submit" className="wd-primary">{s?'Save service details':'Create draft service'}</button>
 </form>;
}
function ServiceRow({s,save}:{s:SetupService;save:Save}){
 const [edit,setEdit]=useState(false);const closed=s.status==='cancelled'||Date.parse(s.startsAt)<=Date.now();
 return <div className="ws-row"><h3>{s.worship} | {s.period}</h3><p>{serviceLocalTime(s.startsAt).replace('T',' ')} | {s.status}</p>{!closed&&<><div className="wd-actions"><button type="button" onClick={()=>setEdit(!edit)}>{edit?'Close editor':'Edit service'}</button>{s.status==='draft'&&<button type="button" onClick={()=>{if(window.confirm('Publish this service and its reviewed assignments to members?'))void save({op:'publish',serviceId:s.id,expectedVersion:s.version});}}>Publish service</button>}<button type="button" onClick={()=>{if(window.confirm('Cancel this service? Its assignments and history will be retained.'))void save({op:'cancel',serviceId:s.id,expectedVersion:s.version});}}>Cancel service</button></div>{edit&&<ServiceForm s={s} save={save}/>}</>}</div>;
}
function SongForm({song,version,save}:{song?:SetupSong;version:number;save:Save}){
 return <form className="ws-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void save({op:song?'song_update':'song',...(song?{songId:song.id,active:f.get('active')==='on'}:{}),code:f.get('code'),title:f.get('title'),seconds:Number(f.get('seconds')),expectedVersion:version});}}>
  <label>Song code<input name="code" required maxLength={30} defaultValue={song?.code}/></label><label>Song title<input name="title" required maxLength={150} defaultValue={song?.title}/></label><label>Duration (seconds)<input name="seconds" type="number" min={1} max={3600} required defaultValue={song?.seconds}/></label>
  {song&&<label className="ws-check"><input type="checkbox" name="active" defaultChecked={song.active}/>Active catalog entry</label>}<button type="submit">{song?'Save catalog entry':'Add approved song'}</button>
 </form>;
}
