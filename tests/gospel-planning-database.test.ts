import test from 'node:test';import assert from 'node:assert/strict';
import{readFile,readdir}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
test('Groups & Gospel Planning database permissions, versions and restricted sections',async()=>{
 const db=new PGlite();let passed=0;
 try{
  const migrations=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&p!=='20261014224708_contacts_private_owner_pilot_v1.sql').sort().map(p=>'supabase/migrations/'+p);
  for(const path of ['supabase/tests/bootstrap.sql',...migrations,'supabase/seed/fictional_members.sql','supabase/tests/gospel_planning.sql']){
   try{await db.exec(await readFile(path,'utf8'),{onNotice:notice=>{if(notice.message?.startsWith('GP PASS:'))passed++;}});}
   catch(e){const err=e as Error&{code?:string};throw Error(path+': '+err.message+' ['+err.code+'] after '+passed+' passes');}
  }
  assert(passed>=100,'Expected 100+ executed Gospel Planning assertions; got '+passed);
  console.log('Gospel Planning SQL assertions: '+passed);
 }finally{await db.close();}
});
