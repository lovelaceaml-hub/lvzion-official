'use client';
import {useEffect,useRef,useState} from 'react';
import {FrameControls} from './app-frame';
import {ArrowDown,ArrowUp,X} from './home-icons';
import {useSwipeTabs} from '../lib/use-swipe-tabs';
import DisplayVisual from './display-visual';
import type{ChurchOffset,DisplayKind,DisplaySlide,DisplayStyle}from'../lib/continuous-display/live-contract';
import {MAX_DISPLAY_SLIDES,churchDateTime,churchLocal,churchTimeToUtc,offsetForChurchTime,parseDisplaySlides}from'../lib/continuous-display/live-contract';
import type {DisplayScreenR2} from '../lib/continuous-display/operations';
import {DisplayMotionEditor,OperatingHoursEditor,PublicationControls,NewScreenEditor,SlideEligibilityEditor} from './display-operations-controls';
const tabs=['content','playlist','publish','screens'] as const;
type Tab=typeof tabs[number];
type Tone='info'|'success'|'warning'|'danger';
const styles:DisplayStyle[]=['editorial','schedule','event','campaign'];
const kinds:DisplayKind[]=['announcement','schedule','event','campaign'];
const capital=(s:string)=>s.slice(0,1).toUpperCase()+s.slice(1);
const defaultWall=(days=0)=>churchLocal(new Date(Date.now()+days*86400000).toISOString());
const notices:Record<string,string>={
 save:'Draft saved. Approval is still required.',
 approve:'Exact draft approved. Publishing is a separate action.',
 publish:'Approved version published. Paired screens update at a safe transition.',
 motion:'This screen’s ambient motion is updated. Paired TVs will adopt it at their next verified update.',
 hours:'Operating hours saved. The screen will show a neutral state outside these hours.',
 restore:'A previously approved publication was restored as a new version.',
 override:'Temporary emphasis started for an already approved slide.',
 clearOverride:'Temporary emphasis ended.',
 revoke:'Device access revoked.'
};
function OffsetSelect({value,onChange}:{value:ChurchOffset;onChange:(offset:ChurchOffset)=>void}){
 return <label className="ui-field">Clock<select className="ui-input" value={value} onChange={e=>onChange(e.target.value as ChurchOffset)}><option value="-07:00">Daylight time (PDT)</option><option value="-08:00">Standard time (PST)</option></select></label>;
}
function newSlide(kind:DisplayKind):DisplaySlide{
 const date=churchLocal(new Date().toISOString()).slice(0,10);
 return{id:'slide-'+crypto.randomUUID().slice(0,12),kind,style:kind==='announcement'?'editorial':kind,
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
 const [selected,setSelected]=useState(0),[status,setStatusText]=useState('Loading your displays…');
 const [tone,setTone]=useState<Tone>('info');
 const setStatus=(text:string,nextTone:Tone='danger')=>{setStatusText(text);setTone(nextTone);};
 const [busy,setBusy]=useState(false),[dirty,setDirty]=useState(false);
 const [startWall,setStartWall]=useState(defaultWall()),[endWall,setEndWall]=useState(defaultWall(7));
 const [startOffset,setStartOffset]=useState<ChurchOffset>(offsetForChurchTime(new Date().toISOString()));
 const [endOffset,setEndOffset]=useState<ChurchOffset>(offsetForChurchTime(new Date(Date.now()+7*86400000).toISOString()));
 const [pairCode,setPairCode]=useState('');
 const editing=useRef(false);
 const update=(fn:(items:DisplaySlide[])=>DisplaySlide[])=>{setSlides(before=>fn(before));setDirty(true);editing.current=true;};
 const change=(index:number,patch:Partial<DisplaySlide>)=>update(before=>before.map((slide,i)=>i===index?{...slide,...patch}:slide));
 const editWindow=<T,>(set:(value:T)=>void)=>(value:T)=>{set(value);editing.current=true;setDirty(true);};
 async function load(){
  try{
   const r=await fetch('/api/display/manage',{cache:'no-store',credentials:'same-origin'});
   if(!r.ok){setScreen(null);setAllScreens([]);setSlides([]);setPairCode('');setStatus(r.status===401?'Sign in to manage the church display.':'Display management is not available for this account.','warning');return;}
   const payload=await r.json() as{screens?:DisplayScreenR2[]};
   setAllScreens(payload.screens??[]);
   const next=(payload.screens??[]).find(candidate=>candidate.id===preferredScreen.current)??payload.screens?.[0];
   if(next)preferredScreen.current=next.id;if(!next){setScreen(null);setSlides([]);setPairCode('');setStatus('No display has been assigned to your account.','warning');return;}
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
   let notice=notices[action]??'Device access revoked.';
   if(action==='pair'&&typeof data.code==='string'){
    setPairCode(data.code);notice='One-time pairing code created. It expires in five minutes.';
   }else if(action==='createScreen'&&typeof data.screenId==='string'){
    preferredScreen.current=data.screenId;setPairCode('');
    notice='A new disabled screen has been created. Configure and approve it before pairing.';
   }
   if(['save','approve','publish','createScreen'].includes(action)){editing.current=false;setDirty(false);}
   await load();setStatus(notice,'success');
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
 const swipe=useSwipeTabs(tabs,tab,setTab);
 const updateRow=(index:number,s:DisplaySlide,row:number,patch:Partial<{time:string;label:string}>)=>
  change(index,{rows:(s.rows??[]).map((v,j)=>j===row?{...v,...patch}:v)});
 const fields=(index:number,s:DisplaySlide)=> <div className="cd-fields">
  <label className="ui-field">Content type<select className="ui-input" value={s.kind} onChange={e=>{const kind=e.target.value as DisplayKind;change(index,{kind,...(kind==='schedule'&&!s.rows?{rows:[{time:'',label:''}],date:defaultWall().slice(0,10)}:{}),...(kind==='event'?{date:s.date||defaultWall().slice(0,10),time:s.time||'',location:s.location||''}:{})});}}>{kinds.map(k=><option key={k} value={k}>{capital(k)}</option>)}</select></label>
  <label className="ui-field">Presentation style<select className="ui-input" value={s.style} onChange={e=>change(index,{style:e.target.value as DisplayStyle})}>{styles.map(v=><option key={v} value={v}>{capital(v)}</option>)}</select></label>
  <label className="ui-field cd-span">Headline<input className="ui-input" value={s.title} maxLength={74} onChange={e=>change(index,{title:e.target.value})}/></label>
  <label className="ui-field cd-span">Supporting message<textarea className="ui-input" value={s.body} maxLength={160} rows={3} onChange={e=>change(index,{body:e.target.value})}/></label>
  <label className="ui-field">Duration (seconds)<input className="ui-input" type="number" min={8} max={60} value={s.duration} onChange={e=>change(index,{duration:Number(e.target.value)})}/></label>
  {(s.kind==='schedule'||s.kind==='event')&&<label className="ui-field">Date<input className="ui-input" type="date" value={s.date||''} onChange={e=>change(index,{date:e.target.value})}/></label>}
  {s.kind==='event'&&<><label className="ui-field">Event time<input className="ui-input" value={s.time||''} maxLength={72} onChange={e=>change(index,{time:e.target.value})}/></label><label className="ui-field">Location<input className="ui-input" value={s.location||''} maxLength={72} onChange={e=>change(index,{location:e.target.value})}/></label></>}
  {s.kind==='schedule'&&<fieldset className="cd-span cd-fieldset"><legend>Activities, up to three</legend>{(s.rows??[]).map((r,i)=><div className="cd-row-fields" key={i}>
    <input className="ui-input" aria-label={`Time for activity ${i+1}`} value={r.time} placeholder="Time" maxLength={28} onChange={e=>updateRow(index,s,i,{time:e.target.value})}/>
    <input className="ui-input" aria-label={`Activity ${i+1}`} value={r.label} placeholder="Activity" maxLength={80} onChange={e=>updateRow(index,s,i,{label:e.target.value})}/>
    <button type="button" className="cd-icon-button" aria-label={`Remove activity ${i+1}`} onClick={()=>change(index,{rows:(s.rows??[]).filter((_,j)=>j!==i)})}><X/></button></div>)}
    {(s.rows?.length||0)<3&&<button type="button" className="ui-button ui-button-quiet" onClick={()=>change(index,{rows:[...(s.rows??[]),{time:'',label:''}]})}>Add activity</button>}
   </fieldset>}
  <div className="cd-span"><SlideEligibilityEditor slide={s} overallStartsAt={screen?.startsAt||undefined} overallEndsAt={screen?.endsAt||undefined}
   onChange={patch=>change(index,patch)} onError={text=>setStatus(text)}/></div>
 </div>;
 const windowEditor=<section className="cd-block" aria-labelledby="cd-window-title"><h2 id="cd-window-title" className="ui-section-title">When it shows</h2>
  <p className="ui-hint">Las Vegas time. On the two days a year the clocks change, pick the matching offset.</p><div className="cd-fields">
  <label className="ui-field">Starts<input className="ui-input" type="datetime-local" value={startWall} onChange={e=>editWindow(setStartWall)(e.target.value)}/></label>
  <OffsetSelect value={startOffset} onChange={editWindow(setStartOffset)}/>
  <label className="ui-field">Ends<input className="ui-input" type="datetime-local" value={endWall} onChange={e=>editWindow(setEndWall)(e.target.value)}/></label>
  <OffsetSelect value={endOffset} onChange={editWindow(setEndOffset)}/>
 </div></section>;
 const preview=(slide:DisplaySlide|null,caption:string)=><aside className="cd-side" aria-label="TV preview">
  <h2 className="ui-section-title">{caption}</h2>
  <div className="cd-stage cd-small-preview"><DisplayVisual slide={slide} preview/></div>
  <p className="ui-hint">Preview only. Nothing reaches the TV until it is approved and published.</p>
 </aside>;
 const moveSlide=(from:number,to:number)=>{update(a=>{const copy=[...a];[copy[from],copy[to]]=[copy[to],copy[from]];return copy;});setSelected(to);};
 return <div className="ui-page cd-manage">
  <FrameControls title="Church Display" left={{label:'Content',icon:'display',onClick:()=>setTab('content'),active:tab==='content'}} right={{label:'Screens',icon:'display',onClick:()=>setTab('screens'),active:tab==='screens'}} more={[{label:'Playlist',icon:'calendar',onClick:()=>setTab('playlist')},{label:'Publish',icon:'display',onClick:()=>setTab('publish')}]}/>
  <main className="ui-main">
   <p className="ui-kicker">{screen?.label||'Your displays'}</p>
   <h1 className="ui-title">Church Display</h1>
   {screen&&<p className="ui-lede">{screen.enabled?'Playing on paired TVs':'Not playing on any TV'} · Published v{screen.publishedVersion}</p>}
   {allScreens.length>1&&<label className="ui-field cd-screen-picker">Choose display
    <select className="ui-input" aria-label="Choose display" value={screen?.id??''} onChange={e=>{
     if(dirty&&!window.confirm('Discard unsaved slide changes before switching screens?'))return;
     preferredScreen.current=e.target.value;editing.current=false;setDirty(false);setPairCode('');void load();
    }}>{allScreens.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select>
   </label>}
   {screen&&<nav className="ui-tabs" aria-label="Church Display sections">{tabs.map(t=><button key={t} type="button" className="ui-tab" aria-current={tab===t?'page':undefined} onClick={()=>setTab(t)}>{capital(t)}</button>)}</nav>}
   {status&&<p className="ui-notice" data-tone={tone} role="status">{status}</p>}
   {!screen?<div className="ui-empty"><strong>No display to manage</strong>Display management needs a manager grant for at least one screen.</div>:<div className="cd-layout" {...swipe}>
   {tab==='content'&&<><section className="cd-main" aria-labelledby="cd-slides-title">
    <div className="cd-heading"><h2 id="cd-slides-title" className="ui-section-title">Slides <span className="cd-count">{slides.length} of {MAX_DISPLAY_SLIDES}</span></h2>
     <button type="button" className="ui-button ui-button-secondary" disabled={busy||slides.length>=MAX_DISPLAY_SLIDES} onClick={()=>{update(a=>[...a,newSlide('announcement')]);setSelected(slides.length);}}>Add slide</button></div>
    {slides.length===0?<div className="ui-empty"><strong>No slides yet</strong>Add an announcement or schedule. Until something is published, the TV shows a quiet welcome.</div>:<>
     <ul className="ui-list">{slides.map((s,i)=><li key={s.id}><button type="button" className="ui-row cd-slide-row" aria-pressed={selected===i} onClick={()=>setSelected(i)}>
      <span className="cd-lead">{i+1}</span><span className="ui-row-body"><strong>{s.title||'Untitled'}</strong><small>{capital(s.kind)} · {s.duration}s</small></span></button></li>)}</ul>
     {active&&<div className="ui-surface cd-editor"><div className="cd-heading"><h2 className="cd-editor-title">Slide {selected+1}</h2>
      <button type="button" className="ui-button ui-button-quiet cd-danger-text" onClick={()=>{update(a=>a.filter((_,i)=>i!==selected));setSelected(Math.max(0,selected-1));}}>Remove slide</button></div>
      {fields(selected,active)}</div>}
    </>}
    {windowEditor}
    <button type="button" className="ui-button ui-button-block cd-primary-action" disabled={busy||!dirty} onClick={save}>{busy?'Saving…':'Save draft'}</button>
   </section>{preview(active,'Preview')}</>}
   {tab==='playlist'&&<section className="cd-main cd-narrow" aria-labelledby="cd-order-title"><h2 id="cd-order-title" className="ui-section-title">Order on the TV</h2>
    <p className="ui-hint">Slides play top to bottom, then start again. Changes stay a draft until approved and published.</p>
    {slides.length===0?<div className="ui-empty"><strong>No slides yet</strong>Add slides on the Content tab.</div>:<ol className="ui-list">{slides.map((s,i)=><li className="ui-row cd-order" key={s.id}><span className="cd-lead">{i+1}</span><span className="ui-row-body"><strong>{s.title}</strong><small>{s.duration}s · {capital(s.style)}</small></span>
     <button type="button" className="cd-icon-button" aria-label={`Move ${s.title} earlier`} disabled={i===0} onClick={()=>moveSlide(i,i-1)}><ArrowUp/></button>
     <button type="button" className="cd-icon-button" aria-label={`Move ${s.title} later`} disabled={i===slides.length-1} onClick={()=>moveSlide(i,i+1)}><ArrowDown/></button>
    </li>)}</ol>}
    <button type="button" className="ui-button ui-button-block cd-primary-action" disabled={busy||!dirty} onClick={save}>Save playlist draft</button>
   </section>}
   {tab==='publish'&&<><section className="cd-main" aria-labelledby="cd-review-title"><h2 id="cd-review-title" className="ui-section-title">Review and publish</h2>
    <dl className="cd-versions"><div><dt>Draft</dt><dd>v{screen.draftVersion}</dd></div><div><dt>Approved</dt><dd>{screen.approvedVersion===null?'None':'v'+screen.approvedVersion}</dd></div><div><dt>Published</dt><dd>v{screen.publishedVersion}</dd></div></dl>
    <p className="ui-hint">Check every slide, date, name and word as it will read on a TV in a shared room. Approval for another app does not cover the TV.</p>
    {windowEditor}
    <div className="cd-actions">
     <button type="button" className="ui-button ui-button-secondary" disabled={busy||dirty||screen.draftVersion<1||screen.approvedVersion===screen.draftVersion} onClick={()=>command('approve',{expectedVersion:screen.draftVersion})}>Approve exact revision</button>
     <button type="button" className="ui-button" disabled={busy||!canPublish} onClick={()=>command('publish',{expectedVersion:screen.draftVersion})}>Publish approved playlist</button>
    </div>
    {dirty&&<p className="ui-notice" data-tone="warning">You have unsaved changes. Save, then approve the new revision before publishing.</p>}
    <PublicationControls key={screen.id} screen={screen} busy={busy} command={command} draftDirty={dirty}/>
   </section>{preview(slides[0]??null,'First slide')}</>}
   {tab==='screens'&&<section className="cd-main cd-narrow" aria-labelledby="cd-pair-title"><h2 id="cd-pair-title" className="ui-section-title">Pair a TV</h2>
    <p className="ui-hint">A TV never signs in with a member account. Open <strong>lvz.app/display</strong> on the TV, then type the code shown here.</p>
    <div className="ui-row cd-pair"><span className="ui-row-body"><strong>{screen.label}</strong><small>{screen.enabled?'Enabled for paired TVs':'Not paired yet'} · Published v{screen.publishedVersion}</small></span></div>
    <button type="button" className="ui-button ui-button-block cd-primary-action" disabled={busy} onClick={()=>command('pair')}>Create one-time pairing code</button>
    {pairCode&&<div className="ui-surface cd-pair-code" aria-live="polite"><span className="ui-hint">Type this on lvz.app/display. It expires in five minutes.</span><strong>{pairCode}</strong></div>}
    <h2 className="ui-section-title">Paired TVs</h2>{screen.devices.length?<ul className="ui-list">{screen.devices.map(d=><li className="ui-row" key={d.id}><span className="ui-row-body"><strong>{d.revoked?'Revoked':d.lastSeen&&Date.now()-Date.parse(d.lastSeen)<45000?'Online · checking in':'Offline or not checking in'}</strong><small>Last seen: {d.lastSeen?churchDateTime(d.lastSeen):'Not yet checked in'}</small></span>{!d.revoked&&<button type="button" className="ui-button ui-button-secondary cd-danger-text" disabled={busy} onClick={()=>{if(window.confirm('Revoke this screen immediately when it next checks in?'))void command('revoke',{deviceId:d.id});}}>Revoke</button>}</li>)}</ul>:<p className="ui-hint">No TV is paired. An unpaired TV cannot receive approved content.</p>}
    <p className="ui-hint">A TV plays no sound. If the network drops or the publication ends, it falls back to a quiet welcome. Revoking takes effect at its next check-in.</p>
    <DisplayMotionEditor key={'motion-'+screen.id} screen={screen} busy={busy} command={command}/>
    <OperatingHoursEditor key={screen.id} screen={screen} busy={busy} command={command}/>
    <NewScreenEditor busy={busy} command={command}/>
   </section>}
   </div>}
  </main>
 </div>;
}

