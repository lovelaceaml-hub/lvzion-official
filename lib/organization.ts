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

// Resolve the entire chain again after a refreshed workspace. A removed parent
// must never leave an old unit selected in a placement form.
export function placementChoice(w:Hierarchy,choice:{categoryId:string;groupId:string;unitId:string},manageableOnly=false,excludeUnitId?:string){
 const category=w.categories.find(c=>c.id===choice.categoryId);
 const groups=category?w.groups.filter(g=>g.parentId===category.id):[];
 const group=groups.find(g=>g.id===choice.groupId);
 const units=group?w.units.filter(u=>u.parentId===group.id&&(!manageableOnly||u.canManage)&&u.id!==excludeUnitId):[];
 const unit=units.find(u=>u.id===choice.unitId);
 return {category,groups,group,units,unit};
}
