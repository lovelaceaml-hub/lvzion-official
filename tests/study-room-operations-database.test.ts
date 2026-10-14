import test from 'node:test';import assert from 'node:assert/strict';
import{readFile,readdir}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
test('Study Room operations preserve RLS, booking gate, conflict rules and audit',async()=>{
 const db=new PGlite();let passed=0;
 try{
  const migrations=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')).sort().map(p=>'supabase/migrations/'+p);
  for(const path of ['supabase/tests/bootstrap.sql',...migrations,'supabase/seed/fictional_members.sql','supabase/tests/study_room_operations.sql']){
   try{await db.exec(await readFile(path,'utf8'),{onNotice:notice=>{if(notice.message?.startsWith('OPS PASS:'))passed++;}});}
   catch(e){const err=e as Error&{code?:string};throw Error(path+': '+err.message+' ['+err.code+']');}
  }
  assert(passed>=25,'Expected 25+ executed operations assertions; got '+passed);
  console.log('Study Room manager operations SQL assertions: '+passed);
 }finally{await db.close();}
});
