import type{ReactNode,SVGProps}from'react';
type IconProps=SVGProps<SVGSVGElement>&{size?:number};
function make(paths:ReactNode){
 return function Icon({size=20,...rest}:IconProps){
  return <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size}
   viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
   strokeLinecap="round" strokeLinejoin="round" {...rest}>{paths}</svg>;
 };
}
export const ArrowDown=make(<><path d="M12 4v16M5 13l7 7 7-7"/></>);
export const ArrowUp=make(<><path d="M12 20V4M5 11l7-7 7 7"/></>);
export const ArrowLeft=make(<><path d="m12 19-7-7 7-7M5 12h14"/></>);
export const ArrowRight=make(<><path d="M5 12h14m-7-7 7 7-7 7"/></>);
export const ChevronLeft=make(<path d="m15 18-6-6 6-6"/>);
export const ChevronRight=make(<path d="m9 18 6-6-6-6"/>);
export const Bell=make(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>);
export const CalendarDays=make(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18M8 14h2m4 0h2m-8 4h2"/></>);
export const Check=make(<path d="m4 12 5 5L20 6"/>);
export const Clock3=make(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>);
export const Grid2X2=make(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>);
export const House=make(<><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10"/><path d="M9 21v-8h6v8"/></>);
export const Info=make(<><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/></>);
export const MapPin=make(<><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>);
export const Pencil=make(<><path d="m3 17-.5 4.5L7 21 20 8a2 2 0 0 0-4-4L3 17Z"/><path d="m14 6 4 4"/></>);
export const Pin=make(<><path d="m16 3 5 5-4 1-3 3v4l-3 2-5-5 2-3h4l3-3 1-4Z"/><path d="m7 17-4 4"/></>);
export const ShieldCheck=make(<><path d="M12 22s9-4 9-10V5l-9-3-9 3v7c0 6 9 10 9 10Z"/><path d="m8 12 3 3 5-6"/></>);
export const UsersRound=make(<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3Z"/><path d="M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v1"/></>);
export const X=make(<path d="M5 5 19 19M19 5 5 19"/>);

export const UserRound=make(<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>);
export const DoorOpen=make(<><path d="M5 21V4l13-2v19M3 21h18M14 11v2"/></>);
export const Monitor=make(<><rect x="2" y="3" width="20" height="14" rx="3"/><path d="M12 17v4M8 21h8"/></>);
export const MoreHorizontal=make(<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>);
