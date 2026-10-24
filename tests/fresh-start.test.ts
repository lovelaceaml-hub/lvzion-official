import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {parseStudyOperation} from '../lib/study-rooms/operations.ts';

const correction='20261016180000_study_rooms_fresh_calendar.sql';
async function files(path:string):Promise<string[]>{
 const entries=await readdir(path,{withFileTypes:true});
 return (await Promise.all(entries.map(e=>e.isDirectory()?files(join(path,e.name)):Promise.resolve([join(path,e.name)])))).flat();
}
test('runtime source has no dependency on separate applications',async()=>{
 const prohibited=/lvrooms\.web\.app|lv-zion-duties\.web\.app|original\s+(?:Study Room\s+)?scheduler|scheduler transition|\bcutover\b/i;
 const violations:string[]=[];
 for(const root of ['app','components','lib'])for(const path of await files(root)){
  if(!/\.(?:ts|tsx|js|jsx|json)$/.test(path))continue;
  const text=await readFile(path,'utf8');
  if(prohibited.test(text))violations.push(path);
 }
 assert.deepEqual(violations,[],'Remove separate-application references from runtime source');
});
test('an explicit empty weekly calendar is accepted but missing or malformed blocks are rejected',()=>{
 const common={requestId:'51000000-0000-4000-8000-000000000001',action:'weekly.replace',expectedVersion:1,reason:'Explicitly empty calendar'};
 const result=parseStudyOperation({...common,blocks:[]});
 assert.equal(result.action,'weekly.replace');
 if(result.action==='weekly.replace')assert.deepEqual(result.blocks,[]);
 for(const blocks of [undefined,null,{},'[]',42])assert.throws(()=>parseStudyOperation({...common,blocks}));
});
// Owner activation migrations (and those built on them) need a verified owner; their own bootstrap-owner suites cover them.
const ownerActivation=new Set(['20261014224708_contacts_private_owner_pilot_v1.sql','20261024160200_worship_duty_live_activation.sql','20261024160300_worship_duty_live_setup.sql','20261024160400_worship_duty_operations.sql']);
async function migrate(db:PGlite,includeCorrection:boolean){
 await db.exec(await readFile('supabase/tests/bootstrap.sql','utf8'));
 const paths=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&!ownerActivation.has(p)&&(includeCorrection||p!==correction)).sort();
 for(const path of paths){
  try{await db.exec(await readFile('supabase/migrations/'+path,'utf8'));}
  catch(error){throw new Error(path+': '+(error instanceof Error?error.message:String(error)));}
 }
}
test('clean schema has no weekly schedules and no external booking prerequisite',async()=>{
 const db=new PGlite();
 try{
  await migrate(db,true);
  const {rows}=await db.query<{value:{weekly:unknown[];bookingsOpen:boolean;newSystemBookings:number}}>('select app_private.study_operations_snapshot() as value');
  assert.deepEqual(rows[0].value.weekly,[]);
  assert.equal(rows[0].value.bookingsOpen,true);
  assert.equal(rows[0].value.newSystemBookings,0);
  const audit=await db.query<{n:number}>("select count(*)::int n from app_private.audit_events where operation='study_rooms.fresh_calendar'");
  assert.equal(audit.rows[0].n,1);
  const auth=await db.query<{allowed:boolean}>("select has_function_privilege('anon','app_private.study_room_operations(jsonb)','execute') as allowed");
  assert.equal(auth.rows[0].allowed,false);
 }finally{await db.close();}
});
test('correction preserves an explicitly configured calendar and pause',async()=>{
 const db=new PGlite();
 try{
  await migrate(db,false);
  await db.exec("delete from app_private.study_service_blocks; insert into app_private.study_service_blocks(weekday,start_min,end_min,label) values(3,1080,1110,'Fictional explicit cleaning'); update app_private.study_policy_state set version=2 where singleton;");
  const before=await db.query('select * from app_private.study_service_blocks order by id');
  await db.exec(await readFile('supabase/migrations/'+correction,'utf8'));
  assert.deepEqual((await db.query('select * from app_private.study_service_blocks order by id')).rows,before.rows);
  const gate=await db.query<{bookings_open:boolean}>('select bookings_open from app_private.study_booking_activation where id');
  assert.equal(gate.rows[0].bookings_open,false);
 }finally{await db.close();}
});
