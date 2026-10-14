'use client';
import {useEffect,useRef,useState} from 'react';
import type{FormEvent}from'react';
import type{DisplaySnapshot,DisplaySlide}from'../lib/continuous-display/live-contract';
import {activeDisplaySlides,parseDisplaySnapshot} from '../lib/continuous-display/live-contract';
import DisplayVisual from './display-visual';
type Verified={packet:DisplaySnapshot;serverEpoch:number;verifiedAt:number};
type ScreenMode='loading'|'unpaired'|'paired';
export default function DisplayPlayer(){
 const [mode,setMode]=useState<ScreenMode>('loading');
 const [slide,setSlide]=useState<DisplaySlide|null>(null);
 const [code,setCode]=useState('');const [pairing,setPairing]=useState(false);
 const [error,setError]=useState('');
 const current=useRef<Verified|null>(null),pending=useRef<Verified|null>(null);
 const shown=useRef<string|null>(null),shownAt=useRef(0),generation=useRef(0);
 const alive=useRef(false);
 const apply=(verified:Verified)=>{
  current.current=verified;pending.current=null;shown.current=null;shownAt.current=performance.now();generation.current++;
  setMode('paired');setSlide(null);
 };
 const refresh=async()=>{
  try{
   const r=await fetch('/api/display/device',{cache:'no-store',credentials:'same-origin'});
   if(!r.ok)throw Error('Unavailable');
   const raw:unknown=await r.json();
   if(!raw||typeof raw!=='object'||!('paired' in raw)||raw.paired!==true){
    current.current=null;pending.current=null;shown.current=null;setSlide(null);setMode('unpaired');return;
   }
   const packet=parseDisplaySnapshot(raw);
   const checked={packet,serverEpoch:Date.parse(packet.serverTime),verifiedAt:performance.now()};
   if(!current.current||packet.version===0&&current.current.packet.version===0)apply(checked);
   else if(packet.version!==current.current.packet.version)pending.current=checked;
   else current.current={...checked};
   setMode('paired');setError('');
  }catch{
   // A currently loaded, verified packet is used only until its short server-issued lease.
   if(!current.current){setSlide(null);setMode('loading');}
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
    if(pending.current&&performance.now()-pending.current.verifiedAt<=30000){apply(pending.current);return;}
    current.current=null;shown.current=null;setSlide(null);return;
   }
   const items=activeDisplaySlides(v.packet.slides,now);
   if(!items.length){shown.current=null;setSlide(null);return;}
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
  return()=>{alive.current=false;clearInterval(poll);clearInterval(advance);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);current.current=null;pending.current=null;};
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
  <div className="cd-stage">
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
