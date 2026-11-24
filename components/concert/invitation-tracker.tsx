'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {SearchField,StatGrid,StatTile,EmptyState} from '../ui-kit';
import {UsersRound} from '../home-icons';
import {ConcertSectionHeading} from './event-design';
import {deliveryLabel,filterInvitations,groupInvitations,openLabel,trackerStamp,trackerStats,type GroupMode,type InvitationRow,type TestFilter,type TrackerData} from '../../lib/concert/invitation-tracker';
import {invitationWorkbook} from '../../lib/concert/invitation-export';
import type {ConcertEvent} from '../../lib/concert/domain';

const endpoint='/api/concert/invitation-tracker';
async function read(response:Response){
  const value=await response.json();
  if(!response.ok)throw Error(typeof value.error==='string'?value.error:'Invitation tracker unavailable.');
  return value;
}
export default function InvitationTracker({event}:{event:ConcertEvent}){
  const [data,setData]=useState<TrackerData|null>(null),[error,setError]=useState(''),[note,setNote]=useState('');
  const [query,setQuery]=useState(''),[tests,setTests]=useState<TestFilter>('exclude'),[group,setGroup]=useState<GroupMode>('all');
  const [rsvp,setRsvp]=useState('all'),[delivery,setDelivery]=useState('all'),[loading,setLoading]=useState(false),[busy,setBusy]=useState('');
  const generation=useRef(0);
  const refresh=useCallback(async()=>{
    const current=++generation.current;
    setLoading(true);setError('');
    try{
      const value=await read(await fetch(endpoint,{cache:'no-store'})) as TrackerData;
      if(current===generation.current)setData(value);
    }catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'Invitation tracker unavailable.');}
    finally{if(current===generation.current)setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();return ()=>{generation.current++;};},[refresh,event.id]);
  const rows=useMemo(()=>filterInvitations(data?.rows??[],query,tests,rsvp,delivery),[data,query,tests,rsvp,delivery]);
  const groups=useMemo(()=>groupInvitations(rows,group),[rows,group]);
  const totals=trackerStats(rows);
  async function act(row:InvitationRow,action:'markTest'|'resend'){
    if(!data||busy)return;
    if(action==='resend'&&!window.confirm('Resend the existing invitation to '+row.name+'?'))return;
    setBusy(row.id);setError('');setNote('');
    try{
      await read(await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action,eventId:data.eventId,id:row.id,test:!row.test})}));
      setNote(action==='resend'?'Invitation email submitted. Delivery is tracked separately.':row.test?'Restored to the main invitation list.':'Marked as test; original record preserved.');
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'The change could not be confirmed.');}
    finally{setBusy('');}
  }
  function exportRows(){
    if(!rows.length)return;
    const bytes=invitationWorkbook(groups.flatMap(g=>g.rows));
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    const a=document.createElement('a');a.href=url;a.download='concert-invitations.xlsx';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <>
    <ConcertSectionHeading title="Invitation Tracker" event={event}/>
    <p className="cc-hint">Named invitations only. Shared links and independently registered guests are not counted as invitations sent.</p>
    <StatGrid label="Filtered invitation totals">
      <StatTile label="Invitations" value={totals.total}/>
      <StatTile label="Delivered" value={totals.delivered}/>
      <StatTile label="Confirmed" value={totals.confirmed} tone="accent"/>
      <StatTile label="Pending RSVP" value={totals.pending}/>
      <StatTile label="Bounced" value={totals.bounced}/>
      <StatTile label="Open reported" value={totals.opened}/>
    </StatGrid>
    <div className="cc-actions">
      <button className="ui-button ui-button-secondary" type="button" disabled={loading||!!busy} onClick={()=>void refresh()}>{loading?'Refreshing…':'Refresh delivery'}</button>
      <button className="ui-button" type="button" disabled={!rows.length||loading} onClick={exportRows}>Export Excel</button>
    </div>
    <SearchField label="Search invitations" placeholder="Guest, email, member or leader" value={query} onChange={e=>setQuery(e.target.value)}/>
    <div className="cc-two">
      <label className="ui-field"><span>Group by</span><select className="ui-input" value={group} onChange={e=>setGroup(e.target.value as GroupMode)}><option value="all">All invitations</option><option value="member">Member / sender</option><option value="leader">Group leader</option></select></label>
      <label className="ui-field"><span>Test records</span><select className="ui-input" value={tests} onChange={e=>setTests(e.target.value as TestFilter)}><option value="exclude">Exclude marked tests</option><option value="include">Include tests</option><option value="only">Tests only</option></select></label>
      <label className="ui-field"><span>RSVP / registration</span><select className="ui-input" value={rsvp} onChange={e=>setRsvp(e.target.value)}>{['all','Confirmed','Pending','Linked','Withdrawn','Registered','Possible separate registration','Cancelled','No linked ticket'].map(x=><option key={x} value={x}>{x==='all'?'All statuses':x}</option>)}</select></label>
      <label className="ui-field"><span>Delivery</span><select className="ui-input" value={delivery} onChange={e=>setDelivery(e.target.value)}>{['all','Delivered','Bounced','Failed','Delayed','Complaint','Sent – delivery unverified','Sending','Pending','Link only'].map(x=><option key={x} value={x}>{x==='all'?'All delivery statuses':x}</option>)}</select></label>
    </div>
    {data&&data.provider!=='checked'?<p className="cc-hint" role="status">{data.provider==='not configured'?'Provider lookup is not configured. App sending status does not prove delivery.':'Provider lookup is partial; unmatched or older messages remain unverified.'}</p>:null}
    <p className="cc-hint">Open reporting is not proof of reading. Excel exports the filtered rows without private email addresses or invitation links.</p>
    {error?<p className="cc-error" role="alert">{error}</p>:null}
    {note?<p className="cc-note" role="status">{note}</p>:null}
    {!data&&loading?<p className="cc-hint" role="status">Loading invitations…</p>:null}
    {data&&!rows.length?<EmptyState icon={<UsersRound size={28}/>} title="No matching invitations">Try changing your filters.</EmptyState>:null}
    {groups.map((g,index)=><section className="cc-panel cc-registration" key={index} aria-label={g.label}>
      <h2>{g.label} · {g.rows.length}</h2>
      <ul className="cc-reg-results">{g.rows.map(row=><li key={row.id}>
        <strong>{row.name}{row.test?' · Test':''}</strong>
        <span>{row.email||'No email · shared link only'}</span>
        <span>Invited by {row.sender} · {row.leader||'Group leader not recorded'}</span>
        <small>Created {trackerStamp(row.createdAt)} Pacific</small>
        <span>{deliveryLabel(row)} · {openLabel(row)}</span>
        {row.providerSentAt?<small>Provider send: {trackerStamp(row.providerSentAt)} Pacific</small>:null}
        <span>RSVP: {row.rsvp} · {row.registration}</span>
        <small>{row.attempts} send attempt{row.attempts===1?'':'s'}{row.mailUpdatedAt?' · App update '+trackerStamp(row.mailUpdatedAt):''}</small>
        <div className="cc-actions">
          <button className="ui-button ui-button-quiet" type="button" disabled={!!busy||loading} onClick={()=>void act(row,'markTest')}>{row.test?'Unmark test':'Mark as test'}</button>
          <button className="ui-button ui-button-secondary" type="button" disabled={!row.canResend||!!busy||loading||row.providerEvent==='complained'||row.providerEvent==='bounced'||row.providerEvent==='suppressed'} onClick={()=>void act(row,'resend')}>Resend invitation</button>
        </div>
      </li>)}</ul>
    </section>)}
  </>;
}
