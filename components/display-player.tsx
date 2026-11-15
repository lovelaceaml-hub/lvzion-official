'use client';
import {useEffect,useRef,useState} from 'react';
import type{FormEvent}from'react';
import type{DisplayRooms,DisplaySlide}from'../lib/continuous-display/live-contract';
import type{DisplaySnapshotR2}from'../lib/continuous-display/operations';
import {activeDisplaySlides,churchLocal,rotationView}from '../lib/continuous-display/live-contract';
import {parseDisplaySnapshotR2,overrideForDisplay,withinOperatingHours,type DisplayMotionMode}from '../lib/continuous-display/operations';
import DisplayVisual from './display-visual';
type Verified={packet:DisplaySnapshotR2;serverEpoch:number;verifiedAt:number};
type ScreenMode='loading'|'unpaired'|'paired';
export default function DisplayPlayer(){
 const [mode,setMode]=useState<ScreenMode>('loading');
 const [motionMode,setMotionMode]=useState<DisplayMotionMode>('standard');
 const [slide,setSlide]=useState<DisplaySlide|null>(null);
 // A new play count each time a slide comes on, so a video starts again even when it is the only slide.
 const [playCount,setPlayCount]=useState(0);
 const [rooms,setRooms]=useState<DisplayRooms|null>(null);
 const [nowClock,setNowClock]=useState('');
 const mediaEnded=useRef<string|null>(null);
 // Mother's Love: the newest recognition seen so far (undefined until the first answer), and one waiting to be welcomed.
 const mlSeen=useRef<string|null|undefined>(undefined);
 const mlJump=useRef<string|null>(null);
 // Completed loops of the playlist: take-turns groups move on to their next slides each loop.
 const loopCount=useRef(0);
 const [welcomeId,setWelcomeId]=useState<string|null>(null);
 const noteMothersLove=(packet:DisplaySnapshotR2)=>{
  const latest=packet.mothersLove?.latestId??null;
  if(!packet.mothersLove)return;
  if(mlSeen.current===undefined){mlSeen.current=latest;return;}
  if(latest&&latest!==mlSeen.current){mlSeen.current=latest;mlJump.current=latest;}
 };
 const show=(next:DisplaySlide,welcome:string|null=null)=>{shown.current=next.id;shownAt.current=performance.now();mediaEnded.current=null;setWelcomeId(welcome);setPlayCount(n=>n+1);setSlide(next);};
 const [code,setCode]=useState('');const [pairing,setPairing]=useState(false);
 const [error,setError]=useState('');
 // Pairing is optional now: the form shows only at lvz.app/display?pair=1.
 const [pairMode,setPairMode]=useState(false);
 const [isFull,setIsFull]=useState(false);
 // Phones that cannot rotate on their own (iPhone) get the display turned sideways instead.
 const [rotated,setRotated]=useState(false);
 const [soundBlocked,setSoundBlocked]=useState(false);
 const portrait=()=>window.innerHeight>window.innerWidth;
 const [controls,setControls]=useState(true);
 const hideControls=useRef<ReturnType<typeof setTimeout>|null>(null);
 const wakeLock=useRef<{release:()=>Promise<void>}|null>(null);
 const showControls=()=>{setControls(true);if(hideControls.current)clearTimeout(hideControls.current);hideControls.current=setTimeout(()=>setControls(false),4000);};
 const keepAwake=async()=>{
  try{const nav=navigator as Navigator&{wakeLock?:{request:(t:'screen')=>Promise<{release:()=>Promise<void>}>}};
   if(nav.wakeLock&&!wakeLock.current&&!document.hidden)wakeLock.current=await nav.wakeLock.request('screen');}catch{}
 };
 // Any tap counts as permission for sound, so later videos play with sound.
 const enableSound=()=>{
  if(!soundBlocked)return;
  setSoundBlocked(false);
  const v=document.querySelector<HTMLVideoElement>('.cd-screen video');
  if(v){v.muted=false;void v.play().catch(()=>{});}
 };
 const toggleFullscreen=async()=>{
  enableSound();
  const leaving=isFull||rotated||!!document.fullscreenElement;
  if(leaving){
   setRotated(false);
   try{(screen.orientation as ScreenOrientation&{unlock?:()=>void}).unlock?.();}catch{}
   try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}
   setIsFull(false);return;
  }
  let full=false;
  try{if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen({navigationUI:'hide'});full=true;}}catch{}
  // Turn phones and tablets to landscape; where that is not possible, rotate the display on screen.
  let locked=false;
  try{const o=screen.orientation as ScreenOrientation&{lock?:(o:string)=>Promise<void>};if(o?.lock){await o.lock('landscape');locked=true;}}catch{}
  // Some devices accept the request but stay upright; check, and rotate the display on screen if so.
  if(locked)await new Promise(r=>setTimeout(r,700));
  if(portrait())setRotated(true);
  setIsFull(true);
  void keepAwake();
 };
 const current=useRef<Verified|null>(null),pending=useRef<Verified|null>(null);
 const shown=useRef<string|null>(null),shownAt=useRef(0),generation=useRef(0);
 const alive=useRef(false);
 const overrideActive=useRef(false);
 const requestSequence=useRef(0);
 const inFlight=useRef<AbortController|null>(null);
 // Show the neutral welcome and forget which slide or temporary notice was on screen.
 const blank=()=>{shown.current=null;overrideActive.current=false;setSlide(null);};
 const apply=(verified:Verified)=>{
  setMotionMode(verified.packet.motionMode);setRooms(verified.packet.rooms);noteMothersLove(verified.packet);
  current.current=verified;pending.current=null;shown.current=null;shownAt.current=performance.now();generation.current++;
  overrideActive.current=false;setMode('paired');setSlide(null);
 };
 const refresh=async()=>{
  if(!alive.current)return;
  const sequence=++requestSequence.current;
  inFlight.current?.abort();
  const controller=new AbortController();inFlight.current=controller;
  const timeout=setTimeout(()=>controller.abort(),7000);
  try{
   const r=await fetch('/api/display/device',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
   if(!alive.current||sequence!==requestSequence.current)return;
   if(!r.ok)throw Error('Unavailable');
   const raw:unknown=await r.json();
   if(!alive.current||sequence!==requestSequence.current)return;
   if(!raw||typeof raw!=='object'||!('paired' in raw)||raw.paired!==true){
    current.current=null;pending.current=null;blank();setMode('unpaired');return;
   }
   const packet=parseDisplaySnapshotR2(raw);
   const checked={packet,serverEpoch:Date.parse(packet.serverTime),verifiedAt:performance.now()};
   if(!current.current||packet.version===0&&current.current.packet.version===0)apply(checked);
   else if(packet.version!==current.current.packet.version){
    // Only a specifically authorized active override can interrupt the regular safe-transition handoff.
    if(packet.overrideSlideId)apply(checked);
    else pending.current=checked;
   }else {current.current={...checked};setMotionMode(checked.packet.motionMode);setRooms(checked.packet.rooms);noteMothersLove(checked.packet);}
   setMode('paired');setError('');
  }catch{
   if(!alive.current||sequence!==requestSequence.current)return;
   // A verified published copy can remain for at most the prior short server lease.
   if(!current.current){setSlide(null);setMode('loading');}
  }finally{
   clearTimeout(timeout);
   if(inFlight.current===controller)inFlight.current=null;
  }
 };
 useEffect(()=>{
  alive.current=true;
  setPairMode(new URLSearchParams(window.location.search).get('pair')==='1');
  showControls();void keepAwake();
  const onFull=()=>{if(!document.fullscreenElement){setIsFull(false);setRotated(false);}else setIsFull(true);};
  // A phone turned to landscape by hand no longer needs the on-screen rotation.
  const onResize=()=>{if(!portrait())setRotated(false);};
  window.addEventListener('resize',onResize);
  const onKey=(e:KeyboardEvent)=>{if(e.key==='f'||e.key==='F')void toggleFullscreen();};
  document.addEventListener('fullscreenchange',onFull);document.addEventListener('keydown',onKey);
  void refresh();
  const poll=setInterval(()=>{if(alive.current)void refresh();},12000);
  const advance=setInterval(()=>{
   const v=current.current;if(!v)return;
   const now=v.serverEpoch+(performance.now()-v.verifiedAt);
   const isExpired=now>=Date.parse(v.packet.leaseUntil);
   const clock=churchLocal(new Date(now).toISOString()).slice(11,16);setNowClock(c=>c===clock?c:clock);
   if(isExpired){
    if(pending.current){
     const pv=pending.current,pNow=pv.serverEpoch+(performance.now()-pv.verifiedAt);
     if(pNow<Date.parse(pv.packet.leaseUntil)){apply(pv);return;}
    }
    current.current=null;blank();return;
   }
   // Operating periods and per-slide expiry are evaluated from the verified server clock.
   if(!withinOperatingHours(v.packet.operatingHours,now)){blank();return;}
   const allItems=activeDisplaySlides(v.packet.slides,now);
   if(!allItems.length){blank();return;}
   let items=rotationView(allItems,loopCount.current);
   const forced=overrideForDisplay(v.packet,now);
   if(forced){
    if(!overrideActive.current||shown.current!==forced.id){
     show(forced);
    }
    overrideActive.current=true;return;
   }
   if(overrideActive.current){overrideActive.current=false;shown.current=null;}
   // A new Mother's Love recognition: show the Mother's Love turn now, whatever is on screen, with its arrival.
   if(mlJump.current){
    const ml=allItems.find(s=>s.kind==='mothers-love');
    const welcome=mlJump.current;mlJump.current=null;
    if(ml){show(ml,welcome);return;}
   }
   const index=shown.current===null?-1:items.findIndex(s=>s.id===shown.current);
   const existing=index>=0?items[index]:null;
   const duration=existing?existing.duration*1000:0;
   // A video moves on when it finishes, or at its set time if that comes first.
   const finished=!!existing&&existing.kind==='video'&&mediaEnded.current===existing.id;
   if(!existing||finished||performance.now()-shownAt.current>=duration){
    if(pending.current&&performance.now()-pending.current.verifiedAt<=30000){apply(pending.current);return;}
    let next=items[index<0?0:(index+1)%items.length];
    // Wrapping round to the start: take-turns groups move on to their next slides.
    if(index>=0&&index+1>=items.length){loopCount.current++;items=rotationView(allItems,loopCount.current);next=items[0];}
    show(next);
   }
  },250);
  const onVisibility=()=>{if(!document.hidden){wakeLock.current=null;void keepAwake();void refresh();}};
  const onOnline=()=>{void refresh();};
  window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility);
  return()=>{alive.current=false;requestSequence.current++;inFlight.current?.abort();
   clearInterval(poll);clearInterval(advance);window.removeEventListener('online',onOnline);
   document.removeEventListener('visibilitychange',onVisibility);
   document.removeEventListener('fullscreenchange',onFull);window.removeEventListener('resize',onResize);document.removeEventListener('keydown',onKey);
   if(hideControls.current)clearTimeout(hideControls.current);
   void wakeLock.current?.release().catch(()=>{});wakeLock.current=null;
   current.current=null;pending.current=null;overrideActive.current=false;};
 // The player intentionally creates one polling coordinator for its lifetime.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function pair(e:FormEvent){
  e.preventDefault();if(pairing)return;setPairing(true);setError('');
  try{
   const response=await fetch('/api/display/device',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({code})});
   if(!response.ok)throw Error('Invalid or expired code. Generate a new code in Display Management.');
   setCode('');await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Pairing unavailable.');}
  finally{setPairing(false);}
 }
 return <main className={'cd-screen'+(rotated?' cd-rotated':'')} aria-label="LV Zion Official Continuous Church Display" data-controls={controls||undefined}
  onPointerMove={showControls} onPointerDown={()=>{showControls();enableSound();}} onKeyDown={enableSound} onDoubleClick={()=>void toggleFullscreen()}>
  <div className={'cd-stage cd-motion-'+motionMode}>
   {mode==='unpaired'&&pairMode?<section className="cd-device-pair">
    <p className="cd-mark">LV<span>Zion</span></p>
    <h1>Pair this display</h1>
    <p>On a phone or computer, open Church Display in LV Zion, choose Screens, then create a one-time pairing code and type it here.</p>
    <form onSubmit={pair}><label htmlFor="cd-code" className="ui-visually-hidden">Pairing code</label>
     <input id="cd-code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={18} placeholder="XXXX-XXXX-XXXX" autoComplete="off" spellCheck={false} aria-label="Pairing code"/>
     <button disabled={pairing||code.replace(/[–\s-]/g,'').length!==12}>{pairing?'Pairing…':'Connect'}</button>
    </form>
    {error&&<p role="alert" className="cd-pair-error">{error}</p>}
   </section>:<DisplayVisual key={(slide?.id??'welcome')+(slide?.kind==='video'||slide?.kind==='mothers-love'?':'+playCount:'')} slide={slide} rooms={rooms} nowClock={nowClock} welcomeId={welcomeId} sound onSoundBlocked={()=>setSoundBlocked(true)}
     mediaSrc={name=>'/api/display/media/'+encodeURIComponent(name)}
     onMediaEnd={()=>{if(slide)mediaEnded.current=slide.id;}}/>}
  </div>
  {!(mode==='unpaired'&&pairMode)&&<button type="button" className="cd-fullscreen" onClick={()=>void toggleFullscreen()}
   aria-label={isFull?'Exit full screen':'Full screen'} data-hidden={!controls||undefined}>{isFull?'Exit full screen':'Full screen'}</button>}
  {soundBlocked&&<button type="button" className="cd-sound" onClick={enableSound}>Tap for sound</button>}
 </main>;
}
