import {DisplayEngine,DEMO_TIME,demoPackage,escapeHtml as esc,deepFreeze} from './engine.mjs';
export function slideMarkup(s) {
 if(!s)return '<section class="slide neutral-slide"><div><p>LV ZION OFFICIAL</p><h1>Welcome.</h1><p>A quiet moment.</p></div></section>';
 const label='<span class="watermark">DESIGN PREVIEW · NOT PUBLISHED</span>';
 const media=['image','video'].includes(s.layout)?(s.layout==='image'?`<img class="slide-media" src="${esc(s.media)}" alt="${esc(s.title)}">`:`<video class="slide-media" src="${esc(s.media)}" autoplay muted playsinline preload="metadata" aria-label="${esc(s.title)}"></video>`):'';
 const rows=s.rows?.map(r=>`<div class="schedule-row"><strong>${esc(r.time)}</strong><span>${esc(r.label)}</span></div>`).join('')||'';
 const date=s.layout==='schedule'?'<aside class="date-block"><span>SUNDAY</span><b>18</b><span>OCTOBER<br>2026</span></aside>':'';
 return `<section class="slide ${esc(s.layout)}" data-slide="${esc(s.id)}"><div class="art" aria-hidden="true"><i></i><i></i><i></i></div>${date}${media}<div class="slide-content"><p class="eyebrow">${esc(s.eyebrow)}</p><h1>${esc(s.title)}</h1>${s.layout==='schedule'?`<div class="schedule-rows">${rows}</div>`:`<p class="slide-body">${esc(s.body)}</p>`}${s.layout==='event'?`<div class="event-detail"><strong>${esc(s.date)}</strong><span>${esc(s.time)} · ${esc(s.location)}</span></div>`:''}</div>${label}</section>`;
}
export function createRuntime(onState=()=>{}) {
 const engine=new DisplayEngine();let draft=demoPackage(),published=deepFreeze(JSON.parse(JSON.stringify(draft)));let offset=0;const started=performance.now();let disconnected=!navigator.onLine;let verified=navigator.onLine;let lastRenew=DEMO_TIME;let key='';let stage=null;let timers=[];let ticks=0;
 const now=()=>DEMO_TIME+performance.now()-started+offset;
 if(verified)engine.offer(published,now());
 function paint(s){if(!stage)return;const k=`${s.slide?.id||'neutral'}:${s.slide?.revision||0}:${s.transitions}:${s.mode}`;if(k===key)return;key=k;timers.forEach(clearTimeout);timers=[];const old=stage.querySelector('video');if(old){old.pause();old.removeAttribute('src');old.load();}stage.innerHTML=slideMarkup(s.slide);stage.dataset.mode=s.mode;
  const media=stage.querySelector('img,video');if(media){const fail=()=>{engine.fail();tick();};media.addEventListener('error',fail,{once:true});if(media instanceof HTMLVideoElement){media.muted=true;media.play().catch(fail);media.addEventListener('ended',()=>{engine.next();tick();},{once:true});let stall=null;media.addEventListener('stalled',()=>{if(stall)clearTimeout(stall);stall=setTimeout(fail,5000);timers.push(stall);});media.addEventListener('playing',()=>{if(stall)clearTimeout(stall);});}else if(media.complete&&media.naturalWidth===0)fail();}
 }
 function tick(){const n=now();if(!disconnected&&verified&&n-lastRenew>=30000){published=deepFreeze({...published,issuedAt:n,leaseUntil:n+300000});engine.offer(published,n);lastRenew=n;}const s=engine.tick(n,{online:!disconnected,clockTrusted:verified});paint(s);onState(s,n);ticks++;return s;}
 const interval=setInterval(tick,250);
 const offline=()=>{disconnected=true;tick();};const online=()=>{disconnected=false;verified=true;lastRenew=0;tick();};
 addEventListener('offline',offline);addEventListener('online',online);const visibility=()=>tick();document.addEventListener('visibilitychange',visibility);
 const api={engine,now,tick,setStage(el){stage=el;key='';tick();},get published(){return published;},get online(){return !disconnected;},publish(p){const n=now();const value=deepFreeze({...JSON.parse(JSON.stringify(p)),issuedAt:n,leaseUntil:n+300000});if(!engine.offer(value,n))return false;published=value;lastRenew=n;tick();return true;},network(value){value?online():offline();},advance(ms){offset+=ms;tick();},resetClock(){offset=0;},dispose(){clearInterval(interval);timers.forEach(clearTimeout);removeEventListener('offline',offline);removeEventListener('online',online);document.removeEventListener('visibilitychange',visibility);stage?.querySelector('video')?.pause();},stats(){return {ticks,mediaElements:stage?.querySelectorAll('video,img').length||0};}};
 addEventListener('pagehide',()=>api.dispose(),{once:true});return api;
}
export function mountPlayer(root){
 document.body.className='billboard-tv';root.innerHTML='<main class="tv-surface" aria-label="Fictional church display"><div id="tv-stage" class="stage"></div></main>';
 const runtime=createRuntime();runtime.setStage(root.querySelector('#tv-stage'));
 // Only an explicitly approved fictional shell is stored; no packages, drafts or credentials.
 if('serviceWorker' in navigator)navigator.serviceWorker.register('/billboard-preview/sw.js',{scope:'/billboard-preview/'}).catch(()=>{});
 return runtime;
}
