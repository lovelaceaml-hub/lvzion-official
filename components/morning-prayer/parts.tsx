import type {ReactNode} from 'react';
import {IconBox} from '../ui-kit';
import styles from './morning-prayer.module.css';

/** Summary line of a glass disclosure card: icon box, title, optional note; the chevron comes from CSS. */
export function CardSummary({icon,title,note}:{icon:ReactNode;title:string;note?:ReactNode}){
 return <summary><IconBox>{icon}</IconBox><span className={styles.summaryTitle}>{title}</span>{note?<small>{note}</small>:null}</summary>;
}

/** Padlock for an action that is not open yet. */
export function Lock({size=20}:{size?:number}){
 return <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
 </svg>;
}
