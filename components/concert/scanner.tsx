'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import jsQR from 'jsqr';
import {FrameControls} from '../app-frame';
import {formatStamp,parseScan,type ScanResult} from '../../lib/concert/domain';
import './concert.css';

type Detector={detect:(source:CanvasImageSource)=>Promise<{rawValue:string}[]>};
type DetectorClass={new(options:{formats:string[]}):Detector;getSupportedFormats?:()=>Promise<string[]>};
const PAUSE_MS=2600;

function message(r:ScanResult):{tone:'ok'|'warn'|'bad';title:string;detail:string}{
 switch(r.result){
  case 'ok':return {tone:'ok',title:'Welcome, '+r.name,detail:'Party of '+(r.partySize??1)+'. Checked in.'};
  case 'already':return {tone:'warn',title:'Already checked in',detail:`${r.name} · party of ${r.partySize??1}${r.checkedInAt?' · at '+formatStamp(r.checkedInAt):''}`};
  case 'cancelled':return {tone:'bad',title:'Ticket removed',detail:(r.name??'This ticket')+' was removed from the guest list.'};
  case 'other_event':return {tone:'bad',title:'Ticket for another event',detail:(r.name??'This ticket')+' is not for the current concert.'};
  default:return {tone:'bad',title:'Not a valid ticket',detail:'Ask for the name and use the guest list instead.'};
 }
}

/** Plays a short tone; silent if audio is blocked. */
function beep(ok:boolean){try{const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=ok?880:220;g.gain.value=.08;o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+(ok?.12:.3));o.onended=()=>void a.close();}catch{}}

