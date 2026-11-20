'use client';

import {useEffect,useState,type FormEvent} from 'react';
import {FrameControls} from '../app-frame';
import './concert.css';

type Placement = {id:string;name:string;title:string;location:string;leader:string};
type PlacementData = {groups:{id:string;name:string}[];requests:Placement[]};

export default function ConcertPlacement() {
  const [data,setData] = useState<PlacementData|null>(null);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [busy,setBusy] = useState(false);

  useEffect(()=>{
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/concert/placement',{signal:controller.signal,cache:'no-store'});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setData(result);
      } catch (error) {if (!controller.signal.aborted) setError(error instanceof Error?error.message:'Unable to load requests.');}
    }
    void load();
    return ()=>controller.abort();
  },[]);

  async function approve(event: FormEvent<HTMLFormElement>, request: Placement) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/concert/placement',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:request.id,groupId:form.get('groupId'),verified:form.get('verified')==='on'})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(data=>data&&{...data,requests:data.requests.filter(item=>item.id!==request.id)});
      setNotice(request.name+' was placed.');
    } catch (error) {setError(error instanceof Error?error.message:'Unable to confirm this placement.');}
    finally {setBusy(false);}
  }

  return <main className="ui-main ui-narrow cc-page">
    <FrameControls title="Member placement" left={{label:'Event',icon:'music',href:'/modules/concert'}} right={{label:'Placement',icon:'people',active:true}}/>
    <h1>Group placement requests</h1>
    {error?<p className="cc-error" role="alert">{error}</p>:null}
    {notice?<p className="cc-note" role="status">{notice}</p>:null}
    {!data&&!error?<p role="status">Loading requests…</p>:null}
    {data&&!data.requests.length?<p>No verified requests are waiting for placement.</p>:null}
    {data?.requests.map(request=><section key={request.id} className="cc-panel cc-registration">
      <h2>{request.title} {request.name}</h2>
      <p>{request.location && request.location + ' · '}Group leader {request.leader}</p>
      <form className="cc-reg-form" onSubmit={event=>void approve(event,request)}>
        <label className="ui-field">Confirm group<select className="ui-input" name="groupId" required defaultValue="">
          <option value="">Choose a group</option>{data.groups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}
        </select></label>
        <label><input type="checkbox" name="verified" required/> I verified this member’s identity and placement.</label>
        <button type="submit" className="ui-button" disabled={busy}>Confirm placement</button>
      </form>
    </section>)}
  </main>;
}
