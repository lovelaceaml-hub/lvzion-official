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
export const Sun=make(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>);
export const Contrast=make(<><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></>);
export const Music=make(<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>);
export const Heart=make(<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5.6 5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>);
export const ClipboardList=make(<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9zM9 11h6m-6 4h4"/></>);
export const LogIn=make(<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></>);
export const Search=make(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>);
export const Plus=make(<path d="M12 5v14M5 12h14"/>);
export const BookOpen=make(<><path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5v13c-3.5-2-6.5-2-9-1z"/><path d="M21 5.5c-2.5-1-5.5-1-9 1v13c3.5-2 6.5-2 9-1z"/></>);
export const Settings=make(<><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/></>);
export const ImageIcon=make(<><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/></>);
export const Film=make(<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></>);
export const FileText=make(<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6m-6 4h6"/></>);
