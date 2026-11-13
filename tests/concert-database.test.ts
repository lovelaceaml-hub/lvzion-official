import test from 'node:test';import assert from 'node:assert/strict';
import{readFile,readdir}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
test('Healing Concert database permissions, tickets and check-in',async()=>{
 const db=new PGlite();let passed=0;
 try{
  const migrations=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&p!=='20261014224708_contacts_private_owner_pilot_v1.sql'&&!/worship_duty_(live_activation|live_setup|operations)/.test(p)).sort().map(p=>'supabase/migrations/'+p);
  for(const path of ['supabase/tests/bootstrap.sql',...migrations,'supabase/seed/fictional_members.sql','supabase/tests/concert.sql']){
   try{await db.exec(await readFile(path,'utf8'),{onNotice:notice=>{if(notice.message?.startsWith('CONCERT PASS:'))passed++;}});}
   catch(e){const err=e as Error&{code?:string};throw Error(path+': '+err.message+' ['+err.code+'] after '+passed+' passes');}
  }
  assert(passed>=40,'Expected 40+ executed Healing Concert assertions; got '+passed);
  console.log('Healing Concert SQL assertions: '+passed);
 }finally{await db.close();}
});
