'use client';
import {useMemo,useState} from 'react';
import {addDays,clockLabel,dayLabel,nextAction,rangeDates,sessionDay,sessionStatus,timeRange,vegasTime24,
 type Range,type Session,type Workspace} from '../../lib/gospel-planning/contract';
import {Empty,Section,Sheet,StatusChip,type Send} from './shared';

const responseLabel={pending:'Not answered yet',accepted:'Accepted',declined:'Declined'} as const;

function SessionRow({session,now,onOpen}:{session:Session;now:number;onOpen:()=>void}){
 const status=sessionStatus(session,now),partners=session.participants.filter(p=>!p.self).map(p=>p.name);
 return <li><button type="button" className="ui-row gp-session-row" onClick={onOpen}>
  <span className="gp-time"><strong>{dayLabel(sessionDay(session))}</strong><small>{timeRange(session.start,session.end)}</small></span>
  <span className="ui-row-body"><strong>{session.mine?(partners.length?'With '+partners.join(' and '):'Session'):session.participants.map(p=>p.name).join(', ')}</strong>
   <small>{session.location.label}</small></span>
  <StatusChip status={status}/>
 </button></li>;
}

export default function Preaching({data,send,busy}:{data:Workspace;send:Send;busy:boolean}){
 const now=Date.now();
 const [openId,setOpenId]=useState<string|null>(null),[planning,setPlanning]=useState<Session|'new'|null>(null),[editingAvailability,setEditingAvailability]=useState(false);
 // Own sessions still ahead, plus recent ones that still need the shared result.
 const upcoming=data.sessions.filter(s=>s.mine&&s.phase!=='cancelled'&&(Date.parse(s.end)>now||nextAction(s,now)==='report'));
 const needing=upcoming.find(s=>nextAction(s,now)!==null);
 const next=needing??upcoming.find(s=>Date.parse(s.end)>now);
 const recent=data.sessions.filter(s=>s.mine&&Date.parse(s.end)<=now&&!upcoming.includes(s)).reverse();
 const managed=data.sessions.filter(s=>!s.mine&&s.canManage);
 const open=data.sessions.find(s=>s.id===openId)??null;
 const canPlan=data.me.placed&&data.locations.length>0&&data.candidates.length>1;
 return <div className="gp-tab-body">
  <Section title="Next" note={next?undefined:'Your next session and anything that needs your answer appear here.'}>
   {next?<div className="ui-surface gp-next">
    <p className="gp-next-when"><strong>{dayLabel(sessionDay(next),'long')}</strong> {timeRange(next.start,next.end)}</p>
    <p className="gp-next-where">{next.location.label} · with {next.participants.filter(p=>!p.self).map(p=>p.name).join(' and ')}</p>
    <p><StatusChip status={sessionStatus(next,now)}/> <span className="ui-hint">{sessionStatus(next,now).detail}</span></p>
    <button type="button" className="ui-button ui-button-block" onClick={()=>setOpenId(next.id)}>
     {nextAction(next,now)==='respond'?'Answer this session':nextAction(next,now)==='report'?'Record the shared result':'View session'}</button>
   </div>:<Empty title="Nothing scheduled yet">{canPlan?'Plan a session with a partner from your group.':'Save your availability so leaders can plan with you.'}</Empty>}
  </Section>

  <Section title="Your sessions" action={canPlan?<button type="button" className="ui-button ui-button-secondary gp-small-button" onClick={()=>setPlanning('new')}>Plan a session</button>:undefined}>
   {!data.me.placed?<p className="ui-hint">Preaching sessions start after you are placed in a group.</p>
    :data.locations.length===0?<p className="ui-notice">No approved meeting places yet. A Gospel Planning manager adds them before sessions can be planned.</p>:null}
   {upcoming.length?<ul className="ui-list">{upcoming.map(s=><SessionRow key={s.id} session={s} now={now} onOpen={()=>setOpenId(s.id)}/>)}</ul>
    :<p className="ui-hint">No sessions in the next six weeks.</p>}
  </Section>

  <Section title="Your availability" note="A few time ranges you are usually free. Saving availability is not agreeing to a session."
   action={data.me.placed?<button type="button" className="ui-button ui-button-secondary gp-small-button" onClick={()=>setEditingAvailability(true)}>Edit</button>:undefined}>
   {data.availability.ranges.length?<ul className="ui-list">{data.availability.ranges.map((r,i)=><li key={i} className="ui-row">
    <span className="ui-row-body"><strong>{dayLabel(r.date)} · {clockLabel(r.from)} to {clockLabel(r.to)}</strong>
     <small>{r.repeatWeeks>1?'Weekly for '+r.repeatWeeks+' weeks':'One day'}{r.skip.length?', skipping '+r.skip.map(d=>dayLabel(d)).join(', '):''}</small></span>
   </li>)}</ul>:<p className="ui-hint">No availability saved.</p>}
  </Section>

  {recent.length>0&&<Section title="Recent sessions" note="The last two weeks. One shared result is kept for each session.">
   <ul className="ui-list">{recent.map(s=><SessionRow key={s.id} session={s} now={now} onOpen={()=>setOpenId(s.id)}/>)}</ul>
  </Section>}

  {managed.length>0&&<Section title="Group sessions this week" note="Sessions you can publish or change within your scope.">
   <ul className="ui-list">{managed.map(s=><SessionRow key={s.id} session={s} now={now} onOpen={()=>setOpenId(s.id)}/>)}</ul>
  </Section>}

  <SessionSheet session={open} now={now} send={send} busy={busy} onClose={()=>setOpenId(null)} onChange={s=>{setOpenId(null);setPlanning(s);}}/>
  <SessionForm open={planning!==null} session={planning==='new'?null:planning} data={data} send={send} busy={busy} onClose={()=>setPlanning(null)}/>
  <AvailabilityForm open={editingAvailability} data={data} send={send} busy={busy} onClose={()=>setEditingAvailability(false)}/>
 </div>;
}

