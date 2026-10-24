'use client';
import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import AppSwitcher from './app-switcher';
import {Bell,CalendarDays,ClipboardList,Clock3,Contrast,Grid2X2,Heart,House,Info,LogIn,Monitor,Music,DoorOpen,UsersRound,UserRound,MoreHorizontal,Sun,X} from './home-icons';
import {moduleStyleFor} from '../lib/module-styles';
import './app-frame.css';
const icons={home:House,calendar:CalendarDays,clock:Clock3,apps:Grid2X2,people:UsersRound,user:UserRound,display:Monitor,room:DoorOpen,bell:Bell,info:Info,more:MoreHorizontal,sun:Sun,contrast:Contrast,heart:Heart,music:Music,clipboard:ClipboardList};
type IconName=keyof typeof icons;
/** short: an optional shorter visible dock label; the accessible name stays label. */
export type FrameAction={label:string;short?:string;icon:IconName;onClick?:()=>void;href?:string;active?:boolean;disabled?:boolean};
/** module: an Atlas style key from lib/module-styles.ts; null wears the shared base; omitted follows the route. */
type Controls={left:FrameAction;right:FrameAction;more?:FrameAction[];onMore?:()=>void;moreActive?:boolean;onHome?:()=>void;onApps?:()=>void;name?:string;profileHref?:string;title?:string;headerContent?:ReactNode;viewport?:boolean;module?:string|null};
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
/** Pages anyone may open. They never show member navigation or the profile circle. */
const publicRoutes=['/sign-in','/sign-up','/signup','/reset-password','/request-access','/activate','/auth','/install'];
export const isPublicRoute=(path:string)=>path==='/'||publicRoutes.some(r=>path===r||path.startsWith(r+'/'));
function routeDetails(path:string):{title:string;icon:IconName}{
 if(path==='/appearance')return{title:'Appearance',icon:'contrast'};
 const style=moduleStyleFor(path);
 if(style)return{title:style.title,icon:style.icon};
 if(path.startsWith('/modules/'))return{title:path.split('/')[2].split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join(' '),icon:'apps'};
 if(path==='/install')return{title:'Install LV Zion',icon:'apps'};
 return{title:'LV Zion',icon:'home'};
}
function initials(name:string){return name.trim().split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();}
export default function AppFrame({children}:{children:ReactNode}){
 const path=usePathname();
 const [registration,setRegistration]=useState<Registration|null>(null),[apps,setApps]=useState(false),[more,setMore]=useState(false),[name,setName]=useState('');
 // 'unknown' until the avatar check answers; only an explicit 401 means signed out.
 const [session,setSession]=useState<'unknown'|'member'|'signed-out'>('unknown');
 const menu=useRef<HTMLDialogElement>(null);
 const controls=registration?.path===path?registration.controls:null;
 const details=routeDetails(path),Icon=icons[details.icon];
 const immersive=path==='/display';
 const publicPage=isPublicRoute(path);
 const memberRoute=path.startsWith('/members')||path.startsWith('/modules')||path==='/appearance';
 // A module that registered its controls has loaded a member view, so its
 // navigation stays; a signed-out shell without controls shows Sign in instead.
 const signedOut=publicPage||(session==='signed-out'&&!controls);
 const moduleKey=controls?.module===undefined?moduleStyleFor(path)?.key:controls.module;
 useEffect(()=>{
  if(!memberRoute){setName('');setSession('unknown');return;}
  const controller=new AbortController();
  const refresh=async()=>{try{const r=await fetch('/api/members/avatar',{cache:'no-store',signal:controller.signal});const data=r.ok?await r.json():null;if(controller.signal.aborted)return;setName(typeof data?.initials==='string'?data.initials:'');setSession(r.ok?'member':r.status===401?'signed-out':'unknown');}catch{if(!controller.signal.aborted)setName('');}};
  void refresh();window.addEventListener('focus',refresh);
  return()=>{controller.abort();window.removeEventListener('focus',refresh);};
 },[memberRoute,path]);
 useEffect(()=>{setApps(false);setMore(false);},[path]);
 useEffect(()=>{if(more)menu.current?.showModal();else menu.current?.close();},[more]);
 const left=controls?.left??{label:'My Week',icon:'calendar' as const,href:'/members'};
 const right=controls?.right??{label:'Profile',icon:'user' as const,href:'/members/manage?tab=profile'};
 const avatar=controls?.name?initials(controls.name):name;
 const title=controls?.title??details.title;
 function action(item:FrameAction){const Symbol=icons[item.icon];const inner=<><Symbol size={22}/><span>{item.short??item.label}</span></>;const name=item.short&&item.short!==item.label?item.label:undefined;
  return item.href?<a href={item.href} aria-label={name} aria-current={item.active?'page':undefined}>{inner}</a>:<button type="button" aria-label={name} disabled={item.disabled} aria-current={item.active?'page':undefined} onClick={item.onClick}>{inner}</button>;
 }
 function signedOutLink(){
  if(path==='/sign-in')return <a className="app-frame-session" href="/sign-up">Create account</a>;
  return <a className="app-frame-session" href="/sign-in"><LogIn size={18}/><span>Sign in</span></a>;
 }
 return <Register.Provider value={setRegistration}>
  {immersive?children:<div className="app-frame" data-route={path} data-lvz-module={moduleKey??undefined} data-signed-out={signedOut} data-header-content={Boolean(controls?.headerContent)} data-viewport={Boolean(controls?.viewport)}>
   <header className="app-frame-header" aria-label="Application header">
    <a className="app-frame-heading" href="/" aria-label={`${title}. Go to Home`}><span className="app-frame-tile" aria-hidden="true"><Icon size={24}/></span><span className="app-frame-name"><strong>{title}</strong><small aria-hidden="true">{title==='LV Zion'?'Your community':'LV Zion'}</small></span></a>
    {signedOut?signedOutLink():<a className="app-frame-avatar" href={controls?.profileHref??"/members/manage?tab=profile"} aria-label="My profile">{avatar||<UserRound size={23}/>}</a>}
    {controls?.headerContent?<div className="app-frame-header-content">{controls.headerContent}</div>:null}
   </header>
   <div className="app-frame-content">{children}</div>
   {signedOut?null:<nav className="app-frame-nav" aria-label="Main navigation">
    {action({label:'Home',icon:'home',onClick:controls?.onHome,href:controls?.onHome?undefined:'/members',active:path==='/members'})}
    {action(left)}
    <button type="button" className="app-frame-apps" aria-label="Open apps" aria-haspopup="dialog" onClick={()=>controls?.onApps?controls.onApps():setApps(true)}><span className="app-frame-orb"><Grid2X2 size={25}/></span><span>Apps</span></button>
    {action(right)}
    <button type="button" aria-current={controls?.moreActive?'page':undefined} aria-haspopup={controls?.onMore?undefined:'dialog'} onClick={()=>controls?.onMore?controls.onMore():setMore(true)}><MoreHorizontal size={24}/><span>More</span></button>
   </nav>}
   {signedOut?null:<AppSwitcher open={apps} onClose={()=>setApps(false)}/>}
   {signedOut?null:<dialog ref={menu} className="ui-sheet app-frame-menu" aria-label="More options" onClose={()=>setMore(false)}><div className="ui-sheet-body">
    <div className="app-frame-menu-heading"><h2>More</h2><button type="button" aria-label="Close more options" onClick={()=>setMore(false)}><X/></button></div>
    {controls?.more?.map(item=><div key={item.label}>{action({...item,onClick:()=>{setMore(false);item.onClick?.();}})}</div>)}
    <a href="/members/manage?tab=profile"><UserRound/>My profile</a><a href="/appearance"><Contrast/>Appearance</a><a href="/install"><Grid2X2/>Install app</a>
   </div></dialog>}
  </div>}
 </Register.Provider>;
}
