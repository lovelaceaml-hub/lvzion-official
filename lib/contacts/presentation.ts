import type {ContactSummary} from './server-contract.ts';
export type ContactFilter='open'|'new'|'active'|'paused'|'closed'|'archived'|'all';
export type ContactCounts={loaded:number;open:number;new:number;active:number;paused:number;closed:number;archived:number};
export const contactFilters:readonly {value:ContactFilter;label:string}[]=[
 {value:'open',label:'Open'},{value:'new',label:'New'},{value:'active',label:'Active'},{value:'paused',label:'Paused'},
 {value:'closed',label:'Closed'},{value:'archived',label:'Archived'},{value:'all',label:'All'}
];
/** Fails closed: a record without a matching owner is never counted, listed or searched. */
const ownedBy=(c:ContactSummary,memberId:string)=>Boolean(memberId)&&Boolean(c.ownerId)&&c.ownerId===memberId;
function matchesFilter(c:ContactSummary,filter:ContactFilter):boolean{
 if(filter==='all')return true;
 if(filter==='archived')return c.archived;
 if(c.archived)return false;
 if(filter==='open')return c.lifecycle!=='closed';
 return c.lifecycle===filter;
}
export function contactCounts(records:readonly ContactSummary[],memberId:string):ContactCounts {
 const own=records.filter(c=>ownedBy(c,memberId));
 const count=(filter:ContactFilter)=>own.filter(c=>matchesFilter(c,filter)).length;
 return {loaded:own.length,open:count('open'),new:count('new'),active:count('active'),paused:count('paused'),closed:count('closed'),archived:count('archived')};
}
export function findLoadedContacts(records:readonly ContactSummary[],memberId:string,filter:ContactFilter,query:string):ContactSummary[] {
 const needle=query.normalize('NFKC').trim().toLocaleLowerCase('en-US').slice(0,120);
 return records.filter(c=>ownedBy(c,memberId)
  &&(!needle||c.name.normalize('NFKC').toLocaleLowerCase('en-US').includes(needle))
  &&matchesFilter(c,filter)
 ).sort((a,b)=>a.name.localeCompare(b.name,'en-US'));
}
/** Follow-up times are shown on the Las Vegas calendar, whatever the device's own zone. */
const dayKey=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
export type DueTag='Overdue'|'Today'|'Tomorrow';
/** A short tag for a scheduled follow-up: past due, due today or due tomorrow (Las Vegas days); null when later or invalid. */
export function dueTag(due:string,now:Date=new Date()):DueTag|null{
 const at=new Date(due);if(!Number.isFinite(at.getTime())||!Number.isFinite(now.getTime()))return null;
 if(at.getTime()<now.getTime())return 'Overdue';
 const today=dayKey.format(now),day=dayKey.format(at);
 if(day===today)return 'Today';
 // Next calendar day by date arithmetic, so a 23- or 25-hour daylight-saving day cannot skip or repeat a date.
 const [y,m,d]=today.split('-').map(Number);
 return day===new Date(Date.UTC(y,m-1,d+1)).toISOString().slice(0,10)?'Tomorrow':null;
}