export default function ConcertScanner(){
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),photo=useRef<HTMLInputElement>(null);
 const [camera,setCamera]=useState<'starting'|'on'|'off'|'denied'>('starting'),[result,setResult]=useState<ScanResult|null>(null),[error,setError]=useState(''),[count,setCount]=useState(0);
 const busy=useRef(false),last=useRef<{code:string;at:number}>({code:'',at:0}),resume=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [access,setAccess]=useState<'checking'|'ok'|'signed-out'|'denied'|'error'>('checking');
 useEffect(()=>{const c=new AbortController();fetch('/api/concert/attendance',{cache:'no-store',signal:c.signal}).then(r=>setAccess(r.ok?'ok':r.status===401?'signed-out':r.status===403?'denied':'error')).catch(()=>{if(!c.signal.aborted)setAccess('error');});return()=>c.abort();},[]);

 const submit=useCallback(async(code:string)=>{
  const now=Date.now();if(busy.current||(code===last.current.code&&now-last.current.at<5000))return;
  busy.current=true;last.current={code,at:now};setError('');
  try{
   const response=await fetch('/api/concert/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
   const data=await response.json().catch(()=>null);
   if(!response.ok)throw Error(typeof data?.error==='string'?data.error:'The scan could not be checked.');
   const r=parseScan(data);setResult(r);if(r.result==='ok')setCount(c=>c+1);
   beep(r.result==='ok');try{navigator.vibrate?.(r.result==='ok'?80:[60,60,60]);}catch{}
  }catch(x){setError(x instanceof Error?x.message:'The scan could not be checked.');}
  if(resume.current)clearTimeout(resume.current);
  resume.current=setTimeout(()=>{busy.current=false;setResult(null);},PAUSE_MS);
 },[]);

 useEffect(()=>{
  if(access!=='ok')return;
  let stream:MediaStream|null=null,stopped=false,timer:ReturnType<typeof setTimeout>|null=null,detector:Detector|null=null;
  async function start(){
   try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    if(stopped){stream.getTracks().forEach(t=>t.stop());return;}
    const v=video.current!;v.srcObject=stream;await v.play();setCamera('on');
    const D=(window as unknown as {BarcodeDetector?:DetectorClass}).BarcodeDetector;
    try{if(D&&(!D.getSupportedFormats||(await D.getSupportedFormats()).includes('qr_code')))detector=new D({formats:['qr_code']});}catch{detector=null;}
    tick();
   }catch(x){setCamera(x instanceof DOMException&&x.name==='NotAllowedError'?'denied':'off');}
  }
  async function tick(){
   if(stopped)return;
   const v=video.current,c=canvas.current;
   if(v&&c&&v.readyState>=2&&!busy.current){
    try{
     let code:string|null=null;
     if(detector){const found=await detector.detect(v);code=found[0]?.rawValue??null;}
     else{const w=Math.min(v.videoWidth,720),h=Math.round(v.videoHeight*w/v.videoWidth);c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(v,0,0,w,h);code=jsQR(ctx.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'dontInvert'})?.data??null;}
     if(code)await submit(code);
    }catch{}
   }
   timer=setTimeout(()=>void tick(),180);
  }
  void start();
  return()=>{stopped=true;if(timer)clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());if(resume.current)clearTimeout(resume.current);};
 },[submit,access]);

 async function fromPhoto(file:File|undefined){
  if(!file)return;setError('');
  try{const bitmap=await createImageBitmap(file),c=canvas.current!,w=Math.min(bitmap.width,1200),h=Math.round(bitmap.height*w/bitmap.width);c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(bitmap,0,0,w,h);
   const code=jsQR(ctx.getImageData(0,0,w,h).data,w,h)?.data;if(!code)throw Error('No QR code was found in that picture.');last.current={code:'',at:0};busy.current=false;await submit(code);}
  catch(x){setError(x instanceof Error?x.message:'That picture could not be read.');}
  if(photo.current)photo.current.value='';
 }

 const shown=result?message(result):null;
 if(access!=='ok')return <main className="ui-main ui-narrow cc-page">
  <FrameControls title="Scan tickets" left={{label:'Concert',icon:'music',href:'/modules/concert'}} right={{label:'Scan',icon:'clipboard',active:true}}/>
  <p className={access==='checking'?'cc-hint':'cc-error'} role={access==='checking'?'status':'alert'}>{access==='checking'?'Checking access…':access==='signed-out'?'Sign in to your LV Zion account to scan tickets.':access==='denied'?'Only concert door staff can scan tickets. Ask a concert manager for access.':'The scanner is unavailable right now. Refresh to try again.'}</p>
  {access==='signed-out'?<a className="ui-button" href="/sign-in">Sign in</a>:null}
 </main>;
 return <main className="cc-scan">
  <FrameControls title="Scan tickets" left={{label:'Guest list',short:'Guests',icon:'people',href:'/modules/concert#guests'}} right={{label:'Scan',icon:'clipboard',active:true}}/>
  <div className="cc-scan-frame">
   <video ref={video} className="cc-scan-video" playsInline muted aria-label="Camera view"/>
   <span className="cc-scan-target" aria-hidden="true"/>
   {camera!=='on'?<p className="cc-scan-status" role="status">{camera==='starting'?'Starting the camera…':camera==='denied'?'Camera access is off. Allow the camera for lvz.app in your browser settings, or scan from a photo below.':'No camera is available. Scan from a photo below.'}</p>:null}
   {shown?<div className="cc-result" data-tone={shown.tone} role="alert"><strong>{shown.title}</strong><span>{shown.detail}</span></div>:null}
  </div>
  <canvas ref={canvas} hidden/>
  <div className="cc-scan-foot">
   <p className="cc-hint" aria-live="polite">{count?`${count} checked in on this phone`:'Point the camera at a ticket QR code.'}</p>
   {error?<p className="cc-error" role="alert">{error}</p>:null}
   <label className="ui-button ui-button-secondary cc-photo">Scan from a photo<input ref={photo} type="file" accept="image/*" onChange={e=>void fromPhoto(e.target.files?.[0])}/></label>
  </div>
 </main>;
}
