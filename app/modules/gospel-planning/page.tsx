'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {FrameControls} from '../../../components/app-frame';
import Preaching from '../../../components/gospel-planning/preaching';
import Group from '../../../components/gospel-planning/group';
import Manage from '../../../components/gospel-planning/manage';
import {NoticeContext,newRequestId,type Notice,type Send,type WeekControl} from '../../../components/gospel-planning/shared';
import {ClipboardList} from '../../../components/home-icons';
import {EmptyState,PageHeading} from '../../../components/ui-kit';
import '../../../components/gospel-planning/gospel-planning.css';
import {GROUP_SCOPED,dayLabel,mondayOf,vegasDay,type Action,type Workspace} from '../../../lib/gospel-planning/contract';
import {useSwipeTabs} from '../../../lib/use-swipe-tabs';

type Tab='preaching'|'group'|'manage';
const tabLabel:Record<Tab,string>={preaching:'My Preaching',group:'My Group',manage:'Manage'};
const saved:Partial<Record<Action,string>>={
 'availability.save':'Availability saved.','session.create':'Session proposed. A leader publishes it to partners.',
 'session.revise':'Change saved. Everyone confirms the new version after it is published.','session.publish':'Published. Partners are asked to confirm.',
 'session.respond':'Your answer is saved.','session.cancel':'Session cancelled. Its history is kept.','report.save':'Shared result saved.',
 'plan.save':'Draft saved. It is not shared until published.','plan.publish':'Plan published to your group.',
 'update.create':'Member update added.','update.edit':'Member update saved.','request.create':'Request sent to the overseer.',
 'request.respond':'Response sent.','request.reply':'Reply sent.','request.withdraw':'Request withdrawn.',
 'location.add':'Place added.','location.retire':'Place retired.','capability.grant':'Role assigned.','capability.end':'Role ended.'};

class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}

