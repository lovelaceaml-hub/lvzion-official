'use client';
import {useEffect,useState} from 'react';
import './installation-panel.css';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export default function InstallationPanel(){
 const[event,setEvent]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(false),[offlineReady,setOfflineReady]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  setInstalled(window.matchMedia('(display-mode: standalone)').matches);
  const available=(e:Event)=>{e.preventDefault();setEvent(e as InstallEvent);};
  const done=()=>{setInstalled(true);setEvent(null);};
  window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',done);
  return()=>{window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',done);};
 },[]);
 async function install(){
  if(!event||busy)return;setBusy(true);setMessage('');
  try{await event.prompt();const result=await event.userChoice;setMessage(result.outcome==='accepted'?'Installation requested. Follow your browser’s confirmation.':'Installation dismissed. You can still use LV Zion in the browser.');setEvent(null);}catch{setMessage('The browser could not start installation. Use its Add to Home Screen option.');}finally{setBusy(false);}
 }
 async function offline(){
  if(busy)return;setBusy(true);setMessage('');
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   if(!('serviceWorker'in navigator)||!window.isSecureContext)throw new Error('Unsupported');
   const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
   if(!registration.active){
    await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Timed out')),12000);})]);
   }
   setOfflineReady(true);setMessage('Public offline fallback enabled. Member records and API responses are not cached.');
  }catch{setMessage('Offline fallback could not be enabled in this browser. No member data was cached.');}finally{if(timer)clearTimeout(timer);setBusy(false);}
 }
 return <main className="lvz-install"><header><a href="/members">← LV Zion</a><span>PHONE SETUP</span></header><p className="lvz-install-kicker">YOUR MEMBER SPACE</p><h1>LV Zion,<br/><em>on your phone.</em></h1><p>Add a shortcut to your home screen. Installing the app does not create an account or grant access to member information.</p>
  <section><h2>{installed?'Opened as an installed app':'Add to your home screen'}</h2>{event?<button disabled={busy} onClick={()=>void install()}>Install LV Zion</button>:<><h3>iPhone or iPad</h3><p>Open this site in Safari, use the Share menu, then choose Add to Home Screen.</p><h3>Android</h3><p>Open this site in your browser and look for Install app or Add to Home screen in its menu. Availability depends on the browser.</p></>}</section>
  <section><h2>A private offline experience</h2><p>Enable a small offline notice and generic app icons. Personal profiles, group rosters, messages, login tokens, and management data are never saved in the offline cache.</p><button disabled={busy||offlineReady} onClick={()=>void offline()}>{offlineReady?'Offline fallback enabled':busy?'Checking browser…':'Enable offline fallback'}</button><small>Nothing is submitted or synchronized in the background.</small></section>
  {message&&<p className="lvz-install-message" role="status">{message}</p>}
  <aside>Sign in to access your member space. Your account permissions apply on every device.</aside><a className="lvz-install-back" href="/members">Return to your member space →</a>
 </main>;
}
