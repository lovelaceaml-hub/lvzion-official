'use client';
/**
 * Church Display management in the shared Liquid Opal material.
 * Content follows Atlas display-editor (slide tiles, a framed TV preview, fields in glass cards),
 * Playlist follows display-playlist (stat tiles, ordered glass rows, a floating save tray),
 * Publish frames the TV preview (display-tv) above versions, approval and the published playlist,
 * Screens follows display-devices (stat tiles, display and TV rows with status tags, pairing card).
 * The TV itself (/display) is not styled here.
 */
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {FrameControls} from './app-frame';
import {ArrowDown,ArrowUp,Check,Clock3,FileText,Monitor,Plus,X} from './home-icons';
import {DisplayMediaPicker} from './display-media-picker';
import {EmptyState,Glass,IconBox,PageHeading,SectionHeader,StatGrid,StatTile,Tag,Tray} from './ui-kit';
import {useSwipeTabs} from '../lib/use-swipe-tabs';
import DisplayVisual from './display-visual';
import type{ChurchOffset,DisplayFit,DisplayKind,DisplaySlide,DisplayStyle}from'../lib/continuous-display/live-contract';
import {DISPLAY_DURATION,KIND_LABELS,ROTATE_PER_LOOP,MAX_DISPLAY_SLIDES,churchDateTime,churchLocal,churchTimeToUtc,isTextKind,offsetForChurchTime,parseDisplaySlides}from'../lib/continuous-display/live-contract';
import type {DisplayScreenR2} from '../lib/continuous-display/operations';
import {DisplayMotionEditor,KindIcon,OperatingHoursEditor,PublicationControls,NewScreenEditor,SlideEligibilityEditor} from './display-operations-controls';
const tabs=['content','playlist','publish','screens'] as const;
type Tab=typeof tabs[number];
type Tone='info'|'success'|'warning'|'danger';
const styles:DisplayStyle[]=['editorial','schedule','event','campaign'];
const kinds:DisplayKind[]=['announcement','schedule','event','campaign','image','video','rooms','mothers-love'];
const capital=(s:string)=>s.slice(0,1).toUpperCase()+s.slice(1);
const two=(n:number)=>String(n).padStart(2,'0');
const defaultWall=(days=0)=>churchLocal(new Date(Date.now()+days*86400000).toISOString());
/** A TV that checked in within this window counts as online. */
const ONLINE_MS=45000;
const headings:Record<Tab,{title:string;lede:string}>={
 content:{title:'Shape the message.',lede:'Edit a slide and check it on the TV preview.'},
 playlist:{title:'Plan the playlist.',lede:'Slides play top to bottom, then start again.'},
 publish:{title:'Review and publish.',lede:'Check every slide, date, name and word as it will read in a shared room.'},
 screens:{title:'Your displays',lede:'Open lvz.app/display on any TV to show the published playlist. Pairing is optional.'}
};
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
/** Glass card with an icon box, a title and one line of guidance. */
function Card({id,icon,title,hint,children,className}:{id:string;icon:ReactNode;title:ReactNode;hint?:ReactNode;children:ReactNode;className?:string}){
 return <Glass className={'cd-card'+(className?' '+className:'')} aria-labelledby={id}>
  <div className="cd-card-head"><IconBox>{icon}</IconBox><div><h2 id={id}>{title}</h2>{hint?<p className="ui-hint">{hint}</p>:null}</div></div>
  {children}
 </Glass>;
}
const defaultTitles:Partial<Record<DisplayKind,string>>={image:'New picture',video:'New video',rooms:'Study rooms today','mothers-love':"The Words of Mother's Love"};
function newSlide(kind:DisplayKind):DisplaySlide{
 const date=churchLocal(new Date().toISOString()).slice(0,10);
 if(!isTextKind(kind))return{id:'slide-'+crypto.randomUUID().slice(0,12),kind,style:'editorial',title:defaultTitles[kind]!,duration:kind==='video'?60:kind==='rooms'?20:kind==='mothers-love'?120:15};
 return{id:'slide-'+crypto.randomUUID().slice(0,12),kind,style:kind==='announcement'?'editorial':kind as DisplayStyle,
  title:'New '+kind,body:'Add approved details before publication.',duration:kind==='schedule'?20:15,
  ...(kind==='schedule'?{date,rows:[{time:'',label:''}]}:{}),
  ...(kind==='event'?{date,time:'',location:''}:{})};
}
/** Changing a slide's type keeps its id, title and dates and drops fields the new type does not use. */
function convertSlide(s:DisplaySlide,kind:DisplayKind):DisplaySlide{
 const fresh=newSlide(kind),limits=DISPLAY_DURATION[kind];
 const keep={id:s.id,title:s.title,...(s.startsAt&&s.endsAt?{startsAt:s.startsAt,endsAt:s.endsAt}:{})};
 const duration=Math.min(limits.max,Math.max(limits.min,s.duration));
 if(isTextKind(kind))return{...fresh,...keep,duration,body:s.body||fresh.body,
  ...(kind==='schedule'&&s.rows?{rows:s.rows,date:s.date||fresh.date}:{}),
  ...(kind==='event'?{date:s.date||fresh.date,time:s.time||'',location:s.location||''}:{})};
 return{...fresh,...keep,duration,...(s.body?{body:s.body}:{}),...(kind!=='rooms'&&s.kind===kind&&s.media?{media:s.media,fit:s.fit}:{})};
}
export default function DisplayManager(){
 const [screen,setScreen]=useState<DisplayScreenR2|null>(null);
 const [allScreens,setAllScreens]=useState<DisplayScreenR2[]>([]);
 const [loaded,setLoaded]=useState(false);
 const preferredScreen=useRef<string|null>(null);
 const [slides,setSlides]=useState<DisplaySlide[]>([]);
 const [tab,setTab]=useState<Tab>('content');
 const [selected,setSelected]=useState(0),[status,setStatusText]=useState('');
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
 const replace=(index:number,next:DisplaySlide)=>update(before=>before.map((slide,i)=>i===index?next:slide));
 const editWindow=<T,>(set:(value:T)=>void)=>(value:T)=>{set(value);editing.current=true;setDirty(true);};
 async function load(){
  try{
   const r=await fetch('/api/display/manage',{cache:'no-store',credentials:'same-origin'});
   if(!r.ok){setScreen(null);setAllScreens([]);setSlides([]);setPairCode('');setStatus(r.status===401?'Sign in to manage the church display.':'Display management is not available for this account.','warning');return;}
   const payload=await r.json() as{screens?:DisplayScreenR2[]};
   setAllScreens(payload.screens??[]);
   const next=(payload.screens??[]).find(candidate=>candidate.id===preferredScreen.current)??payload.screens?.[0];
   if(next)preferredScreen.current=next.id;if(!next){setScreen(null);setSlides([]);setPairCode('');setStatus('','info');return;}
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
  finally{setLoaded(true);}
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
 const devices=screen?.devices??[];
 const paired=devices.filter(d=>!d.revoked);
 const online=(lastSeen:string|null)=>!!lastSeen&&Date.now()-Date.parse(lastSeen)<ONLINE_MS;
 const onlineCount=paired.filter(d=>online(d.lastSeen)).length;
 const loop=slides.reduce((sum,s)=>sum+(Number.isFinite(s.duration)?s.duration:0),0);
 const addSlide=(kind:DisplayKind='announcement')=>{update(a=>[...a,newSlide(kind)]);setSelected(slides.length);};
 const quickAdd:{kind:DisplayKind;label:string}[]=[{kind:'announcement',label:'Text'},{kind:'image',label:'Picture'},{kind:'video',label:'Video'},{kind:'rooms',label:'Study rooms'},{kind:'mothers-love',label:"Mother's Love"}];
 const addButtons=(className:string)=>quickAdd.map(q=><button key={q.kind} type="button" className={className} disabled={busy||slides.length>=MAX_DISPLAY_SLIDES} onClick={()=>addSlide(q.kind)}><Plus size={18}/>{q.label}</button>);
 const updateRow=(index:number,s:DisplaySlide,row:number,patch:Partial<{time:string;label:string}>)=>
  change(index,{rows:(s.rows??[]).map((v,j)=>j===row?{...v,...patch}:v)});
 const fields=(index:number,s:DisplaySlide)=> <div className="cd-fields">
  <label className="ui-field">Content type<select className="ui-input" value={s.kind} onChange={e=>replace(index,convertSlide(s,e.target.value as DisplayKind))}>{kinds.map(k=><option key={k} value={k}>{KIND_LABELS[k]}</option>)}</select></label>
  {isTextKind(s.kind)&&<label className="ui-field">Presentation style<select className="ui-input" value={s.style} onChange={e=>change(index,{style:e.target.value as DisplayStyle})}>{styles.map(v=><option key={v} value={v}>{capital(v)}</option>)}</select></label>}
  {(s.kind==='image'||s.kind==='video')&&screen&&<div className="cd-span"><DisplayMediaPicker key={s.id} slide={s} screenId={screen.id} busy={busy}
   onUploaded={(media,seconds)=>change(index,{media,...(seconds?{duration:Math.min(DISPLAY_DURATION[s.kind].max,Math.max(DISPLAY_DURATION[s.kind].min,seconds))}:{})})}
   onStatus={(text,nextTone)=>setStatus(text,nextTone)}/></div>}
  {(s.kind==='image'||s.kind==='video')&&<label className="ui-field">Fit on screen<select className="ui-input" value={s.fit??'contain'} onChange={e=>change(index,{fit:e.target.value as DisplayFit})}><option value="contain">Show the whole {s.kind==='video'?'video':'picture'}</option><option value="cover">Fill the screen (edges may be trimmed)</option></select></label>}
  <label className="ui-field cd-span">{isTextKind(s.kind)?'Headline':s.kind==='rooms'?'Heading on the TV':'Name (for your list; read aloud by screen readers)'}<input className="ui-input" value={s.title} maxLength={74} onChange={e=>change(index,{title:e.target.value})}/></label>
  {isTextKind(s.kind)?<label className="ui-field cd-span">Supporting message<textarea className="ui-input" value={s.body??''} maxLength={160} rows={3} onChange={e=>change(index,{body:e.target.value})}/></label>
  :<label className="ui-field cd-span">{s.kind==='rooms'?'Note under the heading (optional)':'Caption on the TV (optional)'}<textarea className="ui-input" value={s.body??''} maxLength={160} rows={2} onChange={e=>change(index,{body:e.target.value.trim()?e.target.value:undefined})}/></label>}
  <label className="ui-field">Duration (seconds)<input className="ui-input" type="number" min={DISPLAY_DURATION[s.kind].min} max={DISPLAY_DURATION[s.kind].max} value={s.duration} onChange={e=>change(index,{duration:Number(e.target.value)})}/></label>
  {s.kind==='video'&&<p className="ui-hint cd-span">The TV plays videos with sound and moves on when the video ends, or at this time if that comes first.</p>}
  <label className="cd-check cd-span"><input type="checkbox" checked={s.rotate===true} onChange={e=>change(index,{rotate:e.target.checked?true:undefined})}/>
   Take turns with the slides next to it that also take turns ({ROTATE_PER_LOOP} play each time around)</label>
  {s.kind==='mothers-love'&&<p className="ui-hint cd-span">Plays the live Mother's Love TV for this long, with its song. When a new recognition is published, the TV switches to it right away and shows the new recognition.</p>}
  {s.kind==='rooms'&&<p className="ui-hint cd-span">Shows today’s study-room bookings from lvrooms.web.app: the room and the time only, never who booked. Finished bookings drop off through the day.</p>}
  {(s.kind==='schedule'||s.kind==='event')&&<label className="ui-field">Date<input className="ui-input" type="date" value={s.date||''} onChange={e=>change(index,{date:e.target.value})}/></label>}
  {s.kind==='event'&&<><label className="ui-field">Event time<input className="ui-input" value={s.time||''} maxLength={72} onChange={e=>change(index,{time:e.target.value})}/></label><label className="ui-field">Location<input className="ui-input" value={s.location||''} maxLength={72} onChange={e=>change(index,{location:e.target.value})}/></label></>}
  {s.kind==='schedule'&&<fieldset className="cd-span cd-fieldset"><legend>Activities, up to three</legend>{(s.rows??[]).map((r,i)=><div className="cd-row-fields" key={i}>
    <input className="ui-input" aria-label={`Time for activity ${i+1}`} value={r.time} placeholder="Time" maxLength={28} onChange={e=>updateRow(index,s,i,{time:e.target.value})}/>
    <input className="ui-input" aria-label={`Activity ${i+1}`} value={r.label} placeholder="Activity" maxLength={80} onChange={e=>updateRow(index,s,i,{label:e.target.value})}/>
    <button type="button" className="cd-icon-button" aria-label={`Remove activity ${i+1}`} onClick={()=>change(index,{rows:(s.rows??[]).filter((_,j)=>j!==i)})}><X/></button></div>)}
    {(s.rows?.length||0)<3&&<button type="button" className="ui-button ui-button-secondary cd-add-row" onClick={()=>change(index,{rows:[...(s.rows??[]),{time:'',label:''}]})}><Plus size={18}/>Add activity</button>}
   </fieldset>}
  <div className="cd-span"><SlideEligibilityEditor slide={s} overallStartsAt={screen?.startsAt||undefined} overallEndsAt={screen?.endsAt||undefined}
   onChange={patch=>change(index,patch)} onError={text=>setStatus(text)}/></div>
 </div>;
 const windowEditor=<Card id="cd-window-title" icon={<Clock3/>} title="When it shows" hint="Las Vegas time. On the two days a year the clocks change, pick the matching offset.">
  <div className="cd-fields">
   <label className="ui-field">Starts<input className="ui-input" type="datetime-local" value={startWall} onChange={e=>editWindow(setStartWall)(e.target.value)}/></label>
   <OffsetSelect value={startOffset} onChange={editWindow(setStartOffset)}/>
   <label className="ui-field">Ends<input className="ui-input" type="datetime-local" value={endWall} onChange={e=>editWindow(setEndWall)(e.target.value)}/></label>
   <OffsetSelect value={endOffset} onChange={editWindow(setEndOffset)}/>
  </div>
 </Card>;
 const preview=(slide:DisplaySlide|null,caption:string)=><aside className="cd-side" aria-label="TV preview">
  <figure className="cd-frame"><div className="cd-stage"><DisplayVisual slide={slide} preview mediaSrc={screen?name=>`/api/display/media/${encodeURIComponent(name)}?screen=${screen.id}`:undefined}/></div></figure>
  <p className="cd-frame-note"><strong>{caption}</strong> · Preview only. Nothing reaches the TV until it is approved and published.</p>
 </aside>;
 const moveSlide=(from:number,to:number)=>{update(a=>{const copy=[...a];[copy[from],copy[to]]=[copy[to],copy[from]];return copy;});setSelected(to);};
 const heading=screen?headings[tab]:{title:'Your displays',lede:''};
 return <div className="ui-page cd-manage">
  <FrameControls title="Church Display" left={{label:'Content',icon:'display',onClick:()=>setTab('content'),active:tab==='content'}} right={{label:'Screens',icon:'display',onClick:()=>setTab('screens'),active:tab==='screens'}} more={[{label:'Playlist',icon:'calendar',onClick:()=>setTab('playlist')},{label:'Publish',icon:'display',onClick:()=>setTab('publish')}]}/>
  <main className="ui-main">
   <PageHeading eyebrow={screen?.label||'Church Display'} title={heading.title} lede={heading.lede||undefined}/>
   {allScreens.length>1&&<label className="ui-glass ui-glass-tight cd-context"><IconBox><Monitor size={22}/></IconBox>
    <select className="ui-input" aria-label="Choose display" value={screen?.id??''} onChange={e=>{
     if(dirty&&!window.confirm('Discard unsaved slide changes before switching screens?'))return;
     preferredScreen.current=e.target.value;editing.current=false;setDirty(false);setPairCode('');void load();
    }}>{allScreens.map(candidate=><option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select>
   </label>}
   {screen&&<nav className="ui-tabs" aria-label="Church Display sections">{tabs.map(t=><button key={t} type="button" className="ui-tab" aria-current={tab===t?'page':undefined} onClick={()=>setTab(t)}>{capital(t)}</button>)}</nav>}
   {status&&<p className="ui-notice" data-tone={tone} role="status">{status}</p>}
   {!loaded?<Glass className="cd-state"><EmptyState icon={<Monitor/>} title="Loading" role="status">Loading your displays…</EmptyState></Glass>
   :!screen?<Glass className="cd-state"><EmptyState icon={<Monitor/>} title="No display to manage yet">No screen has been assigned to your account. A display owner can give you a manager grant for a screen.</EmptyState></Glass>
   :<div className="cd-layout" data-tab={tab} {...swipe}>
   {tab==='content'&&<>
    <section className="cd-area-strip" aria-labelledby="cd-slides-title">
     <SectionHeader id="cd-slides-title" title="Slides" note={`${slides.length} of ${MAX_DISPLAY_SLIDES}`}/>
     {slides.length===0?<Glass className="cd-state" as="div"><EmptyState icon={<FileText/>} title="No slides yet"
      action={<div className="cd-add-row-buttons">{addButtons('ui-button ui-button-secondary')}</div>}>Add an announcement, picture, video or study-room board. Until something is published, the TV shows a quiet welcome.</EmptyState></Glass>
     :<ol className="cd-strip" data-no-swipe>{slides.map((s,i)=><li key={s.id}><button type="button" className="cd-tile" aria-pressed={selected===i} onClick={()=>setSelected(i)}>
       <span className="cd-tile-top"><span className="cd-tile-n">{two(i+1)}</span><KindIcon kind={s.kind} size={18}/></span><strong>{s.title||'Untitled'}</strong><small>{KIND_LABELS[s.kind]} · {s.duration}s{s.rotate?' · takes turns':''}</small></button></li>)}
      {quickAdd.map(q=><li key={'add-'+q.kind}><button type="button" className="cd-tile cd-tile-add" disabled={busy||slides.length>=MAX_DISPLAY_SLIDES} onClick={()=>addSlide(q.kind)}><Plus size={22}/><strong>Add {q.label.toLowerCase()}</strong></button></li>)}
     </ol>}
    </section>
    {preview(active,active?`Slide ${selected+1}`:'Quiet welcome')}
    <div className="cd-area-main">
     {active&&<Glass className="cd-card cd-editor" aria-labelledby="cd-editor-title"><div className="cd-card-head"><IconBox><KindIcon kind={active.kind}/></IconBox><div><h2 id="cd-editor-title">Slide {selected+1}</h2><p className="ui-hint">{KIND_LABELS[active.kind]} · {active.duration}s</p></div>
      <button type="button" className="ui-button ui-button-quiet cd-danger-text" onClick={()=>{update(a=>a.filter((_,i)=>i!==selected));setSelected(Math.max(0,selected-1));}}>Remove slide</button></div>
      {fields(selected,active)}</Glass>}
     {windowEditor}
     <Tray className="cd-tray" eyebrow={`Draft v${screen.draftVersion}`} summary={dirty?'Unsaved changes':'All saved'}>
      <button type="button" className="ui-button" disabled={busy||!dirty} onClick={save}>{busy?'Saving…':'Save draft'}</button>
     </Tray>
    </div>
   </>}
   {tab==='playlist'&&<div className="cd-area-main cd-narrow">
    <StatGrid label="Playlist summary">
     <StatTile label="Slides" value={slides.length} note={`of ${MAX_DISPLAY_SLIDES} in this draft`}/>
     <StatTile label="Paired TVs" value={paired.length} note={paired.length?'on this display':'None paired yet'}/>
    </StatGrid>
    <SectionHeader id="cd-order-title" title="Order on the TV" note={slides.length?`${loop}s loop`:undefined}/>
    {slides.length===0?<Glass className="cd-state" as="div"><EmptyState icon={<FileText/>} title="No slides yet"
     action={<button type="button" className="ui-button ui-button-secondary" onClick={()=>setTab('content')}>Go to Content</button>}>Add slides on the Content tab.</EmptyState></Glass>
    :<Glass tight as="div"><ol className="ui-list" aria-labelledby="cd-order-title">{slides.map((s,i)=><li className="ui-row cd-order" key={s.id}>
     <IconBox><KindIcon kind={s.kind}/></IconBox>
     <span className="ui-row-body"><strong>{s.title}</strong><small><Tag>{two(i+1)}</Tag>{s.duration} sec · {isTextKind(s.kind)?capital(s.style):KIND_LABELS[s.kind]}</small></span>
     <span className="cd-move">
      <button type="button" className="cd-icon-button" aria-label={`Move ${s.title} earlier`} disabled={i===0} onClick={()=>moveSlide(i,i-1)}><ArrowUp size={20}/></button>
      <button type="button" className="cd-icon-button" aria-label={`Move ${s.title} later`} disabled={i===slides.length-1} onClick={()=>moveSlide(i,i+1)}><ArrowDown size={20}/></button>
     </span>
    </li>)}</ol></Glass>}
    <Tray className="cd-tray" eyebrow="Playlist" summary={dirty?'Unsaved order':`${slides.length} slide${slides.length===1?'':'s'} · v${screen.draftVersion}`}>
     <button type="button" className="ui-button" disabled={busy||!dirty} onClick={save}>Save playlist draft</button>
    </Tray>
   </div>}
   {tab==='publish'&&<>
    {preview(slides[0]??null,'First slide')}
    <div className="cd-area-main">
     <div className="cd-versions"><StatGrid label="Versions">
      <StatTile label="Draft" value={'v'+screen.draftVersion}/>
      <StatTile label="Approved" value={screen.approvedVersion===null?'None':'v'+screen.approvedVersion}/>
      <StatTile label="Published" value={'v'+screen.publishedVersion} tone="accent"/>
     </StatGrid></div>
     {dirty&&<p className="ui-notice" data-tone="warning">You have unsaved changes. Save, then approve the new revision before publishing.</p>}
     {windowEditor}
     <Card id="cd-review-title" icon={<Check/>} title="Approve, then publish" hint="Approval for another app does not cover the TV. Publishing is a separate step after approval.">
      <div className="cd-actions">
       <button type="button" className="ui-button ui-button-secondary" disabled={busy||dirty||screen.draftVersion<1||screen.approvedVersion===screen.draftVersion} onClick={()=>command('approve',{expectedVersion:screen.draftVersion})}>Approve exact revision</button>
       <button type="button" className="ui-button" disabled={busy||!canPublish} onClick={()=>command('publish',{expectedVersion:screen.draftVersion})}>Publish approved playlist</button>
      </div>
     </Card>
     <PublicationControls key={screen.id} screen={screen} busy={busy} command={command} draftDirty={dirty}/>
    </div>
   </>}
   {tab==='screens'&&<div className="cd-area-main cd-narrow">
    <StatGrid label="Paired TVs summary">
     <StatTile label="Paired TVs" value={paired.length} note={paired.length?'on this display':'None paired yet'}/>
     <StatTile label="Online now" value={onlineCount} note="Checked in within a minute"/>
    </StatGrid>
    <SectionHeader id="cd-devices-title" title="This display"/>
    <Glass tight as="div" className="cd-devices"><ul className="ui-list" aria-labelledby="cd-devices-title">
     <li className="ui-row"><IconBox><Monitor size={22}/></IconBox><span className="ui-row-body"><strong>{screen.label}</strong><small>{screen.enabled?'Enabled for paired TVs':'Not paired yet'} · Published v{screen.publishedVersion}</small></span>
      <Tag tone={screen.enabled?'success':undefined}>{screen.enabled?'Playing':'Off'}</Tag></li>
     {devices.map((d,i)=>{const live=!d.revoked&&online(d.lastSeen);
      return <li className="ui-row cd-device" key={d.id}><IconBox round><Monitor size={20}/></IconBox>
       <span className="ui-row-body"><strong>TV {i+1}</strong><small>Last seen: {d.lastSeen?churchDateTime(d.lastSeen):'Not yet checked in'}</small>
        {!d.revoked&&<button type="button" className="cd-text-button cd-danger-text" aria-label={`Revoke TV ${i+1}`} disabled={busy} onClick={()=>{if(window.confirm('Revoke this screen immediately when it next checks in?'))void command('revoke',{deviceId:d.id});}}>Revoke</button>}</span>
       <Tag tone={d.revoked?'danger':live?'success':undefined}>{d.revoked?'Revoked':live?'Online':'Offline'}</Tag></li>;})}
    </ul>{devices.length===0&&<p className="ui-hint cd-devices-empty">No TV is paired. That is fine: lvz.app/display shows the main display's published playlist without pairing.</p>}</Glass>
    <Glass className="cd-pair-card" aria-labelledby="cd-pair-title">
     <h2 id="cd-pair-title" className="ui-eyebrow">{pairCode?'One-time pairing code':'Pair a TV'}</h2>
     <div className="cd-pair-code" aria-live="polite">{pairCode?<><strong>{pairCode}</strong><p>Type this on lvz.app/display?pair=1. It expires in five minutes.</p></>
      :<p>Optional. Open <strong>lvz.app/display?pair=1</strong> on a TV and type the code to give that TV its own display.</p>}</div>
     <button type="button" className="ui-button ui-button-block" disabled={busy} onClick={()=>command('pair')}>Create one-time pairing code</button>
    </Glass>
    <Glass className="cd-callout" as="div"><span className="cd-callout-icon" aria-hidden="true"><Check size={22}/></span><div><strong>How the TV plays</strong>
     <p>Videos play with sound once someone taps the TV screen once (browsers require it). Tap Full screen on the TV. If the network drops or the publication ends, it shows a quiet welcome.</p></div></Glass>
    <SectionHeader title="Display settings"/>
    <DisplayMotionEditor key={'motion-'+screen.id} screen={screen} busy={busy} command={command}/>
    <OperatingHoursEditor key={screen.id} screen={screen} busy={busy} command={command}/>
    <NewScreenEditor busy={busy} command={command}/>
   </div>}
   </div>}
  </main>
 </div>;
}
