import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCommand,PrayerError} from '../lib/morning-prayer/domain.ts';
import {demoWorkspace,DEMO_NOW,PERSONAS} from '../lib/morning-prayer/fixtures.ts';

test('MPG older draft cannot downgrade a newer published PWP revision',()=>{
 let workspace=demoWorkspace();
 const editor=PERSONAS.find(p=>p.key==='editor')!.actor;
 const publisher=PERSONAS.find(p=>p.key==='publisher')!.actor;
 const body={title:'Fictional PWP correction',summary:'An example only.',items:['Fictional reviewed item'],sourceLabel:'Fictional checked source'};
 for(const key of ['older-draft','newer-draft'])workspace=applyCommand(workspace,editor,{key,expectedVersion:workspace.version,action:{type:'material_draft',key:'october-week-3',body,sourceChecked:true}},DEMO_NOW).workspace;
 const older=workspace.materials.at(-2)!,newer=workspace.materials.at(-1)!;
 workspace=applyCommand(workspace,publisher,{key:'publish-newer',expectedVersion:workspace.version,action:{type:'material_publish',materialId:newer.id}},DEMO_NOW).workspace;
 const revision=workspace.version;
 assert.throws(()=>applyCommand(workspace,publisher,{key:'publish-older',expectedVersion:workspace.version,action:{type:'material_publish',materialId:older.id}},DEMO_NOW),(error:unknown)=>error instanceof PrayerError && error.code==='MATERIAL_REVISION_CONFLICT');
 assert.equal(workspace.publication['october-week-3'],newer.id);
 assert.equal(workspace.version,revision);
 assert.equal(workspace.materials.find(m=>m.id===older.id)!.state,'draft');
});
