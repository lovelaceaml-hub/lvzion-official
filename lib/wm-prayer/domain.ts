/** Pure WM domain logic for fictional previews. Authentication is enforced by the server and SQL proposal, not these fixtures. */
export const CAPABILITIES=['participate','view_recap','view_source','draft','approve','publish','share_external','manage_schedule'] as const;
export type Capability=typeof CAPABILITIES[number];
export type Grant={seriesId:string;capability:Capability;occurrenceId?:string;ended?:boolean};
export type Actor={id:string;active:boolean;grants:Grant[]};
export const LIVE_CONTROLS=Object.freeze({ingestion:false,generation:false,publication:false,sharing:false,scheduling:false});
export class WMError extends Error {readonly code:string;constructor(code:string){super(code);this.name='WMError';this.code=code;}}
export function allows(actor:Actor,capability:Capability,seriesId:string,occurrenceId?:string):boolean{
 return actor.active && actor.grants.some(g=>!g.ended && g.capability===capability && g.seriesId===seriesId && (!g.occurrenceId || g.occurrenceId===occurrenceId));
}
export function requireCapability(actor:Actor,capability:Capability,seriesId:string,occurrenceId?:string):void{if(!allows(actor,capability,seriesId,occurrenceId))throw new WMError('NOT_AUTHORIZED');}
export type SourceCheck={revision:number;kind:'summary'|'transcript';state:'missing'|'failed'|'partial'|'ready';sections:string[]};
export type Point={label:string;text:string;sourceSection:string};
export type Paragraph={heading:string;text:string;sourceSection:string};
export type RecapContent={title:string;centralMessage:string;centralSourceSection:string;points:Point[];explanation:Paragraph[]};
export type Recap={id:string;occurrenceId:string;revision:number;sourceRevision:number;state:'draft'|'review'|'approved';content:RecapContent;authorId:string;reviewerId?:string;privacyApproved:boolean;summaryAcknowledged:boolean;generatedAt:string};
export type EditorialEvent={event:string;recapId:string;actorId:string;at:string;version:number};
export type Workspace={seriesId:string;version:number;recaps:Recap[];sources:Record<string,SourceCheck>;published:Record<string,string>;history:EditorialEvent[]};
function object(value:unknown):Record<string,unknown>{if(!value || typeof value!=='object' || Array.isArray(value))throw new WMError('INVALID_CONTENT');return value as Record<string,unknown>;}
function text(value:unknown,max:number):string{if(typeof value!=='string' || !value.trim() || value.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new WMError('INVALID_CONTENT');return value.trim();}
/** Whitelist projection: arbitrary source URLs, tokens, attendee records and nested fields are never spread into outputs. */
export function parseContent(input:unknown):RecapContent{
 const v=object(input);
 if(!Array.isArray(v.points)||v.points.length<1||v.points.length>3||!Array.isArray(v.explanation)||v.explanation.length<1||v.explanation.length>8)throw new WMError('INVALID_CONTENT');
 return {title:text(v.title,96),centralMessage:text(v.centralMessage,220),centralSourceSection:text(v.centralSourceSection,80),points:v.points.map(p=>{const x=object(p);return{label:text(x.label,30),text:text(x.text,180),sourceSection:text(x.sourceSection,80)};}),explanation:v.explanation.map(p=>{const x=object(p);return{heading:text(x.heading,80),text:text(x.text,1600),sourceSection:text(x.sourceSection,80)};})};
}
export function visibleText(content:RecapContent):string{return [content.title,content.centralMessage,...content.points.map(p=>`${p.label}: ${p.text}`),...content.explanation.map(p=>`${p.heading}\n${p.text}`)].join('\n\n');}
/** Conservative warnings only; not an anonymizer. Human source/accuracy/privacy review is always required. */
export function hasPrivacyWarning(content:RecapContent):boolean{return /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d ().-]{7,}\d)|\b(?:passcode|password|access_token|refresh_token|attendees|private prayer request)\b|<[^>]+>)/i.test(visibleText(content));}
export function validateEvidence(content:RecapContent,source:SourceCheck):void{
 if(source.state!=='ready')throw new WMError('SOURCE_INCOMPLETE');
 const refs=[content.centralSourceSection,...content.points.map(p=>p.sourceSection),...content.explanation.map(p=>p.sourceSection)];
 if(refs.some(ref=>!source.sections.includes(ref)))throw new WMError('UNSUPPORTED_CONTENT');
 if(hasPrivacyWarning(content))throw new WMError('PRIVACY_REVIEW_REQUIRED');
}
export function latestRecap(workspace:Workspace,occurrenceId:string):Recap|undefined{return workspace.recaps.filter(r=>r.occurrenceId===occurrenceId).sort((a,b)=>b.revision-a.revision)[0];}
export type EditorialCommand={expectedVersion:number;recapId:string;at:string}&({action:'submit'}|{action:'approve';privacyChecked:boolean;summaryLimitAccepted:boolean}|{action:'publish'}|{action:'correct';content:unknown});
export function applyEditorialCommand(current:Workspace,actor:Actor,cmd:EditorialCommand):Workspace{
 if(cmd.expectedVersion!==current.version)throw new WMError('REVISION_CONFLICT');
 if(!Number.isFinite(Date.parse(cmd.at)))throw new WMError('INVALID_TIME');
 const original=current.recaps.find(r=>r.id===cmd.recapId);if(!original)throw new WMError('NOT_FOUND');
 const cap:Capability=cmd.action==='submit'||cmd.action==='correct'?'draft':cmd.action==='approve'?'approve':'publish';
 requireCapability(actor,cap,current.seriesId,original.occurrenceId);
 const source=current.sources[original.occurrenceId];if(!source||source.state!=='ready')throw new WMError('SOURCE_INCOMPLETE');
 const next=structuredClone(current);let recap=next.recaps.find(r=>r.id===original.id)!;
 if(cmd.action==='correct'){
  const content=parseContent(cmd.content);validateEvidence(content,source);
  const revision=Math.max(...next.recaps.filter(r=>r.occurrenceId===recap.occurrenceId).map(r=>r.revision))+1;
  recap={id:`demo-${recap.occurrenceId}-revision-${revision}`,occurrenceId:recap.occurrenceId,revision,sourceRevision:source.revision,state:'draft',content,authorId:actor.id,privacyApproved:false,summaryAcknowledged:false,generatedAt:cmd.at};
  next.recaps.push(recap);
 }else{
  if(recap.sourceRevision!==source.revision)throw new WMError('SOURCE_CHANGED');
  validateEvidence(parseContent(recap.content),source);
  if(cmd.action==='submit'){
   if(recap.state!=='draft')throw new WMError('INVALID_TRANSITION');recap.state='review';
  }else if(cmd.action==='approve'){
   requireCapability(actor,'view_source',current.seriesId,recap.occurrenceId);
   if(recap.state!=='review')throw new WMError('INVALID_TRANSITION');
   if(recap.authorId===actor.id)throw new WMError('INDEPENDENT_REVIEW_REQUIRED');
   if(!cmd.privacyChecked||(source.kind==='summary'&&!cmd.summaryLimitAccepted))throw new WMError('REVIEW_ACKNOWLEDGEMENT_REQUIRED');
   recap.state='approved';recap.reviewerId=actor.id;recap.privacyApproved=true;recap.summaryAcknowledged=cmd.summaryLimitAccepted;
  }else{
   if(recap.state!=='approved'||!recap.privacyApproved||!recap.reviewerId)throw new WMError('APPROVAL_REQUIRED');
   if(next.published[recap.occurrenceId]===recap.id)throw new WMError('ALREADY_PUBLISHED');next.published[recap.occurrenceId]=recap.id;
  }
 }
 next.version++;next.history.push({event:cmd.action,recapId:recap.id,actorId:actor.id,at:cmd.at,version:next.version});return next;
}
export function withSourceRevision(current:Workspace,occurrenceId:string,source:SourceCheck):Workspace{
 const previous=current.sources[occurrenceId];if(previous&&source.revision<=previous.revision)throw new WMError('REVISION_CONFLICT');
 return {...structuredClone(current),version:current.version+1,sources:{...current.sources,[occurrenceId]:structuredClone(source)}};
}
export function publishedRecaps(workspace:Workspace,actor:Actor):Recap[]{return workspace.recaps.filter(r=>workspace.published[r.occurrenceId]===r.id&&allows(actor,'view_recap',workspace.seriesId,r.occurrenceId));}
export type SafeExport={title:string;content:RecapContent;text:string;sourceLimitation:string;revision:number;fictional:boolean};
export function prepareExport(workspace:Workspace,actor:Actor,occurrenceId:string,fictional:boolean):SafeExport{
 requireCapability(actor,'share_external',workspace.seriesId,occurrenceId);requireCapability(actor,'view_recap',workspace.seriesId,occurrenceId);
 const recap=workspace.recaps.find(r=>r.id===workspace.published[occurrenceId]);if(!recap||recap.state!=='approved'||!recap.privacyApproved)throw new WMError('APPROVAL_REQUIRED');
 const source=workspace.sources[occurrenceId];if(!source||source.revision!==recap.sourceRevision)throw new WMError('SOURCE_CHANGED');
 const content=parseContent(recap.content);validateEvidence(content,source);
 const sourceLimitation=source.kind==='summary'?'Based on a meeting summary. Paraphrase only; no full transcript or recording reviewed.':'Based on the permitted transcript sections reviewed.';
 return{title:content.title,content,revision:recap.revision,fictional,sourceLimitation,text:`${fictional?'FICTIONAL PREVIEW — NOT A REAL LESSON\n\n':''}Work Mission Prayer Gathering\n${content.title}\n\n${visibleText({...content,title:'Central message'})}\n\n${sourceLimitation}\nRevision ${recap.revision}`};
}
export type Occurrence={id:string;seriesId:string;startsAt:string;endsAt:string;timezone:string|null;status:'upcoming'|'completed'|'cancelled'|'rescheduled';scheduleVerified:boolean;accessVerified:boolean;version:number;originalStartsAt:string};
export function joinState(occurrence:Occurrence,actor:Actor,now:string,windowMinutes=10):'join'|'not_authorized'|'schedule_unverified'|'cancelled'|'outside_window'{
 if(!allows(actor,'participate',occurrence.seriesId,occurrence.id))return 'not_authorized';if(occurrence.status==='cancelled')return 'cancelled';
 if(!occurrence.scheduleVerified||!occurrence.accessVerified||!occurrence.timezone)return 'schedule_unverified';
 try{new Intl.DateTimeFormat('en-US',{timeZone:occurrence.timezone});}catch{return 'schedule_unverified';}
 const t=Date.parse(now),start=Date.parse(occurrence.startsAt),end=Date.parse(occurrence.endsAt);
 if(![t,start,end].every(Number.isFinite)||end<=start||!Number.isFinite(windowMinutes)||windowMinutes<0||windowMinutes>30)return 'schedule_unverified';
 if(occurrence.status==='completed'||t<start-windowMinutes*60000||t>=end)return 'outside_window';return 'join';
}
export function changeSchedule(current:Occurrence,actor:Actor,expectedVersion:number,action:'cancel'|'reschedule',startsAt?:string,endsAt?:string):Occurrence{
 requireCapability(actor,'manage_schedule',current.seriesId,current.id);if(current.version!==expectedVersion)throw new WMError('REVISION_CONFLICT');if(current.status==='completed')throw new WMError('COMPLETED_OCCURRENCE');
 if(action==='cancel')return {...current,status:'cancelled',accessVerified:false,version:current.version+1};
 if(!startsAt||!endsAt||!Number.isFinite(Date.parse(startsAt))||!Number.isFinite(Date.parse(endsAt))||Date.parse(endsAt)<=Date.parse(startsAt))throw new WMError('INVALID_TIME');
 return {...current,startsAt,endsAt,status:'rescheduled',scheduleVerified:false,accessVerified:false,version:current.version+1};
}
