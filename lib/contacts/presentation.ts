import type {ContactSummary} from './server-contract.ts';
export type ContactFilter='open'|'new'|'active'|'paused'|'closed'|'archived'|'all';
export type ContactCounts={loaded:number;open:number;new:number;active:number;paused:number;closed:number;archived:number};
export function contactCounts(records:readonly ContactSummary[],memberId:string):ContactCounts {
 const own=records.filter(c=>c.ownerId===memberId);
 return {
  loaded:own.length,
  open:own.filter(c=>!c.archived&&c.lifecycle!=='closed').length,
  new:own.filter(c=>!c.archived&&c.lifecycle==='new').length,
  active:own.filter(c=>!c.archived&&c.lifecycle==='active').length,
  paused:own.filter(c=>!c.archived&&c.lifecycle==='paused').length,
  closed:own.filter(c=>!c.archived&&c.lifecycle==='closed').length,
  archived:own.filter(c=>c.archived).length
 };
}
export function findLoadedContacts(records:readonly ContactSummary[],memberId:string,filter:ContactFilter,query:string):ContactSummary[] {
 const needle=query.normalize('NFKC').trim().toLocaleLowerCase('en-US').slice(0,120);
 return records.filter(c=>{
  if(c.ownerId!==memberId)return false;
  if(needle&&!c.name.normalize('NFKC').toLocaleLowerCase('en-US').includes(needle))return false;
  if(filter==='all')return true;
  if(filter==='archived')return c.archived;
  if(c.archived)return false;
  if(filter==='open')return c.lifecycle!=='closed';
  return c.lifecycle===filter;
 }).sort((a,b)=>a.name.localeCompare(b.name,'en-US'));
}
export function dateLabel(due:string,now:string):'Overdue'|'Today'|'Upcoming' {
 const value=Date.parse(due),current=Date.parse(now);
 if(!Number.isFinite(value)||!Number.isFinite(current))return 'Upcoming';
 if(value<current)return 'Overdue';
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
 return format.format(value)===format.format(current)?'Today':'Upcoming';
}
