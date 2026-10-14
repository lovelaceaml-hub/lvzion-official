import test from 'node:test';import assert from 'node:assert/strict';import{readFile,readdir}from'node:fs/promises';import{PGlite}from'@electric-sql/pglite';
test('bundle SQL atomicity, private history, retry and full-resource release',async()=>{
 const db=new PGlite();let passed=0;
 try{const paths=['supabase/tests/bootstrap.sql',...(await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort().map(x=>'supabase/migrations/'+x),'supabase/seed/fictional_members.sql','supabase/tests/study_room_bundles.sql'];
 for(const path of paths){try{await db.exec(await readFile(path,'utf8'),{onNotice:n=>{if(n.message?.startsWith('STUDY PASS:'))passed++;}});}catch(e){throw Error(path+': '+(e as Error).message);}}
 assert(passed>=50,'Expected at least 50 bundle SQL assertions; got '+passed);console.log('Study Room R3 database assertions: '+passed);
 }finally{await db.close();}
});
