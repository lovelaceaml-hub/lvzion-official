'use client';
import {useId,useState} from 'react';
import type {Workspace} from '../lib/contracts';
import {groupPath,placementChoice,unitPath} from '../lib/organization';

// Age category -> Group -> (optional) Unit. The form posts groupId, plus unitId only when a unit is chosen.
export default function PlacementPicker({data,manageableOnly=false,excludeUnitId,unitLabel='Unit'}:{data:Workspace;manageableOnly?:boolean;excludeUnitId?:string;unitLabel?:string}){
 const prefix=useId();
 const [choice,setChoice]=useState({categoryId:'',groupId:'',unitId:''});
 const {category,groups,group,units,unit,groupOnly}=placementChoice(data,choice,manageableOnly,excludeUnitId);
 return <fieldset className="placement-picker"><legend>Choose placement</legend>
 <label htmlFor={prefix+'-category'}>Age category</label>
 <select id={prefix+'-category'} required value={category?.id??''} onChange={e=>setChoice({categoryId:e.target.value,groupId:'',unitId:''})}>
 <option value="">Choose age category</option>{data.categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
 <label htmlFor={prefix+'-group'}>Group</label>
 <select id={prefix+'-group'} name="groupId" required disabled={!category} value={group?.id??''} onChange={e=>setChoice({...choice,groupId:e.target.value,unitId:''})}>
 <option value="">Choose group</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>
 {category&&!groups.length&&<p className="fine-print">This age category has no groups yet.</p>}
 <label htmlFor={prefix+'-unit'}>{unitLabel}{groupOnly?' (optional)':''}</label>
 <select id={prefix+'-unit'} name={unit?'unitId':undefined} required={!!group&&!groupOnly} disabled={!group} value={unit?.id??''} onChange={e=>setChoice({...choice,unitId:e.target.value})}>
 <option value="">{groupOnly?'No unit (group only)':'Choose unit'}</option>{units.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
 {group&&!units.length&&!groupOnly&&<p className="fine-print">No available units in this group. Choose another group or ask an authorized administrator to add a unit.</p>}
 <p className="placement-path" aria-live="polite">{unit?unitPath(data,unit.id):group&&groupOnly?groupPath(data,group.id)+' / No unit':'No group selected.'}</p>
 </fieldset>;
}
