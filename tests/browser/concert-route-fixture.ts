// Routes the concert pages' API calls into a disposable in-process PostgreSQL (PGlite) running the real
// migrations and concert SQL. Fictional members only. Token derivation mirrors lib/concert/server.ts
// with a throwaway test secret (that module is server-only and cannot load here).
import type {Page} from '@playwright/test';
import {readFile,readdir} from 'node:fs/promises';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import QRCode from 'qrcode';
import {PGlite} from '@electric-sql/pglite';
import {ConcertError,databaseError,parseMemberCommand,tokenFromScan} from '../../lib/concert/domain';

export const member={ava:101,ben:102,devin:104} as const;
const mid=(n:number)=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
const secret='fictional-browser-test-secret-0123456789abcdef';
const mac=(label:string)=>createHmac('sha256',secret).update(label).digest('base64url');
const digest=(t:string)=>createHash('sha256').update(t).digest('hex');
const ticketToken=(id:string)=>mac('concert-ticket:v1:'+id);
const inviteToken=(memberId:string)=>mac('concert-invite:v1:'+memberId).slice(0,22);

const setup=`begin;
 insert into auth.users(id,email,email_confirmed_at) select ('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'browser-'||n||'@example.invalid',now()-interval '1 day' from generate_series(101,109)n;
 insert into auth.sessions(id,user_id,created_at) select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 hour' from generate_series(101,109)n;
 insert into app_private.account_links(member_id,auth_user_id,username) select ('44444444-4444-4444-8444-'||lpad(n::text,12,'0'))::uuid,('99999999-9999-4999-8999-'||lpad(n::text,12,'0'))::uuid,'browser_'||n from generate_series(101,109)n;
 update app_private.app_modules set status='approved',approved_at=now() where module_key='concert';
 insert into app_private.module_access_grants(member_id,module_id,permission,reason,granted_at)
  values('${mid(104)}',app_private.concert_module_id(),'manager','Fictional door volunteer',now()-interval '1 hour');
 commit;`;

export async function openConcert(page:Page,{as,event=true}:{as:number|null;event?:boolean}){
 const db=new PGlite();
 const migrations=(await readdir('supabase/migrations')).filter(p=>p.endsWith('.sql')&&p!=='20261014224708_contacts_private_owner_pilot_v1.sql'&&!/worship_duty_(live_activation|live_setup|operations)/.test(p)).sort();
 for(const path of ['supabase/tests/bootstrap.sql',...migrations.map(p=>'supabase/migrations/'+p),'supabase/seed/fictional_members.sql'])await db.exec(await readFile(path,'utf8'));
 await db.exec(setup);
 let actor=as;
 const call=async(sql:string,params:unknown[]=[])=>db.transaction(async tx=>{
  await tx.query(`select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)`,
   ['99999999-9999-4999-8999-'+String(actor).padStart(12,'0'),JSON.stringify({session_id:'aaaaaaaa-aaaa-4aaa-8aaa-'+String(actor).padStart(12,'0')})]);
  return (await tx.query<{value:unknown}>(sql,params)).rows[0].value;
 });
 const origin=new URL(page.context().pages()[0]?.url()||'http://127.0.0.1:3017').origin;
 const fail=(e:unknown)=>{const x=e instanceof ConcertError?e:databaseError((e as {code?:string}).code);return {status:x.status,json:{error:x.message,code:x.code}};};
 const signedOut={status:401,json:{error:'Sign in to your LV Zion account.',code:'session'}};
 if(event){actor=member.devin;await call(`select public.concert_command($1::jsonb) as value`,[JSON.stringify({op:'create',title:'Healing Concert',date:'2030-12-06',startTime:'18:00',doorsTime:'17:30',venue:'Fictional Main Hall',details:'Free entry. Fictional test event.',capacity:120,rsvpOpen:true})]);actor=as;}

 await page.route('**/api/concert',async route=>{
  if(actor===null){await route.fulfill(signedOut);return;}
  try{
   if(route.request().method()==='GET'){
    const me=mid(actor),invite=inviteToken(me);
    const ws=await call('select public.concert_workspace($1) as value',[digest(invite)]) as Record<string,unknown>&{myTicket:Record<string,unknown>|null};
    let myTicket=null;
    if(ws.myTicket){const url=origin+'/concert/ticket/'+ticketToken(String(ws.myTicket.id));myTicket={...ws.myTicket,url,qrSvg:await QRCode.toString(url,{type:'svg',margin:1})};}
    await route.fulfill({json:{...ws,myTicket,inviteUrl:origin+'/concert/i/'+invite,email:'browser-'+actor+'@example.invalid'}});return;
   }
   const c=parseMemberCommand(route.request().postDataJSON());
   if(c.op==='rsvp'){const id=randomUUID();const r=await call('select public.concert_member_rsvp($1,$2,$3,$4) as value',[id,digest(ticketToken(id)),c.email,c.partySize]) as {created:boolean};await route.fulfill({json:{ok:true,created:r.created,emailed:false}});return;}
   if(c.op==='resend'){await call('select public.concert_ticket_owner_email($1) as value',[c.ticketId]);await route.fulfill({json:{ok:true,emailed:true}});return;}
   await call('select public.concert_command($1::jsonb) as value',[JSON.stringify(c)]);await route.fulfill({json:{ok:true}});
  }catch(e){await route.fulfill(fail(e));}
 });
 await page.route('**/api/concert/attendance**',async route=>{
  if(actor===null){await route.fulfill(signedOut);return;}
  try{await route.fulfill({json:await call('select public.concert_attendance() as value')});}catch(e){await route.fulfill(fail(e));}
 });
 await page.route('**/api/concert/scan',async route=>{
  if(actor===null){await route.fulfill(signedOut);return;}
  try{const token=tokenFromScan(route.request().postDataJSON().code);
   await route.fulfill({json:token?await call('select public.concert_scan($1) as value',[digest(token)]):{result:'invalid'}});}catch(e){await route.fulfill(fail(e));}
 });
 return {
  as(n:number|null){actor=n;},
  async guestRsvp(inviter:number,name:string,email:string,party:number){
   const id=randomUUID();
   await db.query(`select set_config('request.jwt.claim.sub','',false)`);
   await db.query('select public.concert_guest_rsvp($1,$2,$3,$4,$5,null,$6)',[digest(inviteToken(mid(inviter))),id,digest(ticketToken(id)),name,email,party]);
   return origin+'/concert/ticket/'+ticketToken(id);
  },
  async ticketUrlOf(n:number){
   const r=await db.query<{id:string}>(`select id from app_private.concert_tickets where member_id=$1 and status='active'`,[mid(n)]);
   return origin+'/concert/ticket/'+ticketToken(r.rows[0].id);
  },
  close:()=>db.close()
 };
}
