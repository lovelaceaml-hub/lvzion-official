import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const id=(p:number)=>String(p).repeat(8)+'-'+String(p).repeat(4)+'-4'+String(p).repeat(3)+'-8'+String(p).repeat(3)+'-'+String(p).repeat(12);
test('open display link: only the main screen\'s published, in-window slides, no pairing needed',async()=>{
 const db=new PGlite();
 const owner=id(1),moduleId=id(2),main=id(3),other=id(4);
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema app_private;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table public.members(id uuid primary key,status text default 'active');create table app_private.app_modules(id uuid primary key,module_key text,status text,approved_at timestamptz);create table app_private.module_access_grants(module_id uuid,member_id uuid,permission text,ended_at timestamptz,granted_at timestamptz default now());create function app_private.current_member_id() returns uuid language sql stable as 'select nullif(current_setting(''display.actor'',true),'''')::uuid';");
  for(const path of ['20261014223341_continuous_display_live_schema.sql','20261014230147_continuous_display_operations.sql','20261015004620_continuous_display_motion_r4.sql','20261113220000_display_media_rooms.sql','20261113233000_display_public_link.sql'])
   await db.exec(await readFile(new URL('../supabase/migrations/'+path,import.meta.url),'utf8'));
  const snap=async()=>(await db.query<{v:any}>('select public.display_public_snapshot() v')).rows[0].v;
  assert.equal(await snap(),null);
  await db.query('insert into public.members(id) values($1)',[owner]);
  await db.query("insert into display_private.screens(id,label,created_at) values($1,'Lobby Display',now()-interval '1 day'),($2,'Hall TV',now())",[main,other]);
  // Nothing published: an empty, valid packet (the TV shows its quiet welcome).
  let v=await snap();
  assert.equal(v.screen,'Lobby Display');assert.deepEqual(v.slides,[]);assert.equal(v.paired,true);
  await db.query("insert into app_private.app_modules(id,module_key,status,approved_at) values($1,'continuous-display','approved',now())",[moduleId]);
  await db.query("insert into app_private.module_access_grants(module_id,member_id,permission) values($1,$2,'manager')",[moduleId,owner]);
  await db.query("insert into display_private.permissions(screen_id,member_id,permission) values($1,$2,'edit'),($1,$2,'approve'),($1,$2,'publish'),($3,$2,'edit'),($3,$2,'approve'),($3,$2,'publish')",[main,owner,other]);
  await db.query("select set_config('display.actor',$1,false)",[owner]);
  const later=new Date(Date.now()+3600000).toISOString(),later2=new Date(Date.now()+7200000).toISOString();
  const items=[{id:'rooms-1',kind:'rooms',style:'editorial',title:'Study rooms today',duration:20},
   {id:'later-1',kind:'announcement',style:'editorial',title:'Later',body:'Not yet',duration:10,startsAt:later,endsAt:later2}];
  for(const screen of [main,other]){
   await db.query("select public.display_save_draft($1,0,$2::jsonb,now()-interval '1 minute',now()+interval '7 days')",[screen,JSON.stringify(screen===main?items:[items[0]])]);
   await db.query('select public.display_approve_draft($1,1)',[screen]);
   await db.query('select public.display_publish_approved($1,1)',[screen]);
  }
  await db.query("update display_private.screens set draft_items=$2::jsonb,draft_version=2 where id=$1",[main,JSON.stringify([{id:'draft-1',kind:'announcement',style:'editorial',title:'Draft only',body:'Private draft',duration:10}])]);
  v=await snap();
  // Only the main screen, only published, only slides inside their own window; drafts never appear.
  assert.equal(v.screen,'Lobby Display');assert.equal(Number(v.version),1);
  assert.deepEqual(v.slides.map((s:any)=>s.id),['rooms-1']);
  assert.ok(!JSON.stringify(v).includes('Private draft'));
  assert.deepEqual(Object.keys(v).sort(),['leaseUntil','motionMode','operatingHours','overrideSlideId','overrideUntil','paired','screen','serverTime','slides','version']);
  assert.ok(Date.parse(v.leaseUntil)-Date.parse(v.serverTime)<=30000);
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   await assert.rejects(db.query('select public.display_public_snapshot()'),/permission denied/i);
   await db.exec('reset role');
  }
 }finally{await db.close();}
});
