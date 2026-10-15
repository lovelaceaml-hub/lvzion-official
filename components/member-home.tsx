'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {
 ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Bell,CalendarDays,Check,
 ChevronLeft,ChevronRight,Clock3,Grid2X2,House,Info,MapPin,
 Pencil,Pin,ShieldCheck,UsersRound,X
} from './home-icons';
import type {Workspace} from '../lib/contracts';
import {
 actionNotices,activitiesForPreview,addCalendarDays,canManage,
 cleanFavorites,conceptModules,formatDay,initials,localDay,monthCells,
 reorderFavorite,toggleFavorite,weekDays
} from '../lib/member-experience';
import type{MemberActivity,ModuleEntry}from'../lib/member-experience';
import type{ModuleFeed,ModuleNotice}from'../lib/app-runtime';
import './member-home.css';

type Props={
 workspace:Workspace;demo?:boolean;manageHref:string;experience?:ModuleFeed;
 onFavoriteUpdate?:(ids:string[],version:number)=>Promise<{favorites:string[];favoriteVersion:number}>;
 onModuleNoticeRead?:(noticeId:string)=>Promise<void>;
};
type Section='home'|'manage'|'notifications';
type Period='today'|'week'|'calendar';
const labels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
function displayTime(time:string){
 const [h,m]=time.split(':').map(Number);return ((h+11)%12+1)+':'+String(m).padStart(2,'0')+(h>=12?' PM':' AM');
}
function nextMonth(day:string,offset:number){
 const d=new Date(day.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);
 return d.toISOString().slice(0,10);
}
export default function MemberHome({workspace:w,demo=false,manageHref,experience,onFavoriteUpdate,onModuleNoticeRead}:Props){
 const[section,setSection]=useState<Section>('home');
 const[period,setPeriod]=useState<Period>('today');
 const[today,setToday]=useState('2026-10-13');
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
 useEffect(()=>{const day=localDay();setToday(day);setAnchor(day);setSelectedDay(day);},[]);
 useEffect(()=>{if(!demo){setFavorites(experience?.favorites??[]);setFavoriteVersion(experience?.favoriteVersion??0);}},[demo,experience?.favorites,experience?.favoriteVersion]);
 useEffect(()=>{if(selectedEvent&&!activitySheet.current?.open)activitySheet.current?.showModal();},[selectedEvent]);
 useEffect(()=>{if(selectedApp&&!moduleSheet.current?.open)moduleSheet.current?.showModal();},[selectedApp]);
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
 const unit=w.units.find(u=>u.id===w.self.unitId)?.name??'Unassigned';
 const activities=allActivities.filter(e=>period==='today'?e.date===today:period==='week'?weekDays(anchor).includes(e.date):e.date===selectedDay)
  .sort((a,b)=>(a.date+'T'+a.startTime).localeCompare(b.date+'T'+b.startTime));
 const upcoming=allActivities.filter(a=>a.date>=today).sort((a,b)=>(a.date+'T'+a.startTime).localeCompare(b.date+'T'+b.startTime));
 const next=upcoming[0]??null;
 const periodTitle=period==='today'?'Today':period==='week'?'This week':'Calendar';
 const periodSubtitle=period==='today'?formatDay(today,{weekday:'long',month:'long',day:'numeric'}):
   period==='week'?(formatDay(weekDays(anchor)[0])+' – '+formatDay(weekDays(anchor)[6])):
   formatDay(anchor,{month:'long',year:'numeric'});
 const route=(tab:string)=>manageHref+'?tab='+tab;
 function resetHome(){setSection('home');setPeriod('today');}
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
 function activityCard(e:MemberActivity){
  return <button className="lvz-activity" type="button" key={e.id} onClick={()=>setSelectedEvent(e)}>
   <span className="lvz-time-group"><span>{displayTime(e.startTime)}</span><small>{formatDay(e.date,{weekday:'short'})}</small></span>
   <span className="lvz-activity-line" aria-hidden="true"/>
   <span className="lvz-activity-body"><strong>{e.title}</strong><small>{e.context}</small></span>
   <ChevronRight size={17} aria-hidden="true"/>
  </button>;
 }
 return <div className="lvz-experience">
  <header className="lvz-experience-header">
   <button className="lvz-wordmark" type="button" onClick={resetHome} aria-label="LV Zion home">LV<span className="lvz-wordmark-gap">ZION</span><small>OFFICIAL</small></button>
   <div className="lvz-header-right"><span className="lvz-private-label">{demo?'INTERACTIVE CONCEPT':'MEMBER SPACE'}</span>
    <a href={route('profile')} className="lvz-user-avatar" aria-label="My profile">{initials(w.self.name)}</a>
   </div>
  </header>
  {demo&&<div className="lvz-demo-banner"><Info size={14}/><span>Fictional content only. No official activities or apps are connected.</span></div>}
  <main className="lvz-body">
  {section==='home'&&<>
   <section className="lvz-hero">
    <p className="lvz-eyebrow">YOUR PERSONAL HOME</p>
    <h1>Welcome back,<br/><em>{w.self.firstName??w.self.name.split(' ')[0]}.</em></h1>
    <div className="lvz-placement"><span>{group}</span><span aria-hidden="true">·</span><span>{unit}</span></div>
    <div className="lvz-hero-decor" aria-hidden="true"><span/><span/><span/></div>
   </section>
   {userManages&&<nav className="lvz-home-mode" aria-label="Home mode">
    <button className="lvz-home-mode-selected" aria-current="page">My Week</button>
    <button onClick={()=>switchSection('manage')}>Manage {notices.length>0&&<b className="lvz-small-count">{notices.length}</b>}</button>
   </nav>}
   <section className="lvz-feature-section">
    <div className="lvz-section-top"><span className="lvz-eyebrow">MY WEEK</span><span className="lvz-section-note">{demo?'SAMPLE ACTIVITIES':'MODULES NOT CONNECTED'}</span></div>
    <h2>Keep everything<br/><em>in view.</em></h2>
    <div className="lvz-period-tabs" role="group" aria-label="Activity time view">
     {([['today','Today'],['week','Week'],['calendar','Calendar']] as const).map(([key,label])=><button
      type="button" aria-pressed={period===key} className={period===key?'lvz-selected':''}
      onClick={()=>{setPeriod(key);if(key==='calendar'){setAnchor(today);setSelectedDay(today);}if(key==='week')setAnchor(today);}}
      key={key}>{key==='calendar'&&<CalendarDays size={15}/>} {label}</button>)}
    </div>
    <div className="lvz-section-titleline"><h3>{periodTitle}</h3><span>{periodSubtitle}</span></div>
    {period==='week'&&<div className="lvz-date-controls"><button aria-label="Previous week" onClick={()=>setAnchor(addCalendarDays(anchor,-7))}><ChevronLeft/></button>
     <div className="lvz-week-strip">{weekDays(anchor).map(day=><button key={day}
      className={day===today?'lvz-is-today':''} onClick={()=>{setSelectedDay(day);setPeriod('calendar');setAnchor(day);}}>
      <span>{formatDay(day,{weekday:'short'})}</span><strong>{Number(day.slice(-2))}</strong>
      {allActivities.some(e=>e.date===day)&&<i aria-hidden="true"/>}</button>)}</div>
     <button aria-label="Next week" onClick={()=>setAnchor(addCalendarDays(anchor,7))}><ChevronRight/></button></div>}
    {period==='calendar'&&<div className="lvz-month-box">
      <div className="lvz-month-nav"><button aria-label="Previous month" onClick={()=>setAnchor(nextMonth(anchor,-1))}><ChevronLeft size={19}/></button>
       <strong>{formatDay(anchor,{month:'long',year:'numeric'})}</strong>
       <button aria-label="Next month" onClick={()=>setAnchor(nextMonth(anchor,1))}><ChevronRight size={19}/></button></div>
      <div className="lvz-month-grid">{labels.map(day=><div className="lvz-weekday" key={day}>{day.slice(0,1)}</div>)}{monthCells(anchor).map(c=>dateCell(c.date,c.inMonth))}</div>
      <p className="lvz-selected-label">Selected: {formatDay(selectedDay,{weekday:'long',month:'long',day:'numeric'})}</p>
     </div>}
    <div className="lvz-activity-list">
     {activities.length?activities.map(activityCard):
     <div className="lvz-empty-activity"><CalendarDays size={24}/><strong>{demo?'No sample activities for this day':'Your schedule is not connected yet'}</strong>
     <p>{demo?'Select another date to explore the calendar interaction.':'When an official app is approved, authorized activities will appear here.'}</p></div>}
    </div>
   </section>
   <section className="lvz-next-section">
    <div className="lvz-section-top"><span className="lvz-eyebrow">UP NEXT</span><span className="lvz-section-note">{demo?'EXAMPLE ONLY':'PENDING MODULES'}</span></div>
    {next?<button className="lvz-next-card" onClick={()=>setSelectedEvent(next)}>
      <div className="lvz-next-icon"><Clock3 size={25}/></div><span className="lvz-next-content">
       <small>{formatDay(next.date,{weekday:'long',month:'short',day:'numeric'})} · {displayTime(next.startTime)}</small>
       <strong>{next.title}</strong><span>{next.context}</span></span><ArrowRight size={20}/></button>:
     <div className="lvz-next-card lvz-next-empty"><CalendarDays/><div><strong>No connected activities</strong><p>Approved modules will populate this space.</p></div></div>}
   </section>
   <section className="lvz-apps-section">
    <div className="lvz-section-heading"><div><span className="lvz-eyebrow">MY SPACE</span><h2>Favorite apps</h2></div><button className="lvz-text-button" onClick={openApps}>See all <ArrowRight size={16}/></button></div>
    {favoriteApps.length?<div className="lvz-favorite-grid">{favoriteApps.map(a=><button onClick={()=>openModule(a)} className="lvz-favorite-item" key={a.id}>
     <span className="lvz-favorite-icon" style={{backgroundColor:a.accent}}>{a.shortName}</span><span>{a.name}</span></button>)}</div>:
     <div className="lvz-empty-favorites"><Grid2X2 size={22}/><div><strong>No apps connected yet</strong><p>Your approved applications and favorites will appear here.</p></div></div>}
    {demo&&<p className="lvz-hint">Favorites in this interactive concept are temporary. They do not sync to an account.</p>}
   </section>
   <section className="lvz-community">
    <div><span className="lvz-eyebrow">YOUR COMMUNITY</span><h2>{group}</h2><p>Names-only directory · {w.directory.length} visible members</p></div>
    <a href={route('people')} aria-label="Open your group directory"><UsersRound size={22}/><ArrowRight size={16}/></a>
   </section>
  </>}
  {section==='manage'&&userManages&&<section className="lvz-management">
   <button className="lvz-back-link" onClick={resetHome}><ArrowLeft size={16}/> My Week</button>
   <p className="lvz-eyebrow">MANAGE</p><h1>What needs<br/><em>your attention.</em></h1>
   <p>Only responsibilities assigned to your organizational or department scope are shown.</p>
   <div className="lvz-manage-summary">
    <div><strong>{w.managedMembers.length}</strong><span>Members in your authorized scope</span></div>
    <div><strong>{notices.length}</strong><span>Items needing review</span></div>
    <div><strong>{w.departments.filter(d=>d.canManage).length}</strong><span>Departments you manage</span></div>
   </div>
   {notices.length?<div className="lvz-manage-actions">{notices.map(n=><div className="lvz-manage-action" key={n.id}>
    <div><strong>{n.title}</strong><p>{n.description}</p></div><a href={route('manage')}>Review <ChevronRight size={16}/></a></div>)}</div>:
    <div className="lvz-calm-status"><Check size={19}/><span>There are no pending items in this authorized view.</span></div>}
   <a href={route('manage')} className="lvz-primary-link"><ShieldCheck size={18}/> Open management tools <ArrowRight size={18}/></a>
   <p className="lvz-hint">Account verification, departmental changes, member transfers, and appointments are managed in their authorized sections.</p>
  </section>}
  {section==='notifications'&&<section className="lvz-notifications">
    <p className="lvz-eyebrow">INBOX</p><h1>Notifications<span className="lvz-notice-dot">.</span></h1>
    <p className="lvz-notice-intro">Items here come only from your authorized management view. Push notifications are not active.</p>
    <div className="lvz-section-heading"><h2>Needs action</h2><span className="lvz-count-label">{notices.length}</span></div>
    {notices.length?<div className="lvz-notice-list">{notices.map(n=><button key={n.id} onClick={()=>{if(n.source==='module' && n.route?.startsWith('/modules/'))window.location.assign(n.route);else if(userManages)switchSection('manage');}}>
      <div className="lvz-notice-icon"><Bell size={18}/></div><div><strong>{n.title}</strong><p>{n.description}</p><small>Open the authorized management screen</small></div><ChevronRight size={18}/></button>)}</div>:
     <div className="lvz-no-notices"><Check size={24}/><h3>All clear here</h3><p>No pending approvals or transfer decisions in this view.</p></div>}
    <div className="lvz-section-heading lvz-recent-heading"><h2>Recent</h2></div>
     {recentNotices.length?<div className="lvz-notice-list">{recentNotices.map(n=><button key={n.id}
      onClick={()=>{void openNotice(n);}}><div className="lvz-notice-icon"><Bell size={18}/></div>
      <div><strong>{n.title}</strong><p>{n.description}</p><small>{n.readAt?'Read':'Unread update'}</small></div>
      <ChevronRight size={18}/></button>)}</div>:
      <div className="lvz-no-history"><Info size={21}/><p>Individual app notifications are not connected. No notification history has been imported.</p></div>}
   </section>}
  </main>
  <nav className="lvz-bottom-nav" aria-label="Main navigation">
   <button type="button" className={section==='home'?'lvz-nav-active':''} onClick={resetHome} aria-label="Home" aria-current={section==='home'?'page':undefined}><House size={21}/><span>Home</span></button>
   <button type="button" className="lvz-apps-trigger" onClick={openApps} aria-label="Open apps"><Grid2X2 size={24}/><span>Apps</span></button>
   <button type="button" className={section==='notifications'?'lvz-nav-active':''} onClick={()=>switchSection('notifications')} aria-label="Notifications" aria-current={section==='notifications'?'page':undefined}>
    <span className="lvz-bell-wrapper"><Bell size={21}/>{notices.length>0&&<i/>}</span><span>Notifications</span></button>
  </nav>
  <dialog className="lvz-apps-dialog" ref={appSheet} onClose={()=>setAppsEditing(false)} aria-label="Applications">
   <div className="lvz-sheet-heading"><div><span className="lvz-eyebrow">SWITCHER</span><h2>Applications</h2></div>
    <button className="lvz-sheet-close" onClick={()=>appSheet.current?.close()} aria-label="Close applications"><X size={22}/></button></div>
   <p className="lvz-sheet-description">{demo?'These tiles are fictional navigation concepts, not approved official apps.':'Official applications have not been selected or assigned yet.'}</p>
   {apps.length?<><div className="lvz-apps-sheet-header"><h3>{demo?'Available in this concept':'Available to you'}</h3><button className="lvz-edit-link" onClick={()=>setAppsEditing(v=>!v)}><Pencil size={15}/>{appsEditing?'Done':'Edit favorites'}</button></div>
    <div className="lvz-apps-list">{apps.map(a=>{
     const inFavorites=saved.includes(a.id);
     return <div className="lvz-apps-row" key={a.id}>
       <button className="lvz-app-row-main" onClick={()=>openModule(a)}><span className="lvz-app-row-icon" style={{backgroundColor:a.accent}}>{a.shortName}</span><span><strong>{a.name}</strong><small>{demo?'Fictional concept':'Authorized module'}</small></span><ChevronRight size={18}/></button>
       <button className={'lvz-pin-button '+(inFavorites?'lvz-pin-on':'')} aria-label={(inFavorites?'Unpin ':'Pin ')+a.name} aria-pressed={inFavorites}
         disabled={favoritesSaving} onClick={()=>{void saveFavorites(toggleFavorite(favorites,a.id,apps));}}><Pin size={19}/></button>
      </div>;
    })}</div>
    {appsEditing&&<div className="lvz-reorder-box"><h3>Reorder your favorites</h3><p>Pin up to eight concepts. Use the arrows to change their order.</p>
      {favoriteApps.map((a,i)=><div key={a.id} className="lvz-reorder-row"><span>{i+1}. {a.name}</span><button disabled={i===0} aria-label={'Move '+a.name+' up'} onClick={()=>{void saveFavorites(reorderFavorite(favorites,a.id,-1,apps));}}><ArrowUp size={17}/></button><button disabled={i===favoriteApps.length-1} aria-label={'Move '+a.name+' down'} onClick={()=>{void saveFavorites(reorderFavorite(favorites,a.id,1,apps));}}><ArrowDown size={17}/></button></div>)}
     </div>}
   </>:<div className="lvz-no-apps"><Grid2X2 size={30}/><strong>No applications published</strong><p>Modules will be shown only after they are officially approved and authorized.</p></div>}
    {favoritesMessage&&<p role="status" className="lvz-sheet-footnote">{favoritesMessage}</p>}
   <p className="lvz-sheet-footnote">{demo?'Favorites reset with the demo. No cross-device sync is claimed.':'Only explicitly authorized modules appear. Favorites synchronize between your signed-in devices.'}</p>
  </dialog>
  <dialog className="lvz-detail-dialog" ref={activitySheet} onClose={()=>setSelectedEvent(null)} aria-label="Activity details">
   {selectedEvent&&<><div className="lvz-sheet-heading"><div><span className="lvz-eyebrow">{selectedEvent.source==='fictional'?'FICTIONAL ACTIVITY':'ACTIVITY DETAILS'}</span><h2>{selectedEvent.title}</h2></div>
    <button className="lvz-sheet-close" onClick={closeActivity} aria-label="Close activity"><X size={22}/></button></div>
    <div className="lvz-detail-info"><CalendarDays size={19}/><span>{formatDay(selectedEvent.date,{weekday:'long',month:'long',day:'numeric'})}</span></div>
    <div className="lvz-detail-info"><Clock3 size={19}/><span>{displayTime(selectedEvent.startTime)} – {displayTime(selectedEvent.endTime)}</span></div>
    {selectedEvent.location&&<div className="lvz-detail-info"><MapPin size={19}/><span>{selectedEvent.location}</span></div>}
    <p className="lvz-detail-context">{selectedEvent.context}</p>
    <div className="lvz-detail-warning"><Info size={18}/><span>Sample-only content. No real appointment, check-in, or connected application is represented.</span></div>
    <button className="lvz-detail-done" onClick={closeActivity}>Done</button>
   </>}
  </dialog>
  <dialog className="lvz-detail-dialog" ref={moduleSheet} onClose={()=>setSelectedApp(null)} aria-label="App concept landing">
   {selectedApp&&<><div className="lvz-sheet-heading"><div><span className="lvz-eyebrow">APP LANDING CONCEPT</span><h2>{selectedApp.name}</h2></div>
    <button className="lvz-sheet-close" onClick={closeModule} aria-label="Close module"><X size={22}/></button></div>
    <div className="lvz-module-mark" style={{backgroundColor:selectedApp.accent}}>{selectedApp.shortName}</div>
    <p>{selectedApp.description}</p><p className="lvz-hint">No official app has been selected. This landing page has no account, data, or working app functions.</p>
    <button className="lvz-detail-done" onClick={closeModule}>Return to My Week</button></>}
  </dialog>
 </div>;
}
