'use client';
/**
 * Small Liquid Opal pieces shared by the Study Rooms screens: resource-kind
 * icons, the calendar date block of a reservation card and time formatting.
 */
import type {ReactNode,SVGProps} from 'react';
import {DoorOpen,Monitor} from '../home-icons';
import {clock} from '../../lib/study-rooms/domain';
import type {Kind} from '../../lib/study-rooms/domain';

type IconProps=SVGProps<SVGSVGElement>&{size?:number};
/** A whiteboard on its stand; local because the shared icon set has none. */
export function Whiteboard({size=20,...rest}:IconProps){
 return <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...rest}><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7 20l2-4m8 4-2-4M7 9h6m-6 3h4"/></svg>;
}
export function KindIcon({kind,size=22}:{kind?:Kind;size?:number}){
 return kind==='tv'?<Monitor size={size}/>:kind==='whiteboard'?<Whiteboard size={size}/>:<DoorOpen size={size}/>;
}

const utc=(date:string)=>new Date(date+'T12:00:00Z');
export const longDay=(date:string)=>utc(date).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'});
export const monthDay=(date:string)=>utc(date).toLocaleDateString('en-US',{month:'long',day:'numeric',timeZone:'UTC'});
export const timeRange=(start:number,end:number)=>clock(start)+' – '+clock(end);
/** "11:00–11:30 AM": the meridiem is written once when both ends share it. */
export function shortRange(start:number,end:number){
 const a=clock(start),b=clock(end),same=a.slice(-2)===b.slice(-2);
 return (same?a.slice(0,-3):a)+'–'+b;
}
export function duration(minutes:number){
 const h=Math.floor(minutes/60),m=minutes%60;
 return [h?h+' hr':'',m?m+' min':''].filter(Boolean).join(' ');
}

/** Month, day number and weekday stacked in a tinted rounded block. */
export function DateBlock({date}:{date:string}){
 const d=utc(date);
 return <div className="sr-date-block" aria-hidden="true">
  <span>{d.toLocaleDateString('en-US',{month:'short',timeZone:'UTC'})}</span>
  <strong>{d.getUTCDate()}</strong>
  <small>{d.toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})}</small>
 </div>;
}

/** A frosted card holding an icon, one bold line and one sentence. */
export function Callout({icon,title,children}:{icon:ReactNode;title:ReactNode;children:ReactNode}){
 return <div className="ui-glass sr-callout"><span className="sr-callout-icon" aria-hidden="true">{icon}</span><div><strong>{title}</strong><p>{children}</p></div></div>;
}
