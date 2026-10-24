'use client';
import {useState} from 'react';
import {ArrowRight,BookOpen,FileText} from '../home-icons';
import {EmptyState,IconBox,PageHeading,SearchField,Segmented,Tag} from '../ui-kit';
import styles from './morning-prayer.module.css';
import {clockTime,longDay,monthLabel,pwpPeriod} from './shared';
import type {Material,Occurrence} from './shared';
import type {Screen} from './MorningPrayerLive';
type Filter='all'|'pwp'|'reading';

/** Short line under a material's title: the PWP month and week, or the reading's summary. */
export function materialPlace(m:Material){
 if(m.kind==='reading')return m.body.summary;
 const period=pwpPeriod(m.key);
 return period?monthLabel(period.month)+' · Week '+period.week:'Weekly activities';
}

/**
 * Atlas mission-materials in Liquid Opal: search, a pill filter and glass rows
 * with tags. Only published wording appears; each row opens to its full text and source.
 */
export default function MaterialsTab({data,today,published,onOpen}:Screen&{onOpen:(o:Occurrence)=>void}){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<Filter>('all');
 const q=query.trim().toLocaleLowerCase();
 const listed=published.filter(m=>(filter==='all'||m.kind===filter)&&(!q||(m.body.title+' '+m.body.summary+' '+m.body.sourceLabel).toLocaleLowerCase().includes(q)))
  .sort((a,b)=>a.kind===b.kind?b.key.localeCompare(a.key):a.kind==='pwp'?-1:1);
 const next=(data.upcoming||[]).find(o=>o.kind==='gathering'&&o.date>=today);
 return <div className={styles.screen}>
  <PageHeading eyebrow="Prepare for the week" title="Materials" lede="Published PWP activities and daily readings, with their sources."/>
  <SearchField label="Find a material" placeholder="Find a material" value={query} onChange={e=>setQuery(e.target.value)}/>
  <Segmented label="Material type" value={filter} onChange={setFilter} options={[['all','All'],['pwp','PWP'],['reading','Readings']]}/>
  {listed.length?<div className="ui-glass ui-glass-tight"><ul className="ui-list" aria-label="Published materials">{listed.map(m=><li key={m.key}>
   <details className={styles.expand+' '+styles.plain}>
    <summary className="ui-row">
     <IconBox>{m.kind==='reading'?<BookOpen size={22}/>:<FileText size={22}/>}</IconBox>
     <span className="ui-row-body"><strong>{m.body.title}</strong><small>{materialPlace(m)}</small></span>
     <Tag>{m.kind==='reading'?'Reading':'PWP'}</Tag>
    </summary>
    <div className={styles.material}>
     <p>{m.body.summary}</p>
     {m.body.items.length>0&&<ul>{m.body.items.map((item,i)=><li key={i}>{item}</li>)}</ul>}
     <p className={styles.quiet}>Source: {m.body.sourceLabel}</p>
    </div>
   </details>
  </li>)}</ul></div>
  :<div className="ui-glass"><EmptyState icon={<BookOpen/>} title={published.length?'No materials match':'No materials published yet'}>
   {published.length?'Try another word or type.':'PWP activities and readings appear here once they are published.'}
  </EmptyState></div>}

  {next&&<section className={'ui-glass '+styles.nextCard} aria-labelledby="wm-prep-title">
   <h2 className="ui-eyebrow" id="wm-prep-title">Your preparation</h2>
   <p className={styles.cardTitle}>Next gathering {longDay(next.date)}</p>
   <p className={styles.quiet}>{clockTime(next.startsAt)} Las Vegas time</p>
   <div className={styles.actions}><button type="button" className="ui-button ui-button-secondary" onClick={()=>onOpen(next)}>View next gathering <ArrowRight size={18}/></button></div>
  </section>}
  <p className={styles.external}><a className="ui-link" href="https://wm.watv.org/login.wmc" target="_blank" rel="noopener noreferrer">Open the PWP card on wm.watv.org</a></p>
 </div>;
}
