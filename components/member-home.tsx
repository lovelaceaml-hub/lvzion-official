'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {
 ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Bell,CalendarDays,Check,
 ChevronLeft,ChevronRight,Clock3,Grid2X2,House,Info,MapPin,
 Pencil,Pin,ShieldCheck,UsersRound,X
} from './home-icons';
import type {Workspace} from '../lib/contracts';
import ModuleIcon from './module-icon';
import {
 actionNotices,activitiesForPreview,addCalendarDays,canManage,
 cleanFavorites,conceptModules,formatDay,greeting,initials,localDay,localTime,monthCells,
 nowIndex,reorderFavorite,toggleFavorite,weekDays
} from '../lib/member-experience';
import type{MemberActivity,ModuleEntry}from'../lib/member-experience';
import type{ModuleFeed,ModuleNotice}from'../lib/app-runtime';
import {useSwipeTabs} from '../lib/use-swipe-tabs';
import './member-home.css';
import {FrameControls} from './app-frame';

type Props={
 workspace:Workspace;demo?:boolean;manageHref:string;experience?:ModuleFeed;
 onFavoriteUpdate?:(ids:string[],version:number)=>Promise<{favorites:string[];favoriteVersion:number}>;
 onModuleNoticeRead?:(noticeId:string)=>Promise<void>;
};
type Section='home'|'manage'|'notifications';
type Period='today'|'week'|'calendar';
const periods=['today','week','calendar'] as const;
const labels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function displayTime(time:string){
 const [h,m]=time.split(':').map(Number);return ((h+11)%12+1)+':'+String(m).padStart(2,'0')+(h>=12?' PM':' AM');
}
function clockParts(time:string){const [clock,half]=displayTime(time).split(' ');return {clock,half};}
function nextMonth(day:string,offset:number){
 const d=new Date(day.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);
 return d.toISOString().slice(0,10);
}
export default function MemberHome({workspace:w,demo=false,manageHref,experience,onFavoriteUpdate,onModuleNoticeRead}:Props){
 const[section,setSection]=useState<Section>('home');
 const[period,setPeriod]=useState<Period>('today');
 const[today,setToday]=useState('2026-10-13');
 const[now,setNow]=useState('');
 const[anchor,setAnchor]=useState('2026-10-13');
 const[selectedDay,setSelectedDay]=useState('2026-10-13');
 const[appsEditing,setAppsEditing]=useState(false);
 const[favorites,setFavorites]=useState<string[]>(demo?['concept-a','concept-b']:experience?.favorites??[]);
 const[favoriteVersion,setFavoriteVersion]=useState(experience?.favoriteVersion??0);
 const[favoritesSaving,setFavoritesSaving]=useState(false);
 const[favoritesMessage,setFavoritesMessage]=useState('');
 const[selectedEvent,setSelectedEvent]=useState<MemberActivity|null>(null);
 const[selectedApp,setSelectedApp]=useState<ModuleEntry|null>(null);
 const appSheet=useRef<HTMLDialogElement>(null);
 const activitySheet=useRef<HTMLDialogElement>(null);
 const moduleSheet=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const day=localDay();setToday(day);setAnchor(day);setSelectedDay(day);
  const tick=()=>setNow(localTime());tick();
  const timer=setInterval(tick,60000);return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{if(!demo){setFavorites(experience?.favorites??[]);setFavoriteVersion(experience?.favoriteVersion??0);}},[demo,experience?.favorites,experience?.favoriteVersion]);
 useEffect(()=>{if(selectedEvent&&!activitySheet.current?.open)activitySheet.current?.showModal();},[selectedEvent]);
 useEffect(()=>{if(selectedApp&&!moduleSheet.current?.open)moduleSheet.current?.showModal();},[selectedApp]);
 // Apps links from modules return here and open the same authorized app switcher.
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  if(params.get('apps')!=='1')return;
  appSheet.current?.showModal();
  window.history.replaceState(window.history.state,'',window.location.pathname+window.location.hash);
 },[]);
 const allActivities=useMemo(()=>demo?activitiesForPreview(today):experience?.activities??[],[demo,today,experience?.activities]);
 // Future module services MUST scope this list server-side; no unapproved module is live.
 const apps=useMemo(()=>demo?conceptModules():experience?.modules??[],[demo,experience?.modules]);
 const saved=cleanFavorites(favorites,apps);
 const favoriteApps=saved.map(x=>apps.find(a=>a.id===x)).filter((a):a is ModuleEntry=>Boolean(a));
 const moduleActions=(experience?.notifications??[]).filter(n=>n.requiresAction).map(n=>({
  id:'module-'+n.id,title:n.title,description:n.description,
  destination:'module' as const,source:'module' as const,route:n.route
 }));
 const notices=[...actionNotices(w),...moduleActions];
 const recentNotices=(experience?.notifications??[]).filter(n=>!n.requiresAction||n.readAt!==null);
 const userManages=canManage(w);
 const group=w.groups.find(g=>g.id===w.self.groupId)?.name??'Unassigned';
 const unit=w.units.find(u=>u.id===w.self.unitId)?.name??(w.self.groupId?'No unit':'Unassigned');
 const activities=allActivities.filter(e=>period==='today'?e.date===today:period==='week'?weekDays(anchor).includes(e.date):e.date===selectedDay)
  .sort((a,b)=>(a.date+'T'+a.startTime).localeCompare(b.date+'T'+b.startTime));
 const upcoming=allActivities.filter(a=>a.date>today).sort((a,b)=>(a.date+'T'+a.startTime).localeCompare(b.date+'T'+b.startTime));
 const next=upcoming[0]??null;
 const nowAt=period==='today'&&now?nowIndex(activities,now):-1;
 const periodTitle=period==='today'?'Today':period==='week'?'This week':'Calendar';
 const periodSubtitle=period==='today'?formatDay(today,{weekday:'long',month:'long',day:'numeric'}):
   period==='week'?(formatDay(weekDays(anchor)[0])+' to '+formatDay(weekDays(anchor)[6])):
   formatDay(anchor,{month:'long',year:'numeric'});
 const route=(tab:string)=>manageHref+'?tab='+tab;
 const firstName=w.self.firstName??w.self.name.split(' ')[0];
 function choosePeriod(key:Period){
  setPeriod(key);
  if(key==='calendar'){setAnchor(today);setSelectedDay(today);}
  if(key==='week')setAnchor(today);
 }
 const swipe=useSwipeTabs(periods,period,choosePeriod);
 function resetHome(){setSection('home');setPeriod('today');window.scrollTo({top:0,behavior:'instant'});}
 function closeActivity(){activitySheet.current?.close();setSelectedEvent(null);}
 function closeModule(){moduleSheet.current?.close();setSelectedApp(null);}
 function openApps(){appSheet.current?.showModal();}
 function openModule(module:ModuleEntry){appSheet.current?.close();
  if(!demo && module.status==='approved' && module.route?.startsWith('/modules/')){window.location.assign(module.route);return;}
  if(demo)setSelectedApp(module);
 }
 async function saveFavorites(nextIds:string[]){
  if(demo){setFavorites(nextIds);return;}
  if(!onFavoriteUpdate || favoritesSaving)return;
  setFavoritesSaving(true);setFavoritesMessage('');
  try{
   const response=await onFavoriteUpdate(nextIds,favoriteVersion);
   setFavorites(response.favorites);setFavoriteVersion(response.favoriteVersion);
   setFavoritesMessage('Favorites synced to your member account.');
  }catch{setFavoritesMessage('Favorites were not changed. Refresh the page and try again.');}
  finally{setFavoritesSaving(false);}
 }
 async function openNotice(notice:ModuleNotice){
  if(onModuleNoticeRead && notice.readAt===null)await onModuleNoticeRead(notice.id).catch(()=>{});
  window.location.assign(notice.route);
 }
 function switchSection(view:Section){setSection(view);window.scrollTo({top:0,behavior:'instant'});}
 function dateCell(date:string,inMonth:boolean){
  const hasActivity=allActivities.some(a=>a.date===date);
  return <button type="button" className={'lvz-day '+(inMonth?'':'lvz-outside ')+(selectedDay===date?'lvz-day-active ':'')+(date===today?'lvz-day-today':'')}
   key={date} aria-label={'Select '+formatDay(date,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
   aria-pressed={selectedDay===date} onClick={()=>setSelectedDay(date)}>
   <span>{Number(date.slice(-2))}</span>{hasActivity&&<i aria-hidden="true"/>}
  </button>;
 }
 function activityCard(e:MemberActivity,i:number){
  const t=clockParts(e.startTime);
  const past=period==='today'&&nowAt>i;
  return <li key={e.id}><button className={'lvz-activity'+(past?' lvz-past':'')} type="button" onClick={()=>setSelectedEvent(e)}>
   <span className="lvz-time-group"><span>{t.clock}</span><small>{period==='today'?t.half:formatDay(e.date,{weekday:'short'})+' '+t.half}</small></span>
   <span className="lvz-activity-line" aria-hidden="true"/>
   <span className="lvz-activity-body"><strong>{e.title}</strong><small>{e.context}</small></span>
   <ChevronRight size={17} aria-hidden="true"/>
  </button></li>;
 }
 function nowMark(){
  return <li className="lvz-now" key="now" aria-label={'Now, '+displayTime(now)}><span aria-hidden="true">{displayTime(now)}</span><i aria-hidden="true"/></li>;
 }
 const appIcon=(a:ModuleEntry,className:string)=><span className={className} aria-hidden="true"><ModuleIcon route={'route' in a?String(a.route):undefined}/></span>;
 return <div className="lvz-experience">
  <FrameControls name={w.self.name} profileHref={route('profile')} onHome={resetHome} onApps={openApps}
   left={{label:'Calendar',icon:'calendar',onClick:()=>{setSection('home');choosePeriod('calendar');},active:section==='home'&&period==='calendar'}}
   right={{label:'Notifications',icon:'bell',onClick:()=>switchSection('notifications'),active:section==='notifications'}}
   more={userManages?[{label:'Manage',icon:'people',onClick:()=>switchSection('manage')}]:[]}/>
  {demo&&<div className="lvz-demo-banner"><Info size={16}/><span>Fictional content only. No official activities or apps are connected.</span></div>}
  <main className="lvz-body">
  {section==='home'&&<div className="lvz-home-grid">
   <div className="lvz-home-main">
    <section className="lvz-hero">
     <p className="lvz-hero-date">{formatDay(today,{weekday:'long',month:'long',day:'numeric'})}</p>
     <h1>{greeting(now||'09:00')}, {firstName}.</h1>
     <p className="lvz-placement">{group} · {unit}</p>
    </section>
    {userManages&&<button type="button" className="lvz-home-mode" onClick={()=>switchSection('manage')}>
     <ShieldCheck size={19}/><span>Manage</span><small>{notices.length?notices.length+(notices.length===1?' item needs':' items need')+' your review':'Nothing waiting'}</small><ChevronRight size={17}/>
    </button>}
    <section className="lvz-feature-section" aria-labelledby="lvz-period-title" {...swipe}>
     <div className="lvz-period-tabs" role="group" aria-label="Activity time view">
      {([['today','Today'],['week','Week'],['calendar','Calendar']] as const).map(([key,label])=><button
       type="button" aria-pressed={period===key} key={key} onClick={()=>choosePeriod(key)}>{label}</button>)}
     </div>
     <div className="lvz-section-titleline"><h2 id="lvz-period-title">{periodTitle}</h2><span>{periodSubtitle}</span></div>
     {period==='week'&&<div className="lvz-date-controls"><button aria-label="Previous week" onClick={()=>setAnchor(addCalendarDays(anchor,-7))}><ChevronLeft/></button>
      <div className="lvz-week-strip">{weekDays(anchor).map(day=><button key={day}
       className={day===today?'lvz-is-today':''} onClick={()=>{setSelectedDay(day);setPeriod('calendar');setAnchor(day);}}
       aria-label={'Open '+formatDay(day,{weekday:'long',month:'long',day:'numeric'})}>
       <span>{formatDay(day,{weekday:'short'})}</span><strong>{Number(day.slice(-2))}</strong>
       {allActivities.some(e=>e.date===day)&&<i aria-hidden="true"/>}</button>)}</div>
      <button aria-label="Next week" onClick={()=>setAnchor(addCalendarDays(anchor,7))}><ChevronRight/></button></div>}
     {period==='calendar'&&<div className="lvz-month-box" data-no-swipe>
       <div className="lvz-month-nav"><button aria-label="Previous month" onClick={()=>setAnchor(nextMonth(anchor,-1))}><ChevronLeft size={19}/></button>
        <strong>{formatDay(anchor,{month:'long',year:'numeric'})}</strong>
        <button aria-label="Next month" onClick={()=>setAnchor(nextMonth(anchor,1))}><ChevronRight size={19}/></button></div>
       <div className="lvz-month-grid">{labels.map(day=><div className="lvz-weekday" key={day}>{day.slice(0,1)}</div>)}{monthCells(anchor).map(c=>dateCell(c.date,c.inMonth))}</div>
       <p className="lvz-selected-label">Selected: {formatDay(selectedDay,{weekday:'long',month:'long',day:'numeric'})}</p>
      </div>}
     {activities.length?<ol className="lvz-activity-list">
      {activities.flatMap((e,i)=>i===nowAt?[nowMark(),activityCard(e,i)]:[activityCard(e,i)])}
      {nowAt===activities.length&&nowMark()}
     </ol>:
     <div className="lvz-empty-activity"><strong>{demo?'No sample activities for this day':'Your schedule is not connected yet'}</strong>
      <p>{demo?'Choose another day to explore the calendar.':'When an official app is approved, your authorized activities will appear here.'}</p></div>}
     {period==='today'&&next&&<button type="button" className="lvz-next-card" onClick={()=>setSelectedEvent(next)}>
      <Clock3 size={18}/><span><small>Next, {formatDay(next.date,{weekday:'long',month:'short',day:'numeric'})} at {displayTime(next.startTime)}</small><strong>{next.title}</strong></span><ChevronRight size={17}/>
     </button>}
    </section>
   </div>
   <aside className="lvz-home-side">
    <section className="lvz-apps-section">
     <div className="lvz-section-heading"><h2>Your apps</h2><button className="lvz-text-button" onClick={openApps}>See all <ArrowRight size={16}/></button></div>
     {favoriteApps.length?<div className="lvz-favorite-grid">{favoriteApps.map(a=><button onClick={()=>openModule(a)} className="lvz-favorite-item" key={a.id}>
      {appIcon(a,'lvz-favorite-icon')}<span>{a.name}</span></button>)}</div>:
      <div className="lvz-empty-favorites"><strong>No apps pinned yet</strong><p>{apps.length?'Open See all and pin the apps you use most.':'Your approved apps will appear here.'}</p></div>}
     {demo&&<p className="lvz-hint">Favorites in this example are temporary and do not sync to an account.</p>}
    </section>
    <a className="lvz-community" href={route('people')} aria-label={'Open your group directory, '+group}>
     <span className="lvz-community-icon"><UsersRound size={20}/></span>
     <span><strong>{group}</strong><small>Names-only directory · {w.directory.length} visible members</small></span>
     <ChevronRight size={17}/>
    </a>
   </aside>
  </div>}
  {section==='manage'&&userManages&&<section className="lvz-management">
   <button className="lvz-back-link" onClick={resetHome}><ArrowLeft size={16}/> Home</button>
   <h1>What needs your attention.</h1>
   <p className="lvz-lede">Only responsibilities assigned to your organizational or department scope are shown.</p>
   <dl className="lvz-manage-summary">
    <div><dt>Members in your scope</dt><dd>{w.managedMembers.length}</dd></div>
    <div><dt>Items to review</dt><dd>{notices.length}</dd></div>
    <div><dt>Departments you manage</dt><dd>{w.departments.filter(d=>d.canManage).length}</dd></div>
   </dl>
   {notices.length?<ul className="lvz-manage-actions">{notices.map(n=><li className="lvz-manage-action" key={n.id}>
    <div><strong>{n.title}</strong><p>{n.description}</p></div><a href={route('manage')}>Review <ChevronRight size={16}/></a></li>)}</ul>:
    <p className="lvz-calm-status"><Check size={19}/><span>There are no pending items in this authorized view.</span></p>}
   <a href={route('manage')} className="lvz-primary-link"><ShieldCheck size={18}/> Open management tools <ArrowRight size={18}/></a>
   <p className="lvz-hint">Account verification, department changes, member transfers and appointments are managed in their authorized sections.</p>
  </section>}
  {section==='notifications'&&<section className="lvz-notifications">
    <h1>Notifications</h1>
    <p className="lvz-lede">Items here come only from your authorized views. Push notifications are not active.</p>
    <div className="lvz-section-heading"><h2>Needs action</h2>{notices.length>0&&<span className="lvz-count-label">{notices.length}</span>}</div>
    {notices.length?<div className="lvz-notice-list">{notices.map(n=><button key={n.id} onClick={()=>{if(n.source==='module' && n.route?.startsWith('/modules/'))window.location.assign(n.route);else if(userManages)switchSection('manage');}}>
      <span className="lvz-notice-icon"><Bell size={18}/></span><span><strong>{n.title}</strong><span>{n.description}</span><small>Open the authorized management screen</small></span><ChevronRight size={18}/></button>)}</div>:
     <div className="lvz-no-notices"><h3>All clear here</h3><p>No pending approvals or transfer decisions in this view.</p></div>}
    <div className="lvz-section-heading"><h2>Recent</h2></div>
     {recentNotices.length?<div className="lvz-notice-list">{recentNotices.map(n=><button key={n.id}
      onClick={()=>{void openNotice(n);}}><span className="lvz-notice-icon"><Bell size={18}/></span>
      <span><strong>{n.title}</strong><span>{n.description}</span><small>{n.readAt?'Read':'Unread update'}</small></span>
      <ChevronRight size={18}/></button>)}</div>:
      <p className="lvz-no-history">Individual app notifications are not connected. No notification history has been imported.</p>}
   </section>}
  </main>
  <dialog className="lvz-apps-dialog ui-sheet" ref={appSheet} onClose={()=>setAppsEditing(false)} aria-label="Applications">
   <div className="lvz-sheet-heading"><h2>Applications</h2>
    <button className="lvz-sheet-close" onClick={()=>appSheet.current?.close()} aria-label="Close applications"><X size={22}/></button></div>
   <p className="lvz-sheet-description">{demo?'These tiles are fictional navigation concepts, not approved official apps.':'Only apps assigned to your account appear here.'}</p>
   {apps.length?<><div className="lvz-apps-sheet-header"><h3>{demo?'Available in this concept':'Available to you'}</h3><button className="lvz-edit-link" onClick={()=>setAppsEditing(v=>!v)}><Pencil size={15}/>{appsEditing?'Done':'Edit favorites'}</button></div>
    <ul className="lvz-apps-list">{apps.map(a=>{
     const inFavorites=saved.includes(a.id);
     return <li className="lvz-apps-row" key={a.id}>
       <button className="lvz-app-row-main" onClick={()=>openModule(a)}>{appIcon(a,'lvz-app-row-icon')}<span><strong>{a.name}</strong><small>{demo?'Fictional concept':'Authorized module'}</small></span><ChevronRight size={18}/></button>
       <button className={'lvz-pin-button '+(inFavorites?'lvz-pin-on':'')} aria-label={(inFavorites?'Unpin ':'Pin ')+a.name} aria-pressed={inFavorites}
         disabled={favoritesSaving} onClick={()=>{void saveFavorites(toggleFavorite(favorites,a.id,apps));}}><Pin size={19}/></button>
      </li>;
    })}</ul>
    {appsEditing&&<div className="lvz-reorder-box"><h3>Reorder your favorites</h3><p>Pin up to eight. Use the arrows to change their order.</p>
      {favoriteApps.map((a,i)=><div key={a.id} className="lvz-reorder-row"><span>{i+1}. {a.name}</span><button disabled={i===0} aria-label={'Move '+a.name+' up'} onClick={()=>{void saveFavorites(reorderFavorite(favorites,a.id,-1,apps));}}><ArrowUp size={17}/></button><button disabled={i===favoriteApps.length-1} aria-label={'Move '+a.name+' down'} onClick={()=>{void saveFavorites(reorderFavorite(favorites,a.id,1,apps));}}><ArrowDown size={17}/></button></div>)}
     </div>}
   </>:<div className="lvz-no-apps"><strong>No apps assigned yet</strong><p>Apps appear here only after they are approved and assigned to your account.</p></div>}
    {favoritesMessage&&<p role="status" className="lvz-sheet-footnote">{favoritesMessage}</p>}
   <p className="lvz-sheet-footnote">{demo?'Favorites reset with the demo. No cross-device sync is claimed.':'Favorites sync between your signed-in devices.'}</p>
  </dialog>
  <dialog className="lvz-detail-dialog ui-sheet" ref={activitySheet} onClose={()=>setSelectedEvent(null)} aria-label="Activity details">
   {selectedEvent&&<><div className="lvz-sheet-heading"><div><p className="lvz-sheet-kicker">{selectedEvent.source==='fictional'?'Fictional activity':'Activity details'}</p><h2>{selectedEvent.title}</h2></div>
    <button className="lvz-sheet-close" onClick={closeActivity} aria-label="Close activity"><X size={22}/></button></div>
    <p className="lvz-detail-info"><CalendarDays size={19}/><span>{formatDay(selectedEvent.date,{weekday:'long',month:'long',day:'numeric'})}</span></p>
    <p className="lvz-detail-info"><Clock3 size={19}/><span>{displayTime(selectedEvent.startTime)} to {displayTime(selectedEvent.endTime)}</span></p>
    {selectedEvent.location&&<p className="lvz-detail-info"><MapPin size={19}/><span>{selectedEvent.location}</span></p>}
    <p className="lvz-detail-context">{selectedEvent.context}</p>
    {selectedEvent.source==='fictional'&&<p className="lvz-detail-warning"><Info size={18}/><span>Sample-only content. No real appointment, check-in, or connected application is represented.</span></p>}
    <button className="lvz-detail-done" onClick={closeActivity}>Done</button>
   </>}
  </dialog>
  <dialog className="lvz-detail-dialog ui-sheet" ref={moduleSheet} onClose={()=>setSelectedApp(null)} aria-label="App concept landing">
   {selectedApp&&<><div className="lvz-sheet-heading"><div><p className="lvz-sheet-kicker">App concept</p><h2>{selectedApp.name}</h2></div>
    <button className="lvz-sheet-close" onClick={closeModule} aria-label="Close module"><X size={22}/></button></div>
    {appIcon(selectedApp,'lvz-module-mark')}
    <p className="lvz-detail-context">{selectedApp.description}</p><p className="lvz-hint">No official app has been selected. This landing page has no account, data, or working app functions.</p>
    <button className="lvz-detail-done" onClick={closeModule}>Return to Home</button></>}
  </dialog>
 </div>;
}

