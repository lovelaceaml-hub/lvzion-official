// Routes the real module page's API calls into a disposable in-process PostgreSQL (PGlite) running the
// actual migrations and Gospel Planning SQL. Fictional members only; no hosted accounts, cookies or network.
// The route handlers apply the same strict parser and error mapping as the Next.js API routes.
import type {Page} from '@playwright/test';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {commandFailure,ContractError,parseCommand,weekKey} from '../../lib/gospel-planning/contract';

export const member={ava:101,ben:102,cara:103,devin:104,eira:105,gina:107,hugo:108,isla:109} as const;
const mid=(n:number)=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');

/** Fictional setup: module approved here only, Isla leads group A and publishes, Eira oversees group A, Hugo manages. */
function setup(places:boolean){
 return `begin;
 insert into auth.users(id,email,email_confirmed_at) select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'browser-'||n||'@example.invalid',now()-interval '1 day' from generate_series(101,109)n;
 insert into auth.sessions(id,user_id,created_at) select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 hour' from generate_series(101,109)n;
 insert into app_private.account_links(member_id,auth_user_id,username) select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'browser_'||n from generate_series(101,109)n;
 update app_private.app_modules set status='approved',approved_at=now() where module_key='gospel-planning';
 insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_at)
  select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,'a7000000-0000-4000-8000-000000000001',case n when 108 then 'manager' else 'viewer' end,'Fictional browser access',now()-interval '1 hour'
  from unnest(array[101,102,103,105,107,108,109]) n;
 insert into app_private.role_assignments(member_id,role_key,group_id,appointed_at) values('${mid(109)}','group_leader','22222222-2222-4222-8222-000000000001',now()-interval '1 day');
 insert into gp_private.capability_grants(member_id,capability,group_id,placement_id,granted_by)
  select '${mid(109)}','publish','22222222-2222-4222-8222-000000000001',id,'${mid(108)}' from public.member_placements where member_id='${mid(109)}' and ended_at is null;
 insert into gp_private.capability_grants(member_id,capability,group_id,granted_by) values('${mid(105)}','oversee','22222222-2222-4222-8222-000000000001','${mid(108)}');
 ${places?`insert into gp_private.locations(label,created_by) values('Fictional Library Lobby','${mid(108)}'),('Fictional Park Pavilion','${mid(108)}');`:''}
 commit;`;
}

export async function openGospel(page:Page,{as,places=true}:{as:number;places?:boolean}){
 const db=new PGlite();
 const migrations=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&p!=='20261014224708_contacts_private_owner_pilot_v1.sql').sort();
 for(const path of ['supabase/tests/bootstrap.sql',...migrations.map(p=>'supabase/migrations/'+p),'supabase/seed/fictional_members.sql'])await db.exec(await readFile(path,'utf8'));
 await db.exec(setup(places));
 let actor=as;
 const call=async(sql:string,params:unknown[])=>db.transaction(async tx=>{
  await tx.query(`select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)`,
   ['99999999-9999-4999-8999-'+String(actor).padStart(12,'0'),JSON.stringify({session_id:'aaaaaaaa-aaaa-4aaa-8aaa-'+String(actor).padStart(12,'0')})]);
  return (await tx.query<{value:unknown}>(sql,params)).rows[0].value;
 });
 const fail=(error:unknown)=>{const failure=commandFailure({message:(error as Error).message});return {status:failure.status,json:failure};};
 await page.route('**/api/gospel-planning?**',async route=>{
  try{
   const week=weekKey(new URL(route.request().url()).searchParams.get('week'));
   await route.fulfill({json:await call('select public.gospel_planning_workspace($1::date) as value',[week])});
  }catch(error){
   const f=fail(error);
   await route.fulfill(f.status===403?{status:403,json:{code:'FORBIDDEN',error:'Groups & Gospel Planning has not been assigned to your account.'}}:f);
  }
 });
 await page.route('**/api/gospel-planning/command',async route=>{
  let command;
  try{command=parseCommand(route.request().postDataJSON());}
  catch(error){await route.fulfill({status:400,json:{code:'INVALID',error:error instanceof ContractError?error.message:'Invalid request.'}});return;}
  try{await route.fulfill({json:await call('select public.gospel_planning_command($1,$2::jsonb,$3::uuid) as value',[command.action,JSON.stringify(command.payload),command.requestId])});}
  catch(error){await route.fulfill(fail(error));}
 });
 // A focus event makes the page reload its workspace; wait until that read has been answered and painted.
 async function refresh(){
  const answered=page.waitForResponse(r=>r.url().includes('/api/gospel-planning?'));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await answered;
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(null)))));
 }
 await page.goto('/modules/gospel-planning');
 return {
  db,
  /** Switch persona; the page refreshes as when a member returns to it. */
  async as(n:number){actor=n;await refresh();await page.locator(`[data-gp-viewer="${mid(n)}"]`).or(page.locator('main:not(.gp-app[data-gp-viewer])')).first().waitFor();},
  /** Move every session into the past, as the clock would. */
  async endSession(){await db.exec(`update gp_private.sessions set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour'`);await refresh();},
  async sql(text:string){await db.exec(text);},
  async close(){await db.close();},
 };
}
