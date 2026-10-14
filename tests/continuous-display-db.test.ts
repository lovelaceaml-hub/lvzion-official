import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('display database: isolated authorization, immutable publication and revocable playback foundations',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create table public.members(id uuid primary key,status text not null default 'active');create schema app_private;create function app_private.current_member_id() returns uuid language sql stable as $$select id from public.members where id=nullif(current_setting('test.member',true),'')::uuid and status='active'$$;`);
  await db.exec(await readFile(new URL('../docs/continuous-display/schema-review.sql',import.meta.url),'utf8'));
  const a='10000000-0000-4000-8000-000000000001',tech='10000000-0000-4000-8000-000000000002',outsider='10000000-0000-4000-8000-000000000003';
  const display='20000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000002';
  const item='30000000-0000-4000-8000-000000000001',revision='40000000-0000-4000-8000-000000000001',window='50000000-0000-4000-8000-000000000001',playlist='60000000-0000-4000-8000-000000000001';
  await db.exec(`insert into members(id) values('${a}'),('${tech}'),('${outsider}');insert into display_private.displays(id,label) values('${display}','Fictional lobby'),('${other}','Other fictional screen');insert into display_private.authority_grants(display_id,member_id,permission) values('${display}','${a}','approve'),('${display}','${a}','publish'),('${display}','${tech}','device');insert into display_private.content_items(id,display_id,created_by) values('${item}','${display}','${a}');insert into display_private.content_revisions(id,item_id,revision,template_id,payload,created_by) values('${revision}','${item}',1,'editorial','{"title":"Sample","body":"Fictional content","eyebrow":"DEMO"}','${a}');insert into display_private.publication_windows(id,revision_id,display_id,starts_at,ends_at,cache_allowed) values('${window}','${revision}','${display}',now()-interval '1 minute',now()+interval '1 hour',true);insert into display_private.playlists(id,display_id,label) values('${playlist}','${display}','Fictional loop');insert into display_private.playlist_entries(playlist_id,window_id,position,seconds) values('${playlist}','${window}',0,12);`);
  const actor=async(id:string)=>{await db.query("select set_config('test.member',$1,false)",[id]);};
  await actor(a);
  await assert.rejects(db.query('select display_private.publish_playlist($1,0)',[playlist]),/approved/i);
  const approval=(await db.query<{id:string}>('select display_private.approve_window($1) id',[window])).rows[0].id;
  const first=(await db.query<{id:string}>('select display_private.publish_playlist($1,0) id',[playlist])).rows[0].id;
  assert.ok(first);await assert.rejects(db.query('select display_private.publish_playlist($1,0)',[playlist]),/Concurrent publication/i);
  await assert.rejects(db.query("update display_private.content_revisions set payload='{}' where id=$1",[revision]),/immutable/i);
  await assert.rejects(db.query("delete from display_private.published_versions where id=$1",[first]),/immutable/i);
  assert.equal((await db.query<{ok:boolean}>(`select display_private.valid_payload('{"title":"Sample","body":"B","eyebrow":"D","privateContacts":[]}') ok`)).rows[0].ok,false);
  await assert.rejects(db.query(`insert into display_private.media_assets(display_id,owner_id,private_object_key,mime,bytes,state) values($1,$2,'sample.png','image/png',100,'validated')`,[display,a]),/check constraint/i);
  await actor(tech);await assert.rejects(db.query('select display_private.publish_playlist($1,1)',[playlist]),/Not authorized/i);
  await assert.rejects(db.query('select display_private.require_permission($1,\'device\')',[other]),/Not authorized/i);
  await actor(outsider);await assert.rejects(db.query('select display_private.approve_window($1)',[window]),/Not authorized/i);
  await actor(a);await db.query("update members set status='inactive' where id=$1",[a]);await assert.rejects(db.query('select display_private.publish_playlist($1,1)',[playlist]),/Not authorized/i);await db.query("update members set status='active' where id=$1",[a]);
  await actor(tech);
  const pairing=(await db.query<{id:string}>(`insert into display_private.device_pairings(code_digest,poll_digest,expires_at) values(decode(repeat('11',32),'hex'),decode(repeat('22',32),'hex'),now()+interval '5 minutes') returning id`)).rows[0].id;
  const session=(await db.query<{id:string}>(`select display_private.claim_pairing($1,$2,decode(repeat('33',32),'hex')) id`,[pairing,display])).rows[0].id;
  await assert.rejects(db.query(`select display_private.claim_pairing($1,$2,decode(repeat('44',32),'hex'))`,[pairing,display]),/Pairing unavailable/i);
  const project=async()=>((await db.query<{value:any}>(`select display_private.playback_projection(decode(repeat('33',32),'hex')) value`)).rows[0].value);
  assert.equal(await project(),null); // pairing never enables a physical display automatically
  await db.query('update display_private.displays set enabled=true where id=$1',[display]);
  const p=await project();assert.equal(p.screenId,display);assert.equal(p.items.length,1);assert.ok(Date.parse(p.leaseUntil)-Date.parse(p.serverTime)<=300000);assert.equal(p.items[0].content.privateContacts,undefined);assert.equal(p.published_by,undefined);assert.equal(p.token_digest,undefined);
  await actor(a);await db.query('select display_private.revoke_approval($1)',[approval]);assert.equal((await project()).items.length,0);
  await actor(tech);await db.query('select display_private.revoke_device($1)',[session]);assert.equal(await project(),null);
  const policies=(await db.query<{n:number}>(`select count(*)::integer n from pg_tables where schemaname='display_private' and not rowsecurity`)).rows[0].n;assert.equal(policies,0);
  await db.exec('set role authenticated');await assert.rejects(db.query('select * from display_private.content_revisions'),/permission denied/i);await assert.rejects(db.query('select display_private.playback_projection(null)'),/permission denied/i);await db.exec('reset role');
  await db.exec('set role anon');await assert.rejects(db.query('select * from display_private.published_versions'),/permission denied/i);await db.exec('reset role');
  const audit=(await db.query<{n:number}>(`select count(*)::integer n from display_private.audit_events`)).rows[0].n;assert.ok(audit>=5);
 }finally{await db.close();}
});
