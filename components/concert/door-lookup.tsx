'use client';

import {useRef, useState, type FormEvent} from 'react';
import {formatStamp, parseScan, type ScanResult} from '../../lib/concert/domain';
import ConcertDialog from './concert-dialog';

type Match = {id:string;name:string;partySize:number;checkedInAt:string|null;vip:boolean};

export default function DoorLookup({onCheckIn}: {onCheckIn: (result: ScanResult) => void}) {
  const [name, setName] = useState('');
  const [searched, setSearched] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResult|null>(null);
  const [confirm, setConfirm] = useState(false);
  const requestId = useRef('');

  async function post(input: Record<string,unknown>) {
    const response = await fetch('/api/concert/door', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error??'Check-in could not be completed.');
    return data;
  }

  const exactMatch = matches.some(match => match.name.trim().toLowerCase()===name.trim().toLowerCase());

  async function run(action: 'find'|'check'|'walk', id?:string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (action==='find') {
        setMatches(await post({action,name}));
        setSearched(name);
        setResult(null);
        setConfirm(false);
        requestId.current='';
      } else {
        const scan = parseScan(await post(action==='check'?{action,id}:{action,id:requestId.current||=crypto.randomUUID(),name,confirm:confirm&&exactMatch}));
        setResult(scan);
        onCheckIn(scan);
        if (scan.result==='ok'||scan.result==='already') {
          setMatches(list => list.map(match => match.id===id?{...match,checkedInAt:scan.checkedInAt??null}:match));
          setSearched('');
          setConfirm(false);
        }
      }
    } catch (error) {setError(error instanceof Error?error.message:'Try again.');}
    finally {setBusy(false);}
  }

  function search(event: FormEvent) {event.preventDefault();void run('find');}
  return <ConcertDialog label="Find guest or add walk-in" title="Door check-in">
    <form className="cc-reg-form" onSubmit={search}>
      <label className="ui-field">Guest name<input className="ui-input" autoComplete="off" minLength={2} maxLength={120} required value={name} onChange={event=>{
        setName(event.target.value);setResult(null);setConfirm(false);
      }}/></label>
      <button className="ui-button" disabled={busy}>Search guest list</button>
    </form>
    {result ? <p role="status" className="cc-note">{result.result==='ok'?'Checked in':result.result==='already'?'Already checked in':'Ticket unavailable'}{result.name?' · '+result.name:''}{result.vip?<span className="cc-vip-badge">VIP</span>:null}</p> : null}
    {searched && searched===name ? <>
      {matches.length ? <ul className="cc-reg-results">{matches.map(match => <li key={match.id}>
        <div><strong>{match.name}</strong>{match.vip?<span className="cc-vip-badge">VIP</span>:null}</div>
        <small>{match.partySize>1?'Party of '+match.partySize:'One attendee'}{match.checkedInAt?' · Checked in at '+formatStamp(match.checkedInAt):''}</small>
        {!match.checkedInAt?<button className="ui-button ui-button-secondary" type="button" disabled={busy} onClick={()=>void run('check',match.id)}>Check in</button>:null}
      </li>)}</ul> : <p className="cc-hint">No matching registrations.</p>}
      {confirm ? <>
        <p className="cc-hint">{exactMatch?`Confirm that ${name} is a different person from the matching registration.`:`Add ${name} as a new attendee and check them in?`}</p>
        <button className="ui-button" type="button" disabled={busy} onClick={()=>void run('walk')}>Confirm walk-in</button>
      </> : <button className="ui-button ui-button-secondary" type="button" disabled={busy} onClick={()=>setConfirm(true)}>Add as walk-in</button>}
    </> : null}
    {error?<p className="cc-error" role="alert">{error}</p>:null}
  </ConcertDialog>;
}
