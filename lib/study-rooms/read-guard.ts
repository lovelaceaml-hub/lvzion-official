import {addDay,dayKey} from './domain.ts';

/** Cancels logically pending private reads after any endpoint reports lost access. */
export class SupersededRead extends Error {
 constructor(){super('This response belongs to an earlier access state.');}
}
export function createAccessEpoch(){
 let epoch=0;
 return {
  capture:()=>epoch,
  current:(ticket:number)=>ticket===epoch,
  invalidate:()=>{epoch++;},
  assert:(ticket:number)=>{if(ticket!==epoch)throw new SupersededRead();}
 };
}
/** Browser date is only a refresh hint. The database still authorizes all times. */
export function refreshBookingDay(selected:string,today:string,horizon=4):string{
 dayKey(selected);dayKey(today);
 if(!Number.isSafeInteger(horizon)||horizon<1||horizon>31)throw Error('Invalid booking horizon.');
 return selected<today||selected>=addDay(today,horizon)?today:selected;
}
