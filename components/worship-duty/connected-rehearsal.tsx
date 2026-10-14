'use client';
import {useMemo,useState} from 'react';
import ConnectedWorkspace from './connected-workspace';
import {createRehearsal} from '../../lib/worship-duty/rehearsal-transport';
import {PREVIEW_ACTORS} from '../../lib/worship-duty/fixtures';
export default function ConnectedRehearsal(){
 const [persona,setPersona]=useState(0),[revision,setRevision]=useState(0),[note,setNote]=useState('');
 const rehearsal=useMemo(()=>createRehearsal(persona),[persona,revision]);
 return <><details className="wc-rehearsal-controls"><summary>Fictional review controls</summary><label>Review as<select aria-label="Review as" value={persona} onChange={e=>{setPersona(Number(e.target.value));setNote('');}}>{PREVIEW_ACTORS.map((p,n)=><option value={n} key={n}>{p.label}</option>)}</select></label><div className="wc-buttons"><button onClick={()=>{rehearsal.staleNext();setNote('The next save will simulate a stale record. No assignment will change.');}}>Simulate stale save</button><button onClick={()=>{rehearsal.loseNextResponse();setNote('The next save will succeed in memory but its response will be lost. Reload to verify; do not submit twice.');}}>Simulate lost response</button><button onClick={()=>{rehearsal.revoke();setNote('Fictional access revoked. Select Reload to confirm the workspace clears.');}}>Simulate revoked access</button><button onClick={()=>{setRevision(n=>n+1);setNote('Fictional records reset.');}}>Reset rehearsal</button></div><p role="status">{note||'These controls never change actual roles, accounts or database records. They exist only on this fictional route.'}</p></details><ConnectedWorkspace key={`${persona}:${revision}`} transport={rehearsal.transport} rehearsal/></>;
}
