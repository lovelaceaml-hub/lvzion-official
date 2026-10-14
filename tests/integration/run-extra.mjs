import{createClient}from'@supabase/supabase-js';import{readFileSync}from'node:fs';import{execFileSync}from'node:child_process';import assert from'node:assert/strict';
const root='/tmp/lvz-integration';if(process.env.LVZ_INTEGRATION_DIR!==root||process.env.VERCEL)throw new Error('Disposable local integration only.');
const keys=JSON.parse(readFileSync(root+'/credentials.json'));const fixtures=JSON.parse(readFileSync(root+'/fixtures.json'));const c=createClient('http://127.0.0.1:54321',keys.anon,{auth:{persistSession:false,autoRefreshToken:false}});let count=0;
function ok(label,value){assert(value,label);console.log('PASS: '+label);count++;}
const auth=await c.auth.signInWithPassword({email:'test-107@example.invalid',password:fixtures.password});if(auth.error)throw auth.error;const token=auth.data.session.access_token;
async function rpc(name,data={},override=token){return fetch('http://127.0.0.1:54321/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:keys.anon,Authorization:'Bearer '+override,'Content-Type':'application/json'},body:JSON.stringify(data)});}
ok('real bearer token resolves member before logout',(await(await rpc('my_membership_id')).json())!==null);
await c.auth.signOut({scope:'local'});ok('previous access JWT cannot read after actual Auth logout',(await(await rpc('my_membership_id')).json())===null);
// A fresh Auth identity authenticates using official tokens; duplicate commands race via REST.
const pastor=createClient('http://127.0.0.1:54321',keys.anon,{auth:{persistSession:false,autoRefreshToken:false}});const p=await pastor.auth.signInWithPassword({email:'test-105@example.invalid',password:fixtures.password});if(p.error)throw p.error;
const rid=crypto.randomUUID();const payload={p_action:'member.rename',p_payload:{memberId:'44444444-4444-4444-8444-000000000107',name:'Gina Concurrency',reason:'Concurrent idempotency verification'},p_request_id:rid};
const results=await Promise.all(Array.from({length:8},()=>rpc('member_command',payload,p.data.session.access_token)));ok('eight concurrent identical requests all succeed',results.every(r=>r.ok));
const actual=execFileSync('psql',['-h','/tmp','-p','55436','lvz_auth','-Atc',"select count(*) from app_private.command_receipts where request_id='"+rid+"'"],{encoding:'utf8'}).trim();ok('concurrent retries commit only one command receipt',actual==='1');
const bad=await rpc('admin_command',{p_action:'access.review',p_payload:{id:crypto.randomUUID(),decision:'rejected',reason:'Unexpected actor spoof',actorId:fixtures.identities[105]},p_request_id:crypto.randomUUID()},p.data.session.access_token);ok('real REST rejects unexpected actor override',!bad.ok);
console.log(`PASS: ${count} session-revocation and concurrent REST assertions.`);await pastor.auth.signOut();
