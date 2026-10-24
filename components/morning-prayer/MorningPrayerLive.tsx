'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {FrameControls} from '../app-frame';
import {Sun} from '../home-icons';
import {EmptyState} from '../ui-kit';
import {useSwipeTabs} from '../../lib/use-swipe-tabs';
import {vegasToday} from '../../lib/morning-prayer/time';
import styles from './morning-prayer.module.css';
import {postJSON,requestJSON} from './shared';
import type {Capability,ManageArea,Occurrence,Workspace} from './shared';
import HomeTab from './HomeTab';
import ScheduleTab,{type ScheduleView} from './ScheduleTab';
import GatheringDetail from './GatheringDetail';
import MaterialsTab from './MaterialsTab';
import MeTab from './MeTab';
import ManageTab,{useGatheringForm,useMaterialForm} from './ManageTab';
type Tab='home'|'schedule'|'materials'|'me'|'manage';
const TAB_LABELS:Record<Tab,string>={home:'Home',schedule:'Schedule',materials:'Materials',me:'Me',manage:'Manage'};
const MANAGER_CAPS:Capability[]=['review_requests','manage_schedule','edit_materials','publish_materials'];
/** Posts one action. Single new dates go to the batch endpoint; setup actions to setup; everything else to command. */
export type Post=(action:Record<string,unknown>,setup?:boolean)=>Promise<boolean>;
export default function MorningPrayerLive(){
 const readSequence=useRef(0),readController=useRef<AbortController|null>(null);
 const [tab,setTabState]=useState<Tab>('home');
 const [month,setMonth]=useState(()=>vegasToday().slice(0,7)),[monthDraft,setMonthDraft]=useState(()=>vegasToday().slice(0,7));
 const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 // The gathering detail screen sits over the tab that opened it; switching tabs closes it.
 const [detail,setDetail]=useState<string|null>(null);
 const [scheduleView,setScheduleView]=useState<ScheduleView>('week'),[day,setDay]=useState(()=>vegasToday());
 const [manageArea,setManageArea]=useState<ManageArea>('schedule'),[ownerAccess,setOwnerAccess]=useState(false);
 const [hostSelection,setHostSelection]=useState(''),[readingSelection,setReadingSelection]=useState(''),[myWeek,setMyWeek]=useState(1);
 const gatheringForm=useGatheringForm(),materialForm=useMaterialForm();
 const cap=(key:Capability)=>!!data?.capabilities?.includes(key);
 useEffect(()=>{setMonthDraft(month);},[month]);
 const setTab=useCallback((next:Tab)=>{setDetail(null);setTabState(next);window.scrollTo?.({top:0});},[]);

 const loader=useCallback(async()=>{
  const sequence=++readSequence.current;
  readController.current?.abort();
  const controller=new AbortController();readController.current=controller;
  try{
   const first=month+'-01',last=new Date(Date.UTC(+month.slice(0,4),+month.slice(5,7),0)).toISOString().slice(0,10);
   const result=await requestJSON<Workspace>('/api/morning-prayer?from='+first+'&to='+last,{signal:controller.signal});
   if(sequence!==readSequence.current||controller.signal.aborted)return false;
   setData(result);setError('');return true;
  }catch(e){
   if(sequence!==readSequence.current||controller.signal.aborted)return false;
   setData(null);setError(e instanceof Error?e.message:'Morning Prayer unavailable.');return false;
  }
 },[month]);
 useEffect(()=>{
  setData(null);setError('');void loader();
  const refresh=()=>{if(!document.hidden)void loader();};
  const timer=window.setInterval(refresh,30000);
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{
   readSequence.current++;readController.current?.abort();window.clearInterval(timer);
   window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);
  };
 },[loader]);

 const post:Post=async(action,setup=false)=>{
  if(!data||busy)return false;
  setBusy(true);setMessage('');
  try{
   const key=crypto.randomUUID(),expectedVersion=data.version;
   if(action.type==='create_occurrence'){
    const occurrence=Object.fromEntries(Object.entries(action).filter(([name])=>name!=='type'));
    await postJSON('/api/morning-prayer/batch',{key,expectedVersion,occurrences:[occurrence]});
   }else await postJSON(setup?'/api/morning-prayer/setup':'/api/morning-prayer/command',{key,expectedVersion,action});
   const refreshed=await loader();
   setMessage(refreshed?'Saved.':'Change accepted. Refresh to confirm the result.');
   return refreshed;
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to save.');await loader();return false;}
  finally{setBusy(false);}
 };
 async function joinGathering(id:string){
  if(busy)return;
  setBusy(true);setMessage('');
  try{
   const value=await postJSON<{joinUrl:string}>('/api/morning-prayer/join',{occurrenceId:id});
   const url=new URL(value.joinUrl);
   if(url.protocol!=='https:'||!/(^|[.])zoom[.]us$/.test(url.hostname)||!/^[/]j[/][0-9]{8,12}$/.test(url.pathname))
    throw new Error('The verified Zoom meeting URL is unavailable.');
   window.location.assign(url.toString());
  }catch(e){setMessage(e instanceof Error?e.message:'Joining is currently unavailable.');setBusy(false);}
 }
 /** Opens the gathering detail screen; loads the occurrence's month so its reading and state are current. */
 function openGathering(o:Occurrence){setMonth(o.date.slice(0,7));setDay(o.date);setDetail(o.id);window.scrollTo?.({top:0});}
 /** Opens the schedule week that holds the date. */
 function openDay(date:string){setMonth(date.slice(0,7));setDay(date);setScheduleView('week');setTab('schedule');}

 const today=vegasToday();
 const rows=[...(data?.occurrences||[])].sort((a,b)=>a.date.localeCompare(b.date));
 const published=data?.materials||[];
 const joinable=(id:string)=>cap('join_gathering')&&!!data?.meetingStates?.some(s=>s.occurrenceId===id&&s.ready);
 const canManage=MANAGER_CAPS.some(cap);
 const tabs:Tab[]=['home','schedule',...(cap('view_materials')?['materials' as const]:[]),'me',...(canManage?['manage' as const]:[])];
 const swipe=useSwipeTabs(tabs,tab,setTab);
 const screen={data:data!,rows,today,published,busy,cap,post,joinable,joinGathering};
 const known=data?[...rows,...(data.upcoming||[]),...(data.ownHosting||[])]:[];
 const detailOccurrence=detail?known.find(o=>o.id===detail):undefined;
 return <div className="ui-page">
  <FrameControls left={{label:'Schedule',icon:'calendar',onClick:()=>setTab('schedule'),active:tab==='schedule',disabled:!data}} right={{label:'Me',icon:'user',onClick:()=>setTab('me'),active:tab==='me',disabled:!data}}
   more={[{label:'Overview',icon:'home',onClick:()=>setTab('home')},...(cap('view_materials')?[{label:'Materials',icon:'clipboard' as const,onClick:()=>setTab('materials')}]:[]),...(canManage?[{label:'Manage',icon:'people' as const,onClick:()=>setTab('manage')}]:[])]}/>
  <main className={'ui-main '+styles.main}>
   {data&&<nav className={'ui-tabs '+styles.topTabs} aria-label="Morning Prayer sections">
    {tabs.map(x=><button key={x} type="button" className="ui-tab" aria-current={tab===x?'page':undefined} onClick={()=>setTab(x)}>{TAB_LABELS[x]}</button>)}
   </nav>}
   {message&&<p className="ui-notice" role="status">{message}</p>}
   {error&&<section className={'ui-glass '+styles.state}>
    <EmptyState icon={<Sun/>} title="Morning Prayer is unavailable" action={<div className={styles.actions}>
     <button type="button" className="ui-button" onClick={()=>void loader()}>Try again</button>
     <a className="ui-button ui-button-secondary" href="/members">Back to your apps</a>
    </div>}><span role="alert">{error}</span></EmptyState>
   </section>}
   {!error&&!data&&<div className={'ui-glass '+styles.state}><EmptyState icon={<Sun/>} title="Loading" role="status">Loading your gathering schedule…</EmptyState></div>}
   {data&&<div className={styles.content} data-testid="wm-content" {...swipe}>
    {detail?<GatheringDetail {...screen} occurrence={detailOccurrence} backLabel={tab==='home'?'Overview':TAB_LABELS[tab]} onBack={()=>setDetail(null)}/>:<>
     {tab==='home'&&<HomeTab {...screen} month={month} myWeek={myWeek} onWeek={setMyWeek} onOpen={openGathering} onDay={openDay}
      onFullSchedule={()=>setTab('schedule')} onAddGathering={()=>{setManageArea('schedule');setTab('manage');}} onMaterials={()=>setTab('materials')}/>}
     {tab==='schedule'&&<ScheduleTab {...screen} month={month} day={day} view={scheduleView} onView={setScheduleView} onDay={setDay} onOpen={openGathering}
      onMonth={value=>setMonth(value)} onMine={()=>setTab('me')}/>}
     {tab==='materials'&&<MaterialsTab {...screen} onOpen={openGathering}/>}
     {tab==='me'&&<MeTab {...screen} onOpen={openGathering}/>}
     {tab==='manage'&&<ManageTab {...screen} canManage={canManage} area={manageArea} onArea={setManageArea}
      ownerAccess={ownerAccess} onOwnerAccess={setOwnerAccess} monthDraft={monthDraft} onMonthDraft={setMonthDraft} onMonth={setMonth} gathering={gatheringForm} material={materialForm}
      hostSelection={hostSelection} onHostSelection={setHostSelection} readingSelection={readingSelection} onReadingSelection={setReadingSelection}
      onReload={loader} onNotice={setMessage}/>}
    </>}
   </div>}
  </main>
 </div>;
}
/** Props every tab receives from the shell. `data` is always loaded when a tab renders. */
export type Screen={
 data:Workspace;rows:Occurrence[];today:string;published:NonNullable<Workspace['materials']>;busy:boolean;
 cap:(key:Capability)=>boolean;post:Post;joinable:(id:string)=>boolean;joinGathering:(id:string)=>Promise<void>;
};
