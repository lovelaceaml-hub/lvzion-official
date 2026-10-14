import {cycle} from './engine.mjs';
/** Management-only summary. Never imported by the normal TV branch. */
export function mountStudioSummary(root,runtime){
 function draw(){
  if(!root.isConnected)return;const holder=root.querySelector('.now-card>div');if(!holder)return;
  let line=holder.querySelector('[data-playback-summary]');if(!line){line=document.createElement('p');line.dataset.playbackSummary='true';holder.append(line);}
  let timing=holder.querySelector('[data-timing-summary]');if(!timing){timing=document.createElement('p');timing.dataset.timingSummary='true';holder.append(timing);}
  const state=runtime.engine.state(),p=runtime.engine.pkg,n=runtime.now();
  if(!p||!['playing','offline'].includes(state.mode)){line.textContent='Now: neutral fallback';timing.textContent='No eligible rotation is playing.';return;}
  const counts=new Map();const slots=cycle(p,n,runtime.online,runtime.engine.failed).map(entry=>{const occurrence=counts.get(entry.id)||0;counts.set(entry.id,occurrence+1);return {entry,key:`${entry.id}:${occurrence}`};});
  const index=slots.findIndex(x=>x.key===runtime.engine.lastRegularKey);const next=slots[(index+1)%slots.length]?.entry;const nextSlide=p.slides.find(s=>s.id===next?.slideId&&s.revision===next?.revision);
  line.textContent=`Now: ${state.slide?.title||'Neutral fallback'} · Next regular: ${nextSlide?.title||'Neutral fallback'}`;
  const later=p.entries.filter(e=>e.screenIds.includes(p.screenId)&&e.startsAt>n&&e.endsAt>n).length;
  const expiring=p.entries.filter(e=>e.screenIds.includes(p.screenId)&&e.endsAt>n&&e.endsAt-n<=86400000).length;
  timing.textContent=`Published schedule: ${later} later · ${expiring} expiring within 24h`;
 }
 const timer=setInterval(draw,1000);draw();return()=>clearInterval(timer);
}
