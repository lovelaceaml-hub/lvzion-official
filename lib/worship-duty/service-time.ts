// Every service time is Las Vegas time, independent of the viewing device's timezone.
const ZONE='America/Los_Angeles';
const format=new Intl.DateTimeFormat('sv-SE',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const labelFormat=new Intl.DateTimeFormat('en-US',{timeZone:ZONE,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
/** YYYY-MM-DDTHH:MM in Las Vegas. */
export function serviceLocalTime(iso:string){return format.format(new Date(iso)).replace(' ','T');}
/** YYYY-MM-DD in Las Vegas. */
export const vegasDate=(iso:string)=>serviceLocalTime(iso).slice(0,10);
/** For example "Sat, Oct 17, 10:00 AM". */
export const serviceLabel=(iso:string)=>labelFormat.format(new Date(iso));
export function serviceInstant(local:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw new Error('Choose a valid Las Vegas date and time.');
 const wall=Date.parse(local+'Z');
 const candidates=[7,8].map(offset=>new Date(wall+offset*3600000).toISOString()).filter(iso=>serviceLocalTime(iso)===local);
 if(candidates.length!==1)throw new Error('This time is skipped or repeated during the daylight saving change. Choose an unambiguous service time.');
 return candidates[0];
}
