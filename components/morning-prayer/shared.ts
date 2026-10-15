// Client-side types, formatters and request helper shared by the Morning Prayer screens.
export const ZONE='America/Los_Angeles';
export type Capability='view_schedule'|'join_gathering'|'volunteer_host'|'review_requests'|'manage_schedule'|'view_materials'|'edit_materials'|'publish_materials';
export type Kind='gathering'|'app_day'|'cancelled';
export type Occurrence={id:string;date:string;originalDate:string;startsAt:string;endsAt:string;timezone:string;kind:Kind;host:string;isMine:boolean;hostConfirmed:boolean;verified:boolean;revision:number;readingKey?:string|null};
export type HostRequest={id:string;occurrenceId:string;kind:'volunteer'|'change';status:string;revision:number;date:string;isMine:boolean;requester:string;note:string};
export type MaterialBody={title:string;summary:string;items:string[];sourceLabel:string};
export type Material={key:string;kind:'pwp'|'reading';revision:number;body:MaterialBody};
export type Draft=Material&{id:string;sourceState:'checked'|'incomplete'};
export type Workspace={
 version:number;occurrences:Occurrence[];requests:HostRequest[];capabilities:Capability[];drafts:Draft[];
 eligibleHosts:{id:string;name:string}[];timezone:string;setupComplete:boolean;meetingAccessConfigured:boolean;
 materials?:Material[];materialCatalog?:Material[];upcoming?:Occurrence[];ownHosting?:Occurrence[];
 joinWindowMinutes?:number|null;meetingStates?:{occurrenceId:string;ready:boolean;configured:boolean}[];
};
export type ManageArea='schedule'|'materials'|'people';
/** Short weekday, month and day for a calendar date, e.g. "Tue, Oct 14". */
export const dayLabel=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
/** Las Vegas clock time for an instant, e.g. "7:00 AM". */
export const clockTime=(iso:string)=>new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'numeric',minute:'2-digit'}).format(new Date(iso));
/** Clock time split for the day line, e.g. ["7:00","AM"]. */
export const clockParts=(iso:string)=>{const [time,...rest]=clockTime(iso).split(/\s/);return [time,rest.join(' ')] as const;};
export const monthLabel=(month:string)=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
export const shiftMonth=(month:string,delta:number)=>{const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7);};
export const MONTH_PATTERN=/^[0-9]{4}-(0[1-9]|1[0-2])$/;
export const lines=(text:string)=>text.split('\n').map(x=>x.trim()).filter(Boolean);
/** Same-origin, uncached JSON request. Throws the server's error text when the response is not OK. */
export async function requestJSON<T>(url:string,options:RequestInit={},fallback='This request cannot be completed.'):Promise<T>{
 const response=await fetch(url,{...options,cache:'no-store',credentials:'same-origin'});
 let body;try{body=await response.json();}catch{throw new Error('Unable to read the server response.');}
 if(!response.ok)throw new Error(body?.error||fallback);
 return body as T;
}
export const postJSON=<T>(url:string,payload:unknown,fallback?:string)=>
 requestJSON<T>(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},fallback);
