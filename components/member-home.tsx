'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {
 ArrowDown,ArrowRight,ArrowUp,Bell,CalendarDays,Check,
 ChevronLeft,ChevronRight,Clock3,Grid2X2,Info,MapPin,
 Pencil,Pin,ShieldCheck,Sun,UsersRound,X
} from './home-icons';
import type {Workspace} from '../lib/contracts';
import ModuleIcon from './module-icon';
import {
 actionNotices,activitiesForPreview,addCalendarDays,canManage,
 cleanFavorites,conceptModules,formatDay,greeting,localDay,localTime,monthCells,
 nowIndex,reorderFavorite,toggleFavorite,weekDays
} from '../lib/member-experience';
import type{MemberActivity,ModuleEntry}from'../lib/member-experience';
import type{ModuleFeed,ModuleNotice}from'../lib/app-runtime';
import {useSwipeTabs} from '../lib/use-swipe-tabs';
import {DateStrip,EmptyState,Hero,IconBox,PageHeading,Row,SearchField,SectionHeader,Segmented,StatGrid,StatTile,Tag,TextAction} from './ui-kit';
import './app-switcher.css';
import './member-home.css';
import {FrameControls} from './app-frame';

type Props={
 workspace:Workspace;demo?:boolean;manageHref:string;experience?:ModuleFeed;
 onFavoriteUpdate?:(ids:string[],version:number)=>Promise<{favorites:string[];favoriteVersion:number}>;
 onModuleNoticeRead?:(noticeId:string)=>Promise<void>;
};
type Section='home'|'manage'|'notifications';
type Period='today'|'week'|'calendar';
type NoticeFilter='all'|'unread'|'action';
type AppsView='all'|'favorites';
const periods=['today','week','calendar'] as const;
const labels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const byStart=(a:MemberActivity,b:MemberActivity)=>(a.date+'T'+a.startTime).localeCompare(b.date+'T'+b.startTime);
function displayTime(time:string){
 const [h,m]=time.split(':').map(Number);return ((h+11)%12+1)+':'+String(m).padStart(2,'0')+(h>=12?' PM':' AM');
}
function clockParts(time:string){const [clock,half]=displayTime(time).split(' ');return {clock,half};}
function nextMonth(day:string,offset:number){
 const d=new Date(day.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);
 return d.toISOString().slice(0,10);
}
const longDay=(day:string)=>formatDay(day,{weekday:'long',month:'long',day:'numeric'});
const plural=(n:number,one:string,many:string)=>n+' '+(n===1?one:many);

