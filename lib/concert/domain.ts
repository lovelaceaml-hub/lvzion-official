/** Healing Concert: shared parsing and formatting. Dates and times are Las Vegas civil time. */
export const TIME_ZONE='America/Los_Angeles';
export const MAX_PARTY=10;
export type ProgramItem={position:number;title:string;performers:string|null};
export type ProgramEntry={songNumber:string|null;title:string;duration:string|null;performers:string|null};
export type ConcertEvent={id:string;title:string;date:string;startTime:string;doorsTime:string|null;venue:string;details:string;capacity:number|null;rsvpOpen:boolean;version:number;seatsTaken:number;program:ProgramItem[]};
export type MyTicket={id:string;name:string;email:string;partySize:number;checkedInAt:string|null;url:string;qrSvg:string};
export type Workspace={viewerId:string;name:string;canManage:boolean;event:ConcertEvent|null;myTicket:MyTicket|null;invitedCount:number;inviteUrl:string};
export type AttendanceTicket={id:string;name:string;email:string;phone:string|null;partySize:number;member:boolean;invitedBy:string|null;createdAt:string;checkedInAt:string|null;checkedInBy:string|null};
export type Attendance={event:ConcertEvent|null;tickets:AttendanceTicket[]};
export type ScanResult={result:'ok'|'already'|'invalid'|'cancelled'|'other_event';name?:string;partySize?:number;checkedInAt?:string};
export type PublicEvent={title:string;date:string;startTime:string;doorsTime:string|null;venue:string;details:string;program:ProgramItem[]};

export class ConcertError extends Error{
 status:number;code:string;
 constructor(message:string,status=400,code='invalid'){super(message);this.name='ConcertError';this.status=status;this.code=code;}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const control=/[\u0000-\u001f\u007f]/;
export function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ConcertError('Invalid data.');return value as Record<string,unknown>;}
function fields(p:Record<string,unknown>,keys:string[],optional:string[]=[]){if(Object.keys(p).some(k=>!keys.includes(k)&&!optional.includes(k))||keys.some(k=>!(k in p)))throw new ConcertError('Unexpected or missing field.');}
function text(v:unknown,max:number):string{if(typeof v!=='string'||v.length>max)throw new ConcertError('Invalid text.');return v;}
function nullableText(v:unknown,max:number):string|null{return v===null||v===undefined?null:text(v,max);}
export function identifier(v:unknown):string{const s=text(v,36);if(!uuid.test(s))throw new ConcertError('Invalid identifier.');return s;}
export function dateValue(v:unknown):string{const s=text(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)throw new ConcertError('Choose a valid date.');return s;}
export function clockValue(v:unknown):string{const s=text(v,5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))throw new ConcertError('Choose a valid time.');return s;}
export function nameValue(v:unknown):string{const s=text(v,120).trim().replace(/\s+/g,' ');if(s.length<2||control.test(s))throw new ConcertError('Enter your full name.');return s;}
export function emailValue(v:unknown):string{const s=text(v,254).trim().toLowerCase();if(!emailPattern.test(s))throw new ConcertError('Enter a valid email address.');return s;}
export function phoneValue(v:unknown):string|null{if(v===null||v===undefined||v==='')return null;const s=text(v,30).trim();if(!s)return null;if(s.length<7||!/^[0-9+().\s-]+$/.test(s))throw new ConcertError('Enter a valid phone number or leave it blank.');return s;}
export function partyValue(v:unknown):number{if(!Number.isInteger(v)||(v as number)<1||(v as number)>MAX_PARTY)throw new ConcertError(`Party size must be 1 to ${MAX_PARTY}.`);return v as number;}
function timestamp(v:unknown):string|null{if(v===null||v===undefined)return null;const s=text(v,40);if(!Number.isFinite(Date.parse(s)))throw new ConcertError('Invalid time.',503,'unavailable');return s;}

export type MemberCommand=
 |{op:'rsvp';email:string;partySize:number}
 |{op:'resend';ticketId:string}
 |{op:'create';title:string;date:string;startTime:string;doorsTime:string|null;venue:string;details:string;capacity:number|null;rsvpOpen:boolean}
 |{op:'edit';eventId:string;expectedVersion:number;title:string;date:string;startTime:string;doorsTime:string|null;venue:string;details:string;capacity:number|null;rsvpOpen:boolean}
 |{op:'archive';eventId:string;expectedVersion:number}
 |{op:'checkin'|'undo'|'cancel';ticketId:string}
 |{op:'program';items:ProgramEntry[]};
