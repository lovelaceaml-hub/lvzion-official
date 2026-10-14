'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { allows, applyEditorialCommand, changeSchedule, joinState, latestRecap, prepareExport, publishedRecaps, withSourceRevision, WMError } from '../../lib/wm-prayer/domain';
import type { EditorialCommand, Recap, SafeExport } from '../../lib/wm-prayer/domain';
import { DEMO_CONTENT, DEMO_NOW, PERSONAS, demoOccurrence, demoWorkspace, FRIENDLY_ERRORS } from '../../lib/wm-prayer/fixtures';
import { cardSvg, type CardStyle } from '../../lib/wm-prayer/cards';
import styles from './wm.module.css';

type Screen = 'home' | 'archive' | 'lesson' | 'review';
type Scenario = 'upcoming' | 'completed' | 'pending' | 'cancelled' | 'rescheduled' | 'unverified';
const DATE_LABELS: Record<string,string> = { 'demo-oct12':'Monday, October 12', 'demo-oct13':'Tuesday, October 13', 'demo-oct14':'Wednesday, October 14' };
const cloneContent = () => structuredClone(DEMO_CONTENT);
export default function WMPreview() {
  const [screen,setScreen] = useState<Screen>('home');
  const [personaKey,setPersonaKey] = useState('member');
  const [scenario,setScenario] = useState<Scenario>('upcoming');
  const [workspace,setWorkspace] = useState(demoWorkspace);
  const [occurrence,setOccurrence] = useState(demoOccurrence);
  const [selected,setSelected] = useState('demo-oct13');
  const [reviewSelected,setReviewSelected] = useState('demo-oct14');
  const [cardStyle,setCardStyle] = useState<CardStyle>('outline');
  const [privacyChecked,setPrivacyChecked] = useState(false);
  const [summaryAccepted,setSummaryAccepted] = useState(false);
  const [message,setMessage] = useState('');
  const [share,setShare] = useState<SafeExport | null>(null);
  const [editVariant,setEditVariant] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const view = q.get('view'); if (view && ['home','archive','lesson','review'].includes(view)) setScreen(view as Screen);
    const role = q.get('role'); if (role && PERSONAS.some(p => p.key === role)) setPersonaKey(role);
    const style = q.get('style'); if (style && ['outline','lenses','path'].includes(style)) setCardStyle(style as CardStyle);
  },[]);
  const persona = PERSONAS.find(p => p.key === personaKey)!;
  const actor = persona.actor;
  const published = publishedRecaps(workspace,actor).sort((a,b) => b.occurrenceId.localeCompare(a.occurrenceId));
  const latest = published[0];
  const lesson = published.find(r => r.occurrenceId === selected);
  const candidate = latestRecap(workspace,reviewSelected);
  const source = workspace.sources[reviewSelected];
  const canDraft = allows(actor,'draft',workspace.seriesId,reviewSelected);
  const canApprove = allows(actor,'approve',workspace.seriesId,reviewSelected);
  const canPublish = allows(actor,'publish',workspace.seriesId,reviewSelected);
  const canSource = allows(actor,'view_source',workspace.seriesId,reviewSelected);
  const canSchedule = allows(actor,'manage_schedule',workspace.seriesId,occurrence.id);
  const hasReview = canDraft || canApprove || canPublish || canSource || canSchedule;
  const canRead = allows(actor,'view_recap',workspace.seriesId);
  const now = scenario === 'completed' || scenario === 'pending' ? '2026-10-14T08:10:00-07:00' : DEMO_NOW;
  const join = joinState(occurrence,actor,now);
  // One projection for both the displayed text and clipboard: preserve the occurrence date.
  const shareText = share ? `${DATE_LABELS[selected]}, 2026 · FICTIONAL\n\n${share.text}` : '';
  const navigate = (next: Screen) => { setScreen(next);setShare(null);setMessage(''); };
  const readLesson = (id:string) => { setSelected(id);navigate('lesson'); };
  const errorMessage = (error:unknown) => error instanceof WMError ? FRIENDLY_ERRORS[error.code] || error.code : 'This preview action could not be completed.';
  function run(action:EditorialCommand) {
    try { setWorkspace(applyEditorialCommand(workspace,actor,action));setMessage(action.action === 'publish' ? 'Published in this fictional preview only. Nothing was sent.' : action.action === 'correct' ? 'New draft created. The previously published version is unchanged.' : `Preview ${action.action} complete.`);setPrivacyChecked(false);setSummaryAccepted(false);setShare(null); }
    catch(error) { setMessage(errorMessage(error)); }
  }
  function setDemoScenario(value:Scenario) {
    setScenario(value);setShare(null);const next=demoOccurrence();
    if(value === 'completed' || value === 'pending') next.status='completed';
    if(value === 'cancelled') { next.status='cancelled';next.accessVerified=false; }
    if(value === 'unverified') { next.scheduleVerified=false;next.accessVerified=false;next.timezone=null; }
    if(value === 'rescheduled') { next.status='rescheduled';next.startsAt='2026-10-14T07:30:00-07:00';next.endsAt='2026-10-14T08:00:00-07:00';next.scheduleVerified=false;next.accessVerified=false; }
    setOccurrence(next);
    setWorkspace(w => ({ ...w, version:w.version+1,sources:{...w.sources,'demo-oct14':{...w.sources['demo-oct14'],state:value === 'pending' ? 'missing' : 'ready'}} }));
  }
  function reset() { setWorkspace(demoWorkspace());setOccurrence(demoOccurrence());setScenario('upcoming');setMessage('Fictional changes reset.');setShare(null);setPrivacyChecked(false);setSummaryAccepted(false); }
  function schedule(action:'cancel'|'reschedule') {
    try {setOccurrence(changeSchedule(occurrence,actor,occurrence.version,action,'2026-10-14T07:30:00-07:00','2026-10-14T08:00:00-07:00'));setMessage(action === 'cancel' ? 'Fictional gathering cancelled. No messages sent.' : 'Moved to 7:30 AM in the preview. Schedule and access must be reverified.');}
    catch(error) {setMessage(errorMessage(error));}
  }
  function inspectSource(kind:'duplicate'|'updated'|'partial'|'failed') {
    if(!canSource) {setMessage('Source review is not authorized.');return;}
    if(kind === 'duplicate') {setMessage('Duplicate notification: same fictional occurrence and source content. No new gathering or recap was created.');return;}
    setWorkspace(withSourceRevision(workspace,reviewSelected,{...source,revision:source.revision+1,state:kind === 'updated' ? 'ready' : kind}));
    setShare(null);setMessage(kind === 'updated' ? 'Updated source received in the simulation. Existing publication is preserved; a new draft needs review.' : 'Source incomplete. Generation, approval and sharing are blocked.');
  }
  function exportLesson() {
    try {setShare(prepareExport(workspace,actor,selected,true));setMessage('Two separate outputs are ready for review. There is no Signal connection or automatic posting.');}
    catch(error) {setMessage(errorMessage(error));}
  }
  async function copyText() {
    if(!share) return;
    try {await navigator.clipboard.writeText(shareText);setMessage('Fictional explanation and gathering date copied. Nothing was sent.');}
    catch {setMessage('Clipboard is unavailable. Select the explanation below and copy it manually.');}
  }
  async function saveCard() {
    if(!share) return;
    const svg=cardSvg(share.content,cardStyle,share.revision,DATE_LABELS[selected]);
    const svgUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    try {
      const image=new Image();await new Promise<void>((resolve,reject) => {image.onload=()=>resolve();image.onerror=()=>reject(new Error('render'));image.src=svgUrl;});
      const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=900;
      const ctx=canvas.getContext('2d');if(!ctx) throw new Error('canvas');ctx.drawImage(image,0,0,1080,900);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value ? resolve(value) : reject(new Error('png')),'image/png'));
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`fictional-wm-${selected}-${cardStyle}-r${share.revision}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);setMessage('Fictional card prepared as a PNG. No message was sent.');
    } catch {setMessage('Image export is unavailable in this browser. The readable on-screen card is unchanged.');}
    finally {URL.revokeObjectURL(svgUrl);}
  }
  const card=(recap:Recap) => <section className={`${styles.lessonCard} ${styles[cardStyle]}`} data-testid="lesson-card" aria-label="Fictional educational lesson card">
    <div className={styles.cardEyebrow}>FICTIONAL LESSON CARD · REVISION {recap.revision}</div>
    <h2>{recap.content.title}</h2><p className={styles.central}>{recap.content.centralMessage}</p>
    <div className={styles.points}>{recap.content.points.map((point,index)=><div className={styles.point} key={point.sourceSection}><span className={styles.pointNumber}>0{index+1}</span><div><h3>{point.label}</h3><p>{point.text}</p></div></div>)}</div>
    <footer>Summary-based example · Not a real lesson</footer>
  </section>;
  const command=(action:'submit'|'publish'):EditorialCommand=>({ action,recapId:candidate!.id,expectedVersion:workspace.version,at:now });
  return <main className={styles.root}>
    <div className={styles.shell}>
      <header className={styles.header}><Link href="/experience-preview" className={styles.back}>‹ LV Zion Official</Link><span className={styles.previewPill}>Development preview</span></header>
      <div className={styles.titleRow}><div><p className={styles.eyebrow}>WORK MISSION</p><h1>Prayer Gatherings</h1></div><span className={styles.monogram} aria-hidden="true">WM</span></div>
      <p className={styles.demoNotice}>Fictional content. No real gathering links, members, or messages.</p>
      <nav className={styles.tabs} aria-label="WM application"><button aria-current={screen==='home' ? 'page' : undefined} onClick={()=>navigate('home')}>Home</button><button aria-current={['archive','lesson'].includes(screen) ? 'page' : undefined} onClick={()=>navigate('archive')}>Lessons</button>{hasReview && <button aria-current={screen==='review' ? 'page' : undefined} onClick={()=>navigate('review')}>Manage</button>}</nav>
      <details className={styles.options}><summary>Preview controls <span>{persona.label}</span></summary><div className={styles.optionsBody}>
        <label>Preview role<select aria-label="Preview role" value={personaKey} onChange={e=>{setPersonaKey(e.target.value);setShare(null);setPrivacyChecked(false);setSummaryAccepted(false);setMessage('');}}>{PERSONAS.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
        <p>{persona.description} Role switching is not authentication.</p>
        <label>Gathering scenario<select aria-label="Gathering scenario" value={scenario} onChange={e=>setDemoScenario(e.target.value as Scenario)}><option value="upcoming">Upcoming — within join window</option><option value="completed">Completed — latest lesson first</option><option value="pending">Completed — source pending</option><option value="cancelled">Cancelled</option><option value="rescheduled">Rescheduled — verify access</option><option value="unverified">Schedule not verified</option></select></label>
        <p>Illustrative October 2026 dates, Pacific timezone and 30-minute duration. The real schedule is not verified.</p><button className={styles.secondary} onClick={reset}>Reset fictional changes</button>
      </div></details>
      {message && <p className={styles.message} role="status">{message}</p>}
      {screen === 'home' && <>
        <div className={styles.sectionHeader}><h2>{join==='join' ? 'Coming up' : 'For your morning'}</h2><span>Wednesday, Oct 14 · Demo</span></div>
        {join !== 'join' && latest && <section className={styles.feature}><p className={styles.eyebrow}>LATEST APPROVED LESSON · FICTIONAL</p><h2>{latest.content.title}</h2><p>{latest.content.centralMessage}</p><button className={styles.primary} onClick={()=>readLesson(latest.occurrenceId)}>Read the lesson <span>→</span></button></section>}
        {allows(actor,'participate',workspace.seriesId,occurrence.id) && <section className={styles.gathering} data-testid="gathering-panel"><div className={styles.gatheringTop}><span className={styles.dateTile}>OCT<strong>14</strong></span><div><p className={styles.eyebrow}>{occurrence.status.toUpperCase()} · FICTIONAL</p><h2>{occurrence.status==='rescheduled' ? '7:30 AM' : '7:00 AM'}</h2><p>Work Mission Prayer Gathering</p></div></div>
          {join==='join' ? <><p className={styles.subtle}>A simulated gathering is about to begin.</p><button className={styles.primary} onClick={()=>setMessage('Preview only. No meeting opened and no credentials were requested.')}>Join Gathering <span>↗</span></button></> : <p className={styles.stateNote}>{join==='cancelled' ? 'This fictional occurrence is cancelled. No join action is available.' : join==='schedule_unverified' ? 'Schedule or meeting access needs verification. Joining remains unavailable.' : occurrence.status==='completed' ? 'This gathering is complete.' : 'Outside the simulated join window. Read the latest lesson below.'}</p>}
          {scenario==='pending' && <p className={styles.warning}>Source pending. A complete lesson is not yet available.</p>}
        </section>}
        {join==='join' && latest && <section className={styles.feature}><p className={styles.eyebrow}>LATEST APPROVED LESSON · OCT 13 · FICTIONAL</p><h2>{latest.content.title}</h2><p>{latest.content.centralMessage}</p><button className={styles.textButton} onClick={()=>readLesson(latest.occurrenceId)}>Read graphic + explanation →</button></section>}
        {!canRead && <section className={styles.empty}><h2>No WM access assigned</h2><p>Technical, group and department authority do not automatically grant gathering or lesson access.</p></section>}
        {canRead && <button className={styles.archiveLink} onClick={()=>navigate('archive')}>Browse approved lessons <span>→</span></button>}
      </>}
      {screen==='archive' && <><div className={styles.sectionHeader}><h2>Lesson archive</h2><span>October 2026 · Fictional</span></div><p className={styles.subtle}>The compact lesson card and full explanation stay together. Only the currently published version appears here.</p>{published.length ? <div className={styles.archive}>{published.map(r=><button key={r.id} className={styles.archiveItem} onClick={()=>readLesson(r.occurrenceId)}><span className={styles.archiveDate}>{DATE_LABELS[r.occurrenceId]} · Demo</span><strong>{r.content.title}</strong><span>{r.content.centralMessage}</span><small>Approved in preview · Revision {r.revision} <b>Read →</b></small></button>)}</div> : <section className={styles.empty}><h2>No authorized published lessons</h2><p>Drafts and source assets are not included in the member archive.</p></section>}</>}
      {screen==='lesson' && <>
        <button className={styles.textButton} onClick={()=>navigate('archive')}>‹ Lesson archive</button>
        {lesson ? <><div className={styles.sectionHeader}><span>{DATE_LABELS[selected]} · Fictional</span><span className={styles.approved}>Approved in preview</span></div>
          <fieldset className={styles.stylePicker}><legend>Educational card direction</legend>{(['outline','lenses','path'] as CardStyle[]).map((style,index)=><button key={style} aria-pressed={cardStyle===style} onClick={()=>{setCardStyle(style);setShare(null);}}>{index+1}. {style==='outline' ? 'Lesson outline' : style==='lenses' ? 'Three lenses' : 'Learning path'}</button>)}</fieldset>
          {card(lesson)}
          <div className={styles.sourceLimit}><strong>Source limitation</strong><p>This fictional example models a summary-only recap. No recording or full transcript was reviewed. All wording is paraphrase, not a verbatim quotation.</p></div>
          <article className={styles.explanation}><p className={styles.eyebrow}>DETAILED EXPLANATION</p>{lesson.content.explanation.map(p=><section key={p.heading}><h2>{p.heading}</h2><p>{p.text}</p></section>)}</article>
          <section className={styles.provenance}><h2>About this version</h2><dl><dt>Gathering</dt><dd>{DATE_LABELS[selected]}, 2026 · Fictional</dd><dt>Source type</dt><dd>Fictional meeting summary</dd><dt>Generation time</dt><dd>{new Date(lesson.generatedAt).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})} Pacific · Demo</dd><dt>Revision</dt><dd>{lesson.revision}</dd><dt>Review</dt><dd>Independent fictional reviewer</dd><dt>Publication</dt><dd>This preview only</dd></dl><p>Original sources require separate permission. Publication does not grant recording, transcript or meeting access.</p></section>
          {allows(actor,'share_external',workspace.seriesId,selected) ? <section className={styles.sharing}><h2>Prepare for sharing</h2><p>Graphic and explanation are separate. No direct Signal posting.</p><button className={styles.primary} onClick={exportLesson}>Prepare approved outputs</button>{share && <div data-testid="share-output"><div className={styles.actions}><button onClick={saveCard}>Save fictional PNG</button><button onClick={copyText}>Copy explanation</button></div><label>Approved fictional text<textarea readOnly rows={12} value={shareText} /></label></div>}</section> : <p className={styles.subtle}>External sharing requires its own permission.</p>}
        </> : <section className={styles.empty}><h2>Lesson unavailable</h2><p>This role cannot view this lesson, or it has not been published.</p></section>}
      </>}
      {screen==='review' && <>
        {!hasReview ? <section className={styles.empty}><h2>Management access is not assigned</h2><p>Changing the page address does not grant editorial permission.</p></section> : <>
          <div className={styles.sectionHeader}><h2>Gathering workspace</h2><span>Fictional review</span></div>
          {canSchedule && <section className={styles.panel}><h2>Schedule changes</h2><p>The original occurrence identity is preserved. Changing the time invalidates meeting-access verification.</p><div className={styles.actions}><button onClick={()=>schedule('reschedule')}>Move to 7:30 AM</button><button onClick={()=>schedule('cancel')}>Cancel occurrence</button></div><p>Status: {occurrence.status} · Schedule revision {occurrence.version}</p></section>}
          {(canSource||canDraft||canApprove||canPublish) && <>
            <label className={styles.field}>Fictional gathering<select aria-label="Fictional gathering" value={reviewSelected} onChange={e=>{setReviewSelected(e.target.value);setPrivacyChecked(false);setSummaryAccepted(false);}}>{Object.entries(DATE_LABELS).reverse().map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
            <div className={styles.flow} aria-label="Editorial stages"><span>Original source</span><span>Draft</span><span>Reviewed</span><span>Published</span></div>
            {canSource ? <section className={styles.panel} data-testid="source-panel"><div className={styles.sectionHeader}><h2>Protected source review</h2><span>Revision {source.revision}</span></div><p className={source.state==='ready' ? styles.subtle : styles.warning}>Source {source.state==='ready' ? 'available — fictional summary only' : `incomplete (${source.state})`}</p>{source.state==='ready' && <details><summary>Read the fictional source</summary><p>Central: Listen carefully, explain one point clearly, and leave room for a thoughtful response.</p>{DEMO_CONTENT.points.map(p=><p key={p.label}><strong>{p.sourceSection}:</strong> {p.text}</p>)}<p>Only these invented source sections support this preview. There is no transcript, recording, attendee list or live source link.</p></details>}<details><summary>Test source-import scenarios</summary><div className={styles.actions}><button onClick={()=>inspectSource('duplicate')}>Duplicate notification</button><button onClick={()=>inspectSource('updated')}>Updated summary</button><button onClick={()=>inspectSource('partial')}>Incomplete transcript</button><button onClick={()=>inspectSource('failed')}>Failed import</button></div><p>These controls simulate outcomes without reading Gmail or fetching an asset.</p></details></section> : <p className={styles.sourceLimit}>Source-asset access is not included with this role.</p>}
            {candidate && <section className={styles.panel} data-testid="review-panel"><div className={styles.sectionHeader}><h2>Lesson revision {candidate.revision}</h2><span>{candidate.state}</span></div><p>{candidate.content.title}</p><p>{candidate.content.centralMessage}</p><p className={styles.subtle}>Bound to source revision {candidate.sourceRevision}. Current workspace revision {workspace.version}.</p>
              <details><summary>Review all proposed wording and evidence</summary>{candidate.content.points.map(p=><p key={p.label}><strong>{p.label}:</strong> {p.text}<small className={styles.evidence}>Source section: {p.sourceSection}</small></p>)}{candidate.content.explanation.map(p=><section key={p.heading}><h3>{p.heading}</h3><p>{p.text}</p><small>Source section: {p.sourceSection}</small></section>)}</details>
              {canDraft && <><label className={styles.check}><input type="checkbox" checked={editVariant} onChange={e=>setEditVariant(e.target.checked)} /> Use a prewritten fictional wording correction</label><div className={styles.actions}><button onClick={()=>{const content=cloneContent();if(editVariant)content.centralMessage='Understand the question, share one clear point, and return thoughtfully to what remains.';run({action:'correct',content,recapId:candidate.id,expectedVersion:workspace.version,at:now});}}>Create corrected draft</button><button disabled={candidate.state!=='draft'} onClick={()=>run(command('submit'))}>Submit for review</button></div><p className={styles.subtle}>Only fixed fictional alternatives are editable here. Personal content is not collected.</p></>}
              {canApprove && <><label className={styles.check}><input type="checkbox" checked={privacyChecked} onChange={e=>setPrivacyChecked(e.target.checked)} /> I checked all wording against the source and excluded private details.</label><label className={styles.check}><input type="checkbox" checked={summaryAccepted} onChange={e=>setSummaryAccepted(e.target.checked)} /> I accept the summary-only limitation; no verbatim or recording-review claim.</label><button className={styles.primary} disabled={candidate.state!=='review'} onClick={()=>run({action:'approve',recapId:candidate.id,expectedVersion:workspace.version,at:now,privacyChecked,summaryLimitAccepted:summaryAccepted})}>Approve reviewed version</button><p className={styles.subtle}>Approval does not publish. The author cannot approve their own draft.</p></>}
              {canPublish && <><button className={styles.primary} disabled={candidate.state!=='approved'} onClick={()=>run(command('publish'))}>Publish in fictional preview</button><p className={styles.subtle}>Only an approved, source-current version may replace the member-facing recap.</p></>}
              <p className={styles.publication}>Current member publication: {workspace.published[reviewSelected] ? `revision ${workspace.recaps.find(r=>r.id===workspace.published[reviewSelected])?.revision}` : 'not published'}. A draft never replaces it automatically.</p>
            </section>}
            <section className={styles.panel}><h2>Revision history</h2>{workspace.recaps.filter(r=>r.occurrenceId===reviewSelected).map(r=><p key={r.id}>Revision {r.revision} · Source {r.sourceRevision} · {r.state}{workspace.published[reviewSelected]===r.id ? ' · current publication' : ''}</p>)}{workspace.history.length>0 && <details><summary>Preview audit trail</summary>{workspace.history.map((h,i)=><p key={i}>{h.event} · {h.actorId.replace('demo-','Fictional ')} · workspace {h.version}</p>)}</details>}</section>
          </>}
          <section className={styles.disabled}><strong>Live workflow is off</strong><p>Gmail ingestion, automatic generation, recurring jobs, real publication and distribution are not activated.</p></section>
        </>}
      </>}
      <footer className={styles.footer}>LV Zion Official · Work Mission Prayer Gatherings<br />Preview changes exist only in this page and reset on reload.</footer>
    </div>
  </main>;
}
