import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const actor='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',moduleId='20000000-0000-4000-8000-000000000001',screen='30000000-0000-4000-8000-000000000001';
test('display live SQL review: isolated authorization and revocable, approved TV package',async t=>{
 const db=new PGlite();
 const denied=async(query:string,params:unknown[]=[])=>{await assert.rejects(db.query(query,params));};
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema app_private;create table public.members(id uuid primary key,status text default 'active');create table app_private.app_modules(id uuid primary key,module_key text,status text,approved_at timestamptz);create table app_private.module_access_grants(module_id uuid,member_id uuid,permission text,ended_at timestamptz,granted_at timestamptz default now());create function app_private.current_member_id() returns uuid language sql stable as $$select nullif(current_setting('display.actor',true),'')::uuid$$;");
  await db.exec(await readFile(new URL('../supabase/migrations/20261014223341_continuous_display_live_schema.sql',import.meta.url),'utf8'));
  await db.query("insert into public.members(id) values($1),($2)",[actor,other]);
  await db.query("insert into display_private.screens(id,label) values($1,'Lobby TV')",[screen]);
  await db.query("select set_config('display.actor',$1,false)",[actor]);
  await t.test('unregistered module cannot expose manager workspace',async()=>denied("select public.display_management_state()"));
  await db.query("insert into app_private.app_modules(id,module_key,status,approved_at) values($1,'continuous-display','approved',now())",[moduleId]);
  await db.query("insert into app_private.module_access_grants(module_id,member_id,permission) values($1,$2,'manager')",[moduleId,actor]);
  for(const p of ['edit','approve','publish','device'])await db.query("insert into display_private.permissions(screen_id,member_id,permission) values($1,$2,$3)",[screen,actor,p]);
  await t.test('only explicitly granted screen listed',async()=>{const d=(await db.query<{state:{screens:any[]}}>("select public.display_management_state() state")).rows[0].state;assert.equal(d.screens.length,1);assert.equal(d.screens[0].items.length,0);});
  const items=[{id:'welcome',kind:'announcement',style:'editorial',title:'Approved sample',body:'General welcome',duration:12}],from=new Date(Date.now()-1000).toISOString(),until=new Date(Date.now()+86400000).toISOString();
  await t.test('draft optimistic version and payload validation',async()=>{
   const q=await db.query<{v:number}>("select public.display_save_draft($1,0,$2,$3,$4) v",[screen,JSON.stringify(items),from,until]);assert.equal(Number(q.rows[0].v),1);
   await denied("select public.display_save_draft($1,0,$2,$3,$4)",[screen,JSON.stringify(items),from,until]);
   await denied("select public.display_save_draft($1,1,$2,$3,$4)",[screen,JSON.stringify([{...items[0],privatePhone:'555-5555'}]),from,until]);
  });
  await t.test('cannot publish unreviewed content',async()=>denied("select public.display_publish_approved($1,1)",[screen]));
  await db.query("select public.display_approve_draft($1,1)",[screen]);
  await t.test('approved exact revision publishes immutably',async()=>{
   const q=await db.query<{v:number}>("select public.display_publish_approved($1,1) v",[screen]);assert.equal(Number(q.rows[0].v),1);
   await denied("select public.display_publish_approved($1,1)",[screen]);
   await denied("update display_private.publications set items='[]' where screen_id=$1",[screen]);
  });
  await db.query("select public.display_save_draft($1,1,$2,$3,$4)",[screen,JSON.stringify([{...items[0],title:'Unreviewed replacement'}]),from,until]);
  await t.test('editing a draft cannot replace already approved TV material',async()=>{await denied("select public.display_publish_approved($1,2)",[screen]);});
  const code='a'.repeat(64),token='b'.repeat(64);
  await db.query("select public.display_issue_pairing($1,$2)",[screen,code]);
  await t.test('browser cannot call device service-role RPC',async()=>{
   await db.exec('set role authenticated');try{await denied("select public.display_device_redeem($1,$2)",[code,token]);}finally{await db.exec('reset role');}
  });
  await t.test('one-time pairing and replay prevention',async()=>{
   const q=await db.query<{data:{paired:boolean}}>("select public.display_device_redeem($1,$2) data",[code,token]);assert.equal(q.rows[0].data.paired,true);
   const replay=await db.query<{data:unknown}>("select public.display_device_redeem($1,$2) data",[code,'c'.repeat(64)]);assert.equal(replay.rows[0].data,null);
  });
  await t.test('TV sees only previously approved copy, no manager fields',async()=>{
   const q=await db.query<{data:{slides:any[];devices?:unknown;draftItems?:unknown}}>("select public.display_device_snapshot($1) data",[token]);assert.equal(q.rows[0].data.slides[0].title,'Approved sample');assert.equal(q.rows[0].data.devices,undefined);assert.equal(q.rows[0].data.draftItems,undefined);
  });
  await t.test('device revocation stops TV instantly on subsequent check',async()=>{
   const id=(await db.query<{id:string}>("select id from display_private.devices where token_digest=$1",[token])).rows[0].id;
   await db.query("select public.display_revoke_device($1)",[id]);assert.equal((await db.query<{data:unknown}>("select public.display_device_snapshot($1) data",[token])).rows[0].data,null);
  });
  await t.test('ungranted member and anonymous role cannot read',async()=>{
   await db.query("select set_config('display.actor',$1,false)",[other]);await denied("select public.display_management_state()");
   await db.exec('set role anon');try{await denied('select * from display_private.screens');}finally{await db.exec('reset role');}
  });
  await t.test('all seven private tables use RLS and audit records are retained',async()=>{
   const q=(await db.query<{n:number}>("select count(*)::integer n from pg_tables where schemaname='display_private' and rowsecurity")).rows[0].n;assert.equal(q,7);
   const a=(await db.query<{n:number}>("select count(*)::integer n from display_private.audit_events")).rows[0].n;assert.ok(a>=6);
  });
 }finally{await db.close();}
});
