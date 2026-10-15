import {dayKey,isPlainObject,uuidPattern,validServiceRange} from './domain.ts';
export type ServiceInterval={start:number;end:number;label:string};
export type WeeklyServiceInterval=ServiceInterval&{weekday:number};
export type SpecialDay={day:string;blocks:ServiceInterval[];reason:string};
export type StudyOperationsData={version:number;bookingsOpen:boolean;newSystemBookings:number;weekly:WeeklyServiceInterval[];specialDays:SpecialDay[]};
export type StudyOperationDraft=
 | {action:'resource.add';kind:'room'|'whiteboard'|'tv';name:string;reason:string;expectedVersion:number}
 | {action:'weekly.replace';blocks:WeeklyServiceInterval[];reason:string;expectedVersion:number}
 | {action:'day.replace';day:string;blocks:ServiceInterval[];reason:string;expectedVersion:number}
 | {action:'day.reset';day:string;reason:string;expectedVersion:number};
export type StudyOperationCommand=StudyOperationDraft&{requestId:string};
function object(value:unknown):Record<string,unknown>{
 if(!isPlainObject(value))throw Error('Invalid management request.');
 return value;
}
function stringValue(value:unknown,min:number,max:number,description:string){
 if(typeof value!=='string'||value.trim().length<min||value.length>max)throw Error('Invalid '+description+'.');
 return value.trim();
}
function exactKeys(value:Record<string,unknown>,valid:string[]){
 if(Object.keys(value).some(key=>!valid.includes(key)))throw Error('Unexpected management field.');
}
function validatedBlocks(input:unknown,weekly:boolean):ServiceInterval[]|WeeklyServiceInterval[]{
 if(!Array.isArray(input)||input.length>(weekly?70:26)||(weekly&&input.length===0))throw Error('Choose valid service intervals.');
 const result:(ServiceInterval|WeeklyServiceInterval)[]=[];
 for(const raw of input){
  const p=object(raw);
  exactKeys(p,weekly?['weekday','start','end','label']:['start','end','label']);
  if(!validServiceRange(p.start,p.end))throw Error('Service intervals must fit 10 AM to 11 PM on half-hour boundaries.');
  const label=stringValue(p.label,2,80,'service description');
  if(weekly&&(!Number.isSafeInteger(p.weekday)||(p.weekday as number)<0||(p.weekday as number)>6))
   throw Error('Choose a valid day of the week.');
  const item={start:p.start as number,end:p.end as number,label};
  result.push(weekly?{...item,weekday:p.weekday as number}:item);
 }
 for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){
  const a=result[i],b=result[j];
  if((!weekly||(a as WeeklyServiceInterval).weekday===(b as WeeklyServiceInterval).weekday)
    &&a.start<b.end&&b.start<a.end)throw Error('Service intervals must not overlap.');
 }
 return result as ServiceInterval[];
}
export function parseStudyOperation(value:unknown):StudyOperationCommand{
 const p=object(value);
 if(!['resource.add','weekly.replace','day.replace','day.reset'].includes(String(p.action)))throw Error('Unknown management operation.');
 if(typeof p.requestId!=='string'||!uuidPattern.test(p.requestId))throw Error('Invalid request identifier.');
 if(!Number.isSafeInteger(p.expectedVersion)||(p.expectedVersion as number)<1||(p.expectedVersion as number)>999999999)throw Error('Refresh configuration before saving.');
 const reason=stringValue(p.reason,5,240,'change reason');
 const common={requestId:p.requestId,reason,expectedVersion:p.expectedVersion as number};
 if(p.action==='resource.add'){
  exactKeys(p,['action','requestId','expectedVersion','reason','kind','name']);
  if(!['room','whiteboard','tv'].includes(String(p.kind)))throw Error('Choose a resource type.');
  return {...common,action:'resource.add',kind:p.kind as 'room'|'whiteboard'|'tv',name:stringValue(p.name,2,80,'resource name')};
 }
 if(p.action==='weekly.replace'){
  exactKeys(p,['action','requestId','expectedVersion','reason','blocks']);
  return {...common,action:'weekly.replace',blocks:validatedBlocks(p.blocks,true) as WeeklyServiceInterval[]};
 }
 exactKeys(p,p.action==='day.replace'
  ?['action','requestId','expectedVersion','reason','day','blocks']
  :['action','requestId','expectedVersion','reason','day']);
 if(typeof p.day!=='string')throw Error('Choose a calendar day.');
 const day=dayKey(p.day);
 if(p.action==='day.reset')return {...common,action:'day.reset',day};
 return {...common,action:'day.replace',day,blocks:validatedBlocks(p.blocks,false)};
}
