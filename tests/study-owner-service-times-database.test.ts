import test from 'node:test';import assert from 'node:assert/strict';
import{readFile,readdir}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
// Runs the owner-approved production data step against a freshly migrated disposable database.
test('owner service times are added once, audited, and never stack',async()=>{
 const db=new PGlite();
 try{
  const migrations=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&p!=='20261014224708_contacts_private_owner_pilot_v1.sql').sort().map(p=>'supabase/migrations/'+p);
  for(const path of ['supabase/tests/bootstrap.sql',...migrations])await db.exec(await readFile(path,'utf8'));
  const step=await readFile('supabase/owner-data/20261016_study_rooms_service_times.sql','utf8');
  const blocks=async()=>(await db.query<{weekday:number;start_min:number;end_min:number;label:string}>('select weekday,start_min,end_min,label from app_private.study_service_blocks order by weekday,start_min')).rows;
  const version=async()=>(await db.query<{version:number}>('select version from app_private.study_policy_state where singleton')).rows[0].version;
  assert.deepEqual(await blocks(),[],'fresh calendar starts empty');
  const before=await version();
  await db.exec(step);
  assert.deepEqual(await blocks(),[
   {weekday:2,start_min:1170,end_min:1230,label:'Evening service'},
   {weekday:6,start_min:600,end_min:660,label:'Morning service'},
   {weekday:6,start_min:870,end_min:930,label:'Afternoon service'},
   {weekday:6,start_min:1170,end_min:1230,label:'Evening service'}]);
  assert.equal(await version(),before+1,'calendar version moves once');
  assert.equal((await db.query('select 1 from app_private.audit_events where operation=$1',['study_rooms.owner_service_times'])).rows.length,1,'change is audited');
  await db.exec(step);
  assert.equal((await blocks()).length,4,'running it again adds nothing');
  assert.equal(await version(),before+1,'running it again does not move the version');
 }finally{await db.close();}
});
