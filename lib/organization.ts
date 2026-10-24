import type {Workspace} from './contracts.ts';

type Hierarchy = Pick<Workspace,'categories'|'groups'|'units'>;
export function groupPath(w:Hierarchy,id:string|null|undefined):string {
 const group=w.groups.find(g=>g.id===id);if(!group)return 'Unassigned';
 const category=w.categories.find(c=>c.id===group.parentId);
 return category?`${category.name} / ${group.name}`:group.name;
}
export function unitPath(w:Hierarchy,id:string|null|undefined):string {
 const unit=w.units.find(u=>u.id===id);if(!unit)return 'Unassigned';
 const group=w.groups.find(g=>g.id===unit.parentId);
 return group?`${groupPath(w,group.id)} / ${unit.name}`:unit.name;
}

/** A placement's full path. The unit is optional: a group-only placement shows "Group / No unit". */
export function placementPath(w:Hierarchy,groupId:string|null|undefined,unitId:string|null|undefined):string {
 if(unitId&&w.units.some(u=>u.id===unitId))return unitPath(w,unitId);
 return groupId&&w.groups.some(g=>g.id===groupId)?`${groupPath(w,groupId)} / No unit`:'Unassigned';
}
/** The unit label for a member's own placement: "No unit" when placed in a group without one. */
export function unitLabel(w:Hierarchy,groupId:string|null|undefined,unitId:string|null|undefined):string {
 return w.units.find(u=>u.id===unitId)?.name??(groupId?'No unit':'Unassigned');
}

// Resolve the entire chain again after a refreshed workspace. A removed parent
// must never leave an old unit selected in a placement form.
// Placement is Age category -> Group -> (optional) Unit. "groupOnly" says whether the group itself may be
// chosen without a unit: in a management form only when the viewer may place members in that group.
export function placementChoice(w:Hierarchy,choice:{categoryId:string;groupId:string;unitId:string},manageableOnly=false,excludeUnitId?:string){
 const category=w.categories.find(c=>c.id===choice.categoryId);
 const groups=category?w.groups.filter(g=>g.parentId===category.id&&(!manageableOnly||g.canManage||w.units.some(u=>u.parentId===g.id&&u.canManage))):[];
 const group=groups.find(g=>g.id===choice.groupId);
 const units=group?w.units.filter(u=>u.parentId===group.id&&(!manageableOnly||u.canManage)&&u.id!==excludeUnitId):[];
 const unit=units.find(u=>u.id===choice.unitId);
 const groupOnly=!!group&&(!manageableOnly||!!group.canManage);
 return {category,groups,group,units,unit,groupOnly};
}
