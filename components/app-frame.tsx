'use client';
import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import AppSwitcher from './app-switcher';
import {Bell,CalendarDays,Clock3,Grid2X2,House,Info,Monitor,DoorOpen,UsersRound,UserRound,MoreHorizontal,X} from './home-icons';
import './app-frame.css';
const icons={home:House,calendar:CalendarDays,clock:Clock3,apps:Grid2X2,people:UsersRound,user:UserRound,display:Monitor,room:DoorOpen,bell:Bell,info:Info,more:MoreHorizontal};
type IconName=keyof typeof icons;
export type FrameAction={label:string;icon:IconName;onClick?:()=>void;href?:string;active?:boolean;disabled?:boolean};
type Controls={left:FrameAction;right:FrameAction;more?:FrameAction[];onMore?:()=>void;moreActive?:boolean;onHome?:()=>void;onApps?:()=>void;name?:string;profileHref?:string;title?:string;headerContent?:ReactNode;viewport?:boolean};
type Registration={path:string;controls:Controls};
const Register=createContext<((value:Registration|null)=>void)|null>(null);
/** Modules provide real view actions; the root owns the persistent chrome. */
export function FrameControls(props:Controls){
 const register=useContext(Register),path=usePathname();
 // Update controls without clearing the frame between changes to the module view.
 // The setter supplied by AppFrame is stable, so a frame repaint does not notify
 // this context or re-register the module's controls.
 useLayoutEffect(()=>{register?.({path,controls:props});},[register,path,props]);
 useLayoutEffect(()=>()=>register?.(null),[register,path]);
 return null;
}
function routeDetails(path:string):{title:string;icon:IconName}{
 if(path==='/appearance')return{title:'Appearance',icon:'more'};
 if(path.startsWith('/modules/study-rooms'))return{title:'Study Rooms',icon:'room'};
 if(path.startsWith('/modules/contacts'))return{title:'Contacts',icon:'people'};
 if(path.startsWith('/modules/work-mission-prayer'))return{title:'Morning Prayer',icon:'calendar'};
 if(path.startsWith('/modules/continuous-display'))return{title:'Church Display',icon:'display'};
 if(path.startsWith('/modules/'))return{title:path.split('/')[2].split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '),icon:'apps'};
 if(path==='/members/manage'||path==='/member-preview')return{title:'Members',icon:'people'};
 if(path==='/install')return{title:'Install LV Zion',icon:'apps'};
 return{title:'LV Zion',icon:'home'};
}
function initials(name:string){return name.trim().split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();}
export default function AppFrame({children}:{children:ReactNode}){
 const path=usePathname();
 const [registration,setRegistration]=useState<Registration|null>(null),[apps,setApps]=useState(false),[more,setMore]=useState(false),[name,setName]=useState('');
 const menu=useRef<HTMLDialogElement>(null);
 const controls=registration?.path===path?registration.controls:null;
 const details=routeDetails(path),Icon=icons[details.icon];
 const immersive=path==='/display';
 const memberRoute=path.startsWith('/members')||path.startsWith('/modules');
 useEffect(()=>{
  if(!memberRoute){setName('');return;}
  const controller=new AbortController();
  const refresh=async()=>{try{const r=await fetch('/api/members/avatar',{cache:'no-store',signal:controller.signal});const data=r.ok?await r.json():null;if(!controller.signal.aborted)setName(typeof data?.initials==='string'?data.initials:'');}catch{if(!controller.signal.aborted)setName('');}};
  void refresh();window.addEventListener('focus',refresh);
  return()=>{controller.abort();window.removeEventListener('focus',refresh);};
 },[memberRoute,path]);
 useEffect(()=>{setApps(false);setMore(false);},[path]);
 useEffect(()=>{if(more)menu.current?.showModal();else menu.current?.close();},[more]);
 const left=controls?.left??{label:'My Week',icon:'calendar' as const,href:'/members'};
 const right=controls?.right??{label:'Profile',icon:'user' as const,href:'/members/manage?tab=profile'};
 const avatar=controls?.name?initials(controls.name):name;
 function action(item:FrameAction){const Symbol=icons[item.icon];const inner=<><Symbol size={22}/><span>{item.label}</span></>;
  return item.href?<a href={item.href} aria-current={item.active?'page':undefined}>{inner}</a>:<button type="button" disabled={item.disabled} aria-current={item.active?'page':undefined} onClick={item.onClick}>{inner}</button>;
 }
 return <Register.Provider value={setRegistration}>
  {immersive?children:<div className="app-frame" data-route={path} data-header-content={Boolean(controls?.headerContent)} data-viewport={Boolean(controls?.viewport)}>
   <header className="app-frame-header" aria-label="Application header">
    <div className="app-frame-heading"><Icon size={24}/><span>{controls?.title??details.title}</span></div>
    <a className="app-frame-avatar" href={controls?.profileHref??"/members/manage?tab=profile"} aria-label="My profile">{avatar||<UserRound size={23}/>}</a>
    {controls?.headerContent?<div className="app-frame-header-content">{controls.headerContent}</div>:null}
   </header>
   <div className="app-frame-content">{children}</div>
   <nav className="app-frame-nav" aria-label="Main navigation">
    {action({label:'Home',icon:'home',onClick:controls?.onHome,href:controls?.onHome?undefined:'/members',active:path==='/members'})}
    {action(left)}
    <button type="button" className="app-frame-apps" aria-label="Open apps" aria-haspopup="dialog" onClick={()=>controls?.onApps?controls.onApps():setApps(true)}><span className="app-frame-orb"><Grid2X2 size={25}/></span><span>Apps</span></button>
    {action(right)}
    <button type="button" aria-current={controls?.moreActive?'page':undefined} aria-haspopup={controls?.onMore?undefined:'dialog'} onClick={()=>controls?.onMore?controls.onMore():setMore(true)}><MoreHorizontal size={24}/><span>More</span></button>
   </nav>
   <AppSwitcher open={apps} onClose={()=>setApps(false)}/>
   <dialog ref={menu} className="ui-sheet app-frame-menu" aria-label="More options" onClose={()=>setMore(false)}><div className="ui-sheet-body">
    <div className="app-frame-menu-heading"><h2>More</h2><button type="button" aria-label="Close more options" onClick={()=>setMore(false)}><X/></button></div>
    {controls?.more?.map(item=><div key={item.label}>{action({...item,onClick:()=>{setMore(false);item.onClick?.();}})}</div>)}
    <a href="/members/manage?tab=profile"><UserRound/>My profile</a><a href="/appearance"><Grid2X2/>Appearance</a><a href="/install"><Grid2X2/>Install app</a>
   </div></dialog>
  </div>}
 </Register.Provider>;
}
