'use client';
import {useRef} from 'react';
import type {TouchEvent} from 'react';
import {swipeTabs} from './design-tokens.ts';

/**
 * Decides whether a finished touch is a deliberate horizontal tab swipe.
 * Returns -1 (previous tab), 1 (next tab) or 0 (ignore). Pure, so it is unit-tested.
 */
export function swipeDirection(dx:number,dy:number,durationMs:number):-1|0|1{
 if(durationMs>=swipeTabs.maxDurationMs)return 0;
 if(Math.abs(dx)<swipeTabs.minDistance)return 0;
 if(Math.abs(dx)<=swipeTabs.dominance*Math.abs(dy))return 0;
 return dx<0?1:-1;
}

/** Index of the tab a swipe lands on, without wrapping past either end. */
export function nextTabIndex(current:number,count:number,direction:-1|0|1):number{
 return Math.min(count-1,Math.max(0,current+direction));
}

/**
 * Spread the returned handlers on the element that holds the tab content.
 * The visible tab buttons stay the primary control; swiping is an extra.
 * Swipes that start inside inputs, sliders or horizontally scrolling areas are ignored.
 */
export function useSwipeTabs<T extends string>(tabs:readonly T[],current:T,onChange:(tab:T)=>void){
 const start=useRef<{x:number;y:number;t:number}|null>(null);
 return {
  onTouchStart(event:TouchEvent){
   const target=event.target as HTMLElement|null;
   if(event.touches.length!==1||target?.closest('input,textarea,select,[contenteditable],[data-no-swipe]')){start.current=null;return;}
   const touch=event.touches[0];start.current={x:touch.clientX,y:touch.clientY,t:Date.now()};
  },
  onTouchEnd(event:TouchEvent){
   const from=start.current;start.current=null;
   if(!from||event.changedTouches.length!==1)return;
   const touch=event.changedTouches[0];
   const direction=swipeDirection(touch.clientX-from.x,touch.clientY-from.y,Date.now()-from.t);
   const index=tabs.indexOf(current);
   if(direction===0||index<0)return;
   const next=nextTabIndex(index,tabs.length,direction);
   if(next!==index)onChange(tabs[next]);
  },
  onTouchCancel(){start.current=null;},
 };
}
