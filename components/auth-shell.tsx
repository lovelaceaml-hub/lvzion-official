import type {ReactNode} from 'react';
import {House} from './home-icons';
import {PageHeading} from './ui-kit';
import './auth.css';

/**
 * Sign in, sign up and account recovery in the Liquid Opal material (Atlas
 * main-signin, main-signup): a large app mark, the page heading and one glass
 * card holding the form. `after` sits below the card.
 */
export default function AuthShell({eyebrow,title,lede,children,after,mark=true}:{eyebrow?:ReactNode;title:ReactNode;lede?:ReactNode;children:ReactNode;after?:ReactNode;mark?:boolean}){
 return <main className="lvz-auth">
  {mark?<span className="lvz-auth-mark" aria-hidden="true"><House size={34}/></span>:null}
  <PageHeading eyebrow={eyebrow} title={title} lede={lede}/>
  <div className="ui-glass lvz-auth-card">{children}</div>
  {after}
 </main>;
}
