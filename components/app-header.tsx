import type {ReactNode} from 'react';
/** Optional page actions; the root AppFrame owns the persistent module header. */
export default function AppHeader({children}:{homeHref?:string;onHome?:()=>void;solid?:boolean;children?:ReactNode}){
 return children?<div className="app-frame-page-actions">{children}</div>:null;
}
