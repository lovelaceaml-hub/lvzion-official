'use client';
import {useRef} from 'react';
import type {KeyboardEvent,ReactNode} from 'react';
/** Adds deterministic Tab wrapping to native dialogs in this route only. No document-wide listeners. */
export default function PlanningDialogScope({children}:{children:ReactNode}) {
 const scope=useRef<HTMLDivElement>(null);
 function keepFocus(event:KeyboardEvent<HTMLDivElement>) {
  if(event.key!=='Tab')return;
  const dialog=scope.current?.querySelector<HTMLDialogElement>('dialog.wp-dialog[open]');
  if(!dialog)return;
  const controls=Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'))
   .filter(element=>element.getClientRects().length>0&&!element.closest('[hidden],[inert]'));
  const first=controls[0],last=controls.at(-1),active=document.activeElement;
  if(!first){event.preventDefault();dialog.focus();return;}
  if(event.shiftKey&&(active===first||!dialog.contains(active))){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&(active===last||!dialog.contains(active))){event.preventDefault();first.focus();}
 }
 return <div ref={scope} onKeyDownCapture={keepFocus}>{children}</div>;
}
