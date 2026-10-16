import test from 'node:test';import assert from 'node:assert/strict';
import{readFile,readdir}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
test('Study Rooms leader access and group leader switches stay inside their boundaries',async()=>{
 const db=new PGlite();let passed=0;
 try{
  const migrations=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&!['20261014224708_contacts_private_owner_pilot_v1.sql','20261014224325_worship_duty_live_activation.sql','20261014224327_worship_duty_live_setup.sql','20261014230756_worship_duty_operations.sql'].includes(p)).sort().map(p=>'supabase/migrations/'+p);
  for(const path of ['supabase/tests/bootstrap.sql',...migrations,'supabase/seed/fictional_members.sql','supabase/tests/study_group_access.sql']){
   try{await db.exec(await readFile(path,'utf8'),{onNotice:notice=>{if(notice.message?.startsWith('ACCESS PASS:'))passed++;}});}
   catch(e){const err=e as Error&{code?:string};throw Error(path+': '+err.message+' ['+err.code+']');}
  }
  assert(passed>=30,'Expected 30+ executed access assertions; got '+passed);
  console.log('Study Room leader access SQL assertions: '+passed);
 }finally{await db.close();}
});
