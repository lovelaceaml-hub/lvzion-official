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
