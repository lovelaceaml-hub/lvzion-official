import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupPath,unitPath,placementChoice,placementPath,unitLabel} from '../lib/organization.ts';
const w={categories:[{id:'a',name:'Category A'},{id:'b',name:'Category B'}],groups:[{id:'ga',name:'Group 1',parentId:'a'},{id:'gb',name:'Group 1',parentId:'b'}],units:[{id:'ua',name:'Unit 1',parentId:'ga',canManage:true},{id:'ub',name:'Unit 1',parentId:'gb',canManage:false}]};
test('repeated group and unit names retain their full category path',()=>{assert.equal(groupPath(w,'gb'),'Category B / Group 1');assert.equal(unitPath(w,'ua'),'Category A / Group 1 / Unit 1');assert.equal(unitPath(w,'ub'),'Category B / Group 1 / Unit 1');assert.equal(unitPath(w,null),'Unassigned');});
test('a placement cannot retain a unit from another category or an archived parent',()=>{
 const wrong=placementChoice(w,{categoryId:'b',groupId:'gb',unitId:'ua'});assert.equal(wrong.unit,undefined);
 const removed=placementChoice({...w,groups:w.groups.filter(g=>g.id!=='gb')},{categoryId:'b',groupId:'gb',unitId:'ub'});assert.equal(removed.group,undefined);assert.deepEqual(removed.units,[]);assert.equal(removed.unit,undefined);
});
test('placement choices respect management scope and exclude the current unit',()=>{
 assert.equal(placementChoice(w,{categoryId:'b',groupId:'gb',unitId:'ub'},true).unit,undefined);
 assert.equal(placementChoice(w,{categoryId:'a',groupId:'ga',unitId:'ua'},false,'ua').unit,undefined);
 assert.equal(placementChoice(w,{categoryId:'b',groupId:'gb',unitId:'ub'}).unit?.id,'ub');
});
test('a group-only placement shows its group and no unit',()=>{
 assert.equal(placementPath(w,'ga',null),'Category A / Group 1 / No unit');
 assert.equal(placementPath(w,'ga','ua'),'Category A / Group 1 / Unit 1');
 assert.equal(placementPath(w,null,null),'Unassigned');
 assert.equal(unitLabel(w,'ga',null),'No unit');assert.equal(unitLabel(w,null,null),'Unassigned');assert.equal(unitLabel(w,'ga','ua'),'Unit 1');
});
test('the unit is optional only where the viewer may place members in the group itself',()=>{
 const led={...w,groups:[{...w.groups[0],canManage:true},{...w.groups[1],canManage:false}]};
 assert.equal(placementChoice(led,{categoryId:'a',groupId:'ga',unitId:''},true).groupOnly,true);
 assert.equal(placementChoice(w,{categoryId:'a',groupId:'ga',unitId:''},true).groupOnly,false);
 assert.equal(placementChoice(led,{categoryId:'b',groupId:'gb',unitId:''},true).group,undefined);
 assert.equal(placementChoice(w,{categoryId:'b',groupId:'gb',unitId:''}).groupOnly,true);
});
