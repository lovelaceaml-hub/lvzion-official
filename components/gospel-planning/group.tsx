'use client';
import {useState} from 'react';
import {dayLabel,type MemberUpdate,type OverseerRequest,type Workspace} from '../../lib/gospel-planning/contract';
import {Empty,Section,Sheet,type Send} from './shared';

const requestStatus={open:'Waiting for the overseer',clarification:'Overseer asked a question',answered:'Answered',withdrawn:'Withdrawn'} as const;
const eventLabel={submitted:'Request',clarification:'Question',reply:'Reply',answer:'Answer',withdrawn:'Withdrawn'} as const;

export default function Group({data,send,busy}:{data:Workspace;send:Send;busy:boolean}){
 const leader=data.me.groupLeader||data.me.unitLeader;
 if(!data.me.placed)return <div className="gp-tab-body"><Empty title="You are not placed in a group">My Group opens after a leader places you in a group and unit.</Empty></div>;
 return <div className="gp-tab-body">
  <p className="gp-group-name"><strong>{data.me.groupName}</strong> · {data.me.unitName}</p>
  <MemberUpdates data={data} send={send} busy={busy} leader={leader}/>
  <GospelReview data={data} leader={leader}/>
  <GospelPlan data={data} send={send} busy={busy}/>
  <OverseerRequests data={data} send={send} busy={busy} leader={leader}/>
 </div>;
}

function MemberUpdates({data,send,busy,leader}:{data:Workspace;send:Send;busy:boolean;leader:boolean}){
 const [editing,setEditing]=useState<MemberUpdate|'new'|null>(null);
 const writable=data.units.filter(u=>u.canWrite);
 return <Section number={1} title="Member Updates" note={leader?'Private to your unit and group leaders. Never shared with the group or the published plan.':'Member updates are kept private to unit and group leaders.'}
  action={leader&&writable.length?<button type="button" className="ui-button ui-button-secondary gp-small-button" onClick={()=>setEditing('new')}>Add update</button>:undefined}>
  {leader&&(data.updates?.length?<ul className="ui-list">{data.updates.map(u=><li key={u.id}><button type="button" className="ui-row" onClick={()=>setEditing(u)}>
   <span className="ui-row-body"><strong>{u.about??'General update'} · {u.unitName}</strong><small>{u.body}</small>
    {u.nextAction&&<small>Next: {u.nextAction}{u.assignee?' · '+u.assignee:' · not assigned'}</small>}</span>
   <span className="gp-chip" data-tone={u.status==='done'?'success':'info'}>{u.status==='done'?'Done':u.week<data.week?'Open from '+dayLabel(u.week):'Open'}</span>
  </button></li>)}</ul>:<p className="ui-hint">No member updates for this week.</p>)}
  {leader&&<UpdateForm update={editing} data={data} send={send} busy={busy} onClose={()=>setEditing(null)}/>}
 </Section>;
}

