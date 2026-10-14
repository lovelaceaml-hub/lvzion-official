import {addDay,dayKey} from './domain.ts';
import type {Booking} from './domain.ts';
export type HistoryQuery={from:string;to:string;offset:number;managed:boolean};
export type HistoryPage={bookings:Booking[];total:number;nextOffset:number|null;managed:boolean};
export function parseHistoryQuery(params:URLSearchParams):HistoryQuery{
 const allowed=['from','to','offset','managed'];
 for(const key of params.keys())if(!allowed.includes(key)||params.getAll(key).length!==1)throw Error('Invalid history query.');
 const from=dayKey(params.get('from')??''),to=dayKey(params.get('to')??'');
 const offset=params.get('offset')??'0',managed=params.get('managed')??'false';
 if(to<from||to>addDay(from,30)||!/^\d{1,7}$/.test(offset)||Number(offset)>1000000||!['true','false'].includes(managed))throw Error('Choose a date range of no more than 31 days.');
 return {from,to,offset:Number(offset),managed:managed==='true'};
}
export function previewHistory(bookings:Booking[],query:HistoryQuery,canManage:boolean):HistoryPage{
 if(query.managed&&!canManage)throw Error('Reservation-manager permission required.');
 const all=bookings.filter(b=>b.day>=query.from&&b.day<=query.to&&(b.mine||query.managed)).sort((a,b)=>b.day.localeCompare(a.day)||b.start-a.start||a.id.localeCompare(b.id));
 return {bookings:all.slice(query.offset,query.offset+50),total:all.length,nextOffset:query.offset+50<all.length?query.offset+50:null,managed:query.managed};
}
