'use client';
import {useEffect,useMemo,useState} from 'react';
import type {WMOcc} from './MorningPrayerOperations';
import styles from './volunteer.module.css';
export default function MorningPrayerVolunteer({
 month,rows,today,selected,onSelect,canVolunteer,busy,onSubmit
}:{month:string;rows:WMOcc[];today:string;selected:string|null;onSelect:(id:string)=>void;
 canVolunteer:boolean;busy:boolean;onSubmit:(ids:string[])=>Promise<void>}){
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
 return <div className={styles.wrap}>
  <section className={styles.calendar} aria-label="Monthly Morning Prayer gathering calendar">
   <div className={styles.head}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><span key={x}>{x}</span>)}</div>
   <div className={styles.days}>{dates.map((date,i)=>{
    const o=date?lookup.get(date):undefined;
    return date?<button key={date} type="button" disabled={!o} aria-pressed={selected===o?.id}
     aria-label={date+' '+(o?o.kind==='gathering'?o.host:o.kind:'not scheduled')}
     className={[date===today?styles.today:'',o?.host==='You'?styles.mine:'',o?.kind==='gathering'&&o.host==='Host needed'?styles.open:''].join(' ')}
     onClick={()=>{if(o)onSelect(o.id);}}>
     <strong>{Number(date.slice(-2))}</strong><span>{!o?'—':o.kind==='cancelled'?'Off':o.kind==='app_day'?'App':o.host==='You'?'You':o.host==='Host needed'?'Open':o.verified?'Host':'Check'}</span>
    </button>:<span key={'blank-'+i}/>;
   })}</div>
   <p className={styles.legend}>Select an existing date to review its details. Only authorized schedule records appear.</p>
  </section>
  {canVolunteer&&<section className={styles.volunteer}>
   <h2>Volunteer for available dates</h2>
   <p>Select one or several open, verified dates. Requests remain pending until an authorized reviewer approves them.</p>
   {!open.length?<p className={styles.empty}>No verified open hosting dates in this month.</p>:<>
    <div className={styles.openList}>{open.map(o=><label key={o.id}>
     <input type="checkbox" checked={marked.includes(o.id)} onChange={()=>toggle(o.id)}/>
     <span>{new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(o.date+'T12:00:00Z'))}</span>
    </label>)}</div>
    <button disabled={busy||!marked.length} onClick={()=>{if(window.confirm('Submit '+marked.length+' hosting request(s) for review?'))void onSubmit(marked).then(()=>setMarked([]));}}>
     Submit {marked.length||''} hosting request{marked.length===1?'':'s'}
    </button>
   </>}
  </section>}
 </div>;
}