import test from 'node:test';import assert from 'node:assert/strict';
import {parseStudyOperation} from '../lib/study-rooms/operations.ts';
const base={requestId:'51000000-0000-4000-8000-000000000001',expectedVersion:1,reason:'Fictional setup audit'};
test('inventory creation validates kind and trimmed name',()=>{
 const c=parseStudyOperation({...base,action:'resource.add',kind:'whiteboard',name:' Large Board 6 '});
 assert.equal(c.action,'resource.add');if(c.action==='resource.add')assert.equal(c.name,'Large Board 6');
 for(const kind of ['other',undefined,7])assert.throws(()=>parseStudyOperation({...base,action:'resource.add',kind,name:'Room 5'}));
});
test('weekly restrictions accept Sunday-Saturday coverage',()=>{
 const c=parseStudyOperation({...base,action:'weekly.replace',blocks:[{weekday:2,start:1170,end:1230,label:'Evening service'},{weekday:6,start:600,end:660,label:'Morning service'}]});
 assert.equal(c.action,'weekly.replace');if(c.action==='weekly.replace')assert.equal(c.blocks.length,2);
});
test('weekly intervals cannot overlap within a day',()=>{
 const first={weekday:2,start:1170,end:1230,label:'Evening service'};
 assert.throws(()=>parseStudyOperation({...base,action:'weekly.replace',blocks:[first,{...first,start:1200,end:1260}]}));
 assert.doesNotThrow(()=>parseStudyOperation({...base,action:'weekly.replace',blocks:[first,{...first,weekday:6}]}));
});
test('special days explicitly replace weekly restrictions and permit zero blocks',()=>{
 const c=parseStudyOperation({...base,action:'day.replace',day:'2026-11-01',blocks:[]});
 assert.equal(c.action,'day.replace');if(c.action==='day.replace')assert.equal(c.blocks.length,0);
});
test('day reset checks exact date and forbids surprise fields',()=>{
 assert.equal(parseStudyOperation({...base,action:'day.reset',day:'2026-11-01'}).action,'day.reset');
 assert.throws(()=>parseStudyOperation({...base,action:'day.reset',day:'2026-02-30'}));
 assert.throws(()=>parseStudyOperation({...base,action:'day.reset',day:'2026-11-01',blocks:[]}));
});
test('unknown operations and identity injection fields are rejected',()=>{
 assert.throws(()=>parseStudyOperation({...base,action:'booking.open'}));
 assert.throws(()=>parseStudyOperation({...base,action:'resource.add',kind:'room',name:'Room X',memberId:'someone'}));
});
test('versions and idempotency identifiers are strongly validated',()=>{
 for(const v of [0,-1,1.5,'1',9999999999])assert.throws(()=>parseStudyOperation({...base,expectedVersion:v,action:'day.reset',day:'2026-11-01'}));
 assert.throws(()=>parseStudyOperation({...base,requestId:'1234',action:'day.reset',day:'2026-11-01'}));
});
test('time grid, descriptions and nonoverlap validated',()=>{
 const op={...base,action:'day.replace',day:'2026-11-01'};
 const bad=[{start:599,end:660,label:'Good'},{start:600,end:1381,label:'Good'},{start:601,end:660,label:'Good'},{start:600,end:660,label:'G'},{start:600,end:660,label:'Good',resourceId:'x'}];
 for(const block of bad)assert.throws(()=>parseStudyOperation({...op,blocks:[block]}));
 assert.throws(()=>parseStudyOperation({...op,blocks:[{start:600,end:660,label:'Test'},{start:630,end:690,label:'Test'}]}));
});