function UpdateForm({update,data,send,busy,onClose}:{update:MemberUpdate|'new'|null;data:Workspace;send:Send;busy:boolean;onClose:()=>void}){
 const existing=update&&update!=='new'?update:null;
 const writable=data.units.filter(u=>u.canWrite);
 const blank={unitId:writable[0]?.id??'',aboutMemberId:'',body:'',support:'',nextAction:'',assignToMe:false,status:'open' as 'open'|'done'};
 const [form,setForm]=useState(blank),[key,setKey]=useState('');
 const k=existing?existing.id+':'+existing.version:update?'new':'';
 if(k!==key){setKey(k);setForm(existing?{unitId:existing.unitId,aboutMemberId:existing.aboutMemberId??'',body:existing.body,support:existing.support,nextAction:existing.nextAction,
  assignToMe:existing.assigneeId===data.me.id,status:existing.status}:blank);}
 const people=data.candidates.filter(c=>c.unitId===form.unitId);
 return <Sheet open={update!==null} title={existing?'Member update':'Add member update'} onClose={onClose}>
  <form className="gp-form" onSubmit={async e=>{e.preventDefault();
   const assigneeId=form.assignToMe?data.me.id:existing&&existing.assigneeId!==data.me.id?existing.assigneeId:null;
   const common={body:form.body,support:form.support,nextAction:form.nextAction,aboutMemberId:form.aboutMemberId||null,assigneeId};
   if(await send(existing?'update.edit':'update.create',existing?{...common,id:existing.id,expected:existing.version,status:form.status}:{...common,week:data.week,unitId:form.unitId}))onClose();}}>
   {!existing&&<label className="ui-field">Unit<select className="ui-input" value={form.unitId} onChange={e=>setForm({...form,unitId:e.target.value,aboutMemberId:''})}>
    {writable.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>}
   <label className="ui-field">About (optional)<select className="ui-input" value={form.aboutMemberId} onChange={e=>setForm({...form,aboutMemberId:e.target.value})}>
    <option value="">General update</option>{people.map(p=><option key={p.id} value={p.id}>{p.self?'You':p.name}</option>)}</select></label>
   <label className="ui-field">Update<textarea className="ui-input" rows={3} required maxLength={1200} value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label>
   <label className="ui-field">Support needed (optional)<textarea className="ui-input" rows={2} maxLength={600} value={form.support} onChange={e=>setForm({...form,support:e.target.value})}/></label>
   <label className="ui-field">Next action (optional)<input className="ui-input" maxLength={300} value={form.nextAction} onChange={e=>setForm({...form,nextAction:e.target.value})}/></label>
   <label className="gp-check"><input type="checkbox" checked={form.assignToMe} onChange={e=>setForm({...form,assignToMe:e.target.checked})}/> I will take the next action</label>
   {existing&&existing.assignee&&existing.assigneeId!==data.me.id&&<p className="ui-hint">Assigned to {existing.assignee}.</p>}
   {existing&&<label className="gp-check"><input type="checkbox" checked={form.status==='done'} onChange={e=>setForm({...form,status:e.target.checked?'done':'open'})}/> Mark as done</label>}
   <button className="ui-button ui-button-block" disabled={busy}>{existing?'Save update':'Add update'}</button>
   {existing&&<p className="ui-hint">Written by {existing.author}.</p>}
  </form>
 </Sheet>;
}

function GospelReview({data,leader}:{data:Workspace;leader:boolean}){
 const s=data.weekSummary,published=data.plan?.published;
 return <Section number={2} title="Gospel Review" note="What happened this week and what is still open.">
  {leader&&s&&<dl className="gp-summary">
   <div><dt>Planned</dt><dd>{s.sessions}</dd></div>
   <div><dt>Proposed</dt><dd>{s.proposed}</dd></div>
   <div><dt>Awaiting partner</dt><dd>{s.awaiting}</dd></div>
   <div><dt>Confirmed</dt><dd>{s.confirmed}</dd></div>
   <div><dt>Results recorded</dt><dd>{s.resultsRecorded}</dd></div>
   <div><dt>Result needed</dt><dd>{s.resultsNeeded}</dd></div>
  </dl>}
  {leader&&s&&<p className="ui-hint">Counts only sessions you can see in your scope. Each session counts once, however many partners report.</p>}
  {published?.review?<p className="gp-published">{published.review}</p>:<p className="ui-hint">{leader?'No review has been published for this week.':'Your group has not published a review for this week.'}</p>}
 </Section>;
}

function GospelPlan({data,send,busy}:{data:Workspace;send:Send;busy:boolean}){
 const plan=data.plan,published=plan?.published,draft=plan?.draft;
 const [editing,setEditing]=useState(false);
 const [form,setForm]=useState({review:'',plan:'',nextAction:'',responsibleId:''});
 const changed=draft&&draft.version!==draft.publishedVersion;
 return <Section number={3} title="Gospel Plan" note={plan?.canEdit?'Your draft stays private to leaders until it is published to the group.':'The plan your group has shared for this week.'}
  action={plan?.canEdit?<button type="button" className="ui-button ui-button-secondary gp-small-button" onClick={()=>{setForm({review:draft?.review??'',plan:draft?.plan??'',nextAction:draft?.nextAction??'',responsibleId:draft?.responsibleId??''});setEditing(true);}}>{draft?'Edit draft':'Start draft'}</button>:undefined}>
  {published?<div className="gp-published">
   <p>{published.plan||'No activities listed.'}</p>
   {published.nextAction&&<p><strong>Next:</strong> {published.nextAction}{published.responsible?' · '+published.responsible:''}</p>}
   <p className="ui-hint">Published {dayLabel(published.publishedAt.slice(0,10))} · version {published.version}</p>
  </div>:<p className="ui-hint">No plan has been published for this week.</p>}
  {draft&&<div className="gp-draft ui-surface">
   <p className="gp-draft-label"><strong>Leader draft</strong> · version {draft.version}{changed?' · not yet published':' · same as published'}</p>
   {draft.plan&&<p>{draft.plan}</p>}
   {plan?.canPublish&&changed&&<button type="button" className="ui-button" disabled={busy} onClick={()=>send('plan.publish',{week:data.week,expected:draft.version})}>Publish to group</button>}
   {!plan?.canPublish&&changed&&<p className="ui-hint">A leader with publishing authority publishes the draft.</p>}
   <p className="ui-hint">Publishing shares only the review, plan and next action. Member updates and overseer requests are never included.</p>
  </div>}
  {plan?.canEdit&&<Sheet open={editing} title="Week draft" onClose={()=>setEditing(false)}>
   <form className="gp-form" onSubmit={async e=>{e.preventDefault();
    if(await send('plan.save',{week:data.week,expected:draft?.version??0,review:form.review,plan:form.plan,nextAction:form.nextAction,responsibleId:form.responsibleId||null}))setEditing(false);}}>
    <label className="ui-field">Gospel Review<textarea className="ui-input" rows={4} maxLength={1200} value={form.review} onChange={e=>setForm({...form,review:e.target.value})}/></label>
    <label className="ui-field">Gospel Plan<textarea className="ui-input" rows={4} maxLength={1200} value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})}/></label>
    <label className="ui-field">Next action<input className="ui-input" maxLength={300} value={form.nextAction} onChange={e=>setForm({...form,nextAction:e.target.value})}/></label>
    <label className="ui-field">Responsible (optional)<select className="ui-input" value={form.responsibleId} onChange={e=>setForm({...form,responsibleId:e.target.value})}>
     <option value="">Not assigned</option>{data.candidates.map(c=><option key={c.id} value={c.id}>{c.self?'You':c.name}</option>)}</select></label>
    <p className="ui-hint">Do not include private member details. Use Member Updates for those.</p>
    <button className="ui-button ui-button-block" disabled={busy}>Save draft</button>
   </form>
  </Sheet>}
 </Section>;
}

