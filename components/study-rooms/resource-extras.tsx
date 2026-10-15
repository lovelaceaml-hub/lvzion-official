'use client';
import type {Kind,Resource} from '../../lib/study-rooms/domain';
const kinds:readonly [Kind,string][]=[['room','Study Room'],['whiteboard','Whiteboard'],['tv','TV']];
export function ResourceExtras({resources,primary,value,onChange}:{resources:Resource[];primary:string;value:string[];onChange:(ids:string[])=>void}){
 const primaryKind=resources.find(r=>r.id===primary)?.kind;
 return <fieldset className="sr-bundle"><legend>Add resources to this reservation</legend><p className="ui-hint">One of each kind. All selected resources are booked or released together.</p>{kinds.filter(([kind])=>kind!==primaryKind).map(([kind,label])=>{
  const options=resources.filter(r=>r.kind===kind&&r.active!==false),selected=value.find(id=>options.some(r=>r.id===id));
  function choose(id:string){onChange([...value.filter(v=>resources.find(r=>r.id===v)?.kind!==kind),...(id?[id]:[])]);}
  return <div key={kind}><label className="sr-inline-check"><input type="checkbox" checked={!!selected} disabled={!options.length} onChange={e=>choose(e.target.checked?options[0].id:'')}/>{label}</label>{selected&&<label className="ui-field">{label} unit<select className="ui-input" aria-label={label+' unit'} value={selected} onChange={e=>choose(e.target.value)}>{options.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}</div>;
 })}</fieldset>;
}
