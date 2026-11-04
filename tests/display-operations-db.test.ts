import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const owner='10000000-0000-4000-8000-000000000001';
const deputy='10000000-0000-4000-8000-000000000002';
const ownerAuth='10000000-0000-4000-8000-000000000011';
const moduleId='20000000-0000-4000-8000-000000000001';
const lobby='30000000-0000-4000-8000-000000000001';
const digest=(value:string)=>value.repeat(64).slice(0,64);

test('display operations R2: owner-scoped multi-screen, hours, restore and approved overrides',async t=>{
 const db=new PGlite();
 const denied=async(sql:string,args:unknown[]=[])=>assert.rejects(db.query(sql,args));
 const actor=async(id:string)=>db.query("select set_config('display.actor',$1,false)",[id]);
 const q=async<T=unknown>(sql:string,args:unknown[]=[])=>{
  const r=await db.query<{value:T}>(sql,args);return r.rows[0]?.value;
 };
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema app_private;
   create table public.members(id uuid primary key,status text default 'active');
   create table app_private.app_modules(id uuid primary key,module_key text,status text,approved_at timestamptz);
   create table app_private.module_access_grants(module_id uuid,member_id uuid,permission text,ended_at timestamptz,granted_at timestamptz default now());
   create table app_private.bootstrap_receipts(auth_user_id uuid primary key);
   create table app_private.account_links(member_id uuid,auth_user_id uuid,enabled boolean,technical_enabled boolean);
   create function app_private.current_member_id() returns uuid language sql stable as $$select nullif(current_setting('display.actor',true),'')::uuid$$;`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261014223341_continuous_display_live_schema.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261014230147_continuous_display_operations.sql',import.meta.url),'utf8'));
  await db.query('insert into public.members(id) values($1),($2)',[owner,deputy]);
  await db.query("insert into display_private.screens(id,label) values($1,'Lobby Display')",[lobby]);
  await actor(owner);
  await t.test('unregistered module cannot create screens',async()=>denied("select public.display_create_screen('Hall TV')"));
  await db.query("insert into app_private.app_modules(id,module_key,status,approved_at) values($1,'continuous-display','approved',now())",[moduleId]);
  await db.query("insert into app_private.module_access_grants(module_id,member_id,permission) values($1,$2,'manager')",[moduleId,owner]);
  for(const p of ['edit','approve','publish','device'])
   await db.query('insert into display_private.permissions(screen_id,member_id,permission) values($1,$2,$3)',[lobby,owner,p]);
  await t.test('generic manager and technical appointment do not create screens',async()=>denied("select public.display_create_screen('Hall TV')"));
  await db.query('insert into app_private.account_links(member_id,auth_user_id,enabled,technical_enabled) values($1,$2,true,true)',[owner,ownerAuth]);
  await db.query('insert into app_private.bootstrap_receipts(auth_user_id) values($1)',[ownerAuth]);
  await t.test('only bootstrap owner can add disabled, separately granted screens',async()=>{
   const created=await q<string>("select public.display_create_screen('Fellowship Hall TV') value");
   assert.ok(created);
   assert.equal((await q<any>('select public.display_management_state_r2() value')).screens.length,2);
   assert.equal(Number((await q<number>('select count(*)::integer value from display_private.permissions where screen_id=$1',[created]))),4);
   assert.equal(await q<boolean>('select enabled value from display_private.screens where id=$1',[created]),false);
   await denied("select public.display_create_screen('Fellowship Hall TV')");
   await actor(deputy);await denied("select public.display_create_screen('Unauthorized TV')");await actor(owner);
  });
  const hours=Array.from({length:7},(_,day)=>({day,enabled:day!==0,start:420,end:1380}));
  await t.test('valid hours, invalid key, stale config versions are enforced',async()=>{
   assert.equal(await q<boolean>('select display_private.valid_operating_hours($1::jsonb) value',[JSON.stringify(hours)]),true);
   assert.equal(await q<boolean>('select display_private.valid_operating_hours($1::jsonb) value',[JSON.stringify([...hours.slice(0,6),{...hours[0]}])]),false);
   await denied('select public.display_set_operating_hours($1,0,$2::jsonb)',[lobby,JSON.stringify([{day:0,enabled:true,start:0,end:1440}])]);
   const version=await q<number>('select public.display_set_operating_hours($1,0,$2::jsonb) value',[lobby,JSON.stringify(hours)]);
   assert.equal(Number(version),1);
   await denied('select public.display_set_operating_hours($1,0,$2::jsonb)',[lobby,JSON.stringify([])]);
   const state=await q<any>('select public.display_management_state_r2() value');
   const s=state.screens.find((x:any)=>x.id===lobby);
   assert.equal(s.configVersion,1);assert.deepEqual(s.operatingHours,hours);
  });
  const starts=new Date(Date.now()-1000).toISOString(),until=new Date(Date.now()+86400000).toISOString();
  const innerStart=new Date(Date.now()-500).toISOString(),innerEnd=new Date(Date.now()+600000).toISOString();
  const content=[{id:'approved-1',kind:'announcement',style:'editorial',title:'Fictional announcement',
     body:'Safe fixture',duration:12,startsAt:innerStart,endsAt:innerEnd}];
  await t.test('per-slide content must stay inside approved overall window',async()=>{
   const wrong=[{...content[0],startsAt:new Date(Date.now()-86400000).toISOString()}];
   await denied('select public.display_save_draft($1,0,$2::jsonb,$3,$4)',[lobby,JSON.stringify(wrong),starts,until]);
   assert.equal(Number(await q('select public.display_save_draft($1,0,$2::jsonb,$3,$4) value',[lobby,JSON.stringify(content),starts,until])),1);
  });
  await t.test('unapproved drafts still cannot publish',async()=>denied('select public.display_publish_approved($1,1)',[lobby]));
  await db.query('select public.display_approve_draft($1,1)',[lobby]);
  await db.query('select public.display_publish_approved($1,1)',[lobby]);
  const firstPub=await q<string>('select current_publication value from display_private.screens where id=$1',[lobby]);
  const token=digest('b'),code=digest('a');
  await db.query('select public.display_issue_pairing($1,$2)',[lobby,code]);
  await db.query('select public.display_device_redeem($1,$2)',[code,token]);
  await t.test('paired R2 projection is approved, minimized and advertises hours',async()=>{
   const p=await q<any>('select public.display_device_snapshot_r2($1) value',[token]);
   assert.equal(p.slides[0].title,'Fictional announcement');
   assert.deepEqual(p.operatingHours,hours);
   assert.equal(p.overrideSlideId,null);assert.equal(p.devices,undefined);assert.equal(p.draftVersion,undefined);
  });
  await t.test('already approved temporary emphasis is bounded and revocable',async()=>{
   await denied('select public.display_set_override($1,$2,1900,1)',[lobby,'approved-1']);
   await denied('select public.display_set_override($1,$2,60,1)',[lobby,'not-approved']);
   const until=await q<string>('select public.display_set_override($1,$2,60,1) value',[lobby,'approved-1']);
   assert.ok(until);
   const p=await q<any>('select public.display_device_snapshot_r2($1) value',[token]);
   assert.equal(p.overrideSlideId,'approved-1');
   assert.equal(await q<boolean>('select public.display_clear_override($1) value',[lobby]),true);
   assert.equal(await q<boolean>('select public.display_clear_override($1) value',[lobby]),false);
   assert.equal((await q<any>('select public.display_device_snapshot_r2($1) value',[token])).overrideSlideId,null);
  });
  await t.test('restore appends immutable new generation from original approval',async()=>{
   const second=[{...content[0],title:'Another approved draft'}];
   await db.query('select public.display_save_draft($1,1,$2::jsonb,$3,$4)',[lobby,JSON.stringify(second),starts,until]);
   await db.query('select public.display_approve_draft($1,2)',[lobby]);
   assert.equal(Number(await q('select public.display_publish_approved($1,2) value',[lobby])),2);
   assert.equal(Number(await q('select public.display_restore_publication($1,$2,2) value',[lobby,firstPub])),3);
   await denied('select public.display_restore_publication($1,$2,2)',[lobby,firstPub]);
   const snap=await q<any>('select public.display_device_snapshot_r2($1) value',[token]);
   assert.equal(snap.version,3);assert.equal(snap.slides[0].title,'Fictional announcement');
   await denied("update display_private.publications set items='[]' where screen_id=$1",[lobby]);
  });
  await t.test('ungranted member and anonymous roles cannot use new operations',async()=>{
   await actor(deputy);
   await denied('select public.display_management_state_r2()');
   await denied('select public.display_set_operating_hours($1,0,$2::jsonb)',[lobby,'[]']);
   await db.exec('set role anon');
   try{await denied('select * from display_private.current_overrides');await denied('select public.display_device_snapshot_r2($1)',[token]);}
   finally{await db.exec('reset role');}
  });
  await t.test('eight private tables retain deny-all RLS',async()=>{
   const r=await q<number>("select count(*)::integer value from pg_tables where schemaname='display_private' and rowsecurity");
   assert.equal(r,8);
  });
 }finally{await db.close();}
});
