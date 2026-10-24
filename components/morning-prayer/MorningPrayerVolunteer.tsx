'use client';
import {useEffect,useMemo,useState} from 'react';
import {Check} from '../home-icons';
import {IconBox,Tray} from '../ui-kit';
import {dayLabel} from './shared';
import type {Occurrence} from './shared';
import styles from './morning-prayer.module.css';

/** Month calendar in a glass card. Choosing a scheduled date opens its detail. */
export function MonthCalendar({month,rows,today,selected,onSelect}:{month:string;rows:Occurrence[];today:string;selected:string;onSelect:(o:Occurrence)=>void}){
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
 const status=(o:Occurrence)=>o.kind==='cancelled'?'Off':o.kind==='app_day'?'App':o.host==='You'?'You':o.host==='Host needed'?'Open':o.verified?'Host':'Check';
 return <section className={'ui-glass '+styles.calendar} aria-label="Monthly Morning Prayer gathering calendar" data-no-swipe>
  <div className={styles.weekHead} aria-hidden="true">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><span key={x}>{x}</span>)}</div>
  <div className={styles.days}>{dates.map((date,i)=>{
   const o=date?lookup.get(date):undefined;
   return date?<button key={date} type="button" disabled={!o} aria-pressed={o?selected===date:undefined}
    aria-label={dayLabel(date)+', '+(o?o.kind==='gathering'?o.host:o.kind==='app_day'?'Pray Daily app day':'cancelled':'not scheduled')}
    className={[date===today?styles.today:'',o?.host==='You'?styles.mine:'',o?.kind==='gathering'&&o.host==='Host needed'?styles.open:'',o&&o.kind!=='gathering'?styles.off:''].join(' ')}
    onClick={()=>{if(o)onSelect(o);}}>
    <strong>{Number(date.slice(-2))}</strong><span aria-hidden="true">{o?status(o):'-'}</span>
   </button>:<span key={'blank-'+i}/>;
  })}</div>
  <ul className="ui-legend" aria-label="Calendar key"><li>Host: assigned</li><li>Open: needs a host</li><li>You: your date</li><li>App: Pray Daily app</li><li>Off: cancelled</li></ul>
 </section>;
}

/** Open, confirmed dates a member may ask to host, with a floating tray for the request. */
export function VolunteerCard({month,rows,today,busy,onSubmit}:{month:string;rows:Occurrence[];today:string;busy:boolean;onSubmit:(ids:string[])=>Promise<boolean>}){
 const [marked,setMarked]=useState<string[]>([]);
 useEffect(()=>setMarked([]),[month,rows.length]);
 const open=rows.filter(o=>o.kind==='gathering'&&o.verified&&o.host==='Host needed'&&o.date>=today);
 function toggle(id:string){setMarked(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<12?[...prev,id]:prev);}
 return <section aria-labelledby="wm-volunteer-title">
  <div className="ui-section-head"><h2 id="wm-volunteer-title">Volunteer to host</h2></div>
  <div className={'ui-glass '+styles.card}>
   <p className={styles.quiet}>Choose one or more open, confirmed dates. Each request waits for a coordinator to approve it.</p>
   {!open.length?<p className={styles.quietLine}>No open dates to host this month.</p>:
    <div className={styles.choiceList} role="group" aria-label="Open dates">{open.map(o=><label key={o.id} className={styles.choice}>
     <input type="checkbox" checked={marked.includes(o.id)} onChange={()=>toggle(o.id)}/>
     <IconBox round>{marked.includes(o.id)?<Check size={20}/>:<span aria-hidden="true">{Number(o.date.slice(-2))}</span>}</IconBox>
     <span className="ui-row-body"><strong>{dayLabel(o.date)}</strong><small>Needs a host</small></span>
    </label>)}</div>}
  </div>
  {marked.length>0&&<Tray className={styles.tray} eyebrow="Selected" summary={marked.length+(marked.length===1?' date to host':' dates to host')}>
   <button type="button" className="ui-button" disabled={busy||!marked.length} onClick={()=>{if(window.confirm('Submit '+marked.length+' hosting request(s) for review?'))void onSubmit(marked).then(saved=>{if(saved)setMarked([]);});}}>
    Request to host
   </button>
  </Tray>}
 </section>;
}
