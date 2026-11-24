import 'server-only';
import {settings} from '../server/config';
import {namedInviteUrl} from './registration-server';
import type {InvitationRow,TrackerData} from './invitation-tracker';

type Message={id:string;to:string[];from:string;subject:string;created_at:string;last_event:string};
type MessageDetail=Message&{text?:string|null;html?:string|null};
const known=new Set(['sent','delivered','opened','clicked','bounced','complained','failed','suppressed','delivery_delayed']);
const fromEvents=(from:string)=>/(^|<)events@lvz\.app(>|$)/i.test(from.trim());
const validMessage=(m:unknown):m is Message=>{
  if(!m||typeof m!=='object')return false;
  const v=m as Message;
  return typeof v.id==='string'&&/^[\w-]{1,80}$/.test(v.id)&&Array.isArray(v.to)&&v.to.every(x=>typeof x==='string')&&
    typeof v.from==='string'&&typeof v.subject==='string'&&typeof v.created_at==='string'&&Number.isFinite(Date.parse(v.created_at))&&typeof v.last_event==='string';
};

// Read-only, bounded lookup. Match the exact signed invitation URL inside the provider
// message; never guess by display name or recipient alone. Never return bodies or URLs.
export async function invitationDelivery(rows:InvitationRow[]):Promise<Pick<TrackerData,'rows'|'provider'>>{
  const token=process.env.LVZ_CONCERT_RESEND_READ_KEY;
  if(!token||!settings().production)return {rows,provider:'not configured'};
  const deadline=Date.now()+16_000;
  const eligible=rows.filter(r=>r.email&&r.attempts>0);
  if(!eligible.length)return {rows,provider:'checked'};
  const earliest=Math.min(...eligible.map(r=>Date.parse(r.createdAt)))-60_000;
  let partial=false;
  async function get(path:string):Promise<unknown>{
    const remaining=deadline-Date.now();
    if(remaining<500)throw new Error('Lookup time limit');
    const response=await fetch('https://api.resend.com'+path,{headers:{Authorization:'Bearer '+token},
      cache:'no-store',signal:AbortSignal.timeout(Math.min(3500,remaining))});
    if(!response.ok)throw new Error('Provider unavailable');
    return response.json();
  }
  try{
    let after:string|undefined;
    const messages:Message[]=[];
    for(let page=0;page<3;page++){
      const data=await get('/emails?limit=100'+(after?'&after='+encodeURIComponent(after):'')) as {data?:unknown;has_more?:boolean};
      if(!Array.isArray(data.data)||!data.data.every(validMessage))throw new Error('Invalid provider response');
      const list=data.data;
      messages.push(...list.filter(m=>fromEvents(m.from)&&m.subject.startsWith('You’re invited · ')&&Date.parse(m.created_at)>=earliest));
      if(!data.has_more||!list.length||Math.min(...list.map(m=>Date.parse(m.created_at)))<earliest)break;
      after=list[list.length-1].id;
      if(page===2)partial=true;
    }
    const candidates=messages.filter(m=>eligible.some(r=>m.to.some(t=>t.toLowerCase()===r.email?.toLowerCase())&&Date.parse(m.created_at)>=Date.parse(r.createdAt)-60_000));
    candidates.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
    if(candidates.length>30)partial=true;
    const match=new Map<string,Message>();
    for(const message of candidates.slice(0,30)){
      try{
        const detail=await get('/emails/'+encodeURIComponent(message.id)) as MessageDetail;
        if(!validMessage(detail)||detail.id!==message.id||!fromEvents(detail.from)||!detail.subject.startsWith('You’re invited · ')){partial=true;continue;}
        const possible=eligible.filter(r=>detail.to.some(t=>t.toLowerCase()===r.email?.toLowerCase())&&Date.parse(detail.created_at)>=Date.parse(r.createdAt)-60_000&&
          [detail.text,detail.html].some(body=>typeof body==='string'&&body.includes(namedInviteUrl(r.id))));
        if(possible.length!==1){partial=true;continue;}
        const row=possible[0];if(!match.has(row.id))match.set(row.id,detail);
      }catch{partial=true;if(Date.now()>=deadline-500)break;}
    }
    return {provider:partial?'partial':'checked',rows:rows.map(r=>{
      const message=match.get(r.id);
      // An old provider event must not override a newer application attempt.
      if(!message||!known.has(message.last_event)||r.mailStatus==='pending'||r.mailStatus==='sending'||
        (r.mailUpdatedAt&&Date.parse(message.created_at)<Date.parse(r.mailUpdatedAt)-120_000))return r;
      return {...r,providerEvent:message.last_event,providerSentAt:message.created_at};
    })};
  }catch{return {rows,provider:'partial'};}
}
