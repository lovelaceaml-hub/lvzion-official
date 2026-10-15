import type {ReactNode} from 'react';

type Props={
 /** Where the wordmark goes. Members land on /members; signed-out pages use /sign-in. */
 homeHref?:string;
 /** Use instead of homeHref when "home" is a view inside the current screen. */
 onHome?:()=>void;
 /** White bar with a hairline, for desktop-style pages. */
 solid?:boolean;
 children?:ReactNode;
};

/** Shared Day Sheet header: tapping the wordmark always returns home. */
export default function AppHeader({homeHref='/members',onHome,solid=false,children}:Props){
 const mark=<>LV<span>Zion</span></>;
 return <header className={'ui-header'+(solid?' ui-header-solid':'')}>
  {onHome
   ?<button type="button" className="ui-wordmark" onClick={onHome} aria-label="LV Zion home">{mark}</button>
   :<a className="ui-wordmark" href={homeHref} aria-label="LV Zion home">{mark}</a>}
  {children}
 </header>;
}