function SessionSheet({session,now,send,busy,onClose,onChange}:{session:Session|null;now:number;send:Send;busy:boolean;onClose:()=>void;onChange:(s:Session)=>void}){
 const [outcome,setOutcome]=useState<'completed'|'not-held'>('completed'),[note,setNote]=useState(''),[reason,setReason]=useState(''),[correcting,setCorrecting]=useState(false);
 if(!session)return <Sheet open={false} title="Session" onClose={onClose}>{null}</Sheet>;
 const status=sessionStatus(session,now),self=session.participants.find(p=>p.self),ended=Date.parse(session.end)<=now;
 const action=nextAction(session,now);
 const respond=(response:'accepted'|'declined')=>send('session.respond',{id:session.id,expected:session.version,expectedResponse:self?.responseVersion??0,response});
 const canChange=session.canEdit&&session.phase!=='cancelled'&&!session.report&&Date.parse(session.start)>now;
 return <Sheet open title="Session" onClose={onClose}>
  <p className="gp-sheet-when"><strong>{dayLabel(sessionDay(session),'long')}</strong><br/>{timeRange(session.start,session.end)} · {session.location.label}</p>
  <p><StatusChip status={status}/></p>
  <p className="ui-hint">{status.detail}</p>
  <h3 className="gp-subheading">Partners</h3>
  <ul className="ui-list">{session.participants.map(p=><li key={(p.id??'')+p.name} className="ui-row">
   <span className="ui-row-body"><strong>{p.self?'You':p.name}</strong>
    <small>{responseLabel[p.response]}{p.reconfirm?' · needs to confirm the change':''}{p.covered===false?(p.self?' · outside your saved availability':' · outside their saved availability'):''}</small></span>
  </li>)}</ul>
  {action==='respond'&&<div className="gp-actions">
   <button type="button" className="ui-button" disabled={busy} onClick={async()=>{if(await respond('accepted'))onClose();}}>Accept</button>
   <button type="button" className="ui-button ui-button-secondary" disabled={busy} onClick={async()=>{if(await respond('declined'))onClose();}}>Decline</button>
  </div>}
  {!action&&self&&session.phase==='published'&&!ended&&<p className="gp-actions"><button type="button" className="ui-button ui-button-quiet" disabled={busy}
   onClick={async()=>{if(await respond(self.response==='accepted'?'declined':'accepted'))onClose();}}>{self.response==='accepted'?'I can no longer go':'Accept after all'}</button></p>}
  {session.canManage&&session.phase==='proposal'&&Date.parse(session.start)>now&&<div className="gp-actions">
   <button type="button" className="ui-button" disabled={busy} onClick={async()=>{if(await send('session.publish',{id:session.id,expected:session.version}))onClose();}}>Publish to partners</button>
   <p className="ui-hint">Partners are asked to confirm after publication. Publishing does not accept for anyone.</p>
  </div>}
  {(action==='report'||(session.report&&self?.response==='accepted'))&&<form className="gp-form" onSubmit={async e=>{e.preventDefault();
    const payload:Record<string,unknown>={id:session.id,expected:session.version,expectedReport:session.report?.version??0,outcome,note};
    if(session.report)payload.reason=reason;
    if(await send('report.save',payload)){setCorrecting(false);setNote('');setReason('');onClose();}}}>
   <h3 className="gp-subheading">Shared result</h3>
   {session.report&&!correcting?<>
    <p>{session.report.outcome==='completed'?'Completed':'Not held'}{session.report.note?': '+session.report.note:''}</p>
    <p className="ui-hint">Recorded by {session.report.authorSelf?'you':session.report.author}{session.report.corrected?', corrected':''}. One result counts for everyone in the session.</p>
    <button type="button" className="ui-button ui-button-quiet" onClick={()=>{setCorrecting(true);setOutcome(session.report!.outcome);setNote(session.report!.note);}}>Correct the result</button>
   </>:<>
    <fieldset className="gp-choice"><legend className="ui-hint">What happened</legend>
     <label><input type="radio" name="outcome" checked={outcome==='completed'} onChange={()=>setOutcome('completed')}/> Completed</label>
     <label><input type="radio" name="outcome" checked={outcome==='not-held'} onChange={()=>setOutcome('not-held')}/> Not held</label>
    </fieldset>
    <label className="ui-field">Note (optional)<textarea className="ui-input" rows={3} maxLength={1200} value={note} onChange={e=>setNote(e.target.value)}/></label>
    {session.report&&<label className="ui-field">Reason for the correction<input className="ui-input" required maxLength={600} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
    <button className="ui-button" disabled={busy}>{session.report?'Save correction':'Save shared result'}</button>
    <p className="ui-hint">Only one result is kept per session. If your partner already saved it, you will be asked to review theirs.</p>
   </>}
  </form>}
  {session.mine&&<div className="gp-contacts">
   <h3 className="gp-subheading">Follow-up</h3>
   <p className="ui-hint">Contacts keeps its own records and checks its own access. Nothing from this session is shared with it.</p>
   <div className="gp-actions"><a className="ui-button ui-button-secondary" href="/modules/contacts">Open in Contacts</a>
    <a className="ui-button ui-button-secondary" href="/modules/contacts">Create follow-up in Contacts</a></div>
  </div>}
  {canChange&&<div className="gp-actions gp-quiet-actions">
   <button type="button" className="ui-button ui-button-quiet" onClick={()=>onChange(session)}>Change time, place or partners</button>
   <button type="button" className="ui-button ui-button-quiet" disabled={busy} onClick={async()=>{if(window.confirm('Cancel this session? Its history is kept.')&&await send('session.cancel',{id:session.id,expected:session.version}))onClose();}}>Cancel session</button>
  </div>}
 </Sheet>;
}

function SessionForm({open,session,data,send,busy,onClose}:{open:boolean;session:Session|null;data:Workspace;send:Send;busy:boolean;onClose:()=>void}){
 const self=data.candidates.find(c=>c.self);
 const initial=useMemo(()=>session?{date:sessionDay(session),from:vegasTime24(session.start),to:vegasTime24(session.end),locationId:session.location.id,
   people:session.participants.map(p=>p.id).filter((id):id is string=>!!id)}
  :{date:addDays(data.today,1),from:'10:00',to:'11:00',locationId:data.locations[0]?.id??'',people:self?[self.id]:[]},[session,data.today,data.locations,self]);
 const [form,setForm]=useState(initial);
 const [key,setKey]=useState<string|null>(null);
 const formKey=(session?.id??'new')+':'+(session?.version??0)+':'+String(open);
 if(open&&key!==formKey){setKey(formKey);setForm(initial);}
 const toggle=(id:string)=>setForm(f=>({...f,people:f.people.includes(id)?f.people.filter(x=>x!==id):[...f.people,id]}));
 const plansForOthers=data.me.groupLeader||data.me.unitLeader||data.me.scheduler;
 const count=form.people.length;
 return <Sheet open={open} title={session?'Change session':'Plan a session'} onClose={onClose}>
  <form className="gp-form" onSubmit={async e=>{e.preventDefault();
   const payload={date:form.date,from:form.from,to:form.to,locationId:form.locationId,participants:form.people};
   if(await send(session?'session.revise':'session.create',session?{...payload,id:session.id,expected:session.version}:payload))onClose();}}>
   <label className="ui-field">Date<input className="ui-input" type="date" required min={data.today} value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
   <div className="gp-two">
    <label className="ui-field">Start<input className="ui-input" type="time" step={300} required value={form.from} onChange={e=>setForm({...form,from:e.target.value})}/></label>
    <label className="ui-field">End<input className="ui-input" type="time" step={300} required value={form.to} onChange={e=>setForm({...form,to:e.target.value})}/></label>
   </div>
   <label className="ui-field">Meeting place<select className="ui-input" required value={form.locationId} onChange={e=>setForm({...form,locationId:e.target.value})}>
    {data.locations.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
   <fieldset className="gp-choice gp-people"><legend className="ui-field">Partners from your group (two or three people in all)</legend>
    {data.candidates.filter(c=>plansForOthers||!c.self).map(c=><label key={c.id}>
     <input type="checkbox" checked={form.people.includes(c.id)} disabled={!plansForOthers&&c.self} onChange={()=>toggle(c.id)}/> {c.self?'You':c.name}</label>)}
   </fieldset>
   {session&&<p className="ui-notice" data-tone="warning">Saving a change returns the session to Proposed. Everyone confirms the new version after it is published again.</p>}
   <button className="ui-button ui-button-block" disabled={busy||count<2||count>3}>{session?'Save change':'Propose session'}</button>
   <p className="ui-hint">Naming a partner does not accept for them. Each person confirms for themselves.</p>
  </form>
 </Sheet>;
}

type DraftRange=Range&{key:number};
function AvailabilityForm({open,data,send,busy,onClose}:{open:boolean;data:Workspace;send:Send;busy:boolean;onClose:()=>void}){
 const [ranges,setRanges]=useState<DraftRange[]>([]);
 const [version,setVersion]=useState<number|null>(null);
 if(open&&version!==data.availability.version){setVersion(data.availability.version);setRanges(data.availability.ranges.map((r,i)=>({...r,key:i})));}
 if(!open&&version!==null)setVersion(null);
 const update=(key:number,patch:Partial<Range>)=>setRanges(rs=>rs.map(r=>r.key===key?{...r,...patch,skip:patch.repeatWeeks!==undefined||patch.date!==undefined?[]:(patch.skip??r.skip)}:r));
 return <Sheet open={open} title="Your availability" onClose={onClose}>
  <form className="gp-form" onSubmit={async e=>{e.preventDefault();
   if(await send('availability.save',{expected:data.availability.version,ranges:ranges.map(({key:_key,...r})=>r)}))onClose();}}>
   <p className="ui-hint">Add a few ranges, such as Wednesday 3 to 5 PM for four weeks. Leaders see whether a session fits your ranges; other members do not.</p>
   {ranges.map((r,index)=><fieldset key={r.key} className="gp-range"><legend>Range {index+1}</legend>
    <label className="ui-field">First date<input className="ui-input" type="date" required min={addDays(data.today,-7)} value={r.date} onChange={e=>update(r.key,{date:e.target.value})}/></label>
    <div className="gp-two">
     <label className="ui-field">From<input className="ui-input" type="time" step={300} required value={r.from} onChange={e=>update(r.key,{from:e.target.value})}/></label>
     <label className="ui-field">To<input className="ui-input" type="time" step={300} required value={r.to} onChange={e=>update(r.key,{to:e.target.value})}/></label>
    </div>
    <label className="ui-field">Repeat<select className="ui-input" value={r.repeatWeeks} onChange={e=>update(r.key,{repeatWeeks:Number(e.target.value)})}>
     <option value={1}>This day only</option><option value={2}>Weekly for 2 weeks</option><option value={3}>Weekly for 3 weeks</option><option value={4}>Weekly for 4 weeks</option></select></label>
    {r.repeatWeeks>1&&r.date&&<div className="gp-choice"><span className="ui-hint">Skip a week</span>
     {rangeDates({...r,skip:[]}).slice(1).map(d=><label key={d}><input type="checkbox" checked={r.skip.includes(d)}
      onChange={e=>update(r.key,{skip:e.target.checked?[...r.skip,d]:r.skip.filter(x=>x!==d)})}/> {dayLabel(d)}</label>)}</div>}
    <button type="button" className="ui-button ui-button-quiet" onClick={()=>setRanges(rs=>rs.filter(x=>x.key!==r.key))}>Remove range</button>
   </fieldset>)}
   {ranges.length<14&&<button type="button" className="ui-button ui-button-secondary ui-button-block" onClick={()=>setRanges(rs=>[...rs,{key:Date.now(),date:addDays(data.today,1),from:'15:00',to:'17:00',repeatWeeks:1,skip:[]}])}>Add a time range</button>}
   <button className="ui-button ui-button-block" disabled={busy}>Save availability</button>
  </form>
 </Sheet>;
}
