'use client';
import {useState} from 'react';
import {ArrowRight} from '../home-icons';
import {EmptyState,Segmented,Tag} from '../ui-kit';
import {kindLabels} from '../../lib/study-rooms/domain';
import type {Kind} from '../../lib/study-rooms/domain';
import type {AdminData} from '../../lib/study-rooms/admin';
import {KindIcon} from './parts';

const kinds=[['room','Rooms'],['whiteboard','Whiteboards'],['tv','TVs']] as const;

/** Atlas study-resources: the real inventory by kind, each resource as a glass card. */
export function ResourceInventory({resources,onView}:{resources:AdminData['resources'];onView:(kind:Kind)=>void}){
 const [kind,setKind]=useState<Kind>('room');
 const list=resources.filter(r=>r.kind===kind);
 const open=resources.filter(r=>r.active).length;
 return <section className="sr-section sr-inventory" aria-labelledby="sr-inventory-title">
  <header className="ui-heading sr-sub-heading"><p className="ui-eyebrow">Spaces & equipment</p><h2 id="sr-inventory-title">Resource inventory</h2><p>{open} of {resources.length} {resources.length===1?'resource is':'resources are'} open for reservations.</p></header>
  <Segmented label="Inventory type" options={kinds} value={kind} onChange={setKind}/>
  {list.length?<ul className="sr-resource-grid">{list.map((r,i)=><li key={r.id}><article className="ui-glass sr-resource-card">
   <div className="sr-resource-art" aria-hidden="true"><KindIcon kind={r.kind} size={36}/><span>{String(i+1).padStart(2,'0')}</span></div>
   <div className="sr-resource-title"><h3>{r.name}</h3><Tag tone={r.active?undefined:'warning'}>{r.active?'Available':'Unavailable'}</Tag></div>
   <p>{kindLabels[r.kind]} · {r.active?'open for reservations':'closed to new reservations'}</p>
   {r.active&&<button type="button" className="ui-button ui-button-secondary sr-view-button" aria-label={`View availability for ${r.name}`} onClick={()=>onView(r.kind)}>View availability<ArrowRight size={18}/></button>}
  </article></li>)}</ul>
  :<EmptyState icon={<KindIcon kind={kind} size={30}/>} title="Nothing of this kind yet">Add one under Inventory & service calendar.</EmptyState>}
 </section>;
}
