import {DisplayEngine,DEMO_TIME,demoPackage,escapeHtml as esc,deepFreeze} from './engine.mjs';
export function slideMarkup(s){
 if(!s)return '<section class="slide neutral-slide"><div><p>LV ZION OFFICIAL</p><h1>Welcome.</h1><p>A quiet moment.</p></div></section>';
 const label='<span class="watermark">DESIGN PREVIEW · NOT PUBLISHED</span>';
 const media=['image','video'].includes(s.layout)?(s.layout==='image'?`<img class="slide-media" src="${esc(s.media)}" alt="${esc(s.title)}">`:`<video class="slide-media" src="${esc(s.media)}" autoplay muted playsinline preload="metadata" aria-label="${esc(s.title)}"></video>`):'';
 const rows=s.rows?.map(r=>`<div class="schedule-row"><strong>${esc(r.time)}</strong><span>${esc(r.label)}</span></div>`).join('')||'';
 const date=s.layout==='schedule'?`<aside class="date-block"><span>SUNDAY</span><b>18</b><span>${esc(s.date)}</span></aside>`:'';
 return `<section class="slide ${esc(s.layout)}" data-slide="${esc(s.id)}"><div class="art" aria-hidden="true"><i></i><i></i><i></i></div>${date}${media}<div class="slide-content"><p class="eyebrow">${esc(s.eyebrow)}</p><h1>${esc(s.title)}</h1>${s.layout==='schedule'?`<div class="schedule-rows">${rows}</div>`:`<p class="slide-body">${esc(s.body)}</p>`}${s.layout==='event'?`<div class="event-detail"><strong>${esc(s.date)}</strong><span>${esc(s.time)} · ${esc(s.location)}</span></div>`:''}</div>${label}</section>`;
}
export function createRuntime(onState=()=>{}){
 const engine=new DisplayEngine();let published=deepFreeze(demoPackage());let offset=0;const started=performance.now();let verified=false;let reachable=false;let simulatedOffline=false;let lastRenew=0;let key='';let stage=null;let timers=[];let interval=null;let ticks=0;let disposed=false;let inFlight=null;let lastProbe=0;
 const now=()=>DEMO_TIME+performance.now()-started+offset;
 function cleanupMedia(){timers.forEach(clearTimeout);timers=[];const old=stage?.querySelector('video');if(old){old.pause();old.removeAttribute('src');old.load();}}
 function paint(s){
  if(!stage)return;const k=`${s.slide?.id||'neutral'}:${s.slide?.revision||0}:${s.transitions}:${s.mode}`;if(k===key)return;key=k;cleanupMedia();stage.innerHTML=slideMarkup(s.slide);stage.dataset.mode=s.mode;stage.dataset.transition=s.entry?.transition||'cut';
  const media=stage.querySelector('img,video');if(!media)return;
  const generation=key;const fail=()=>{if(disposed||generation!==key||!media.isConnected)return;engine.fail();tick();};
  const watchdog=setTimeout(fail,5000);timers.push(watchdog);media.addEventListener('error',fail,{once:true});
  if(media instanceof HTMLVideoElement){media.muted=true;media.play().catch(fail);media.addEventListener('playing',()=>clearTimeout(watchdog),{once:true});media.addEventListener('ended',()=>{if(generation!==key)return;engine.next();tick();},{once:true});let stall=null;media.addEventListener('stalled',()=>{if(stall)clearTimeout(stall);stall=setTimeout(fail,5000);timers.push(stall);});media.addEventListener('playing',()=>{if(stall)clearTimeout(stall);});}
  else {media.addEventListener('load',()=>clearTimeout(watchdog),{once:true});if(media.complete){clearTimeout(watchdog);if(media.naturalWidth===0)fail();}}
 }
 async function probe(){
  if(disposed||simulatedOffline||inFlight||!navigator.onLine)return;const controller=new AbortController();inFlight=controller;const timeout=setTimeout(()=>controller.abort(),4000);lastProbe=performance.now();
  try{const r=await fetch('/billboard-preview/heartbeat',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
   if(r.status===401||r.status===403){engine.revoke();reachable=false;await caches?.delete?.('lvzion-billboard-fictional-shell-r2');return;}
   if(!r.ok)throw Error('Unavailable');const data=await r.json();if(data.fictional!==true||data.reachable!==true||!Number.isFinite(data.serverTime))throw Error('Invalid heartbeat');
   if(disposed||simulatedOffline)return;verified=true;reachable=true;const n=now();published=deepFreeze({...published,issuedAt:n,leaseUntil:n+300000});engine.offer(published,n);lastRenew=n;
  }catch{reachable=false;}finally{clearTimeout(timeout);inFlight=null;if(!disposed)tick();}
 }
 function tick(){if(disposed)return engine.state();const n=now();const online=reachable&&!simulatedOffline&&navigator.onLine;const state=engine.tick(n,{online,clockTrusted:verified});paint(state);onState(state,n);ticks++;if(!simulatedOffline&&performance.now()-lastProbe>=15000)void probe();return state;}
 function offline(){reachable=false;inFlight?.abort();tick();}
 function online(){lastProbe=0;void probe();}
 const visibility=()=>{if(!document.hidden){tick();void probe();}};
 function start(){if(disposed)return;interval=setInterval(tick,250);void probe();}
 const pagehide=()=>{if(interval)clearInterval(interval);interval=null;inFlight?.abort();cleanupMedia();};
 const pageshow=event=>{if(event.persisted&&!disposed){verified=false;reachable=false;engine.current=null;start();tick();}};
 addEventListener('offline',offline);addEventListener('online',online);addEventListener('pagehide',pagehide);addEventListener('pageshow',pageshow);document.addEventListener('visibilitychange',visibility);
 const api={engine,now,tick,setStage(el){cleanupMedia();stage=el;key='';tick();},get published(){return published;},get online(){return reachable&&!simulatedOffline&&navigator.onLine;},publish(p){if(!api.online)return false;const n=now();const value=deepFreeze({...JSON.parse(JSON.stringify(p)),issuedAt:n,leaseUntil:n+300000});if(!engine.offer(value,n))return false;published=value;lastRenew=n;tick();return true;},network(value){simulatedOffline=!value;if(value)online();else offline();},advance(ms){offset+=ms;tick();},dispose(){disposed=true;if(interval)clearInterval(interval);inFlight?.abort();cleanupMedia();removeEventListener('offline',offline);removeEventListener('online',online);removeEventListener('pagehide',pagehide);removeEventListener('pageshow',pageshow);document.removeEventListener('visibilitychange',visibility);},stats(){return {ticks,mediaElements:stage?.querySelectorAll('video,img').length||0,lastVerified:lastRenew};}};
 start();return api;
}
export function mountPlayer(root){document.body.className='billboard-tv';root.innerHTML='<main class="tv-surface" aria-label="Fictional church display"><div id="tv-stage" class="stage"></div></main>';const runtime=createRuntime();runtime.setStage(root.querySelector('#tv-stage'));if('serviceWorker'in navigator)navigator.serviceWorker.register('/billboard-preview/sw.js',{scope:'/billboard-preview/'}).catch(()=>{});return runtime;}
