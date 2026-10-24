'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Reservations from '../../../components/study-rooms/reservations';
import '../../../components/study-rooms/reservations.css';
import {PageHeading} from '../../../components/ui-kit';
import {StudyOperationsManager} from '../../../components/study-rooms/operations';
import {dayKey,vegasDay} from '../../../lib/study-rooms/domain';
import type {Schedule,BookingCommand} from '../../../lib/study-rooms/domain';
import type {AdminCommand,AdminData} from '../../../lib/study-rooms/admin';
import type {StudyOperationCommand,StudyOperationsData} from '../../../lib/study-rooms/operations';
import type {HistoryPage,HistoryQuery} from '../../../lib/study-rooms/history';
import {broadcastStudyChange,subscribeStudyRefresh} from '../../../lib/study-rooms/freshness';
import {createAccessEpoch,refreshBookingDay,SupersededRead} from '../../../lib/study-rooms/read-guard';

class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}
async function readJSON<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch(path,{...options,cache:'no-store'});
 let result;
 try{result=await response.json();}catch{throw new RequestError('The server response could not be read. Please refresh.',response.status);}
 if(!response.ok)throw new RequestError(result.error??'Request unavailable.',response.status);
 return result as T;
}
const accessDenied=(e:unknown):e is RequestError=>e instanceof RequestError&&(e.status===401||e.status===403);
const scheduleUrl=(date:string)=>'/api/study-rooms?day='+encodeURIComponent(date);
const vegasTime=()=>new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'});

