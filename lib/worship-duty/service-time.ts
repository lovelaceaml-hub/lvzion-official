const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function serviceLocalTime(iso:string){return format.format(new Date(iso)).replace(' ','T');}
export function serviceInstant(local:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw new Error('Choose a valid Las Vegas date and time.');
 const wall=Date.parse(local+'Z');
 const candidates=[7,8].map(offset=>new Date(wall+offset*3600000).toISOString()).filter(iso=>serviceLocalTime(iso)===local);
 if(candidates.length!==1)throw new Error('This time is skipped or repeated during the daylight saving change. Choose an unambiguous service time.');
 return candidates[0];
}
