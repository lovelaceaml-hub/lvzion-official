'use client';
import {useMemo,useState} from 'react';
import {preflightRoster} from '../../lib/roster-preflight';
import {rosterScenarios,sampleContext} from '../../lib/roster-samples';
import './roster-preview.css';
export default function RosterPreview(){
 const[scenario,setScenario]=useState<keyof typeof rosterScenarios>('clean');
 const report=useMemo(()=>preflightRoster(rosterScenarios[scenario].csv,sampleContext),[scenario]);
 return <main className="roster-preview">
  <header><a href="/experience-preview">← LV Zion</a><span>FICTIONAL DATA ONLY</span></header>
  <p className="roster-kicker">MEMBER FOUNDATION / IMPORT REHEARSAL</p>
  <h1>Review first.<br/><em>Import later.</em></h1>
  <p className="roster-intro">Explore how a controlled roster review will catch duplicate people and incorrect placements before anything reaches the member database.</p>
  <aside className="roster-safe" role="note"><strong>Nothing is uploaded or imported.</strong><p>These are fixed fictional examples. This screen accepts no personal files or live member details, creates no accounts, and sends no invitations.</p></aside>
  <fieldset className="roster-scenarios"><legend>Choose a sample scenario</legend>{Object.entries(rosterScenarios).map(([id,item])=><button type="button" key={id} aria-pressed={scenario===id} onClick={()=>setScenario(id as keyof typeof rosterScenarios)}>{item.label}</button>)}</fieldset>
  <section aria-label="Review summary" className="roster-counts" aria-live="polite"><div><strong>{report.counts.ready}</strong><span>Ready for review</span></div><div><strong>{report.counts.review}</strong><span>Check matches</span></div><div><strong>{report.counts.blocked}</strong><span>Needs correction</span></div></section>
  <div className="roster-scope"><span>Example reviewing scope</span><strong>Category A · Group 1 · Units 1 &amp; 2</strong><p>Being able to review one group does not authorize an import into another group.</p></div>
  <section aria-label="Fictional roster rows" className="roster-rows">{report.rows.map(row=><article key={row.rowNumber} className="roster-row"><div className="roster-row-heading"><span className="roster-avatar" aria-hidden="true">{row.data.display_name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span><div><small>DATA ROW {row.rowNumber}</small><h2>{row.data.display_name}</h2></div><span className={'roster-state roster-state-'+row.state}>{row.state==='ready'?'Ready':row.state==='review'?'Review':'Blocked'}</span></div><p className="roster-placement">{row.data.category_code} / {row.data.group_code} / {row.data.unit_code}</p>{row.issues.length?<ul>{row.issues.map((issue,i)=><li key={i}>{issue.message}</li>)}</ul>:<p className="roster-clear">The sample row passes format, placement, scope, and duplicate checks.</p>}</article>)}</section>
  <footer><strong>Records written: 0</strong><p>Passing preflight is not permission to import. A real import will still require authorized review, a current backup, and a verified member-matching workflow.</p><a href="/member-preview">Explore member management →</a></footer>
 </main>;
}
