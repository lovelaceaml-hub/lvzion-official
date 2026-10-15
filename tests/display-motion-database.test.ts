import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const id=(p:number)=>String(p).repeat(8)+'-'+String(p).repeat(4)+'-4'+String(p).repeat(3)+'-8'+String(p).repeat(3)+'-'+String(p).repeat(12);
test('display R4 SQL: device-only motion permission, independent grants, versioning and TV projection',async()=>{
 const db=new PGlite();
 const owner=id(1),other=id(2),moduleId=id(3),screen=id(4),digest='a'.repeat(64),token='b'.repeat(64);
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema app_private;create table public.members(id uuid primary key,status text default 'active');create table app_private.app_modules(id uuid primary key,module_key text,status text,approved_at timestamptz);create table app_private.module_access_grants(module_id uuid,member_id uuid,permission text,ended_at timestamptz,granted_at timestamptz default now());create function app_private.current_member_id() returns uuid language sql stable as 'select nullif(current_setting(''display.actor'',true),'''')::uuid';");
  for(const path of ['20261014223341_continuous_display_live_schema.sql','20261014230147_continuous_display_operations.sql','20261015004620_continuous_display_motion_r4.sql'])
   await db.exec(await readFile(new URL('../supabase/migrations/'+path,import.meta.url),'utf8'));
  await db.query('insert into public.members(id) values($1),($2)',[owner,other]);
  await db.query("insert into display_private.screens(id,label) values($1,'Test lobby')",[screen]);
  await db.query("select set_config('display.actor',$1,false)",[owner]);
  await assert.rejects(db.query("select public.display_set_motion($1,0,'calm')",[screen]),/Not authorized|permission/i);
  await db.query("insert into app_private.app_modules(id,module_key,status,approved_at) values($1,'continuous-display','approved',now())",[moduleId]);
  await db.query("insert into app_private.module_access_grants(module_id,member_id,permission) values($1,$2,'manager')",[moduleId,owner]);
  await assert.rejects(db.query("select public.display_set_motion($1,0,'calm')",[screen]),/Not authorized|permission/i);
  await db.query("insert into display_private.permissions(screen_id,member_id,permission) values($1,$2,'device')",[screen,owner]);
  await assert.rejects(db.query("select public.display_set_motion($1,0,'<style>')",[screen]),/Invalid motion mode/i);
  const first=(await db.query<{version:number}>("select public.display_set_motion($1,0,'calm') version",[screen])).rows[0].version;
  assert.equal(Number(first),1);
  await assert.rejects(db.query("select public.display_set_motion($1,0,'still')",[screen]),/Screen settings changed/i);
  const state=(await db.query<{v:{screens:{motionMode:string;configVersion:number}[]}}>("select public.display_management_state_r2() v")).rows[0].v;
  assert.equal(state.screens[0].motionMode,'calm');
  assert.equal(Number(state.screens[0].configVersion),1);
  await db.query('select public.display_issue_pairing($1,$2)',[screen,digest]);
  const paired=(await db.query<{v:{paired:boolean}}>('select public.display_device_redeem($1,$2) v',[digest,token])).rows[0].v;
  assert.equal(paired.paired,true);
  const snapshot=(await db.query<{v:{motionMode:string;slides:unknown[];paired:boolean}}>('select public.display_device_snapshot_r2($1) v',[token])).rows[0].v;
  assert.equal(snapshot.motionMode,'calm');assert.equal(snapshot.slides.length,0);
  const still=(await db.query<{version:number}>("select public.display_set_motion($1,1,'still') version",[screen])).rows[0].version;
  assert.equal(Number(still),2);
  assert.equal((await db.query<{v:{motionMode:string}}>('select public.display_device_snapshot_r2($1) v',[token])).rows[0].v.motionMode,'still');
  await db.query("insert into app_private.module_access_grants(module_id,member_id,permission) values($1,$2,'manager')",[moduleId,other]);
  await db.query("select set_config('display.actor',$1,false)",[other]);
  await assert.rejects(db.query("select public.display_set_motion($1,2,'lively')",[screen]),/Not authorized|permission/i);
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from display_private.screens'),/permission denied/i);
  await assert.rejects(db.query("select public.display_set_motion($1,2,'calm')",[screen]),/permission denied/i);
  await db.exec('reset role');
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select public.display_device_snapshot_r2($1)',[token]),/permission denied/i);
  await db.exec('reset role');
  assert.equal((await db.query<{n:number}>("select count(*)::int n from display_private.audit_events where action='motion_updated'")).rows[0].n,2);
  assert.equal((await db.query<{n:number}>("select count(*)::int n from pg_tables where schemaname='display_private' and not rowsecurity")).rows[0].n,0);
 }finally{await db.close();}
});
