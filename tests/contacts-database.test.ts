import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

// A disposable database, not hosted Supabase or an authenticated PostgREST test.
test('Contacts schema: deny-all access, independent identity and structural invariants',async()=>{
 const db=new PGlite();let assertions=0;
 const check=(value:unknown)=>{assert.ok(value);assertions++;};
 const denied=async(sql:string)=>{await assert.rejects(()=>db.exec(sql));assertions++;};
 try {
  for(const path of ['supabase/tests/bootstrap.sql','supabase/migrations/20261014020617_member_system_foundation.sql','docs/contacts/schema-review.sql'])await db.exec(await readFile(path,'utf8'));
  const tables=await db.query<{tablename:string,rowsecurity:boolean}>("select tablename,rowsecurity from pg_tables where schemaname='contacts_private' order by tablename");
  check(tables.rows.length===12);
  for(const t of tables.rows){
   check(t.rowsecurity);
   const r=await db.query<{relforcerowsecurity:boolean}>("select relforcerowsecurity from pg_class where oid=$1::regclass",['contacts_private.'+t.tablename]);check(r.rows[0].relforcerowsecurity);
   for(const role of ['anon','authenticated','service_role']){
    const grants=await db.query<{allowed:boolean}>("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') as allowed",[role,'contacts_private.'+t.tablename]);check(!grants.rows[0].allowed);
   }
  }
  for(const role of ['anon','authenticated','service_role']){
   await db.exec('set role '+role);
   await denied('select * from contacts_private.records');
   await denied("insert into contacts_private.release_gate values(false,'draft','test')");
   await db.exec('reset role');
  }
  // Deliberately give a non-privileged test role table grants: deny-all RLS still returns zero rows.
  await db.exec('grant usage on schema contacts_private to authenticated; grant select,insert,update,delete on all tables in schema contacts_private to authenticated; set role authenticated');
  check((await db.query('select * from contacts_private.release_gate')).rows.length===0);
  await denied("insert into contacts_private.release_gate values(true,'draft','test')");
  await db.exec('reset role');
  await denied("update contacts_private.release_gate set state='approved'");
  // Fixed synthetic identifiers, only inside this test process.
  const u=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  await db.exec(`insert into public.age_categories(id,name) values('${u(1)}','Synthetic adults');
   insert into public.church_groups(id,age_category_id,name) values('${u(2)}','${u(1)}','Synthetic group');
   insert into public.church_units(id,group_id,name) values('${u(3)}','${u(2)}','Synthetic unit');
   insert into public.members(id,display_name,status) values('${u(4)}','Synthetic responsible member','active'),('${u(5)}','Synthetic collaborator','active');
   insert into public.member_placements(id,member_id,group_id,unit_id) values('${u(6)}','${u(4)}','${u(2)}','${u(3)}'),('${u(7)}','${u(5)}','${u(2)}','${u(3)}');
   insert into contacts_private.records(id,owner_member_id,owner_placement_id,origin_group_id) values('${u(8)}','${u(4)}','${u(6)}','${u(2)}'),('${u(9)}','${u(4)}','${u(6)}','${u(2)}');
   insert into contacts_private.identities(contact_id,display_name) values('${u(8)}','Synthetic contact A'),('${u(9)}','Synthetic contact B');
   insert into contacts_private.methods(contact_id,kind,value) values('${u(8)}','phone','202-555-0142'),('${u(9)}','phone','202-555-0142');`);
  check((await db.query('select * from contacts_private.methods')).rows.length===2);
  check((await db.query('select * from public.members')).rows.length===2);
  await denied(`update contacts_private.records set owner_placement_id='${u(7)}' where id='${u(8)}'`);
  await denied(`update contacts_private.records set do_not_contact=true where id='${u(8)}'`);
  await denied(`update contacts_private.records set archived_at=now() where id='${u(8)}'`);
  await denied(`update contacts_private.records set lifecycle='converted_to_member' where id='${u(8)}'`);
  await db.exec(`insert into contacts_private.follow_ups(id,contact_id,assigned_member_id,due_at,action) values('${u(10)}','${u(8)}','${u(4)}',now()+interval '1 day','Synthetic next action')`);
  await denied(`insert into contacts_private.follow_ups(contact_id,assigned_member_id,due_at,action) values('${u(8)}','${u(4)}',now()+interval '2 days','Another action')`);
  await denied(`update contacts_private.follow_ups set state='completed' where id='${u(10)}'`);
  await db.exec(`update contacts_private.follow_ups set state='completed',completed_at=now(),completed_by='${u(4)}' where id='${u(10)}'`);
  check((await db.query<{state:string}>("select state from contacts_private.follow_ups")).rows[0].state==='completed');
  await db.exec(`insert into contacts_private.interactions(id,contact_id,author_member_id,occurred_at,body) values('${u(11)}','${u(8)}','${u(4)}',now(),'Synthetic private note')`);
  await denied(`update contacts_private.interactions set body='Overwritten' where id='${u(11)}'`);
  await denied(`delete from contacts_private.interactions where id='${u(11)}'`);
  await denied(`insert into contacts_private.interactions(contact_id,author_member_id,occurred_at,body,supersedes_id) values('${u(9)}','${u(4)}',now(),'Cross-contact correction','${u(11)}')`);
  await db.exec(`insert into contacts_private.audit_events(request_id,actor_member_id,contact_id,action,before_version,after_version) values('${u(12)}','${u(4)}','${u(8)}','interact',1,2)`);
  await denied('delete from contacts_private.audit_events');
  await denied('update contacts_private.audit_events set after_version=3');
  // Two stale proposals queued together: exactly one CAS update wins. Not a two-connection hosted race test.
  const attempts=await Promise.all([db.query('update contacts_private.records set version=version+1 where id=$1 and version=1 returning version',[u(8)]),db.query('update contacts_private.records set version=version+1 where id=$1 and version=1 returning version',[u(8)])]);
  check(attempts.filter(x=>x.rows.length===1).length===1);
  check((await db.query<{version:number}>('select version from contacts_private.records where id=$1',[u(8)])).rows[0].version===2);
  console.log(`CONTACTS SQL: ${assertions} assertions passed in disposable PGlite.`);
 } finally {await db.close();}
});
