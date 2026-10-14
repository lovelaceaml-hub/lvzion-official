'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import DisplayVisual from './display-visual';
import type{DisplayKind,DisplaySlide,DisplayStyle}from'../lib/continuous-display/live-contract';
import {churchLocal,churchTimeToUtc,offsetForChurchTime,parseDisplaySlides}from'../lib/continuous-display/live-contract';
import type {DisplayScreenR2} from '../lib/continuous-display/operations';
import {OperatingHoursEditor,PublicationControls,NewScreenEditor,SlideEligibilityEditor} from './display-operations-controls';
type Tab='content'|'playlist'|'publish'|'screens';
const styles:DisplayStyle[]=['editorial','schedule','event','campaign'];
const kinds:DisplayKind[]=['announcement','schedule','event','campaign'];
const capital=(s:string)=>s.slice(0,1).toUpperCase()+s.slice(1);
const defaultWall=(days=0)=>churchLocal(new Date(Date.now()+days*86400000).toISOString());
function newSlide(kind:DisplayKind):DisplaySlide{
 const date=churchLocal(new Date().toISOString()).slice(0,10);
 return{id:'slide-'+crypto.randomUUID().slice(0,12),kind,style:kind==='announcement'?'editorial':kind==='schedule'?'schedule':kind==='event'?'event':'campaign',
  title:'New '+kind,body:'Add approved details before publication.',duration:kind==='schedule'?20:15,
  ...(kind==='schedule'?{date,rows:[{time:'',label:''}]}:{}),
  ...(kind==='event'?{date,time:'',location:''}:{})};
}
export default function DisplayManager(){
 const [screen,setScreen]=useState<DisplayScreenR2|null>(null);
 const [allScreens,setAllScreens]=useState<DisplayScreenR2[]>([]);
 const preferredScreen=useRef<string|null>(null);
 const [slides,setSlides]=useState<DisplaySlide[]>([]);
 const [tab,setTab]=useState<Tab>('content');
 const [selected,setSelected]=useState(0),[status,setStatus]=useState('Loading your authorized displays…');
 const [busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 const [startWall,setStartWall]=useState(defaultWall()),[endWall,setEndWall]=useState(defaultWall(7));
 const [startOffset,setStartOffset]=useState<'-07:00'|'-08:00'>(offsetForChurchTime(new Date().toISOString()));
 const [endOffset,setEndOffset]=useState<'-07:00'|'-08:00'>(offsetForChurchTime(new Date(Date.now()+7*86400000).toISOString()));
 const [pairCode,setPairCode]=useState('');
 const editing=useRef(false);
 const update=(fn:(items:DisplaySlide[])=>DisplaySlide[])=>{setSlides(before=>fn(before));setDirty(true);editing.current=true;};
 const change=(index:number,patch:Partial<DisplaySlide>)=>update(before=>before.map((slide,i)=>i===index?{...slide,...patch}:slide));
 async function load(){
  try{
   const r=await fetch('/api/display/manage',{cache:'no-store',credentials:'same-origin'});
   if(!r.ok){setStatus(r.status===401?'Sign in to manage the church display.':'Display management is not available for this account.');return;}
   const payload=await r.json() as{screens?:DisplayScreenR2[]};
   setAllScreens(payload.screens??[]);
   const next=(payload.screens??[]).find(candidate=>candidate.id===preferredScreen.current)??payload.screens?.[0];
   if(next)preferredScreen.current=next.id;if(!next){setStatus('No display has been assigned to your account.');return;}
   setScreen(next);
   if(!editing.current){
    setSlides(next.items||[]);setSelected(0);setDirty(false);
    const start=next.startsAt||new Date().toISOString();
    const end=next.endsAt||new Date(Date.now()+7*86400000).toISOString();
    setStartWall(churchLocal(start));setEndWall(churchLocal(end));
    setStartOffset(offsetForChurchTime(start));setEndOffset(offsetForChurchTime(end));
   }
   setStatus('');
  }catch{setStatus('The display manager could not connect. Check your network and reload.');}
 }
 useEffect(()=>{void load();const focus=()=>{if(!editing.current)void load();};window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[]);
 async function command(action:string,extra:Record<string,unknown>={}){
  if(!screen||busy)return;
  setBusy(true);setStatus('');
  try{
   const r=await fetch('/api/display/manage',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(action==='createScreen'?{action,...extra}:{action,screenId:screen.id,...extra})});
   const data=await r.json() as Record<string,unknown>;
   if(!r.ok)throw Error(typeof data.error==='string'?data.error:'Display change was rejected.');
   if(action==='pair'&&typeof data.code==='string'){
    setPairCode(data.code);setStatus('One-time pairing code created. It expires in five minutes.');
   }else if(action==='createScreen'&&typeof data.screenId==='string'){
    preferredScreen.current=data.screenId;setPairCode('');
    setStatus('A new disabled screen has been created. Configure and approve it before pairing.');
   }else if(action==='hours')setStatus('Operating hours saved. The screen will show a neutral state outside these hours.');
   else if(action==='restore')setStatus('A previously approved publication was restored as a new version.');
   else if(action==='override')setStatus('Temporary emphasis started for an already approved slide.');
   else if(action==='clearOverride')setStatus('Temporary emphasis ended.');
   else setStatus(action==='save'?'Draft saved. Approval is still required.':action==='approve'?'Exact draft approved. Publishing is a separate action.':action==='publish'?'Approved version published. Paired screens update at a safe transition.':'Device access revoked.');
   if(['save','approve','publish','createScreen'].includes(action)){editing.current=false;setDirty(false);}
   await load();
  }catch(e){setStatus(e instanceof Error?e.message:'Could not complete the change.');}
  finally{setBusy(false);}
 }
 async function save(){
  if(!screen)return;
  try{
   const content=parseDisplaySlides(slides);
   const startsAt=churchTimeToUtc(startWall,startOffset);
   const endsAt=churchTimeToUtc(endWall,endOffset);
   if(Date.parse(endsAt)<=Date.now()||Date.parse(endsAt)<=Date.parse(startsAt))throw Error('The publication end must be after its start and in the future.');
   for(const slide of content)if(slide.startsAt&&slide.endsAt&&
    (Date.parse(slide.startsAt)<Date.parse(startsAt)||Date.parse(slide.endsAt)>Date.parse(endsAt)))
    throw Error('A slide-specific window must stay within the overall approved publication window.');
   await command('save',{expectedVersion:screen.draftVersion,slides:content,startsAt,endsAt});
  }catch(e){setStatus(e instanceof Error?e.message:'Check the content before saving.');}
 }
 const active=slides[selected]??null;
 const canPublish=!!screen&&!dirty&&screen.draftVersion>0&&screen.approvedVersion===screen.draftVersion;
 const fields=(index:number,s:DisplaySlide)=> <div className="cd-fields">
  <label>Content type<select value={s.kind} onChange={e=>{const kind=e.target.value as DisplayKind;change(index,{kind,...(kind==='schedule'&&!s.rows?{rows:[{time:'',label:''}],date:defaultWall().slice(0,10)}:{}),...(kind==='event'?{date:s.date||defaultWall().slice(0,10),time:s.time||'',location:s.location||''}:{})});}}>{kinds.map(k=><option key={k} value={k}>{capital(k)}</option>)}</select></label>
  <label>Presentation style<select value={s.style} onChange={e=>change(index,{style:e.target.value as DisplayStyle})}>{styles.map(v=><option key={v} value={v}>{capital(v)}</option>)}</select></label>
  <label className="cd-span">Headline<input value={s.title} maxLength={74} onChange={e=>change(index,{title:e.target.value})}/></label>
  <label className="cd-span">Supporting message<textarea value={s.body} maxLength={160} rows={3} onChange={e=>change(index,{body:e.target.value})}/></label>
  <label>Duration (seconds)<input type="number" min={8} max={60} value={s.duration} onChange={e=>change(index,{duration:Number(e.target.value)})}/></label>
  <div className="cd-span"><SlideEligibilityEditor slide={s} overallStartsAt={screen?.startsAt||undefined} overallEndsAt={screen?.endsAt||undefined}
   onChange={patch=>change(index,patch)} onError={setStatus}/></div>
  {(s.kind==='schedule'||s.kind==='event')&&<label>Date<input type="date" value={s.date||''} onChange={e=>change(index,{date:e.target.value})}/></label>}
  {s.kind==='event'&&<><label>Event time<input value={s.time||''} maxLength={72} onChange={e=>change(index,{time:e.target.value})}/></label><label>Location<input value={s.location||''} maxLength={72} onChange={e=>change(index,{location:e.target.value})}/></label></>}
  {s.kind==='schedule'&&<div className="cd-span"><strong>Activities (up to three)</strong>{(s.rows??[]).map((r,i)=><div className="cd-row-fields" key={i}>
    <input aria-label={`Time for activity ${i+1}`} value={r.time} placeholder="Time" maxLength={28} onChange={e=>change(index,{rows:(s.rows??[]).map((v,j)=>j===i?{...v,time:e.target.value}:v)})}/>
    <input aria-label={`Activity ${i+1}`} value={r.label} placeholder="Approved activity" maxLength={80} onChange={e=>change(index,{rows:(s.rows??[]).map((v,j)=>j===i?{...v,label:e.target.value}:v)})}/>
    <button type="button" aria-label={`Remove activity ${i+1}`} onClick={()=>change(index,{rows:(s.rows??[]).filter((_,j)=>j!==i)})}>×</button></div>)}
    {(s.rows?.length||0)<3&&<button type="button" className="cd-button cd-light" onClick={()=>change(index,{rows:[...(s.rows??[]),{time:'',label:''}]})}>+ Activity</button>}
   </div>}
 </div>;
 const windowEditor=<div className="cd-window"><h3>Publication window · Las Vegas</h3><p>Times use America/Los_Angeles. Select the correct daylight-saving offset for transition days.</p><div className="cd-fields">
  <label>Begins<input type="datetime-local" value={startWall} onChange={e=>{setStartWall(e.target.value);editing.current=true;setDirty(true);}}/></label>
  <label>UTC offset<select value={startOffset} onChange={e=>{setStartOffset(e.target.value as '-07:00'|'-08:00');editing.current=true;setDirty(true);}}><option value="-07:00">Daylight (PDT −07)</option><option value="-08:00">Standard (PST −08)</option></select></label>
  <label>Expires<input type="datetime-local" value={endWall} onChange={e=>{setEndWall(e.target.value);editing.current=true;setDirty(true);}}/></label>
  <label>UTC offset<select value={endOffset} onChange={e=>{setEndOffset(e.target.value as '-07:00'|'-08:00');editing.current=true;setDirty(true);}}><option value="-07:00">Daylight (PDT −07)</option><option value="-08:00">Standard (PST −08)</option></select></label>
 </div></div>;
 return <main className="cd-manage">
  <header className="cd-head"><Link href="/members">← My Week</Link><p>LV ZION OFFICIAL · APPS</p><h1>Church Display</h1><span>Animated digital billboard · authorized management</span></header>
  <div className="cd-screen-status"><strong>{screen?.label||'Continuous Church Display'}</strong>
    <span>{screen?.enabled?'Paired playback enabled':'No active church TV paired'} · Published v{screen?.publishedVersion||0}</span>
    {allScreens.length>1&&<label className="cd-screen-picker">Choose display
     <select aria-label="Choose display" value={screen?.id??''} onChange={e=>{
      if(dirty&&!window.confirm('Discard unsaved slide changes before switching screens?'))return;
      preferredScreen.current=e.target.value;editing.current=false;setDirty(false);setPairCode('');void load();
     }}>{allScreens.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select>
    </label>}
   </div>
  <nav className="cd-tabs" aria-label="Display management tabs">{(['content','playlist','publish','screens'] as const).map(t=><button key={t} aria-current={tab===t?'page':undefined} onClick={()=>setTab(t)}>{capital(t)}</button>)}</nav>
  {status&&<p className="cd-notice" role="status">{status}</p>}
  {!screen?<p className="cd-empty">The display management module requires an active, explicitly assigned manager grant.</p>:<>
  {tab==='content'&&<section className="cd-panel">
   <div className="cd-heading"><div><h2>Content library</h2><p>Create and review church-approved content. Nothing uploads or publishes automatically.</p></div><button className="cd-button" disabled={busy||slides.length>=16} onClick={()=>{update(a=>[...a,newSlide('announcement')]);setSelected(slides.length);}}>+ Create</button></div>
   {slides.length===0?<div className="cd-empty"><h3>No content yet</h3><p>Start with a church announcement or schedule. The TV displays a neutral welcome until something is approved and published.</p></div>:<>
    <div className="cd-library">{slides.map((s,i)=><button key={s.id} type="button" className={selected===i?'cd-library-item is-selected':'cd-library-item'} onClick={()=>setSelected(i)}><strong>{s.title||'Untitled'}</strong><small>{capital(s.kind)} · {s.duration}s</small></button>)}</div>
    <div className="cd-stage cd-small-preview"><DisplayVisual slide={active} preview/></div>
    {active&&<><h3>Slide {selected+1} · Draft editor</h3>{fields(selected,active)}<button className="cd-button cd-danger" onClick={()=>{update(a=>a.filter((_,i)=>i!==selected));setSelected(Math.max(0,selected-1));}}>Remove slide</button></>}
   </>}
   {windowEditor}<button className="cd-button cd-primary cd-wide" disabled={busy||!dirty} onClick={save}>{busy?'Saving…':'Save draft'}</button>
  </section>}
  {tab==='playlist'&&<section className="cd-panel"><h2>Playlist order</h2><p>Slides loop in this order. Changes remain drafts until separately approved and published.</p>
   {slides.map((s,i)=><div className="cd-order" key={s.id}><span>{i+1}</span><div><strong>{s.title}</strong><small>{s.duration}s · {capital(s.style)}</small></div>
    <button aria-label={`Move ${s.title} earlier`} disabled={i===0} onClick={()=>{update(a=>{const copy=[...a];[copy[i-1],copy[i]]=[copy[i],copy[i-1]];return copy;});setSelected(i-1);}}>↑</button>
    <button aria-label={`Move ${s.title} later`} disabled={i===slides.length-1} onClick={()=>{update(a=>{const copy=[...a];[copy[i+1],copy[i]]=[copy[i],copy[i+1]];return copy;});setSelected(i+1);}}>↓</button>
   </div>)}
   <button className="cd-button cd-primary cd-wide" disabled={busy||!dirty} onClick={save}>Save playlist draft</button>
  </section>}
  {tab==='publish'&&<section className="cd-panel"><h2>Review and publish</h2>
   <div className="cd-meta"><span>Draft revision <strong>v{screen.draftVersion}</strong></span><span>Approved revision <strong>{screen.approvedVersion===null?'None':'v'+screen.approvedVersion}</strong></span><span>Published version <strong>v{screen.publishedVersion}</strong></span></div>
   <div className="cd-stage cd-small-preview"><DisplayVisual slide={slides[0]??null} preview/></div>
   <p>Review all slides, scheduling, names and wording specifically for a common-area TV. Approval for Signal or another app does not authorize a billboard.</p>
   {windowEditor}
   <div className="cd-action-stack">
    <button className="cd-button cd-light" disabled={busy||dirty||screen.draftVersion<1||screen.approvedVersion===screen.draftVersion} onClick={()=>command('approve',{expectedVersion:screen.draftVersion})}>Approve exact revision</button>
    <button className="cd-button cd-primary" disabled={busy||!canPublish} onClick={()=>command('publish',{expectedVersion:screen.draftVersion})}>Publish approved playlist</button>
   </div>
   {dirty&&<p className="cd-subtle">There are unsaved changes. Save, review and approve the new revision before publishing.</p>}
   <h3>Previous published versions</h3>{screen.history.length?<div>{screen.history.map(h=><p key={h.id} className="cd-history">v{h.generation} · {new Date(h.publishedAt).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})} · Expires {new Date(h.until).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})}</p>)}</div>:<p>No publication history yet.</p>}
   <PublicationControls key={screen.id} screen={screen} busy={busy} command={command} draftDirty={dirty}/>
  </section>}
  {tab==='screens'&&<section className="cd-panel"><h2>Screen pairing and health</h2>
   <p>A television never signs in with a member account. Open <strong>lvz.app/display</strong> on the screen, then enter a temporary code.</p>
   <div className="cd-pair"><strong>{screen.label}</strong><p>{screen.enabled?'Enabled for paired televisions':'Not paired yet'} · Published v{screen.publishedVersion}</p>
    <button className="cd-button cd-primary" disabled={busy} onClick={()=>command('pair')}>Create one-time pairing code</button>
    {pairCode&&<div className="cd-pair-code" aria-live="polite"><span>Use on lvz.app/display · expires in five minutes</span><strong>{pairCode}</strong></div>}
   </div>
   <h3>Paired devices</h3>{screen.devices.length?screen.devices.map(d=><div className="cd-device" key={d.id}><div><strong>{d.revoked?'Revoked':d.lastSeen&&Date.now()-Date.parse(d.lastSeen)<45000?'Online · checking in':'Offline or not checking in'}</strong><small>Last seen: {d.lastSeen?new Date(d.lastSeen).toLocaleString('en-US',{timeZone:'America/Los_Angeles'}):'Not yet checked in'}</small></div>{!d.revoked&&<button className="cd-button cd-danger" disabled={busy} onClick={()=>{if(window.confirm('Revoke this screen immediately when it next checks in?'))void command('revoke',{deviceId:d.id});}}>Revoke</button>}</div>):<p className="cd-empty">No device has been paired. An unpaired display cannot receive approved content.</p>}
   <p className="cd-subtle">The player is silent and fails to a neutral screen when the network or publication expires. Device revocation is checked at the next poll.</p>
   <OperatingHoursEditor key={screen.id} screen={screen} busy={busy} command={command}/>
   <NewScreenEditor busy={busy} command={command}/>
  </section>}
  </>}
  <footer className="cd-foot">LV Zion Official · Approved TV content only · America/Los_Angeles</footer>
 </main>;
}
