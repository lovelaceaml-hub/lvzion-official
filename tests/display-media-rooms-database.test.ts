import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const id=(p:number)=>String(p).repeat(8)+'-'+String(p).repeat(4)+'-4'+String(p).repeat(3)+'-8'+String(p).repeat(3)+'-'+String(p).repeat(12);
const media='0123456789abcdef0123456789abcdef';
test('display media SQL: picture, video and rooms slides, private bucket and media permission',async()=>{
 const db=new PGlite();
 const owner=id(1),approver=id(2),outsider=id(3),moduleId=id(4),screen=id(5);
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema app_private;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table public.members(id uuid primary key,status text default 'active');create table app_private.app_modules(id uuid primary key,module_key text,status text,approved_at timestamptz);create table app_private.module_access_grants(module_id uuid,member_id uuid,permission text,ended_at timestamptz,granted_at timestamptz default now());create function app_private.current_member_id() returns uuid language sql stable as 'select nullif(current_setting(''display.actor'',true),'''')::uuid';");
  for(const path of ['20261014223341_continuous_display_live_schema.sql','20261014230147_continuous_display_operations.sql','20261015004620_continuous_display_motion_r4.sql','20261113220000_display_media_rooms.sql'])
   await db.exec(await readFile(new URL('../supabase/migrations/'+path,import.meta.url),'utf8'));
  const valid=async(items:unknown)=>(await db.query<{v:boolean}>('select display_private.valid_items($1::jsonb) v',[JSON.stringify(items)])).rows[0].v;
  const base={style:'editorial',title:'Item'};
  // Earlier text slides keep their exact rules.
  assert.equal(await valid([{...base,id:'text-1',kind:'announcement',body:'Hello',duration:15}]),true);
  assert.equal(await valid([{...base,id:'text-1',kind:'announcement',duration:15}]),false);
  assert.equal(await valid([{...base,id:'text-1',kind:'announcement',body:'Hello',duration:61}]),false);
  // Pictures and videos need a server-named file of the matching type; captions are optional.
  assert.equal(await valid([{...base,id:'pic-1',kind:'image',media:media+'.jpg',duration:10}]),true);
  assert.equal(await valid([{...base,id:'pic-1',kind:'image',media:media+'.jpg',fit:'contain',body:'Caption',duration:300}]),true);
  assert.equal(await valid([{...base,id:'pic-1',kind:'image',media:media+'.mp4',duration:10}]),false);
  assert.equal(await valid([{...base,id:'pic-1',kind:'image',media:'../secret.jpg',duration:10}]),false);
  assert.equal(await valid([{...base,id:'pic-1',kind:'image',duration:10}]),false);
  assert.equal(await valid([{...base,id:'pic-1',kind:'image',media:media+'.jpg',fit:'stretch',duration:10}]),false);
  assert.equal(await valid([{...base,id:'vid-1',kind:'video',media:media+'.mp4',duration:900}]),true);
  assert.equal(await valid([{...base,id:'vid-1',kind:'video',media:media+'.mp4',duration:901}]),false);
  assert.equal(await valid([{...base,id:'vid-1',kind:'video',media:media+'.webp',duration:60}]),false);
  // Rooms slides carry no file and no booking data; the TV fetches room and time only.
  assert.equal(await valid([{...base,id:'rooms-1',kind:'rooms',duration:20}]),true);
  assert.equal(await valid([{...base,id:'rooms-1',kind:'rooms',duration:121}]),false);
  assert.equal(await valid([{...base,id:'rooms-1',kind:'rooms',media:media+'.jpg',duration:20}]),false);
  assert.equal(await valid([{...base,id:'rooms-1',kind:'rooms',rows:[],duration:20}]),false);
  assert.equal(await valid([{...base,id:'rooms-1',kind:'rooms',duration:20,name:'Someone'}]),false);
  const bucket=(await db.query<{public:boolean;file_size_limit:string}>("select public,file_size_limit from storage.buckets where id='display-media'")).rows[0];
  assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),52428800);
  // Media permission: upload needs edit on that screen; view needs any permission on it.
  await db.query('insert into public.members(id) values($1),($2),($3)',[owner,approver,outsider]);
  await db.query("insert into display_private.screens(id,label) values($1,'Test lobby')",[screen]);
  await db.query("insert into app_private.app_modules(id,module_key,status,approved_at) values($1,'continuous-display','approved',now())",[moduleId]);
  for(const m of [owner,approver,outsider])
   await db.query("insert into app_private.module_access_grants(module_id,member_id,permission) values($1,$2,'manager')",[moduleId,m]);
  await db.query("insert into display_private.permissions(screen_id,member_id,permission) values($1,$2,'edit'),($1,$3,'approve')",[screen,owner,approver]);
  const as=(m:string)=>db.query("select set_config('display.actor',$1,false)",[m]);
  await as(owner);
  assert.equal((await db.query<{v:boolean}>("select public.display_media_authorize($1,'upload') v",[screen])).rows[0].v,true);
  await assert.rejects(db.query("select public.display_media_authorize($1,'delete')",[screen]),/Invalid purpose/);
  await as(approver);
  await assert.rejects(db.query("select public.display_media_authorize($1,'upload')",[screen]),/Not authorized/);
  assert.equal((await db.query<{v:boolean}>("select public.display_media_authorize($1,'view') v",[screen])).rows[0].v,true);
  await as(outsider);
  await assert.rejects(db.query("select public.display_media_authorize($1,'view')",[screen]),/Not authorized/);
  // A real draft with every new kind saves through the existing RPC and window rules.
  await as(owner);
  const items=[{...base,id:'pic-1',kind:'image',media:media+'.png',duration:12},{...base,id:'vid-1',kind:'video',media:media+'.mp4',duration:60},{...base,id:'rooms-1',kind:'rooms',duration:20}];
  const version=(await db.query<{v:number}>("select public.display_save_draft($1,0,$2::jsonb,now(),now()+interval '7 days') v",[screen,JSON.stringify(items)])).rows[0].v;
  assert.equal(Number(version),1);
  await db.exec('set role anon');
  await assert.rejects(db.query("select public.display_media_authorize($1,'view')",[screen]),/permission denied/i);
  await db.exec('reset role');
 }finally{await db.close();}
});
