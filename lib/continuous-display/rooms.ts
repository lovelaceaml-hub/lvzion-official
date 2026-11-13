import {CHURCH_TIME_ZONE,isRecord,type DisplayRooms} from './live-contract.ts';
/**
 * Projects the study-room lobby feed to what a church TV may show: today's room bookings as a room
 * label and a start and end time. Who booked a room never leaves this function.
 * (Anthony, 2026-11-13: room and time only. The lvrooms read is the one approved exception to the
 * LV Zion Official no-other-app rule; see AGENTS.md.)
 */
export const ROOMS_FEED_URL='https://lvrooms.web.app/api/lobby-schedule';
const clock=/^([01]\d|2[0-3]):[0-5]\d$/;
export function churchToday(epochMs:number):string{
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:CHURCH_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(epochMs).map(x=>[x.type,x.value]));
 return `${p.year}-${p.month}-${p.day}`;
}
export function projectRooms(feed:unknown,today:string):DisplayRooms{
 if(!isRecord(feed)||!Array.isArray(feed.bookings))throw Error('Unexpected room feed.');
 const labels=new Map<string,string>();
 const units=isRecord(feed.config)&&isRecord(feed.config.resources)&&isRecord(feed.config.resources.room)?feed.config.resources.room.units:null;
 if(Array.isArray(units))for(const u of units)
  if(isRecord(u)&&typeof u.id==='string'&&typeof u.name==='string'&&u.name.trim()&&[...u.name].length<=40)labels.set(u.id,u.name.trim());
 const bookings=feed.bookings.flatMap(b=>{
  if(!isRecord(b)||b.date!==today||typeof b.room!=='string'||typeof b.start!=='string'||typeof b.end!=='string'
   ||!clock.test(b.start)||!clock.test(b.end)||b.end<=b.start)return[];
  const room=labels.get(b.room);
  return room?[{room,start:b.start,end:b.end}]:[];
 });
 bookings.sort((a,b)=>a.start.localeCompare(b.start)||a.room.localeCompare(b.room,'en',{numeric:true}));
 return{date:today,bookings:bookings.slice(0,60)};
}
