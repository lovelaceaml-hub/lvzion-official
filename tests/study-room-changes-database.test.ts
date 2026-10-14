import test from'node:test';import assert from'node:assert/strict';import{readFile,readdir}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
test('study room R2 changes and management database assertions',async()=>{
 const db=new PGlite();let passed=0;
 try{const migrations=(await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort().map(x=>'supabase/migrations/'+x);
 for(const path of ['supabase/tests/bootstrap.sql',...migrations,'supabase/seed/fictional_members.sql','supabase/tests/study_room_changes.sql']){
  try{await db.exec(await readFile(path,'utf8'),{onNotice:n=>{if(n.message?.startsWith('STUDY PASS:'))passed++;}});}catch(e){const error=e as Error&{code?:string;position?:string};throw Error(path+': '+error.message+' ['+error.code+'] at '+error.position);}
 }
 assert(passed>=42,'Expected at least 42 executed study-room SQL assertions, got '+passed);console.log('Study room R2 SQL assertions passed: '+passed);
 }finally{await db.close();}
});
