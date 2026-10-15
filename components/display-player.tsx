'use client';
import {useEffect,useRef,useState} from 'react';
import type{FormEvent}from'react';
import type{DisplaySlide}from'../lib/continuous-display/live-contract';
import type{DisplaySnapshotR2}from'../lib/continuous-display/operations';
import {activeDisplaySlides}from '../lib/continuous-display/live-contract';
import {parseDisplaySnapshotR2,overrideForDisplay,withinOperatingHours,type DisplayMotionMode}from '../lib/continuous-display/operations';
import DisplayVisual from './display-visual';
type Verified={packet:DisplaySnapshotR2;serverEpoch:number;verifiedAt:number};
type ScreenMode='loading'|'unpaired'|'paired';
export default function DisplayPlayer(){
 const [mode,setMode]=useState<ScreenMode>('loading');
 const [motionMode,setMotionMode]=useState<DisplayMotionMode>('standard');
 const [slide,setSlide]=useState<DisplaySlide|null>(null);
 const [code,setCode]=useState('');const [pairing,setPairing]=useState(false);
 const [error,setError]=useState('');
 const current=useRef<Verified|null>(null),pending=useRef<Verified|null>(null);
 const shown=useRef<string|null>(null),shownAt=useRef(0),generation=useRef(0);
 const alive=useRef(false);
 const overrideActive=useRef(false);
 const requestSequence=useRef(0);
 const inFlight=useRef<AbortController|null>(null);
 // Show the neutral welcome and forget which slide or temporary notice was on screen.
 const blank=()=>{shown.current=null;overrideActive.current=false;setSlide(null);};
 const apply=(verified:Verified)=>{
  setMotionMode(verified.packet.motionMode);
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
   }else {current.current={...checked};setMotionMode(checked.packet.motionMode);}
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
  void refresh();
  const poll=setInterval(()=>{if(alive.current)void refresh();},12000);
  const advance=setInterval(()=>{
   const v=current.current;if(!v)return;
   const now=v.serverEpoch+(performance.now()-v.verifiedAt);
   const isExpired=now>=Date.parse(v.packet.leaseUntil);
   if(isExpired){
    if(pending.current){
     const pv=pending.current,pNow=pv.serverEpoch+(performance.now()-pv.verifiedAt);
     if(pNow<Date.parse(pv.packet.leaseUntil)){apply(pv);return;}
    }
    current.current=null;blank();return;
   }
   // Operating periods and per-slide expiry are evaluated from the verified server clock.
   if(!withinOperatingHours(v.packet.operatingHours,now)){blank();return;}
   const items=activeDisplaySlides(v.packet.slides,now);
   if(!items.length){blank();return;}
   const forced=overrideForDisplay(v.packet,now);
   if(forced){
    if(!overrideActive.current||shown.current!==forced.id){
     shown.current=forced.id;shownAt.current=performance.now();setSlide(forced);
    }
    overrideActive.current=true;return;
   }
   if(overrideActive.current){overrideActive.current=false;shown.current=null;}
   const index=shown.current===null?-1:items.findIndex(s=>s.id===shown.current);
   const existing=index>=0?items[index]:null;
   const duration=existing?existing.duration*1000:0;
   if(!existing||performance.now()-shownAt.current>=duration){
    if(pending.current&&performance.now()-pending.current.verifiedAt<=30000){apply(pending.current);return;}
    const next=items[index<0?0:(index+1)%items.length];
    shown.current=next.id;shownAt.current=performance.now();setSlide(next);
   }
  },250);
  const onVisibility=()=>{if(!document.hidden)void refresh();};
  const onOnline=()=>{void refresh();};
  window.addEventListener('online',onOnline);document.addEventListener('visibilitychange',onVisibility);
  return()=>{alive.current=false;requestSequence.current++;inFlight.current?.abort();
   clearInterval(poll);clearInterval(advance);window.removeEventListener('online',onOnline);
   document.removeEventListener('visibilitychange',onVisibility);
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
 return <main className="cd-screen" aria-label="LV Zion Official Continuous Church Display">
  <div className={'cd-stage cd-motion-'+motionMode}>
   {mode==='unpaired'?<section className="cd-device-pair">
    <p>LV ZION OFFICIAL · DIGITAL BILLBOARD</p>
    <h1>Pair this display</h1>
    <p>Open Continuous Church Display in your authorized LV Zion account, choose Screens, then create a one-time pairing code.</p>
    <form onSubmit={pair}><label htmlFor="cd-code" className="cd-visually-hidden">Pairing code</label>
     <input id="cd-code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={18} placeholder="XXXX–XXXX–XXXX" autoComplete="off" spellCheck={false} aria-label="Pairing code"/>
     <button disabled={pairing||code.replace(/[–\s-]/g,'').length!==12}>{pairing?'Pairing…':'Connect'}</button>
    </form>
    {error&&<p role="alert" className="cd-pair-error">{error}</p>}
   </section>:<DisplayVisual slide={slide}/>}
  </div>
 </main>;
}
