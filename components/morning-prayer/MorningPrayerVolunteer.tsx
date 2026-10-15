'use client';
import {useEffect,useMemo,useState} from 'react';
import {dayLabel} from './shared';
import type {Occurrence} from './shared';
import styles from './morning-prayer.module.css';
export default function MorningPrayerVolunteer({
 month,rows,today,selected,onSelect,canVolunteer,busy,onSubmit
}:{month:string;rows:Occurrence[];today:string;selected:string|null;onSelect:(id:string)=>void;
 canVolunteer:boolean;busy:boolean;onSubmit:(ids:string[])=>Promise<boolean>}){
 const [marked,setMarked]=useState<string[]>([]);
 useEffect(()=>setMarked([]),[month,rows.length]);
 const lookup=new Map(rows.map(o=>[o.date,o]));
 const dates=useMemo(()=>{
  if(!/^[0-9]{4}-[0-9]{2}$/.test(month))return [];
  const [year,number]=month.split('-').map(Number);
  const first=new Date(Date.UTC(year,number-1,1));
  const blanks=(first.getUTCDay()+6)%7;
  const count=new Date(Date.UTC(year,number,0)).getUTCDate();
  const all:(string|null)[]=Array(blanks).fill(null);
  for(let d=1;d<=count;d++)all.push(month+'-'+String(d).padStart(2,'0'));
  return all;
 },[month]);
 const open=rows.filter(o=>o.kind==='gathering'&&o.verified&&o.host==='Host needed'&&o.date>=today);
 function toggle(id:string){setMarked(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<12?[...prev,id]:prev);}
 const status=(o:Occurrence)=>o.kind==='cancelled'?'Off':o.kind==='app_day'?'App':o.host==='You'?'You':o.host==='Host needed'?'Open':o.verified?'Host':'Check';
 return <div>
  <section aria-label="Monthly Morning Prayer gathering calendar" data-no-swipe>
   <div className={styles.weekHead} aria-hidden="true">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><span key={x}>{x}</span>)}</div>
   <div className={styles.days}>{dates.map((date,i)=>{
    const o=date?lookup.get(date):undefined;
    return date?<button key={date} type="button" disabled={!o} aria-pressed={o?selected===o.id:undefined}
     aria-label={dayLabel(date)+', '+(o?o.kind==='gathering'?o.host:o.kind==='app_day'?'Pray Daily app day':'cancelled':'not scheduled')}
     className={[date===today?styles.today:'',o?.host==='You'?styles.mine:'',o?.kind==='gathering'&&o.host==='Host needed'?styles.open:''].join(' ')}
     onClick={()=>{if(o)onSelect(o.id);}}>
     <strong>{Number(date.slice(-2))}</strong><span aria-hidden="true">{o?status(o):'-'}</span>
    </button>:<span key={'blank-'+i}/>;
   })}</div>
   <p className={styles.legend}>Choose a scheduled date to see its details. Open means the date still needs a host.</p>
  </section>
  {canVolunteer&&<section aria-labelledby="wm-volunteer-title">
   <h2 className={styles.heading} id="wm-volunteer-title">Volunteer to host</h2>
   <p className={styles.quiet}>Choose one or more open, confirmed dates. Each request waits for a coordinator to approve it.</p>
   {!open.length?<p className={styles.quiet}>No open dates to host this month.</p>:<>
    <div className={styles.checkList} role="group" aria-label="Open dates">{open.map(o=><label key={o.id} className={styles.check}>
     <input type="checkbox" checked={marked.includes(o.id)} onChange={()=>toggle(o.id)}/>
     <span>{dayLabel(o.date)}</span>
    </label>)}</div>
    <div className={styles.actions}><button type="button" className="ui-button" disabled={busy||!marked.length} onClick={()=>{if(window.confirm('Submit '+marked.length+' hosting request(s) for review?'))void onSubmit(marked).then(saved=>{if(saved)setMarked([]);});}}>
     Submit {marked.length||''} hosting request{marked.length===1?'':'s'}
    </button></div>
   </>}
  </section>}
 </div>;
}
