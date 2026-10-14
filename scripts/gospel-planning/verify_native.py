#!/usr/bin/env python3
"""Fictional PostgreSQL verification. Never connects to an existing/hosted database.
Requires non-root POSIX, PostgreSQL 17+ with btree_gist and Python 3.10+.
Uses a fresh local cluster, owner-only Unix socket, no TCP, and cleans up in finally.
Auth tables are the repository's isolated test doubles, NOT real Supabase Auth.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess as sp
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = [
 '20261014020617_member_system_foundation.sql',
 '20261014043055_member_command_hardening.sql',
 '20261014045521_member_onboarding.sql',
 '20261014074214_module_runtime_foundation.sql',
]
def uid(n): return str(uuid.UUID(int=n))
def lit(v): return "'" + str(v).replace("'", "''") + "'"
def body(v): return lit(json.dumps(v, separators=(',', ':'))) + '::jsonb'
G, H, U, V, W, MOD, LOC = map(uid, [1100,1101,1200,1201,1202,600,700])
WEEK='2030-01-07'
START='2030-01-09T18:00:00Z'
END='2030-01-09T19:00:00Z'
WINDOWS=[{'start':'2030-01-09T16:00:00Z','end':'2030-01-09T23:00:00Z'}]

def auth(i):
 return f"set request.jwt.claim.sub={lit(uid(300+i))};set request.jwt.claims={lit(json.dumps({'session_id':uid(400+i)}))};"
def command_sql(i,action,payload,receipt=None):
 return auth(i)+f"select gp_private.command({lit(action)},{body(payload)},{lit(receipt or str(uuid.uuid4()))});"

class Database:
 def __init__(self, root):
  self.root=root;self.socket=root/'sock';self.socket.mkdir(mode=0o700)
  self.env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
  self.env['LC_ALL']='C.UTF-8'
  self.args=['psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-h',str(self.socket),'-p','55439','-d','postgres']
  self.checks=[];self.races=[]
 def external(self,args):
  result=sp.run(args,env=self.env,text=True,capture_output=True,timeout=40)
  if result.returncode: raise RuntimeError(result.stderr[-3000:])
  return result.stdout
 def sql(self,sql,fail=None):
  result=sp.run(self.args,input=sql,env=self.env,text=True,capture_output=True,timeout=20)
  if fail:
   assert result.returncode and fail in result.stderr,(fail,result.stdout,result.stderr)
  elif result.returncode: raise RuntimeError(result.stderr[-4000:])
  return result.stdout.strip()
 def query(self,sql): return json.loads(self.sql(sql).splitlines()[-1])
 def cmd(self,i,action,payload,receipt=None,fail=None):
  out=self.sql(command_sql(i,action,payload,receipt),fail)
  return None if fail else json.loads(out.splitlines()[-1])
 def check(self,name,value=True):
  assert value,name
  self.checks.append(name)
 def race(self,name,first,second,expected_error=None):
  """Hold the shared lock, prove the second connection blocks, then release it."""
  one=sp.Popen(self.args,stdin=sp.PIPE,stdout=sp.PIPE,stderr=sp.PIPE,text=True,bufsize=1,env=self.env)
  two=None
  try:
   one.stdin.write("begin;select pg_advisory_xact_lock(741085);select 'GP_LOCKED';\n");one.stdin.flush()
   limit=time.monotonic()+10
   while True:
    if time.monotonic()>limit: raise AssertionError('No lock acknowledgement')
    line=one.stdout.readline()
    if 'GP_LOCKED' in line: break
    if not line and one.poll() is not None: raise AssertionError(one.stderr.read())
   two=sp.Popen(self.args,stdin=sp.PIPE,stdout=sp.PIPE,stderr=sp.PIPE,text=True,env=self.env)
   two.stdin.write("set application_name='gospel-race-waiter';"+second+'\n');two.stdin.close()
   blocked=False
   for _ in range(100):
    blocked=self.sql("select count(*) from pg_stat_activity where application_name='gospel-race-waiter' and wait_event_type='Lock' and wait_event='advisory';")=='1'
    if blocked:break
    time.sleep(.02)
   assert blocked,'The test never observed a real advisory-lock wait'
   one.stdin.write(first+';commit;\n');one.stdin.close()
   one.wait(timeout=15);two.wait(timeout=15)
   out1,err1=one.stdout.read(),one.stderr.read();out2,err2=two.stdout.read(),two.stderr.read()
   assert one.returncode==0,(out1,err1)
   if expected_error:assert two.returncode and expected_error in err2,(out2,err2)
   else:assert two.returncode==0,(out2,err2)
   self.races.append({'name':name,'wait_observed':True,'first_exit':one.returncode,'second_exit':two.returncode,'expected_rejection':expected_error})
   self.check('race: '+name)
   return out2
  finally:
   for proc in (one,two):
    if proc is not None and proc.poll() is None:proc.kill();proc.wait()

 def seed(self):
  sql=f"begin;insert into public.age_categories(id,name) values({lit(uid(1000))},'Fictional age category');"
  sql+=f"insert into public.church_groups(id,age_category_id,name) values({lit(G)},{lit(uid(1000))},'Sample group A'),({lit(H)},{lit(uid(1000))},'Sample group B');"
  sql+=f"insert into public.church_units(id,group_id,name) values({lit(U)},{lit(G)},'Sample unit A1'),({lit(V)},{lit(G)},'Sample unit A2'),({lit(W)},{lit(H)},'Sample unit B1');"
  for i in range(1,10):
   group,unit=(H,W) if i==9 else (G,V) if i==4 else (G,U)
   sql+=f"insert into public.members(id,display_name,status) values({lit(uid(i))},'Fictional {i}','active');"
   sql+=f"insert into public.member_placements(id,member_id,group_id,unit_id,started_at) values({lit(uid(200+i))},{lit(uid(i))},{lit(group)},{lit(unit)},now()-interval '10 days');"
   sql+=f"insert into auth.users(id,email,email_confirmed_at) values({lit(uid(300+i))},'fictional-{i}@example.invalid',now());"
   sql+=f"insert into auth.sessions(id,user_id,created_at,not_after) values({lit(uid(400+i))},{lit(uid(300+i))},now()-interval '1 hour',now()+interval '1 day');"
   sql+=f"insert into app_private.account_links(member_id,auth_user_id,username) values({lit(uid(i))},{lit(uid(300+i))},'sample{i}');"
  sql+=f"insert into app_private.app_modules(id,module_key,display_name,short_name,route_path,status,approved_at) values({lit(MOD)},'gospel-planning','Fictional Gospel','Gospel','/modules/gospel-planning','approved',now());"
  for i in range(1,10):
   sql+=f"insert into app_private.module_access_grants(member_id,module_id,granted_at,reason) values({lit(uid(i))},{lit(MOD)},now()-interval '1 day','Fictional test fixture only');"
  sql+=f"insert into app_private.role_assignments(id,member_id,role_key,unit_id,appointed_at) values({lit(uid(505))},{lit(uid(5))},'unit_leader',{lit(U)},now()-interval '1 day');"
  sql+=f"insert into app_private.role_assignments(id,member_id,role_key,group_id,appointed_at) values({lit(uid(506))},{lit(uid(6))},'group_leader',{lit(G)},now()-interval '1 day');"
  sql+=f"insert into app_private.role_assignments(member_id,role_key,appointed_at) values({lit(uid(8))},'technical_admin',now()-interval '1 day');"
  for i,cap,unit,appointment in [(5,'schedule',U,uid(505)),(6,'plan_edit',None,uid(506)),(6,'publish',None,uid(506)),(7,'schedule',None,None)]:
   sql+=f"insert into gp_private.capability_grants(member_id,placement_id,group_id,unit_id,capability,appointment_id,granted_at) values({lit(uid(i))},{lit(uid(200+i))},{lit(G)},{lit(unit) if unit else 'null'},{lit(cap)},{lit(appointment) if appointment else 'null'},now()-interval '1 day');"
  sql+=f"insert into gp_private.locations(id,label) values({lit(LOC)},'Approved fictional public location');commit;"
  self.sql(sql)

 def session(self,i=1,participants=(1,2),start=START,end=END,publish=True):
  payload={'start':start,'end':end,'locationId':LOC,'participants':[uid(x) for x in participants]}
  result=self.cmd(i,'session.create',payload)
  if publish:self.cmd(6,'session.publish',{'id':result['id'],'expected':1})
  return result['id']
 def past(self):
  sid=str(uuid.uuid4())
  self.sql(f"""begin;
   insert into gp_private.sessions(id,group_id,creator_id,creator_placement_id,starts_at,ends_at,location_id,phase)
   values({lit(sid)},{lit(G)},{lit(uid(1))},{lit(uid(201))},now()-interval '2 hours',now()-interval '1 hour',{lit(LOC)},'published');
   insert into gp_private.session_revisions select id,version,starts_at,ends_at,location_id,creator_id,now() from gp_private.sessions where id={lit(sid)};
   insert into gp_private.participants values({lit(sid)},1,{lit(uid(1))},{lit(uid(201))},1),({lit(sid)},1,{lit(uid(2))},{lit(uid(202))},1);commit;""")
  return sid
 def workspace(self,i):return self.query(auth(i)+f"select gp_private.workspace('{WEEK}');")

 def verify(self):
  self.check('all fourteen private tables have RLS',self.sql("select count(*)=14 and bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='gp_private' and relkind='r';")=='t')
  for role in ['anon','authenticated','service_role']:
   self.sql(f'set role {role};select * from gp_private.sessions;',fail='42501')
   self.check(role+' cannot read private tables directly')
   self.sql(f"set role {role};select public.gospel_planning_workspace('{WEEK}');",fail='42501')
   self.check(role+' has no live RPC execution grant')
  self.sql(f"select public.gospel_planning_workspace('{WEEK}');",fail='GOSPEL_PLANNING_NOT_ACTIVATED')
  self.check('public runtime gate is closed even to owner')
  self.sql(f"select gp_private.workspace('{WEEK}');",fail='GP_DENIED')
  self.check('missing verified actor denied internally')
  for i in range(1,10): self.cmd(i,'availability.save',{'expected':0,'windows':WINDOWS})
  self.check('own availability saves through session-derived identity')
  self.cmd(1,'availability.save',{'expected':1,'windows':WINDOWS,'actorId':uid(2)},fail='GP_INVALID')
  self.check('client-supplied actor rejected')
  self.cmd(1,'availability.save',{'expected':0,'windows':WINDOWS},fail='GP_STALE')
  self.check('stale availability save rejected')
  self.cmd(1,'availability.save',{'expected':1,'windows':WINDOWS+WINDOWS},fail='GP_OVERLAP')
  self.check('overlapping availability ranges rejected')
  self.cmd(1,'availability.save',{'expected':1,'windows':[{'start':'2030-01-09T18:00:00','end':END}]},fail='GP_INVALID_TIME')
  self.check('timezone-less input rejected')
  self.check('own-group names only',set(x['id'] for x in self.workspace(1)['candidates'])=={uid(i) for i in range(1,9)})
  self.check('second group has only its own candidate',len(self.workspace(9)['candidates'])==1)
  p={'groupId':G,'week':WEEK,'expected':0,'summary':'Sample review','activity':'Sample plan','nextAction':'Assigned sample next action'}
  for i in (1,5,7,8,9):
   self.cmd(i,'plan.save',p,fail='GP_DENIED');self.check(f'actor {i} cannot edit group leader plan')
  plan=self.cmd(6,'plan.save',p)['id']
  self.check('group leader can prepare a new week')
  self.check('member does not receive private draft','draft' not in self.workspace(1)['plan'])
  self.check('nothing published from saving a draft',self.workspace(1)['plan']['published'] is None)
  self.cmd(6,'plan.publish',{'id':plan,'expected':1})
  p.update(expected=1,summary='Replacement draft')
  self.cmd(6,'plan.save',p)
  self.check('existing published content preserved during edits',self.workspace(1)['plan']['published']['summary']=='Sample review')
  self.cmd(6,'plan.publish',{'id':plan,'expected':1},fail='GP_STALE');self.check('stale publication rejected')
  self.cmd(8,'plan.publish',{'id':plan,'expected':2},fail='GP_DENIED');self.check('technical title does not grant publishing')
  self.cmd(6,'plan.publish',{'id':plan,'expected':2})
  self.check('exact current safe publication visible',self.workspace(1)['plan']['published']['version']==2)
  proposal={'start':START,'end':END,'locationId':LOC,'participants':[uid(1),uid(9)]}
  self.cmd(1,'session.create',proposal,fail='GP_DENIED');self.check('cross-group session denied')
  proposal['participants']=[uid(1),uid(4)]
  self.cmd(5,'session.create',proposal,fail='GP_DENIED');self.check('unit scheduler cannot schedule another unit')
  proposal['participants']=[uid(1),uid(2)]
  self.cmd(8,'session.create',proposal,fail='GP_DENIED');self.check('technical title does not confer scheduling')
  sid=self.session(publish=False)
  self.check('proposals do not create commitments',self.sql('select count(*) from gp_private.commitments;')=='0')
  self.cmd(2,'availability.save',{'expected':1,'windows':WINDOWS})
  self.cmd(6,'session.publish',{'id':sid,'expected':1},fail='GP_STALE_AVAILABILITY')
  self.check('publication rejects stale availability snapshot')
  revise=dict(proposal,id=sid,expected=1)
  self.cmd(1,'session.revise',revise)
  self.cmd(6,'session.publish',{'id':sid,'expected':2})
  self.check('publishing is not acceptance',self.sql('select count(*) from gp_private.commitments;')=='0')
  self.check('other ordinary member cannot see session',not self.workspace(3)['sessions'])
  self.check('technical administrator cannot see session',not self.workspace(8)['sessions'])
  r={'id':sid,'expected':2,'expectedResponse':0,'response':'accepted'}
  receipt=str(uuid.uuid4());self.cmd(1,'session.respond',r,receipt)
  self.check('exact retry is idempotent',self.cmd(1,'session.respond',r,receipt)['replayed'])
  self.check('retry created one response history row',self.sql('select count(*) from gp_private.response_history;')=='1')
  self.cmd(1,'session.respond',dict(r,response='declined'),receipt,fail='GP_RETRY_CONFLICT');self.check('changed retry payload rejected')
  self.cmd(1,'session.respond',dict(r,response='declined'),fail='GP_STALE_RESPONSE');self.check('second stale response cannot overwrite first')
  self.cmd(1,'session.revise',dict(revise,expected=2,start=END,end='2030-01-09T20:00:00Z'))
  self.check('material revision preserves old commitment while awaiting response',self.sql(f"select lower(during)={lit(START)}::timestamptz from gp_private.commitments where session_id={lit(sid)};")=='t')
  self.cmd(1,'session.respond',r,fail='GP_STALE');self.check('old confirmation rejected after material revision')
  self.cmd(6,'session.publish',{'id':sid,'expected':3})
  self.cmd(1,'session.respond',dict(r,expected=3))
  self.check('reconfirmation moves commitment atomically',self.sql(f"select lower(during)={lit(END)}::timestamptz from gp_private.commitments where session_id={lit(sid)};")=='t')
  adjacent=self.session(start=START,end=END)
  self.cmd(1,'session.respond',{'id':adjacent,'expected':1,'expectedResponse':0,'response':'accepted'})
  self.check('back-to-back half-open commitments accepted')
  self.cmd(1,'session.cancel',{'id':adjacent,'expected':1})
  self.check('explicit cancellation releases commitment',self.sql(f"select count(*) from gp_private.commitments where session_id={lit(adjacent)};")=='0')
  self.cmd(1,'session.cancel',{'id':sid,'expected':3})
  a=self.session(participants=(1,2));b=self.session(participants=(1,3))
  self.race('competing commitments',command_sql(1,'session.respond',{'id':a,'expected':1,'expectedResponse':0,'response':'accepted'}),command_sql(1,'session.respond',{'id':b,'expected':1,'expectedResponse':0,'response':'accepted'}),'GP_OVERLAP')
  self.check('at most one overlapping commitment exists',self.sql('select count(*) from gp_private.commitments;')=='1')
  self.sql(f"insert into gp_private.commitments values({lit(b)},1,{lit(uid(1))},tstzrange({lit(START)},{lit(END)},'[)'));",fail='23P01');self.check('database exclusion rejects bypassed overlap insert')
  self.cmd(1,'session.cancel',{'id':a,'expected':1});self.cmd(1,'session.cancel',{'id':b,'expected':1})
  pending=self.session()
  self.race('material revision versus queued response',command_sql(1,'session.revise',dict(proposal,id=pending,expected=1,start=END,end='2030-01-09T20:00:00Z')),command_sql(2,'session.respond',{'id':pending,'expected':1,'expectedResponse':0,'response':'accepted'}),'GP_STALE')
  p.update(expected=2,summary='Concurrent replacement')
  self.race('draft edit versus queued publication',command_sql(6,'plan.save',p),command_sql(6,'plan.publish',{'id':plan,'expected':2}),'GP_STALE')
  self.check('publication race retains prior published version',self.workspace(1)['plan']['published']['version']==2)
  past=self.past();report={'id':past,'expected':1,'expectedReport':0,'outcome':'completed','summary':'Explicit sample result','reason':''}
  report_receipt=str(uuid.uuid4())
  self.race('two partners reporting once',command_sql(1,'report.save',report,report_receipt),command_sql(2,'report.save',report),'GP_STALE_REPORT')
  self.check('shared result counted once',self.sql(f"select report_version from gp_private.sessions where id={lit(past)};")=='1')
  self.check('report retry returns prior receipt',self.cmd(1,'report.save',report,report_receipt)['replayed'])
  self.cmd(2,'report.save',dict(report,expectedReport=1,summary='Corrected result'),fail='GP_INVALID');self.check('correction requires explicit reason')
  correction_receipt=str(uuid.uuid4())
  self.cmd(2,'report.save',dict(report,expectedReport=1,summary='Corrected result',reason='Fictional correction'),correction_receipt)
  self.check('correction retains immutable original',self.sql(f"select count(*) from gp_private.reports where session_id={lit(past)};")=='2')
  self.sql(f"update gp_private.reports set summary='overwrite' where session_id={lit(past)};",fail='GP_IMMUTABLE');self.check('history cannot be overwritten')
  # Frozen unit history cannot confer current unit scheduling scope after transfer.
  unit_session=self.session(i=5,participants=(1,3),publish=False)
  self.sql(f"begin;update public.member_placements set ended_at=clock_timestamp() where id={lit(uid(203))};insert into public.member_placements(id,member_id,group_id,unit_id) values({lit(uid(903))},{lit(uid(3))},{lit(G)},{lit(V)});select 1 / (not gp_private.manages_session({lit(uid(5))},{lit(unit_session)}))::integer;rollback;")
  self.check('unit transfer revokes frozen unit scope')
  creator_receipt=str(uuid.uuid4())
  made=self.cmd(1,'session.create',proposal,creator_receipt)['id']
  self.cmd(6,'session.revise',dict(proposal,id=made,expected=1,participants=[uid(2),uid(3)]))
  self.cmd(1,'session.create',proposal,creator_receipt,fail='GP_DENIED')
  self.check('removed creator cannot retrieve old create receipt')
  self.sql(f"insert into gp_private.commitments values({lit(unit_session)},1,{lit(uid(1))},tstzrange('2030-01-10T18:00:00Z','2030-01-10T19:00:00Z','[)'));",fail='GP_COMMITMENT_WINDOW')
  self.check('commitment interval must match its immutable revision')
  self.race('grant revocation versus queued save',f"update app_private.module_access_grants set ended_at=clock_timestamp() where member_id={lit(uid(2))};",command_sql(2,'availability.save',{'expected':2,'windows':WINDOWS}),'GP_DENIED')
  self.cmd(2,'report.save',dict(report,expectedReport=1,summary='Corrected result',reason='Fictional correction'),correction_receipt,fail='GP_DENIED');self.check('revoked actor cannot replay prior work')
  queued_projection=self.race('ended leadership versus queued private projection',f"update app_private.role_assignments set ended_at=clock_timestamp() where id={lit(uid(506))};",auth(6)+f"select gp_private.workspace('{WEEK}');")
  self.check('queued projection excludes revoked draft','draft' not in json.loads(queued_projection.splitlines()[-1])['plan'])
  self.check('ended leadership loses private draft','draft' not in self.workspace(6)['plan'])
  self.check('no missing response creates inferred result',self.sql(f"select report_version=0 and phase='proposal' from gp_private.sessions where id={lit(pending)};")=='t')
  self.sql(auth(1)+f"begin isolation level repeatable read;select gp_private.workspace('{WEEK}');",fail='GP_ISOLATION_REQUIRED');self.check('stale transaction isolation rejected')
  self.sql(f"update public.members set status='inactive' where id={lit(uid(3))};")
  self.sql(auth(3)+f"select gp_private.workspace('{WEEK}');",fail='GP_DENIED');self.check('inactive member denied')
  self.sql(f"begin;update public.member_placements set ended_at=clock_timestamp() where member_id={lit(uid(1))} and ended_at is null;insert into public.member_placements(id,member_id,group_id,unit_id) values({lit(uid(901))},{lit(uid(1))},{lit(H)},{lit(W)});commit;")
  self.check('transfer does not grant old group sessions',not self.workspace(1)['sessions'])
  self.cmd(1,'report.save',report,report_receipt,fail='GP_DENIED');self.check('transfer invalidates old receipt access')
  self.check('historical group remains unchanged',self.sql(f"select bool_and(historical_group_id={lit(G)}::uuid) from gp_private.reports where session_id={lit(past)};")=='t')
  self.check('new group sees neither old draft nor sessions',self.workspace(1)['plan'] is None)
  self.check('no contact data tables or integrations in core',self.sql("select count(*) from pg_tables where schemaname='gp_private' and tablename like '%contact%';")=='0')

 def restore(self):
  dump=self.root/'fictional.dump'
  self.external(['pg_dump','-h',str(self.socket),'-p','55439','-d','postgres','-Fc','-f',str(dump)])
  self.external(['createdb','-h',str(self.socket),'-p','55439','gospel_restored'])
  self.external(['pg_restore','-h',str(self.socket),'-p','55439','-d','gospel_restored','--exit-on-error',str(dump)])
  original=self.args;self.args=original[:-1]+['gospel_restored']
  try:
   self.check('restored backup preserves closed gate',self.sql('select gp_private.live_enabled();')=='f')
   self.sql('set role authenticated;select * from gp_private.reports;',fail='42501');self.check('restored backup preserves private access denial')
   self.check('restored backup retains report correction history',self.sql('select count(*) from gp_private.reports;')=='2')
   self.check('restored backup retains overlap exclusion',self.sql("select count(*) from pg_constraint where conrelid='gp_private.commitments'::regclass and contype='x';")=='1')
  finally:self.args=original

def main():
 if os.geteuid()==0:raise SystemExit('Run as a non-root user.')
 for program in ['initdb','pg_ctl','psql','pg_dump','pg_restore','createdb']:
  if not shutil.which(program):raise SystemExit('Missing local test dependency: '+program)
 files=[ROOT/'supabase/tests/bootstrap.sql',*[ROOT/'supabase/migrations'/n for n in MIGRATIONS],ROOT/'docs/gospel-planning/transactional-core-review.sql']
 if not all(p.is_file() for p in files):raise SystemExit('Run from the complete repository; required source files are missing.')
 started=dt.datetime.now(dt.timezone.utc).isoformat()
 with tempfile.TemporaryDirectory(prefix='gp-native-') as folder:
  db=Database(Path(folder));started_server=False
  try:
   db.external(['initdb','-D',str(db.root/'data'),'--encoding=UTF8','--auth=trust','--no-locale'])
   db.external(['pg_ctl','-D',str(db.root/'data'),'-l',str(db.root/'postgres.log'),'-o',f"-k {db.socket} -p 55439 -c listen_addresses=''",'-w','start']);started_server=True
   for p in files:db.sql(p.read_text())
   db.seed();db.verify();db.restore()
   evidence={'status':'passed','startedAt':started,'finishedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'postgres':db.sql('select version();'),'assertions':len(db.checks),'checks':db.checks,'races':db.races,'sourceSha256':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},'limits':['Disposable PostgreSQL only; Auth tables/session claims are repository test doubles.','No hosted migration, live runtime, real-user Auth/PostgREST, frontend transport or physical-device validation.','Restricted Member Updates and Overseer Request persistence is not implemented by this core.','Authorization races assume protected operations use the existing foundation lock; infrastructure-owner direct SQL is not a member API.']}
   out=ROOT/'docs/gospel-planning/R2-VERIFICATION.json';out.write_text(json.dumps(evidence,indent=2)+'\n')
   print(json.dumps({'status':'passed','assertions':len(db.checks),'genuineRaces':len(db.races),'localRestore':'passed','evidence':str(out)}))
  finally:
   if started_server:db.external(['pg_ctl','-D',str(db.root/'data'),'-m','immediate','-w','stop'])
if __name__=='__main__':main()
