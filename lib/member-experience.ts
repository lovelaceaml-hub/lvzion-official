import type {Workspace} from './contracts';

export type MemberActivity = {
 id:string; title:string; date:string; startTime:string; endTime:string;
 context:string; location?:string; source:'fictional'|'approved-module';
 moduleId?:string;
};
export type ModuleEntry = {
 id:string; name:string; shortName:string; description:string; accent:string;
 status:'fictional-concept'|'approved'; route?:string; canManage?:boolean;
};
export type ActionNotice = {
 id:string; title:string; description:string; destination:'manage'|'module';
 source:'transfer'|'access-request'|'module'; route?:string;
};
export function localDay(now:Date=new Date(),timeZone='America/Los_Angeles'):string{
 const format=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
 const p=Object.fromEntries(format.formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return [p.year,p.month,p.day].join('-');
}
/** Church-local 24-hour time ("HH:MM"), independent of the device's own timezone. */
export function localTime(now:Date=new Date(),timeZone='America/Los_Angeles'):string{
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.hour+':'+p.minute;
}
/** Home greeting for a church-local "HH:MM" time. */
export function greeting(time:string):string{
 const hour=Number(time.slice(0,2));
 return hour>=4&&hour<12?'Good morning':hour>=12&&hour<17?'Good afternoon':'Good evening';
}
/** Position of the "now" mark in a day's activities sorted by start time. */
export function nowIndex(items:{startTime:string}[],time:string):number{
 const i=items.findIndex(e=>e.startTime>time);return i<0?items.length:i;
}
function dateAtUtcNoon(key:string):Date{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(key))throw new Error('Invalid calendar day');
 const d=new Date(key+'T12:00:00.000Z');
 if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==key)throw new Error('Invalid calendar day');
 return d;
}
export function addCalendarDays(key:string,delta:number):string{
 if(!Number.isInteger(delta)||Math.abs(delta)>366)throw new Error('Invalid day offset');
 const d=dateAtUtcNoon(key);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);
}
export function mondayOf(key:string):string{
 const d=dateAtUtcNoon(key);return addCalendarDays(key,-((d.getUTCDay()+6)%7));
}
export function weekDays(key:string):string[]{
 const start=mondayOf(key);return Array.from({length:7},(_,i)=>addCalendarDays(start,i));
}
export function monthCells(key:string):{date:string;inMonth:boolean}[]{
 dateAtUtcNoon(key);
 const first=key.slice(0,7)+'-01';dateAtUtcNoon(first);
 const monday=mondayOf(first);const month=first.slice(0,7);
 return Array.from({length:42},(_,i)=>{
  const date=addCalendarDays(monday,i);return{date,inMonth:date.startsWith(month)};
 });
}
export function formatDay(key:string,opts:Intl.DateTimeFormatOptions={month:'short',day:'numeric'}):string{
 return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',...opts}).format(dateAtUtcNoon(key));
}
export function activitiesForPreview(today:string):MemberActivity[]{
 return [
  {id:'fictional-01',title:'Example Activity 01',date:today,startTime:'09:00',endTime:'10:00',context:'Personal schedule concept',location:'Sample location',source:'fictional'},
  {id:'fictional-02',title:'Example Activity 02',date:addCalendarDays(today,1),startTime:'17:30',endTime:'18:30',context:'Group activity concept',location:'Sample location',source:'fictional'},
  {id:'fictional-03',title:'Example Activity 03',date:addCalendarDays(today,3),startTime:'15:00',endTime:'16:00',context:'Department activity concept',source:'fictional'},
  {id:'fictional-04',title:'Example Activity 04',date:addCalendarDays(today,6),startTime:'18:00',endTime:'19:00',context:'Future approved module concept',source:'fictional'}
 ];
}
export function conceptModules():ModuleEntry[]{
 return [
  {id:'concept-a',name:'Example Module A',shortName:'A',description:'Navigation and favorites interaction only. Not an official application.',accent:'#52718c',status:'fictional-concept'},
  {id:'concept-b',name:'Example Module B',shortName:'B',description:'Concept landing page. No connected data or actions.',accent:'#957344',status:'fictional-concept'},
  {id:'concept-c',name:'Example Module C',shortName:'C',description:'Concept landing page. Not approved for launch.',accent:'#5f8174',status:'fictional-concept'},
  {id:'concept-d',name:'Example Module D',shortName:'D',description:'Concept landing page. No church records or assignments.',accent:'#9d7481',status:'fictional-concept'}
 ];
}
export function cleanFavorites(favorites:string[],apps:ModuleEntry[],max=8):string[]{
 const allowed=new Set(apps.map(a=>a.id));
 return [...new Set(favorites.filter(x=>allowed.has(x)))].slice(0,max);
}
export function toggleFavorite(favorites:string[],appId:string,apps:ModuleEntry[],max=8):string[]{
 const clean=cleanFavorites(favorites,apps,max);
 if(!apps.some(a=>a.id===appId))return clean;
 if(clean.includes(appId))return clean.filter(x=>x!==appId);
 return clean.length<max?[...clean,appId]:clean;
}
export function reorderFavorite(favorites:string[],appId:string,direction:-1|1,apps:ModuleEntry[]):string[]{
 const list=cleanFavorites(favorites,apps);const idx=list.indexOf(appId),next=idx+direction;
 if(idx<0||next<0||next>=list.length)return list;
 [list[idx],list[next]]=[list[next],list[idx]];return list;
}
export function actionNotices(w:Workspace):ActionNotice[]{
 const transfers=(w.transfers??[]).filter(t=>t.canDecide).map(t=>({
  id:'transfer-'+t.id,title:'Transfer needs review',description:'An authorized receiving-group decision is pending.',destination:'manage' as const,source:'transfer' as const
 }));
 const requests=(w.permissions.organization?(w.onboarding?.requests??[]):[]).filter(x=>x.status==='pending').map(x=>({
  id:'request-'+x.id,title:'Account request needs verification',description:'Check the request and verify identity before approval.',destination:'manage' as const,source:'access-request' as const
 }));
 const enrollments=w.permissions.organization?(w.unassignedMembers??[]).map(x=>({id:'enrollment-'+x.id,title:'Unassigned member needs verification',description:'Verify membership and choose an initial placement.',destination:'manage' as const,source:'access-request' as const})):[];
 return [...transfers,...requests,...enrollments];
}
/** Up to two capital initials for an avatar. */
export function initials(name:string):string{return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();}
export function canManage(w:Workspace):boolean{
 return w.permissions.organization||w.permissions.memberManagement||w.permissions.departmentAdmin||w.permissions.technical||
  w.departments.some(d=>d.canManage);
}
