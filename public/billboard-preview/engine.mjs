/** Continuous Church Display R1. Pure, bounded playback policy; no backend credentials. */
export const TZ = 'America/Los_Angeles';
export const LIMITS = Object.freeze({entries:40, slides:40, repeat:3, seconds:60, leaseMs:300000, bytes:10485760});
export const DEMO_TIME = Date.parse('2026-10-14T18:00:00-07:00');
export const PERMISSIONS = Object.freeze(['create','review','approve','publish','playlist','assign','device','override']);
const layouts = ['editorial','schedule','event','campaign','image','video'];
const keys = (o, allowed) => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).every(k => allowed.includes(k));
const text = (v,max) => typeof v === 'string' && v.trim().length > 0 && [...v].length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v);
const finite = Number.isFinite;
const integer = (n,min,max) => Number.isSafeInteger(n) && n>=min && n<=max;
const copy = value => JSON.parse(JSON.stringify(value));
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function deepFreeze(obj) { if(obj && typeof obj==='object' && !Object.isFrozen(obj)){Object.freeze(obj);Object.values(obj).forEach(deepFreeze);} return obj; }
export function allowed(grants, permission, screenId) { return Array.isArray(grants) && grants.some(g=>g.permission===permission && g.screenId===screenId && g.active===true); }
export function mediaPath(path) { return typeof path==='string' && /^\/billboard-preview\/media\/[a-z0-9-]+\.(png|jpg|webp|mp4)$/.test(path); }
export function validateSlide(s) {
  const errors=[];
  if(!keys(s,['id','revision','layout','eyebrow','title','body','date','time','location','rows','media','fictional'])) return ['Invalid display fields'];
  if(!text(s.id,64)||!integer(s.revision,1,1000000)||!layouts.includes(s.layout)||s.fictional!==true) errors.push('Invalid display revision');
  if(!text(s.title,74)||!text(s.eyebrow,52)||!text(s.body,160)) errors.push('Keep the headline under 75 characters and supporting text under 161');
  for(const k of ['date','time','location']) if(s[k]!==undefined && !text(s[k],64)) errors.push(`Invalid ${k}`);
  if(s.rows!==undefined && (!Array.isArray(s.rows)||s.rows.length>3||s.rows.some(r=>!keys(r,['time','label'])||!text(r.time,28)||!text(r.label,80)))) errors.push('Use at most three short schedule rows');
  if(s.layout==='schedule' && (!s.date || !s.rows?.length)) errors.push('A schedule needs a date and activities');
  if(s.layout==='event' && (!s.date||!s.time||!s.location)) errors.push('An event needs a date, time and location');
  if(['image','video'].includes(s.layout) && !mediaPath(s.media)) errors.push('Missing or unapproved media');
  return errors;
}
export function validateEntry(e, ids) {
  return keys(e,['id','slideId','revision','seconds','transition','startsAt','endsAt','screenIds','cacheAllowed','repeat','emphasis']) && text(e.id,64) && ids.has(`${e.slideId}:${e.revision}`) && integer(e.seconds,5,LIMITS.seconds) && ['cut','fade'].includes(e.transition) && finite(e.startsAt)&&finite(e.endsAt)&&e.endsAt>e.startsAt && Array.isArray(e.screenIds)&&e.screenIds.length>0&&e.screenIds.length<=10&&e.screenIds.every(x=>text(x,64)) && typeof e.cacheAllowed==='boolean'&&integer(e.repeat,1,LIMITS.repeat) && (e.emphasis===undefined || (keys(e.emphasis,['startsAt','endsAt','repeat'])&&finite(e.emphasis.startsAt)&&finite(e.emphasis.endsAt)&&e.emphasis.endsAt>e.emphasis.startsAt&&e.emphasis.startsAt>=e.startsAt&&e.emphasis.endsAt<=e.endsAt&&integer(e.emphasis.repeat,1,LIMITS.repeat)));
}
export function validatePackage(p) {
  if(!keys(p,['schema','version','screenId','issuedAt','leaseUntil','slides','entries','hours','overrides']) || p.schema!==1 || !integer(p.version,1,1000000)||!text(p.screenId,64)||!finite(p.issuedAt)||!finite(p.leaseUntil)||p.leaseUntil<=p.issuedAt||p.leaseUntil-p.issuedAt>LIMITS.leaseMs) return false;
  if(!Array.isArray(p.slides)||p.slides.length>LIMITS.slides||p.slides.some(s=>validateSlide(s).length)||!Array.isArray(p.entries)||p.entries.length>LIMITS.entries) return false;
  const ids=new Set(p.slides.map(s=>`${s.id}:${s.revision}`));
  if(ids.size!==p.slides.length||new Set(p.entries.map(e=>e.id)).size!==p.entries.length||p.entries.some(e=>!validateEntry(e,ids))) return false;
  if(!Array.isArray(p.hours)||p.hours.length>14||p.hours.some(h=>!keys(h,['days','start','end'])||!Array.isArray(h.days)||!h.days.length||h.days.some(d=>!integer(d,0,6))||!integer(h.start,0,1439)||!integer(h.end,1,1440)||h.end<=h.start)) return false;
  if(!Array.isArray(p.overrides)||p.overrides.length>10||p.overrides.some(o=>!keys(o,['id','entryId','priority','startsAt','endsAt'])||!text(o.id,64)||!p.entries.some(e=>e.id===o.entryId)||!integer(o.priority,0,100)||!finite(o.startsAt)||!finite(o.endsAt)||o.endsAt<=o.startsAt)) return false;
  return true;
}
export function localParts(now) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
  return {day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday),minute:Number(p.hour)*60+Number(p.minute),date:`${p.year}-${p.month}-${p.day}`};
}
/** Explicit ISO offset required. Never silently disambiguate DST folds or nonexistent local times. */
export function churchInstant(iso) {
  if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(iso)) throw Error('Include the local UTC offset');
  const n=Date.parse(iso); if(!finite(n)) throw Error('Invalid time');
  const p=localParts(n); if(`${p.date}T${String(Math.floor(p.minute/60)).padStart(2,'0')}:${String(p.minute%60).padStart(2,'0')}`!==iso.slice(0,16)) throw Error('Time or offset does not match Los Angeles');
  return n;
}
export function isOperating(p,now) { const t=localParts(now); return p.hours.some(h=>h.days.includes(t.day)&&t.minute>=h.start&&t.minute<h.end); }
export function eligible(e,p,now,online=true) { return e.screenIds.includes(p.screenId)&&e.startsAt<=now&&now<e.endsAt&&(online||e.cacheAllowed); }
export function cycle(p,now,online=true,failed=new Set()) {
  const available=p.entries.filter(e=>eligible(e,p,now,online)&&!failed.has(`${e.slideId}:${e.revision}`)); const result=[];
  // Weighted rounds interleave emphasis rather than producing a block of repeated notices.
  for(let round=0;round<LIMITS.repeat;round++) for(const e of available){const n=e.emphasis&&now>=e.emphasis.startsAt&&now<e.emphasis.endsAt?e.emphasis.repeat:e.repeat;if(round<n)result.push(e);}
  return result;
}
export class DisplayEngine {
  constructor(){this.pkg=null;this.pending=null;this.current=null;this.startedAt=0;this.remaining=0;this.paused=false;this.pauseAt=0;this.failed=new Set();this.lastNow=0;this.mode='neutral';this.activeOverride=null;this.revoked=false;this.transitions=0;}
  offer(p,now){if(!validatePackage(p)||p.issuedAt>now+5000||p.leaseUntil<=now||this.revoked)return false;const latest=this.pending||this.pkg;if(latest && (p.screenId!==latest.screenId||p.version<latest.version||(p.version===latest.version&&p.issuedAt<latest.issuedAt)))return false;
    // A same-version heartbeat may extend only the lease, never substitute content.
    if(latest&&p.version===latest.version){const strip=x=>JSON.stringify({...x,issuedAt:0,leaseUntil:0});if(strip(p)!==strip(latest))return false;}
    this.pending=deepFreeze(copy(p));return true;
  }
  revoke(){this.revoked=true;this.pkg=null;this.pending=null;this.current=null;this.failed.clear();this.mode='revoked';}
  fail(){if(this.current)this.failed.add(`${this.current.slideId}:${this.current.revision}`);this.current=null;this.activeOverride=null;}
  pause(now){if(!this.paused){this.paused=true;this.pauseAt=now;this.remaining=this.current?Math.max(0,this.current.seconds*1000-(now-this.startedAt)):0;}}
  resume(now){if(this.paused){if(this.current)this.startedAt=now-(this.current.seconds*1000-this.remaining);this.paused=false;}}
  next(){this.current=null;this.activeOverride=null;}
  tick(now,{online=true,clockTrusted=true}={}) {
    if(this.revoked)return this.state();
    if(!finite(now)||!clockTrusted||now+1000<this.lastNow){this.current=null;this.mode='clock';return this.state();}
    this.lastNow=Math.max(this.lastNow,now);
    const effective=this.pending||this.pkg;
    if(!effective||now>=effective.leaseUntil){this.current=null;this.mode='stale';return this.state();}
    if(!isOperating(effective,now)){this.current=null;this.mode='quiet';return this.state();}
    // Revocation, expiry, quiet and authorized override preempt a paused slide.
    const overrides=effective.overrides.filter(o=>o.startsAt<=now&&now<o.endsAt&&effective.entries.some(e=>e.id===o.entryId&&eligible(e,effective,now,online)&&!this.failed.has(`${e.slideId}:${e.revision}`))).sort((a,b)=>b.priority-a.priority||b.startsAt-a.startsAt||a.id.localeCompare(b.id));
    const override=overrides[0];
    const validCurrent=this.current&&eligible(this.current,this.pkg||effective,now,online)&&!this.failed.has(`${this.current.slideId}:${this.current.revision}`);
    const due=!validCurrent||(!this.paused&&now-this.startedAt>=this.current.seconds*1000)||this.activeOverride!== (override?.id||null);
    if(due || (override && this.pending)) {
      const prior=this.current;
      if(this.pending){const oldVersion=this.pkg?.version;this.pkg=this.pending;this.pending=null;if(oldVersion!==this.pkg.version)this.failed.clear();}
      const p=this.pkg;const list=cycle(p,now,online,this.failed);
      let entry=override?p.entries.find(e=>e.id===override.entryId):null;
      if(!entry){const i=prior?list.findIndex(e=>e.id===prior.id):-1;entry=list[(i+1)%list.length]||null;}
      this.current=entry;this.activeOverride=override?.id||null;this.startedAt=now;this.remaining=entry?entry.seconds*1000:0;this.transitions++;
    }
    this.mode=this.current?(online?'playing':'offline'):'empty';return this.state();
  }
  state(){return {mode:this.mode,entry:this.current,slide:this.current?this.pkg?.slides.find(s=>s.id===this.current.slideId&&s.revision===this.current.revision):null,version:this.pkg?.version||0,pendingVersion:this.pending?.version||null,paused:this.paused,failedCount:this.failed.size,transitions:this.transitions,override:!!this.activeOverride};}
}
export const FIXTURES=deepFreeze([
 {id:'welcome',revision:1,layout:'editorial',eyebrow:'CHURCH ANNOUNCEMENT',title:'A warm welcome.',body:'Make room for a conversation. There is a place for everyone.',fictional:true},
 {id:'sunday',revision:1,layout:'schedule',eyebrow:'SUNDAY GOSPEL SCHEDULE',title:'A day to go together.',body:'October 18 · One date, one clear plan.',date:'OCTOBER 18, 2026',rows:[{time:'10:00 AM–3:00 PM',label:'All-Day Preaching in 3rd Las Vegas Area'},{time:'3:00 PM',label:'Member Visitation'}],fictional:true},
 {id:'picnic',revision:1,layout:'event',eyebrow:'FICTIONAL COMMUNITY EVENT',title:'An afternoon together.',body:'Bring a picnic. Enjoy good company.',date:'SATURDAY, OCTOBER 24',time:'4:00–6:00 PM',location:'SAMPLE GARDEN',fictional:true},
 {id:'campaign',revision:1,layout:'campaign',eyebrow:'FICTIONAL CAMPAIGN CONCEPT',title:'Kind words week.',body:'A little encouragement. A brighter day.',fictional:true},
 {id:'notice',revision:1,layout:'editorial',eyebrow:'FICTIONAL TEMPORARY NOTICE',title:'A moment of quiet.',body:'The regular display will resume shortly.',fictional:true},
 {id:'broken',revision:1,layout:'image',eyebrow:'MEDIA FAILURE TEST',title:'Sample image',body:'This intentionally missing image must not stop playback.',media:'/billboard-preview/media/intentionally-missing.png',fictional:true}
]);
export function demoPackage(now=DEMO_TIME,version=1) {
 const slides=copy(FIXTURES);return {schema:1,version,screenId:'demo-lobby',issuedAt:now,leaseUntil:now+LIMITS.leaseMs,slides,entries:slides.slice(0,4).map((s,i)=>({id:`entry-${s.id}`,slideId:s.id,revision:1,seconds:[12,18,14,14][i],transition:'fade',startsAt:DEMO_TIME-86400000,endsAt:DEMO_TIME+10*86400000,screenIds:['demo-lobby'],cacheAllowed:true,repeat:1})),hours:[{days:[0,1,2,3,4,5,6],start:420,end:1380}],overrides:[]};
}
export function publicationState(entry,now){return now>=entry.endsAt?'Expired':now<entry.startsAt?'Scheduled':'Eligible now';}
export function mediaPreflight({type,size,width,height,duration,metadataStripped}) {const e=[];if(!['image/png','image/jpeg','image/webp','video/mp4'].includes(type))e.push('Unsupported media type');if(!integer(size,1,LIMITS.bytes))e.push('File exceeds 10 MB');if(!integer(width,1280,4096)||!integer(height,720,2304))e.push('Use at least 1280 × 720, at most 4096 × 2304');if(width&&height&&Math.abs(width/height-16/9)>.1)e.push('Review letterboxing for this aspect ratio');if(type==='video/mp4'&&(!finite(duration)||duration<1||duration>60))e.push('Video must be 1–60 seconds');if(metadataStripped!==true)e.push('Server must re-encode and strip metadata');return e;}
/** A display projection is copied from the approved snapshot, never an ordinary module response. */
export function projectForScreen(p,screenId,now){if(!validatePackage(p)||p.screenId!==screenId||p.leaseUntil<=now)return null;const entries=p.entries.filter(e=>e.screenIds.includes(screenId));const revisions=new Set(entries.map(e=>`${e.slideId}:${e.revision}`));return deepFreeze({...copy(p),entries:copy(entries),slides:p.slides.filter(s=>revisions.has(`${s.id}:${s.revision}`)).map(copy),overrides:p.overrides.filter(o=>entries.some(e=>e.id===o.entryId)).map(copy)});}
