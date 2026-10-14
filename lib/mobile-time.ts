import type {MemberActivity} from './member-experience';
/** Church-local clock, independent of the device's timezone and daylight-saving offsets. */
export function churchClock(now:Date=new Date(),timeZone='America/Los_Angeles'):{day:string;time:string}{
 if(Number.isNaN(now.getTime()))throw new Error('Invalid clock value');
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return {day:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};
}
export function upcomingActivities(items:MemberActivity[],clock:{day:string;time:string}):MemberActivity[]{
 return items.filter(e=>e.date>clock.day || (e.date===clock.day&&e.endTime>clock.time)).sort((a,b)=>(a.date+'T'+a.startTime).localeCompare(b.date+'T'+b.startTime));
}
