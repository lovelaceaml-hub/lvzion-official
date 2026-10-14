/** America/Los_Angeles civil-time conversion; device timezone never changes the result. */
const zone='America/Los_Angeles';
const validDate=(value:string)=>{
 if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;
};
function rendered(d:Date):string{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
 const field=(type:string)=>parts.find(p=>p.type===type)?.value||'';
 return field('year')+'-'+field('month')+'-'+field('day')+'T'+field('hour')+':'+field('minute');
}
export function vegasInstant(date:string,clock:string):string{
 if(!validDate(date)||!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(clock))throw new Error('Choose a valid Las Vegas date and time.');
 const [y,m,d]=date.split('-').map(Number),[h,min]=clock.split(':').map(Number);
 const desired=Date.UTC(y,m-1,d,h,min);let candidate=desired;
 for(let i=0;i<4;i++){
  const local=rendered(new Date(candidate));
  const [ld,lt]=local.split('T');
  const [yr,mo,day]=ld.split('-').map(Number),[hour,minute]=lt.split(':').map(Number);
  candidate+=desired-Date.UTC(yr,mo-1,day,hour,minute);
 }
 const expected=date+'T'+clock;
 if(rendered(new Date(candidate))!==expected)throw new Error('This local clock time is invalid due to daylight saving time.');
 if(rendered(new Date(candidate-3600000))===expected||rendered(new Date(candidate+3600000))===expected)
  throw new Error('This repeated local clock time is ambiguous. Choose another time.');
 return new Date(candidate).toISOString();
}
export function vegasToday(now=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=(s:string)=>parts.find(p=>p.type===s)?.value||'';
 return get('year')+'-'+get('month')+'-'+get('day');
}
export function scheduleCandidates(from:string,to:string,days:number[],starts:string,ends:string,kind:'gathering'|'app_day'|'cancelled',today=vegasToday()){
 if(!validDate(from)||!validDate(to)||!Array.isArray(days)||days.length===0||days.some(n=>!Number.isInteger(n)||n<0||n>6))throw new Error('Choose a valid date range and weekdays.');
 const a=Date.parse(from+'T12:00:00Z'),b=Date.parse(to+'T12:00:00Z');
 if(b<a||b-a>180*86400000||a<Date.parse(today+'T12:00:00Z'))throw new Error('Dates must be future and within the next 180 days.');
 const result:{date:string;startsAt:string;endsAt:string;timezone:'America/Los_Angeles';kind:typeof kind}[]=[];
 const chosen=new Set(days);
 for(let t=a;t<=b;t+=86400000){
  const d=new Date(t);
  if(!chosen.has(d.getUTCDay()))continue;
  const date=d.toISOString().slice(0,10),start=vegasInstant(date,starts),end=vegasInstant(date,ends);
  if(Date.parse(end)<=Date.parse(start))throw new Error('End time must be after start time.');
  result.push({date,startsAt:start,endsAt:end,timezone:zone,kind});
 }
 if(!result.length||result.length>62)throw new Error('Choose between 1 and 62 dates.');
 return result;
}