export default function MemberHome({workspace:w,demo=false,manageHref,experience,onFavoriteUpdate,onModuleNoticeRead}:Props){
 const[section,setSection]=useState<Section>('home');
 const[period,setPeriod]=useState<Period>('today');
 const[today,setToday]=useState('2026-10-13');
 const[now,setNow]=useState('');
 const[anchor,setAnchor]=useState('2026-10-13');
 const[selectedDay,setSelectedDay]=useState('2026-10-13');
 const[noticeFilter,setNoticeFilter]=useState<NoticeFilter>('all');
 const[appsView,setAppsView]=useState<AppsView>('all');
 const[appQuery,setAppQuery]=useState('');
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
 const weekStrip=useRef<HTMLDivElement>(null);
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
 const allActivities=useMemo(()=>(demo?activitiesForPreview(today):experience?.activities??[]).slice().sort(byStart),[demo,today,experience?.activities]);
 // Future module services MUST scope this list server-side; no unapproved module is live.
 const apps=useMemo(()=>demo?conceptModules():experience?.modules??[],[demo,experience?.modules]);
 const saved=cleanFavorites(favorites,apps);
 const favoriteApps=saved.map(x=>apps.find(a=>a.id===x)).filter((a):a is ModuleEntry=>Boolean(a));
 // Quick access shows the member's pinned apps, or their first authorized apps until they pin some.
 const quickApps=favoriteApps.length?favoriteApps:apps.slice(0,4);
 const moduleActions=(experience?.notifications??[]).filter(n=>n.requiresAction).map(n=>({
  id:'module-'+n.id,title:n.title,description:n.description,
  destination:'module' as const,source:'module' as const,route:n.route
 }));
 const notices=[...actionNotices(w),...moduleActions];
 const recentNotices=(experience?.notifications??[]).filter(n=>!n.requiresAction||n.readAt!==null);
 const userManages=canManage(w);
 const group=w.groups.find(g=>g.id===w.self.groupId)?.name??'Unassigned';
 const unit=w.units.find(u=>u.id===w.self.unitId)?.name??(w.self.groupId?'No unit':'Unassigned');
 const listDay=period==='today'?today:selectedDay;
 const activities=allActivities.filter(e=>e.date===listDay);
 const nowAt=listDay===today&&now?nowIndex(activities,now):-1;
 // The next activity: one still running today, or the first one after it.
 const next=allActivities.find(a=>a.date>today||(a.date===today&&(!now||a.endTime>now)))??null;
 const week=weekDays(anchor);
 const weekRest=allActivities.filter(a=>week.includes(a.date)&&a.date!==selectedDay).length;
 const route=(tab:string)=>manageHref+'?tab='+tab;
 const firstName=w.self.firstName??w.self.name.split(' ')[0];
 function choosePeriod(key:Period){
  setPeriod(key);
  if(key!=='today'){setAnchor(today);setSelectedDay(today);}
 }
 const swipe=useSwipeTabs(periods,period,choosePeriod);
 // Keep the selected day chip in view when the strip scrolls on narrow phones.
 useEffect(()=>{
  const strip=weekStrip.current?.querySelector<HTMLElement>('.ui-daystrip');
  const chip=strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
  if(strip&&chip)strip.scrollLeft=chip.offsetLeft-strip.offsetLeft-(strip.clientWidth-chip.offsetWidth)/2;
 },[period,selectedDay,anchor]);
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
 function moveWeek(offset:number){setAnchor(addCalendarDays(anchor,offset));setSelectedDay(addCalendarDays(selectedDay,offset));}
 function dateCell(date:string,inMonth:boolean){
  const hasActivity=allActivities.some(a=>a.date===date);
  return <button type="button" className={'lvz-day '+(inMonth?'':'lvz-outside ')+(selectedDay===date?'lvz-day-active ':'')+(date===today?'lvz-day-today':'')}
   key={date} aria-label={'Select '+formatDay(date,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
   aria-pressed={selectedDay===date} onClick={()=>setSelectedDay(date)}>
   <span>{Number(date.slice(-2))}</span>{hasActivity&&<i aria-hidden="true"/>}
  </button>;
 }
 function activityRow(e:MemberActivity,i:number){
  const t=clockParts(e.startTime);
  const past=nowAt>i;
  return <li key={e.id}><button className={'ui-timeline-row lvz-activity'+(past?' lvz-past':'')} type="button" onClick={()=>setSelectedEvent(e)}>
   <span className="ui-timeline-time lvz-time-group"><span>{t.clock}</span><small>{t.half}</small></span>
   <span className="ui-timeline-mark" aria-hidden="true"/>
   <span className="ui-timeline-body lvz-activity-body"><strong>{e.title}</strong><small>{e.context}{e.location?' · '+e.location:''}</small>
    {e.source==='fictional'&&<span><Tag>Fictional example</Tag></span>}</span>
   <ChevronRight size={18} aria-hidden="true"/>
  </button></li>;
 }
 function nowMark(){
  return <li className="lvz-now" key="now" aria-label={'Now, '+displayTime(now)}><span aria-hidden="true">{displayTime(now)}</span><i aria-hidden="true"/></li>;
 }
 function agenda(empty:{title:string;text:string}){
  return <div className="ui-glass lvz-agenda">
   {activities.length?<ol className="ui-timeline lvz-activity-list">
    {activities.flatMap((e,i)=>i===nowAt?[nowMark(),activityRow(e,i)]:[activityRow(e,i)])}
    {nowAt===activities.length&&nowMark()}
   </ol>:<EmptyState icon={<CalendarDays/>} title={empty.title}>{empty.text}</EmptyState>}
  </div>;
 }
 const emptyDay=(day:string)=>demo?{title:'No sample activities for this day',text:'Choose another day to explore the calendar.'}
  :{title:day===today?'Nothing scheduled today':'Nothing scheduled',text:'Activities from your approved apps appear here when they are scheduled for you.'};
 const backToToday=selectedDay!==today?<TextAction label="Back to today" onClick={()=>{setSelectedDay(today);setAnchor(today);}}>Today</TextAction>:undefined;
 function hero(){
  if(!next)return <Hero className="lvz-next" titleId="lvz-next-title" tag="Your schedule" title="Nothing scheduled yet."
   detail={demo?'No sample activities are planned.':'When an approved app schedules something for you, it appears here.'}
   art={<Sun/>} action={apps.length?<button type="button" className="ui-hero-action" onClick={openApps}>Browse your apps <ArrowRight size={18}/></button>:undefined}/>;
  const running=next.date===today&&now!==''&&next.startTime<=now;
  const when=next.date===today?'Today':next.date===addCalendarDays(today,1)?'Tomorrow':formatDay(next.date,{weekday:'long',month:'short',day:'numeric'});
  return <Hero className="lvz-next" titleId="lvz-next-title" tag={running?'Happening now':'Your next activity'} title={next.title}
   detail={when+' · '+displayTime(next.startTime)+(next.location?' · '+next.location:'')} art={<Sun/>}
   action={<button type="button" className="ui-hero-action" onClick={()=>setSelectedEvent(next)}>View details <ArrowRight size={18}/></button>}/>;
 }
 const appIcon=(a:ModuleEntry,className:string)=><span className={className} aria-hidden="true"><ModuleIcon route={a.route}/></span>;
 const query=appQuery.trim().toLowerCase();
 const sheetApps=(appsView==='favorites'?favoriteApps:apps).filter(a=>!query||a.name.toLowerCase().includes(query));
 const unreadNotices=recentNotices.filter(n=>n.readAt===null);
 const shownRecent=noticeFilter==='unread'?unreadNotices:recentNotices;
 return <div className="lvz-experience">
  <FrameControls name={w.self.name} profileHref={route('profile')} onHome={resetHome} onApps={openApps}
   left={{label:'Calendar',icon:'calendar',onClick:()=>{setSection('home');choosePeriod('calendar');},active:section==='home'&&period==='calendar'}}
   right={{label:'Notifications',short:'Updates',icon:'bell',onClick:()=>switchSection('notifications'),active:section==='notifications'}}
   more={userManages?[{label:'Manage',icon:'people',onClick:()=>switchSection('manage')}]:[]}/>
  {demo&&<div className="lvz-demo-banner"><Info size={16}/><span>Fictional content only. No official activities or apps are connected.</span></div>}
  <main className="lvz-body">
  {section==='home'&&<div className="lvz-home-grid">
   <div className="lvz-home-main">
    <PageHeading eyebrow={formatDay(today,{weekday:'long',month:'long',day:'numeric'})} title={<>{greeting(now||'09:00')}, {firstName}.</>}
     lede={group==='Unassigned'&&unit==='Unassigned'?'Your day, your apps and your group in one place.':group+' · '+unit}/>
    {userManages&&<div className="ui-glass ui-glass-tight lvz-manage-entry">
     <Row onClick={()=>switchSection('manage')} lead={<IconBox><ShieldCheck size={22}/></IconBox>} title="Manage"
      detail={notices.length?plural(notices.length,'item needs','items need')+' your review':'Nothing waiting for your review'}
      end={notices.length?<span className="ui-count">{notices.length}</span>:undefined}/>
    </div>}
    <section className="lvz-feature-section" aria-labelledby="lvz-period-title" {...swipe}>
     <Segmented className="lvz-period-tabs" label="Activity time view" value={period} onChange={choosePeriod}
      options={[['today','Today'],['week','Week'],['calendar','Calendar']]}/>
     {period==='today'&&<>
      {hero()}
      <SectionHeader title="Quick access" action={apps.length?<TextAction onClick={openApps}>All apps</TextAction>:undefined}/>
      {quickApps.length?<ul className="ui-quick-grid lvz-favorite-grid" aria-label="Quick access apps">{quickApps.map(a=><li key={a.id}>
       <button type="button" className="ui-quick lvz-favorite-item" onClick={()=>openModule(a)}><ModuleIcon route={a.route} size={26}/><span>{a.name}</span></button>
      </li>)}</ul>:
       <div className="ui-glass"><EmptyState icon={<Grid2X2/>} title="No apps assigned yet">Your approved apps appear here once they are assigned to your account.</EmptyState></div>}
      {demo&&<p className="lvz-hint">Favorites in this example are temporary and do not sync to an account.</p>}
      <SectionHeader title="Today at a glance" id="lvz-period-title" note={formatDay(today,{month:'short',day:'numeric'})}/>
      {agenda(emptyDay(today))}
     </>}
     {period==='week'&&<>
      <SectionHeader title="This week" id="lvz-period-title" action={<div className="lvz-week-nav">
       <button type="button" className="lvz-round-button" aria-label="Previous week" onClick={()=>moveWeek(-7)}><ChevronLeft size={20}/></button>
       <span>{formatDay(week[0])+' to '+formatDay(week[6])}</span>
       <button type="button" className="lvz-round-button" aria-label="Next week" onClick={()=>moveWeek(7)}><ChevronRight size={20}/></button>
      </div>}/>
      <div className="lvz-week" data-no-swipe ref={weekStrip}>
       <DateStrip label="Days this week" days={week.map(day=>{
        const count=allActivities.filter(e=>e.date===day).length;
        return {key:day,top:formatDay(day,{weekday:'short'}),day:Number(day.slice(-2)),
         bottom:count?<i className="lvz-dot" aria-hidden="true"/>:day===today?'Today':formatDay(day,{month:'short'}),
         label:'Select '+longDay(day)+(count?', '+plural(count,'activity','activities'):''),
         selected:day===selectedDay,onClick:()=>setSelectedDay(day)};
       })}/>
      </div>
      <SectionHeader level={3} title={longDay(selectedDay)} action={backToToday}/>
      {agenda(emptyDay(selectedDay))}
      <div className="ui-glass ui-glass-tight lvz-week-note">
       <Row lead={<IconBox round><Sun size={22}/></IconBox>} title={weekRest?'More this week':'Space for what matters'}
        detail={weekRest?plural(weekRest,'more activity is','more activities are')+' scheduled this week.':'Nothing else is scheduled this week.'}/>
      </div>
     </>}
     {period==='calendar'&&<>
      <SectionHeader title="Calendar" id="lvz-period-title" note={formatDay(anchor,{month:'long',year:'numeric'})}/>
      <div className="ui-glass lvz-month-box" data-no-swipe>
       <div className="lvz-month-nav"><button type="button" className="lvz-round-button" aria-label="Previous month" onClick={()=>setAnchor(nextMonth(anchor,-1))}><ChevronLeft size={20}/></button>
        <strong>{formatDay(anchor,{month:'long',year:'numeric'})}</strong>
        <button type="button" className="lvz-round-button" aria-label="Next month" onClick={()=>setAnchor(nextMonth(anchor,1))}><ChevronRight size={20}/></button></div>
       <div className="lvz-month-grid">{labels.map(day=><div className="lvz-weekday" key={day} aria-hidden="true">{day.slice(0,1)}</div>)}{monthCells(anchor).map(c=>dateCell(c.date,c.inMonth))}</div>
      </div>
      <SectionHeader level={3} title={longDay(selectedDay)} action={backToToday}/>
      {agenda(emptyDay(selectedDay))}
     </>}
    </section>
   </div>
   <aside className="lvz-home-side" aria-label="Your community">
    <div className="ui-glass lvz-rail">
     <p className="ui-eyebrow">Your community, at a glance</p>
     <span className="lvz-rail-art" aria-hidden="true"><UsersRound/></span>
     <h2>{group}</h2>
     <p className="lvz-rail-lede">{unit==='Unassigned'?'Your placement is set by an authorized leader.':unit}</p>
     <ul className="ui-list lvz-rail-list">
      <li><Row href={route('people')} label={'Open your group directory, '+group} lead={<IconBox><UsersRound size={22}/></IconBox>}
       title="Group directory" detail={'Names only · '+plural(w.directory.length,'visible member','visible members')}/></li>
      {next&&<li><Row onClick={()=>setSelectedEvent(next)} lead={<IconBox><Clock3 size={22}/></IconBox>} title={next.title}
       detail={(next.date===today?'Today':formatDay(next.date,{weekday:'short',month:'short',day:'numeric'}))+' · '+displayTime(next.startTime)}/></li>}
     </ul>
    </div>
   </aside>
  </div>}
  {section==='manage'&&userManages&&<section className="lvz-management">
   <button type="button" className="lvz-back-link" aria-label="Back to Home" onClick={resetHome}><ChevronLeft size={18}/> Home</button>
   <PageHeading eyebrow="Your responsibilities" title="What needs your attention." lede="Only responsibilities assigned to your organizational or department scope are shown."/>
   <StatGrid label="Your scope">
    <StatTile label="Members in your scope" value={w.managedMembers.length}/>
    <StatTile label="Items to review" value={notices.length} tone={notices.length?'accent':undefined}/>
    <StatTile label="Departments you manage" value={w.departments.filter(d=>d.canManage).length}/>
   </StatGrid>
   <SectionHeader title="To review" note={notices.length?String(notices.length):undefined}/>
   <div className="ui-glass ui-glass-tight">
    {notices.length?<ul className="ui-list lvz-manage-actions">{notices.map(n=><li key={n.id}>
     <Row href={route('manage')} lead={<IconBox><Bell size={20}/></IconBox>} title={n.title} detail={n.description} end={<span className="lvz-review">Review</span>}/></li>)}</ul>:
     <EmptyState icon={<Check/>} title="Nothing waiting">There are no pending items in this authorized view.</EmptyState>}
   </div>
   <a href={route('manage')} className="ui-button ui-button-block lvz-primary-link"><ShieldCheck size={18}/> Open management tools <ArrowRight size={18}/></a>
   <p className="lvz-hint">Account verification, department changes, member transfers and appointments are managed in their authorized sections.</p>
  </section>}
  {section==='notifications'&&<section className="lvz-notifications">
    <PageHeading eyebrow="Stay in the loop" title="Notifications" lede="Updates from your authorized apps. Push notifications are not active."/>
    <Segmented label="Show" value={noticeFilter} onChange={setNoticeFilter}
     options={[['all','All updates'],['unread','Unread'],['action','Action needed']]}/>
    {noticeFilter!=='unread'&&<>
     <SectionHeader title="Needs action" note={notices.length?String(notices.length):undefined}/>
     {notices.length?<div className="ui-glass ui-glass-tight"><ul className="ui-list lvz-notice-list">{notices.map(n=><li key={n.id}>
      <Row onClick={()=>{if(n.source==='module' && n.route?.startsWith('/modules/'))window.location.assign(n.route);else if(userManages)switchSection('manage');}}
       lead={<IconBox>{n.source==='module'?<ModuleIcon route={n.route} size={20}/>:<ShieldCheck size={20}/>}</IconBox>}
       title={n.title} detail={n.description} end={<Tag tone="warning">Review</Tag>}/>
     </li>)}</ul></div>:
      <div className="ui-glass"><div className="ui-empty-state lvz-all-clear"><span className="ui-empty-icon" aria-hidden="true"><Check/></span>
       <h3>All clear here</h3><p>No pending approvals or transfer decisions in this view.</p></div></div>}
    </>}
    {noticeFilter!=='action'&&<>
     <SectionHeader title={noticeFilter==='unread'?'Unread':'Recent'}/>
     {shownRecent.length?<div className="ui-glass ui-glass-tight"><ul className="ui-list lvz-notice-list">{shownRecent.map(n=><li key={n.id}>
      <Row onClick={()=>{void openNotice(n);}} lead={<IconBox><ModuleIcon route={n.route} size={20}/></IconBox>}
       title={n.title} detail={n.description} end={n.readAt?undefined:<Tag>New</Tag>}/>
     </li>)}</ul></div>:
      <div className="ui-glass"><EmptyState icon={<Bell/>} title={noticeFilter==='unread'?'Nothing unread':'No recent updates'}>
       Updates from your approved apps appear here.</EmptyState></div>}
    </>}
   </section>}
  </main>
  <dialog className="lvz-apps-dialog ui-sheet" ref={appSheet} onClose={()=>{setAppsEditing(false);setAppQuery('');}} aria-label="Applications">
   <div className="lvz-sheet-heading"><div><p className="ui-eyebrow">Your community toolkit</p><h2>Applications</h2></div>
    <button type="button" className="lvz-sheet-close" onClick={()=>appSheet.current?.close()} aria-label="Close applications"><X size={22}/></button></div>
   <p className="lvz-sheet-description">{demo?'These tiles are fictional navigation concepts, not approved official apps.':'Only apps assigned to your account appear here.'}</p>
   {apps.length?<>
    <SearchField label="Find an app" placeholder="Find an app" value={appQuery} onChange={e=>setAppQuery(e.target.value)} autoComplete="off"/>
    <Segmented label="Apps view" value={appsView} onChange={setAppsView} options={[['all','All apps'],['favorites','Favorites']]}/>
    <div className="lvz-apps-sheet-header"><h3>{appsView==='favorites'?'Your favorites':demo?'Available in this concept':'Available to you'}</h3>
     <button type="button" className="lvz-edit-link" onClick={()=>setAppsEditing(v=>!v)}><Pencil size={15}/>{appsEditing?'Done':'Edit favorites'}</button></div>
    {appsEditing&&<div className="ui-glass lvz-reorder-box"><h3>Reorder your favorites</h3><p>Pin up to eight. Use the arrows to change their order.</p>
     {favoriteApps.length?favoriteApps.map((a,i)=><div key={a.id} className="lvz-reorder-row"><span>{i+1}. {a.name}</span>
      <button type="button" disabled={i===0} aria-label={'Move '+a.name+' up'} onClick={()=>{void saveFavorites(reorderFavorite(favorites,a.id,-1,apps));}}><ArrowUp size={17}/></button>
      <button type="button" disabled={i===favoriteApps.length-1} aria-label={'Move '+a.name+' down'} onClick={()=>{void saveFavorites(reorderFavorite(favorites,a.id,1,apps));}}><ArrowDown size={17}/></button></div>)
      :<p>Pin an app to add it to your favorites.</p>}
    </div>}
    {sheetApps.length?<ul className="lvz-app-grid">{sheetApps.map(a=>{
     const inFavorites=saved.includes(a.id);
     return <li className="ui-glass lvz-app-tile" key={a.id}>
      {appIcon(a,'ui-icon-box lvz-app-symbol')}
      <button type="button" className="lvz-app-open" onClick={()=>openModule(a)}>
       <strong>{a.name}</strong><small>{a.description}</small><span className="lvz-app-go">Open app <ArrowRight size={16}/></span>
      </button>
      <button type="button" className={'lvz-pin-button'+(inFavorites?' lvz-pin-on':'')} aria-label={(inFavorites?'Unpin ':'Pin ')+a.name} aria-pressed={inFavorites}
       disabled={favoritesSaving} onClick={()=>{void saveFavorites(toggleFavorite(favorites,a.id,apps));}}><Pin size={19}/></button>
     </li>;
    })}</ul>:<p className="lvz-sheet-empty">{query?'No app matches that name.':'No favorites yet. Pin an app to keep it close.'}</p>}
   </>:<div className="ui-glass"><EmptyState icon={<Grid2X2/>} title="No apps assigned yet">Apps appear here only after they are approved and assigned to your account.</EmptyState></div>}
   {favoritesMessage&&<p role="status" className="lvz-sheet-footnote">{favoritesMessage}</p>}
   <p className="lvz-sheet-footnote">{demo?'Favorites reset with the demo. No cross-device sync is claimed.':'Favorites sync between your signed-in devices.'}</p>
  </dialog>
  <dialog className="lvz-detail-dialog ui-sheet" ref={activitySheet} onClose={()=>setSelectedEvent(null)} aria-label="Activity details">
   {selectedEvent&&<><div className="lvz-sheet-heading"><div><p className="ui-eyebrow">{selectedEvent.source==='fictional'?'Fictional activity':'Activity details'}</p><h2>{selectedEvent.title}</h2></div>
    <button type="button" className="lvz-sheet-close" onClick={closeActivity} aria-label="Close activity"><X size={22}/></button></div>
    <div className="ui-glass ui-glass-tight"><ul className="ui-list">
     <li><Row lead={<IconBox><CalendarDays size={20}/></IconBox>} title={longDay(selectedEvent.date)}/></li>
     <li><Row lead={<IconBox><Clock3 size={20}/></IconBox>} title={displayTime(selectedEvent.startTime)+' to '+displayTime(selectedEvent.endTime)}/></li>
     {selectedEvent.location&&<li><Row lead={<IconBox><MapPin size={20}/></IconBox>} title={selectedEvent.location}/></li>}
    </ul></div>
    <p className="lvz-detail-context">{selectedEvent.context}</p>
    {selectedEvent.source==='fictional'&&<p className="ui-notice lvz-detail-warning" data-tone="warning"><Info size={18}/><span>Sample-only content. No real appointment, check-in, or connected application is represented.</span></p>}
    <button type="button" className="ui-button ui-button-block" onClick={closeActivity}>Done</button>
   </>}
  </dialog>
  <dialog className="lvz-detail-dialog ui-sheet" ref={moduleSheet} onClose={()=>setSelectedApp(null)} aria-label="App concept landing">
   {selectedApp&&<><div className="lvz-sheet-heading"><div><p className="ui-eyebrow">App concept</p><h2>{selectedApp.name}</h2></div>
    <button type="button" className="lvz-sheet-close" onClick={closeModule} aria-label="Close module"><X size={22}/></button></div>
    {appIcon(selectedApp,'lvz-module-mark')}
    <p className="lvz-detail-context">{selectedApp.description}</p><p className="lvz-hint">No official app has been selected. This landing page has no account, data, or working app functions.</p>
    <button type="button" className="ui-button ui-button-block" onClick={closeModule}>Return to Home</button></>}
  </dialog>
 </div>;
}