export default function GospelPlanning(){
 const [week,setWeek]=useState(''),[data,setData]=useState<Workspace|null>(null),[error,setError]=useState<RequestError|null>(null);
 const [tab,setTab]=useState<Tab>('preaching'),[busy,setBusy]=useState(false),[notice,setNotice]=useState<Notice>(null);
 // '' means the member's own group; otherwise a group they lead by appointment.
 const [group,setGroup]=useState('');
 const sequence=useRef(0);


 const load=useCallback(async(target:string)=>{
  const id=++sequence.current;
  try{
   const response=await fetch('/api/gospel-planning?week='+encodeURIComponent(target)+(group?'&group='+encodeURIComponent(group):''),{cache:'no-store'});
   const result=await response.json().catch(()=>({error:'The server response could not be read. Please refresh.'}));
   if(id!==sequence.current)return;
   if(!response.ok){
    // Access changed or ended: drop everything already on screen.
    if(response.status===401||response.status===403)setData(null);
    setError(new RequestError(result.error??'Gospel Planning is unavailable.',response.status));return;
   }
   setData(result as Workspace);setError(null);
  }catch{if(id===sequence.current)setError(new RequestError('Could not reach the server. Check your connection and try again.',0));}
 },[group]);
 useEffect(()=>{setWeek(mondayOf(vegasDay()));},[]);
 useEffect(()=>{if(!week)return;void load(week);const refresh=()=>{void load(week);};window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[week,load]);

 const send:Send=useCallback(async(action,payload)=>{
  setBusy(true);setNotice(null);
  try{
   const response=await fetch('/api/gospel-planning/command',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action,requestId:newRequestId(),payload:group&&GROUP_SCOPED.includes(action)?{...payload,groupId:group}:payload})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok){
    setNotice({tone:response.status===409?'warning':'danger',text:result.error??'This could not be saved.'});
    if(response.status===409||response.status===401||response.status===403)await load(week);
    return false;
   }
   setNotice({tone:'success',text:saved[action]??'Saved.'});await load(week);return true;
  }catch{setNotice({tone:'danger',text:'Could not reach the server. Refresh to check whether your change was saved.'});return false;}
  finally{setBusy(false);}
 },[load,week,group]);

 const tabs=useMemo<Tab[]>(()=>data?.me.manager?['preaching','group','manage']:['preaching','group'],[data?.me.manager]);
 const current=tabs.includes(tab)?tab:'preaching';
 const swipe=useSwipeTabs(tabs,current,setTab);
 const controls=useMemo(()=>({title:'Gospel Planning',
  left:{label:'Preaching',icon:'calendar' as const,onClick:()=>setTab('preaching'),active:current==='preaching'},
  right:{label:'My Group',icon:'people' as const,onClick:()=>setTab('group'),active:current==='group'},
  more:data?.me.manager?[{label:'Manage Gospel Planning',icon:'more' as const,onClick:()=>setTab('manage'),active:current==='manage'}]:undefined}),[current,data?.me.manager]);

 if(!data)return <main className="ui-main ui-narrow gp-app">
  <FrameControls {...controls}/>
  <PageHeading eyebrow="Groups & Gospel Planning" title="Preaching, planned together" lede="Your group, your preaching partners and the week ahead."/>
  <div className="ui-glass gp-loading">
   <EmptyState icon={<ClipboardList/>} title={error?'Not available right now':'Opening your plans'}
    action={<div className="gp-actions">
     {error&&error.status!==401&&error.status!==403&&<button type="button" className="ui-button" onClick={()=>{void load(week);}}>Try again</button>}
     {error?.status===401&&<a className="ui-button" href="/sign-in">Sign in</a>}
     <a className="ui-button ui-button-secondary" href="/members">Return to LV Zion Home</a>
    </div>}>
    <span role="status" className="gp-loading-status" data-tone={error?'warning':undefined}>{error?.message??'Opening your group and preaching plans…'}</span>
    <span className="gp-loading-hint">This app needs sign-in and access assigned to your account.</span>
   </EmptyState>
  </div>
 </main>;

 const me=data.me,placement=me.placed?[me.groupName,me.unitName??(me.inGroup?'No unit':'Group you lead')].filter(Boolean).join(' · '):'Not placed in a group yet';
 const heading=current==='preaching'?{eyebrow:dayLabel(data.today,'long'),title:'My preaching',lede:placement}
  :current==='group'?{eyebrow:'Your group',title:me.placed?me.groupName??'My group':'My group',lede:me.placed?[me.unitName??(me.inGroup?'No unit':null),me.groupLeader?'Group leader':me.unitLeader?'Unit leader':'Member'].filter(Boolean).join(' · '):'My Group opens after placement.'}
  :{eyebrow:'Authorized management',title:'Places and roles',lede:'Approved meeting places and Gospel roles for every group.'};
 const control:WeekControl={week,today:data.today,onWeek:setWeek};

 return <NoticeContext.Provider value={notice}>
  <main className="ui-main gp-app" data-gp-week={data.week} data-gp-viewer={data.me.id}>
   <FrameControls {...controls}/>
   <PageHeading eyebrow={heading.eyebrow} title={heading.title} lede={heading.lede}/>
   <div className="ui-tabs gp-tabs" role="tablist" aria-label="Gospel Planning sections">
    {tabs.map(t=><button key={t} type="button" role="tab" id={'gp-tab-'+t} aria-controls="gp-panel" aria-selected={current===t} className="ui-tab" onClick={()=>setTab(t)}>{tabLabel[t]}</button>)}
   </div>
   {current!=='manage'&&(data.groups?.length??0)>1&&<label className="ui-glass gp-group-choice"><span>Group</span><select className="ui-input" value={group||data.me.groupId||''} onChange={e=>{setGroup(e.target.value===data.me.ownGroupId?'':e.target.value);}}>
    {data.groups.map(g=><option key={g.id} value={g.id}>{g.name}{g.own?' (my group)':g.leader?' (I lead)':''}</option>)}</select></label>}
   {notice&&<p role="status" className="ui-notice" data-tone={notice.tone}>{notice.text}</p>}
   {error&&<p role="alert" className="ui-notice" data-tone="warning">{error.message} The screen shows the last loaded version.</p>}
   <div id="gp-panel" role="tabpanel" aria-labelledby={'gp-tab-'+current} {...swipe}>
    {current==='preaching'&&<Preaching data={data} send={send} busy={busy} control={control}/>}
    {current==='group'&&<Group data={data} send={send} busy={busy} control={control}/>}
    {current==='manage'&&<Manage data={data} send={send} busy={busy}/>}
   </div>
  </main>
 </NoticeContext.Provider>;
}