function OverseerRequests({data,send,busy,leader}:{data:Workspace;send:Send;busy:boolean;leader:boolean}){
 const [creating,setCreating]=useState(false),[openId,setOpenId]=useState<string|null>(null);
 const [reviewerId,setReviewerId]=useState(''),[body,setBody]=useState('');
 const open=data.requests.find(r=>r.id===openId)??null;
 const reviewers=data.reviewers??[];
 const visible=leader||data.me.overseer||data.requests.length>0;
 return <Section number={4} title="Request for Overseer" note={visible?'Shared only between the requesting leader and the assigned overseer.':'Requests are shared only between a requesting leader and the assigned overseer.'}
  action={leader&&reviewers.length?<button type="button" className="ui-button ui-button-secondary gp-small-button" onClick={()=>{setReviewerId(reviewers[0].id);setBody('');setCreating(true);}}>New request</button>:undefined}>
  {leader&&!reviewers.length&&<p className="ui-hint">No overseer has been assigned to your group yet.</p>}
  {visible&&(data.requests.length?<ul className="ui-list">{data.requests.map(r=><li key={r.id}><button type="button" className="ui-row" onClick={()=>setOpenId(r.id)}>
   <span className="ui-row-body"><strong>{r.asReviewer?'From '+r.author+' · '+r.groupName:'To '+r.reviewer}</strong><small>{r.events[0]?.body}</small></span>
   <span className="gp-chip" data-tone={r.nextActor===(r.asReviewer?'reviewer':'requester')?'warning':r.status==='answered'?'success':'info'}>{requestStatus[r.status]}</span>
  </button></li>)}</ul>:<p className="ui-hint">No open requests.</p>)}
  <Sheet open={creating} title="New request for overseer" onClose={()=>setCreating(false)}>
   <form className="gp-form" onSubmit={async e=>{e.preventDefault();if(await send('request.create',{week:data.week,reviewerId,body}))setCreating(false);}}>
    <label className="ui-field">Overseer<select className="ui-input" value={reviewerId} onChange={e=>setReviewerId(e.target.value)}>{reviewers.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <label className="ui-field">Request<textarea className="ui-input" rows={4} required maxLength={1200} value={body} onChange={e=>setBody(e.target.value)}/></label>
    <button className="ui-button ui-button-block" disabled={busy}>Send request</button>
   </form>
  </Sheet>
  <RequestSheet request={open} send={send} busy={busy} onClose={()=>setOpenId(null)}/>
 </Section>;
}

function RequestSheet({request,send,busy,onClose}:{request:OverseerRequest|null;send:Send;busy:boolean;onClose:()=>void}){
 const [body,setBody]=useState('');
 if(!request)return <Sheet open={false} title="Request" onClose={onClose}>{null}</Sheet>;
 const reviewerTurn=request.asReviewer&&request.status==='open',requesterTurn=request.asAuthor&&request.status==='clarification';
 return <Sheet open title="Request for overseer" onClose={()=>{setBody('');onClose();}}>
  <p className="ui-hint">{request.groupName} · to {request.reviewer} · {requestStatus[request.status]}</p>
  <ol className="gp-history">{request.events.map((e,i)=><li key={i}><strong>{eventLabel[e.kind]} · {e.self?'You':e.actor}</strong>{e.body&&<p>{e.body}</p>}
   <small className="ui-hint">{new Date(e.recordedAt).toLocaleString('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</small></li>)}</ol>
  {request.nextActor&&<p className="ui-hint">Next: {request.nextActor==='reviewer'?(request.asReviewer?'your answer':request.reviewer):(request.asAuthor?'your reply':request.author)}.</p>}
  {(reviewerTurn||requesterTurn)&&<form className="gp-form" onSubmit={e=>e.preventDefault()}>
   <label className="ui-field">{reviewerTurn?'Your response':'Your reply'}<textarea className="ui-input" rows={3} required maxLength={1200} value={body} onChange={e=>setBody(e.target.value)}/></label>
   <div className="gp-actions">
    {reviewerTurn&&<><button type="button" className="ui-button" disabled={busy||!body.trim()} onClick={async()=>{if(await send('request.respond',{id:request.id,expected:request.version,decision:'answer',body})){setBody('');onClose();}}}>Send answer</button>
     <button type="button" className="ui-button ui-button-secondary" disabled={busy||!body.trim()} onClick={async()=>{if(await send('request.respond',{id:request.id,expected:request.version,decision:'clarification',body})){setBody('');onClose();}}}>Ask a question</button></>}
    {requesterTurn&&<button type="button" className="ui-button" disabled={busy||!body.trim()} onClick={async()=>{if(await send('request.reply',{id:request.id,expected:request.version,body})){setBody('');onClose();}}}>Send reply</button>}
   </div>
  </form>}
  {request.asAuthor&&(request.status==='open'||request.status==='clarification')&&<p><button type="button" className="ui-button ui-button-quiet" disabled={busy}
   onClick={async()=>{if(window.confirm('Withdraw this request? Its history is kept.')&&await send('request.withdraw',{id:request.id,expected:request.version}))onClose();}}>Withdraw request</button></p>}
 </Sheet>;
}
