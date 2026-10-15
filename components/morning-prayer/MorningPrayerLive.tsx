'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {vegasToday} from '../../lib/morning-prayer/time';
import styles from './morning-prayer.module.css';
import {postJSON,requestJSON} from './shared';
import type {Capability,ManageArea,Occurrence,Workspace} from './shared';
import HomeTab from './HomeTab';
import ScheduleTab from './ScheduleTab';
import MeTab from './MeTab';
import ManageTab,{useGatheringForm,useMaterialForm} from './ManageTab';
type Tab='home'|'schedule'|'me'|'manage';
const TAB_LABELS:Record<Tab,string>={home:'Home',schedule:'Schedule',me:'Me',manage:'Manage'};
const MANAGER_CAPS:Capability[]=['review_requests','manage_schedule','edit_materials','publish_materials'];
/** Posts one action. Single new dates go to the batch endpoint; setup actions to setup; everything else to command. */
export type Post=(action:Record<string,unknown>,setup?:boolean)=>Promise<boolean>;
export default function MorningPrayerLive(){
 const readSequence=useRef(0),readController=useRef<AbortController|null>(null);
 const [tab,setTab]=useState<Tab>('home');
 const [month,setMonth]=useState(()=>vegasToday().slice(0,7)),[monthDraft,setMonthDraft]=useState(()=>vegasToday().slice(0,7));
 const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [busy,setBusy]=useState(false),[focus,setFocus]=useState<string|null>(null);
 const [manageArea,setManageArea]=useState<ManageArea>('schedule'),[ownerAccess,setOwnerAccess]=useState(false);
 const [hostSelection,setHostSelection]=useState(''),[readingSelection,setReadingSelection]=useState(''),[myWeek,setMyWeek]=useState(1);
 const gatheringForm=useGatheringForm(),materialForm=useMaterialForm();
 const cap=(key:Capability)=>!!data?.capabilities?.includes(key);
 useEffect(()=>{setMonthDraft(month);},[month]);

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
 function openDate(o:Occurrence){setFocus(o.id);setMonth(o.date.slice(0,7));setTab('schedule');}

 const today=vegasToday();
 const rows=[...(data?.occurrences||[])].sort((a,b)=>a.date.localeCompare(b.date));
 const published=data?.materials||[];
 const joinable=(id:string)=>cap('join_gathering')&&!!data?.meetingStates?.some(s=>s.occurrenceId===id&&s.ready);
 const canManage=MANAGER_CAPS.some(cap);
 const tabs:Tab[]=['home','schedule','me',...(canManage?['manage' as const]:[])];
 const screen={data:data!,rows,today,published,busy,cap,post,joinable,joinGathering};
 return <main className={styles.root}>
  <div className={styles.shell}>
   <header className={styles.header}><Link href="/members">‹ LV Zion Official</Link><span className={styles.brand}>Work Mission</span></header>
   <div className={styles.titleRow}><div><p className={styles.overline}>Las Vegas Zion</p><h1>Morning Prayer</h1></div><div className={styles.logo}>WM</div></div>
   {message&&<p className={styles.message} role="status">{message}</p>}
   {error&&<section className={styles.empty}>
    <h2>Access or service unavailable</h2><p role="alert">{error}</p>
    <button className={styles.secondary} onClick={()=>void loader()}>Try again</button>
    <p><Link href="/members">Back to My Week</Link></p>
   </section>}
   {!error&&!data&&<p role="status">Loading your authorized gathering schedule…</p>}
   {data&&<>
    {tab==='home'&&<HomeTab {...screen} month={month} myWeek={myWeek} onWeek={setMyWeek} onOpen={openDate}
     onFullSchedule={()=>setTab('schedule')} onAddGathering={()=>{setManageArea('schedule');setTab('manage');}}/>}
    {tab==='schedule'&&<ScheduleTab {...screen} month={month} focus={focus} onFocus={setFocus}
     onMonth={value=>{setMonth(value);setFocus(null);}}/>}
    {tab==='me'&&<MeTab {...screen}/>}
    {tab==='manage'&&<ManageTab {...screen} canManage={canManage} area={manageArea} onArea={setManageArea}
     ownerAccess={ownerAccess} onOwnerAccess={setOwnerAccess} monthDraft={monthDraft} onMonthDraft={setMonthDraft} onMonth={setMonth} gathering={gatheringForm} material={materialForm}
     hostSelection={hostSelection} onHostSelection={setHostSelection} readingSelection={readingSelection} onReadingSelection={setReadingSelection}
     onReload={loader} onNotice={setMessage}/>}
   </>}
   <footer className={styles.footer}>Las Vegas Zion · Work Mission</footer>
  </div>
  <nav className={styles.nav} aria-label="Morning Prayer navigation">
   {tabs.map(x=><button key={x} aria-current={tab===x?'page':undefined} onClick={()=>setTab(x)}>{TAB_LABELS[x]}</button>)}
  </nav>
 </main>;
}
/** Props every tab receives from the shell. `data` is always loaded when a tab renders. */
export type Screen={
 data:Workspace;rows:Occurrence[];today:string;published:NonNullable<Workspace['materials']>;busy:boolean;
 cap:(key:Capability)=>boolean;post:Post;joinable:(id:string)=>boolean;joinGathering:(id:string)=>Promise<void>;
};
