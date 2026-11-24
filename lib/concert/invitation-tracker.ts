export type InvitationRow = {
  id:string; sender:string; senderEmail:string; leader:string|null; name:string; email:string|null;
  createdAt:string; test:boolean; mailStatus:string|null; mailUpdatedAt:string|null; attempts:number;
  rsvp:string; registration:string; canResend:boolean;
  providerEvent?:string; providerSentAt?:string;
};
export type TrackerData = {eventId:string; rows:InvitationRow[]; provider:'not configured'|'partial'|'checked'};
export type TestFilter = 'exclude'|'include'|'only';
export type GroupMode = 'all'|'member'|'leader';
export function filterInvitations(rows:InvitationRow[],query:string,test:TestFilter,rsvp:string,delivery:string){
  const q=query.trim().toLowerCase();
  return rows.filter(r=>(test==='include'||(test==='only'?r.test:!r.test)) &&
    (!q||[r.name,r.email,r.sender,r.senderEmail,r.leader].some(v=>v?.toLowerCase().includes(q))) &&
    (rsvp==='all'||r.rsvp===rsvp||r.registration===rsvp) &&
    (delivery==='all'||deliveryLabel(r)===delivery));
}
export function groupInvitations(rows:InvitationRow[],mode:GroupMode){
  const groups=new Map<string,{label:string;rows:InvitationRow[]}>();
  for(const row of rows){
    const key=mode==='member'?row.senderEmail.trim().toLowerCase():mode==='leader'?(row.leader?.trim().toLowerCase()||''): 'all';
    const label=mode==='member'?row.sender:mode==='leader'?(row.leader||'Group leader not recorded'):'All invitations';
    let group=groups.get(key);
    if(!group){group={label,rows:[]};groups.set(key,group);}
    group.rows.push(row);
  }
  return [...groups.values()].sort((a,b)=>a.label.localeCompare(b.label));
}
export function deliveryLabel(row:InvitationRow){
  if(!row.email)return 'Link only';
  switch(row.providerEvent){
    case 'delivered':case 'opened':case 'clicked':return 'Delivered';
    case 'bounced':return 'Bounced';
    case 'complained':return 'Complaint';
    case 'failed':case 'suppressed':return 'Failed';
    case 'delivery_delayed':return 'Delayed';
    case 'sent':return 'Sent – delivery unverified';
  }
  if(row.mailStatus==='sent')return 'Sent – delivery unverified';
  if(row.mailStatus==='failed')return 'Failed';
  if(row.mailStatus==='sending')return 'Sending';
  return 'Pending';
}
export function openLabel(row:InvitationRow){
  return row.providerEvent==='opened'?'Open reported':'Not observed / unknown';
}
export function trackerStamp(value:string|null|undefined){
  if(!value)return '—';
  return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
}
export function trackerStats(rows:InvitationRow[]){
  return {total:rows.length,delivered:rows.filter(r=>deliveryLabel(r)==='Delivered').length,
    bounced:rows.filter(r=>deliveryLabel(r)==='Bounced').length,
    opened:rows.filter(r=>r.providerEvent==='opened').length,
    confirmed:rows.filter(r=>r.rsvp==='Confirmed').length,
    pending:rows.filter(r=>r.rsvp==='Pending').length};
}