function eventFields(p:Record<string,unknown>){
 const title=text(p.title,80).trim(),venue=text(p.venue,120).trim(),details=text(p.details,600).trim();
 if(title.length<2||control.test(title))throw new ConcertError('Enter a concert name of 2 to 80 characters.');
 if(venue.length<2||control.test(venue))throw new ConcertError('Enter the venue.');
 const date=dateValue(p.date),startTime=clockValue(p.startTime),doorsTime=p.doorsTime===null||p.doorsTime===''?null:clockValue(p.doorsTime);
 if(doorsTime&&doorsTime>startTime)throw new ConcertError('Doors must open before the concert starts.');
 const capacity=p.capacity===null||p.capacity===''?null:p.capacity;
 if(capacity!==null&&(!Number.isInteger(capacity)||(capacity as number)<1||(capacity as number)>5000))throw new ConcertError('Capacity must be 1 to 5000 seats, or blank for no limit.');
 if(typeof p.rsvpOpen!=='boolean')throw new ConcertError('Choose whether RSVP is open.');
 return {title,date,startTime,doorsTime,venue,details,capacity:capacity as number|null,rsvpOpen:p.rsvpOpen};
}
function version(v:unknown):number{if(!Number.isSafeInteger(v)||(v as number)<1)throw new ConcertError('Refresh before saving.');return v as number;}
export function parseMemberCommand(value:unknown):MemberCommand{
 const p=object(value);
 switch(p.op){
  case 'rsvp':fields(p,['op','email','partySize']);return {op:'rsvp',email:emailValue(p.email),partySize:partyValue(p.partySize)};
  case 'resend':fields(p,['op','ticketId']);return {op:'resend',ticketId:identifier(p.ticketId)};
  case 'create':fields(p,['op','title','date','startTime','doorsTime','venue','details','capacity','rsvpOpen']);return {op:'create',...eventFields(p)};
  case 'edit':fields(p,['op','eventId','expectedVersion','title','date','startTime','doorsTime','venue','details','capacity','rsvpOpen']);return {op:'edit',eventId:identifier(p.eventId),expectedVersion:version(p.expectedVersion),...eventFields(p)};
  case 'archive':fields(p,['op','eventId','expectedVersion']);return {op:'archive',eventId:identifier(p.eventId),expectedVersion:version(p.expectedVersion)};
  case 'checkin':case 'undo':case 'cancel':fields(p,['op','ticketId']);return {op:p.op,ticketId:identifier(p.ticketId)};
  case 'program':fields(p,['op','items']);return {op:'program',items:parseProgramEntries(p.items)};
 }
 throw new ConcertError('Unknown action.');
}
export type GuestRsvp={invite:string;name:string;email:string;phone:string|null;partySize:number};
export function parseGuestRsvp(value:unknown):GuestRsvp{
 const p=object(value);fields(p,['invite','name','email','partySize'],['phone']);
 return {invite:inviteToken(p.invite),name:nameValue(p.name),email:emailValue(p.email),phone:phoneValue(p.phone),partySize:partyValue(p.partySize)};
}
export function inviteToken(v:unknown):string{const s=text(v,64);if(!/^[A-Za-z0-9_-]{22}$/.test(s))throw new ConcertError('This invitation link is not valid.');return s;}
export function ticketToken(v:unknown):string{const s=text(v,64);if(!/^[A-Za-z0-9_-]{43}$/.test(s))throw new ConcertError('This ticket link is not valid.');return s;}
/** A scanned code is either the ticket link or the bare token. Anything else is not a ticket. */
export function tokenFromScan(raw:unknown):string|null{
 if(typeof raw!=='string'||raw.length>300)return null;
 const s=raw.trim();const m=s.match(/\/concert\/ticket\/([A-Za-z0-9_-]{43})(?:[/?#]|$)/);
 if(m)return m[1];return /^[A-Za-z0-9_-]{43}$/.test(s)?s:null;
}

function optionalLine(v:unknown,max:number,label:string):string|null{if(v===null||v===undefined)return null;const t=text(v,max).trim();if(!t)return null;if(control.test(t))throw new ConcertError(label);return t;}
export function parseProgram(value:unknown):ProgramItem[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>40)throw new ConcertError('Program could not be verified.',503,'unavailable');
 return value.map((raw,i)=>{const p=object(raw);if(p.position!==i+1)throw new ConcertError('Program could not be verified.',503,'unavailable');return {position:i+1,title:text(p.title,120),performers:p.performers===null?null:text(p.performers,120)};});
}
export function parseProgramEntries(value:unknown):ProgramEntry[]{
 if(!Array.isArray(value)||value.length>40)throw new ConcertError('The program can have up to 40 songs.');
 return value.map((raw,i)=>{const p=object(raw);fields(p,['songNumber','title','duration','performers']);
  const title=text(p.title,120).trim();if(!title||control.test(title))throw new ConcertError(`Song ${i+1} needs a title.`);
  const duration=optionalLine(p.duration,5,'Invalid time.');if(duration&&!/^\d{1,2}:[0-5]\d$/.test(duration))throw new ConcertError(`Song ${i+1}: write the time like 3:08.`);
  return {songNumber:optionalLine(p.songNumber,12,`Song ${i+1}: invalid song number.`),title,duration,performers:optionalLine(p.performers,120,`Song ${i+1}: invalid performers.`)};});
}
export function parseEvent(value:unknown):ConcertEvent{
 const e=object(value);
 const capacity=e.capacity===null?null:e.capacity;
 if(capacity!==null&&!Number.isInteger(capacity))throw new ConcertError('Concert could not be verified.',503,'unavailable');
 if(typeof e.rsvpOpen!=='boolean'||!Number.isInteger(e.seatsTaken))throw new ConcertError('Concert could not be verified.',503,'unavailable');
 return {id:identifier(e.id),title:text(e.title,80),date:dateValue(e.date),startTime:clockValue(e.startTime),doorsTime:e.doorsTime===null?null:clockValue(e.doorsTime),
  venue:text(e.venue,120),details:text(e.details,600),capacity:capacity as number|null,rsvpOpen:e.rsvpOpen,version:version(e.version),seatsTaken:e.seatsTaken as number,program:parseProgram(e.program)};
}
export function parsePublicEvent(value:unknown):PublicEvent{
 const e=object(value);
 return {title:text(e.title,80),date:dateValue(e.date),startTime:clockValue(e.startTime),doorsTime:e.doorsTime===null?null:clockValue(e.doorsTime),venue:text(e.venue,120),details:text(e.details,600),program:parseProgram(e.program)};
}
export function parseAttendance(value:unknown):Attendance{
 const p=object(value);if(!Array.isArray(p.tickets)||p.tickets.length>5000)throw new ConcertError('Attendance could not be verified.',503,'unavailable');
 return {event:p.event===null?null:parseEvent(p.event),tickets:p.tickets.map(raw=>{const t=object(raw);
  if(typeof t.member!=='boolean')throw new ConcertError('Attendance could not be verified.',503,'unavailable');
  return {id:identifier(t.id),name:text(t.name,120),email:text(t.email,254),phone:nullableText(t.phone,30),partySize:partyValue(t.partySize),member:t.member,
   invitedBy:nullableText(t.invitedBy,160),createdAt:timestamp(t.createdAt)??'',checkedInAt:timestamp(t.checkedInAt),checkedInBy:nullableText(t.checkedInBy,160)};})};
}
export function parseScan(value:unknown):ScanResult{
 const p=object(value);const result=p.result;
 if(!['ok','already','invalid','cancelled','other_event'].includes(result as string))throw new ConcertError('Scan could not be verified.',503,'unavailable');
 const out:ScanResult={result:result as ScanResult['result']};
 if(p.name!==undefined)out.name=text(p.name,120);
 if(p.partySize!==undefined)out.partySize=partyValue(p.partySize);
 if(p.checkedInAt!==undefined&&p.checkedInAt!==null)out.checkedInAt=timestamp(p.checkedInAt)??undefined;
 return out;
}
export function databaseError(code?:string):ConcertError{
 if(code==='42501')return new ConcertError('You do not have permission for this action.',403,'permission');
 if(code==='40001')return new ConcertError('This concert changed on another device. Refresh before saving.',409,'stale');
 if(code==='LVZCF')return new ConcertError('Sorry, the concert is full.',409,'full');
 if(code==='23505')return new ConcertError('That is already registered or already open.',409,'conflict');
 if(code==='23514')return new ConcertError('RSVP is closed, or this change does not fit the current concert. Refresh and check.',409,'closed');
 if(['22023','22P02','22007','22008'].includes(code??''))return new ConcertError('Check the details and try again.');
 return new ConcertError('The concert service is unavailable. Nothing has been confirmed.',503,'unavailable');
}

export function formatDate(date:string,options:Intl.DateTimeFormatOptions={weekday:'long',month:'long',day:'numeric',year:'numeric'}):string{return new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(new Date(dateValue(date)+'T12:00:00Z'));}
export function formatTime(time:string):string{return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit'}).format(new Date('2000-01-01T'+clockValue(time)+':00Z'));}
export function formatStamp(iso:string):string{return new Intl.DateTimeFormat('en-US',{timeZone:TIME_ZONE,hour:'numeric',minute:'2-digit'}).format(new Date(iso));}
export function whenLine(e:Pick<PublicEvent,'date'|'startTime'|'doorsTime'>):string{
 return formatDate(e.date)+' · '+(e.doorsTime?'Doors '+formatTime(e.doorsTime)+' · ':'')+'Starts '+formatTime(e.startTime);
}
export function seatsLeft(e:Pick<ConcertEvent,'capacity'|'seatsTaken'>):number|null{return e.capacity===null?null:Math.max(0,e.capacity-e.seatsTaken);}
/** CSV with formula-injection protection for spreadsheet apps. */
export function attendanceCsv(a:Attendance):string{
 const cell=(v:string|number|null|boolean)=>{let s=v===null?'':String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
 const rows=[['Name','Email','Phone','Party','Member','Invited by','RSVP time','Checked in','Checked in by']];
 for(const t of a.tickets)rows.push([t.name,t.email,t.phone??'',String(t.partySize),t.member?'Yes':'No',t.invitedBy??'',t.createdAt?new Date(t.createdAt).toLocaleString('en-US',{timeZone:TIME_ZONE}):'',t.checkedInAt?new Date(t.checkedInAt).toLocaleString('en-US',{timeZone:TIME_ZONE}):'',t.checkedInBy??'']);
 return rows.map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}