export default function StudyRooms(){
 const [day,setDay]=useState(''),[data,setData]=useState<Schedule|null>(null),[admin,setAdmin]=useState<AdminData>(),[operations,setOperations]=useState<StudyOperationsData>();
 const [error,setError]=useState(''),[warning,setWarning]=useState(''),[lastRefresh,setLastRefresh]=useState('');
 const [leadsGroup,setLeadsGroup]=useState(false),[signedOut,setSignedOut]=useState(false);
 const bookingHorizon=useRef(4);
 const sequence=useRef(0),controller=useRef<AbortController|null>(null);
 const access=useRef(createAccessEpoch()).current;

 /** Drops every in-flight read so a late response cannot repaint an older day or access state. */
 const cancelReads=useCallback(()=>{sequence.current++;controller.current?.abort();},[]);
 const clearScreen=useCallback(()=>{setData(null);setAdmin(undefined);setOperations(undefined);},[]);
 const clearAccess=useCallback((message:string,status?:number)=>{
  access.invalidate();cancelReads();clearScreen();
  setLastRefresh('');setWarning('');setError(message);setSignedOut(status===401);
 },[access,cancelReads,clearScreen]);

 const loadDay=useCallback(async(date:string):Promise<Schedule>=>{
  dayKey(date);const ticket=access.capture();
  try{const value=await readJSON<Schedule>(scheduleUrl(date));access.assert(ticket);return value;}
  catch(e){if(access.current(ticket)&&accessDenied(e))clearAccess(e.message,e.status);throw e;}
 },[access,clearAccess]);

 const load=useCallback(async(date:string):Promise<boolean>=>{
  const nextDay=refreshBookingDay(date,vegasDay(),bookingHorizon.current);
  if(nextDay!==date){cancelReads();clearScreen();setDay(nextDay);return false;}
  const ticket=access.capture(),id=++sequence.current;
  controller.current?.abort();
  const abort=new AbortController();controller.current=abort;
  try{
   const schedule=await readJSON<Schedule>(scheduleUrl(date),{signal:abort.signal});
   access.assert(ticket);
   const [config,policy]=schedule.canManage
    ?await Promise.all([readJSON<AdminData>('/api/study-rooms/admin',{signal:abort.signal}),readJSON<StudyOperationsData>('/api/study-rooms/operations',{signal:abort.signal})])
    :[undefined,undefined];
   access.assert(ticket);
   if(id!==sequence.current)return false;
   if(Number.isSafeInteger(schedule.horizon)&&schedule.horizon>=1&&schedule.horizon<=31)bookingHorizon.current=schedule.horizon;
   setData(schedule);setAdmin(config);setOperations(policy);setError('');setWarning('');setSignedOut(false);
   setLastRefresh(vegasTime());
   return true;
  }catch(e){
   if(e instanceof SupersededRead||!access.current(ticket)||id!==sequence.current||abort.signal.aborted)return false;
   const message=e instanceof Error?e.message:'Unable to refresh reservations.';
   if(accessDenied(e))clearAccess(message,e.status);
   else{setError(message);setWarning('Availability could not be refreshed. The server will recheck every reservation before saving.');}
   return false;
  }
 },[access,cancelReads,clearAccess,clearScreen]);

 // Group leaders get a link to turn booking on for members of their group.
 useEffect(()=>{fetch('/api/study-rooms/access',{cache:'no-store'}).then(r=>setLeadsGroup(r.ok)).catch(()=>setLeadsGroup(false));},[]);
 useEffect(()=>{setDay(vegasDay());return ()=>{access.invalidate();cancelReads();};},[access,cancelReads]);
 useEffect(()=>{if(!day)return;clearScreen();void load(day);return subscribeStudyRefresh(()=>load(day));},[day,load,clearScreen]);

 async function post(path:string,command:BookingCommand|AdminCommand|StudyOperationCommand){
  const ticket=access.capture();
  try{await readJSON(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});}
  catch(e){
   if(accessDenied(e)){if(access.current(ticket))clearAccess(e.message,e.status);}
   else if(e instanceof RequestError&&e.status===409&&access.current(ticket))await load(day);
   throw e;
  }
  if(!access.current(ticket))throw new Error('Your access changed while saving. Check the reservation after signing in again.');
  broadcastStudyChange();
  const fresh=await load(day);
  if(!fresh&&access.current(ticket))setWarning('Your change was saved, but this screen could not refresh. Use Refresh to see the saved reservation.');
 }

 async function loadHistory(query:HistoryQuery):Promise<HistoryPage>{
  const ticket=access.capture();
  try{
   const result=await readJSON<HistoryPage>('/api/study-rooms/history?'+new URLSearchParams({from:query.from,to:query.to,offset:String(query.offset),managed:String(query.managed)}));
   access.assert(ticket);return result;
  }catch(e){if(access.current(ticket)&&accessDenied(e))clearAccess(e.message,e.status);throw e;}
 }

 if(!data)return <div className="ui-page sr-app sr-shell">
  <main className="ui-main ui-narrow">
   <PageHeading eyebrow="A place to focus" title="Study Room Reservation" lede="Rooms, whiteboards and TVs for focused study."/>
   <div className="ui-glass sr-shell-card">
    <p role="status" className={error?'ui-notice':'ui-lede'} data-tone={error?(signedOut?'warning':'danger'):undefined}>{error||'Loading Study Rooms…'}</p>
    {error&&<p className="ui-hint">{signedOut?'Sign in to reserve a study room.':'Study Rooms needs a Study Rooms grant from a leader.'}</p>}
    {error&&<div className="sr-shell-actions">
     {signedOut&&<a className="ui-button" href="/sign-in">Sign in</a>}
     {day&&<button type="button" className={signedOut?'ui-button ui-button-secondary':'ui-button'} onClick={()=>{void load(day);}}>Try again</button>}
     <a className="ui-link sr-home-link" href="/members">Return to Home</a>
    </div>}
   </div>
  </main>
 </div>;

 const status=<>
  {warning&&<p role="status" className="ui-notice" data-tone="warning">{warning}</p>}
  {leadsGroup&&<p className="sr-group-access"><a className="ui-link" href="/modules/study-rooms/members">Who can book in your group</a></p>}
  <p className="ui-hint sr-freshness">Updated {lastRefresh} Las Vegas time. Refreshes while this screen is open.</p>
 </>;
 return <Reservations status={status} schedule={data} changeDay={setDay} refresh={()=>{void load(day);}} loadDay={loadDay} loadHistory={loadHistory}
   admin={admin} saveAdmin={c=>post('/api/study-rooms/admin',c)} submit={c=>post('/api/study-rooms/command',c)}
   operations={data.canManage&&operations?<StudyOperationsManager data={operations} today={data.today} save={c=>post('/api/study-rooms/operations',c)}/>:null}/>;
}

