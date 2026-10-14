import type{MemberActivity,ModuleEntry}from'./member-experience';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeRoute=/^\/modules\/[a-z][a-z0-9-]{2,48}$/;
const localDate=/^\d{4}-\d{2}-\d{2}$/;
const clock=/^([01]\d|2[0-3]):[0-5]\d$/;
export type AuthorizedModule=ModuleEntry&{route:string;canManage:boolean};
export type ModuleNotice={id:string;moduleId:string;title:string;description:string;createdAt:string;readAt:string|null;requiresAction:boolean;route:string};
export type ModuleFeed={
 modules:AuthorizedModule[];
 activities:MemberActivity[];
 notifications:ModuleNotice[];
 favorites:string[];
 favoriteVersion:number;
};
export const emptyModuleFeed=():ModuleFeed=>({modules:[],activities:[],notifications:[],favorites:[],favoriteVersion:0});
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid module projection');return v as Record<string,unknown>};
const arr=(v:unknown):unknown[]=>{if(!Array.isArray(v))throw new Error('Invalid module projection array');return v};
const str=(v:unknown,max=200):string=>{if(typeof v!=='string'||v.length>max)throw new Error('Invalid module projection text');return v};
const isValidDate=(s:string):boolean=>localDate.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function parseModuleFeed(payload:unknown):ModuleFeed{
 const p=obj(payload);
 const modules=arr(p.modules).slice(0,100).map(raw=>{
  const m=obj(raw),id=str(m.id,36),route=str(m.route,64),name=str(m.name,80),shortName=str(m.shortName,12),description=str(m.description,500),accent=str(m.accent,7);
  if(!uuid.test(id)||!safeRoute.test(route)||!/^#[a-fA-F0-9]{6}$/.test(accent)||!name||!shortName||m.status!=='approved'||typeof m.canManage!=='boolean')throw new Error('Unapproved module');
  return {id,name,shortName,description,accent,status:'approved' as const,route,canManage:m.canManage};
 });
 const allowed=new Set(modules.map(m=>m.id));
 const activities=arr(p.activities).slice(0,80).map(raw=>{
  const a=obj(raw),id=str(a.id,36),moduleId=str(a.moduleId,36),date=str(a.date,10),startTime=str(a.startTime,5),endTime=str(a.endTime,5);
  if(!uuid.test(id)||!allowed.has(moduleId)||!isValidDate(date)||!clock.test(startTime)||!clock.test(endTime)||a.source!=='approved-module')throw new Error('Invalid module activity');
  const activity:MemberActivity={id,moduleId,title:str(a.title,150),date,startTime,endTime,context:str(a.context,300),source:'approved-module'};
  if(a.location!==null && a.location!==undefined)activity.location=str(a.location,140);
  return activity;
 });
 const notifications=arr(p.notifications).slice(0,40).map(raw=>{
  const n=obj(raw),id=str(n.id,36),moduleId=str(n.moduleId,36),route=str(n.route,64),createdAt=str(n.createdAt,40);
  if(!uuid.test(id)||!allowed.has(moduleId)||!safeRoute.test(route)||!modules.some(m=>m.id===moduleId&&m.route===route)||Number.isNaN(Date.parse(createdAt))||typeof n.requiresAction!=='boolean')throw new Error('Invalid module notification');
  const readAt=n.readAt===null?null:str(n.readAt,40);
  if(readAt!==null&&Number.isNaN(Date.parse(readAt)))throw new Error('Invalid notification read time');
  return{id,moduleId,title:str(n.title,140),description:str(n.description,300),createdAt,readAt,requiresAction:n.requiresAction,route};
 });
 const favorites=arr(p.favorites).map(x=>str(x,36));
 if(favorites.length>8||new Set(favorites).size!==favorites.length||favorites.some(id=>!allowed.has(id)))throw new Error('Invalid module favorites');
 if(!Number.isSafeInteger(p.favoriteVersion)||(p.favoriteVersion as number)<0)throw new Error('Invalid module favorites version');
 return {modules,activities,notifications,favorites,favoriteVersion:p.favoriteVersion as number};
}
export function parseFavoriteChange(raw:unknown):{moduleIds:string[];expectedVersion:number}{
 const p=obj(raw),moduleIds=arr(p.moduleIds).map(x=>str(x,36)),expectedVersion=p.expectedVersion;
 if(moduleIds.length>8||moduleIds.some(id=>!uuid.test(id))||new Set(moduleIds).size!==moduleIds.length||!Number.isSafeInteger(expectedVersion)||(expectedVersion as number)<0)throw new Error('Invalid favorite update');
 if(Object.keys(p).some(k=>!['moduleIds','expectedVersion'].includes(k)))throw new Error('Unexpected favorite update');
 return {moduleIds,expectedVersion:expectedVersion as number};
}
export function parseNoticeRead(raw:unknown):string{
 const p=obj(raw);
 if(Object.keys(p).length!==1||!uuid.test(str(p.noticeId,36)))throw new Error('Invalid notice update');
 return p.noticeId as string;
}
