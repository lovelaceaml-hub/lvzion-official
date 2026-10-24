// Groups & Gospel Planning on the real module route. API calls run the actual SQL in a disposable
// in-process database (see gospel-route-fixture.ts). Fictional people and places only.
import {test,expect,type Page} from '@playwright/test';
import {member,openGospel} from './gospel-route-fixture';
import {mondayOf,vegasDay} from '../../lib/gospel-planning/contract';

const shots=process.env.LVZ_SCREENSHOT_DIR;
async function capture(page:Page,name:string){if(shots)await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
const saved=(page:Page)=>page.locator('.gp-app > [role=status]');
const tomorrow=vegasDay(new Date(Date.now()+864e5));
async function showWeekOf(page:Page,day:string){
 if(mondayOf(day)!==mondayOf(vegasDay()))await page.getByRole('button',{name:'Next week'}).click();
}
const sessionSheet=(page:Page)=>page.getByRole('dialog',{name:'Session'});

test('leader week: private update, draft, publication and overseer request with history',async({page})=>{
 const gp=await openGospel(page,{as:member.isla});
 await page.getByRole('tab',{name:'My Group'}).click();
 await expect(page.locator('.gp-section-heading h2')).toHaveText(['1Member Updates','2Gospel Review','3Gospel Plan','4Request for Overseer']);

 await page.getByRole('button',{name:'Add update'}).click();
 const update=page.getByRole('dialog',{name:'Add member update'});
 await update.getByLabel('Unit').selectOption({label:'Demo Unit A1'});
 await update.getByLabel('About (optional)').selectOption({label:'Gina Example'});
 await update.getByLabel('Update',{exact:true}).fill('Fictional private update');
 await update.getByLabel('Next action (optional)').fill('Fictional call');
 await update.getByLabel('I will take the next action').check();
 await update.getByRole('button',{name:'Add update'}).click();
 await expect(saved(page)).toContainText('Member update added');
 await expect(page.getByText('Fictional private update')).toBeVisible();

 await page.getByRole('button',{name:'Start draft'}).click();
 const draft=page.getByRole('dialog',{name:'Week draft'});
 await draft.getByLabel('Gospel Review').fill('Fictional review of the week');
 await draft.getByLabel('Gospel Plan').fill('Fictional plan for the week');
 await draft.getByLabel('Next action').fill('Fictional follow-up');
 await draft.getByRole('button',{name:'Save draft'}).click();
 await expect(page.getByText('not yet published')).toBeVisible();

 await gp.as(member.gina);
 await expect(page.getByText('No plan has been published for this week.')).toBeVisible();
 await expect(page.getByText('Fictional plan for the week')).toHaveCount(0);
 await expect(page.getByText('Fictional private update')).toHaveCount(0);

 await gp.as(member.isla);
 await page.getByRole('button',{name:'Publish to group'}).click();
 await expect(saved(page)).toContainText('Plan published');
 await page.getByRole('button',{name:'New request'}).click();
 const request=page.getByRole('dialog',{name:'New request for overseer'});
 await request.getByLabel('Request',{exact:true}).fill('Fictional request for guidance');
 await request.getByRole('button',{name:'Send request'}).click();
 await expect(page.getByText('Waiting for the overseer')).toBeVisible();
 await capture(page,'gospel-leader-week-phone');

 await gp.as(member.gina);
 await expect(page.getByText('Fictional plan for the week')).toBeVisible();
 await expect(page.getByText('Fictional review of the week')).toBeVisible();
 await expect(page.getByText('Fictional private update')).toHaveCount(0);
 await expect(page.getByText('Fictional request for guidance')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Add update'})).toHaveCount(0);
 await capture(page,'gospel-member-group-phone');

 await gp.as(member.eira);
 await page.getByRole('button',{name:/From Isla Example/}).click();
 const answer=page.getByRole('dialog',{name:'Request for overseer'});
 await answer.getByLabel('Your response').fill('Fictional question back');
 await answer.getByRole('button',{name:'Ask a question'}).click();
 await expect(page.getByText('Overseer asked a question')).toBeVisible();
 await expect(page.getByText('Fictional private update')).toHaveCount(0);

 await gp.as(member.isla);
 await page.getByRole('button',{name:/To Eira Example/}).click();
 const reply=page.getByRole('dialog',{name:'Request for overseer'});
 await expect(reply.getByText('Fictional question back')).toBeVisible();
 await reply.getByLabel('Your reply').fill('Fictional clarification');
 await reply.getByRole('button',{name:'Send reply'}).click();
 await gp.as(member.eira);
 await page.getByRole('button',{name:/From Isla Example/}).click();
 await answer.getByLabel('Your response').fill('Fictional answer');
 await answer.getByRole('button',{name:'Send answer'}).click();
 await gp.as(member.isla);
 await page.getByRole('button',{name:/To Eira Example/}).click();
 await expect(reply.locator('.gp-history li')).toHaveCount(4);
 await expect(reply.getByText('Fictional answer')).toBeVisible();
 await gp.close();
});

test('member availability, proposed session, partner response, change and one shared result',async({page})=>{
 const gp=await openGospel(page,{as:member.gina});
 await expect(page.getByRole('tab',{name:'My Preaching'})).toHaveAttribute('aria-selected','true');
 await expect(page.getByText('Nothing scheduled yet')).toBeVisible();
 await expect(page.getByRole('button',{name:'Open apps'})).toBeVisible();

 await page.getByRole('button',{name:'Edit',exact:true}).click();
 const availability=page.getByRole('dialog',{name:'Your availability'});
 await availability.getByRole('button',{name:'Add a time range'}).click();
 await availability.getByLabel('First date').fill(tomorrow);
 await availability.getByLabel('From').fill('09:00');
 await availability.getByLabel('To').fill('13:00');
 await availability.getByLabel('Repeat').selectOption('2');
 await availability.getByRole('button',{name:'Save availability'}).click();
 await expect(saved(page)).toContainText('Availability saved');
 await expect(page.getByText('Weekly for 2 weeks')).toBeVisible();

 await page.getByRole('button',{name:'Plan a session'}).click();
 const plan=page.getByRole('dialog',{name:'Plan a session'});
 await plan.getByLabel('Date').fill(tomorrow);
 await plan.getByLabel('Start').fill('10:00');
 await plan.getByLabel('End').fill('11:00');
 await plan.getByLabel('Ben Example').check();
 await plan.getByRole('button',{name:'Propose session'}).click();
 await expect(page.locator('.gp-session-row')).toContainText('Proposed');

 await gp.as(member.isla);
 await showWeekOf(page,tomorrow);
 await page.locator('.gp-session-row',{hasText:'Gina Example'}).click();
 await sessionSheet(page).getByRole('button',{name:'Publish to partners'}).click();
 await expect(saved(page)).toContainText('Partners are asked to confirm');

 await gp.as(member.ben);
 await expect(page.locator('.gp-next')).toContainText('Awaiting you');
 await page.getByRole('button',{name:'Answer this session'}).click();
 await sessionSheet(page).getByRole('button',{name:'Accept',exact:true}).click();
 await expect(page.locator('.gp-session-row')).toContainText('Awaiting partner');

 await gp.as(member.gina);
 await page.getByRole('button',{name:'Answer this session'}).click();
 await expect(sessionSheet(page).getByText('Accepted')).toBeVisible();
 await sessionSheet(page).getByRole('button',{name:'Accept',exact:true}).click();
 await expect(page.locator('.gp-session-row')).toContainText('Confirmed');
 await capture(page,'gospel-member-preaching-phone');

 await gp.as(member.isla);
 await page.locator('.gp-session-row',{hasText:'Gina Example'}).click();
 await sessionSheet(page).getByRole('button',{name:'Change time, place or partners'}).click();
 const change=page.getByRole('dialog',{name:'Change session'});
 await change.getByLabel('Start').fill('11:00');
 await change.getByLabel('End').fill('12:00');
 await change.getByRole('button',{name:'Save change'}).click();
 await page.locator('.gp-session-row',{hasText:'Gina Example'}).click();
 await expect(sessionSheet(page).getByText('needs to confirm the change').first()).toBeVisible();
 await sessionSheet(page).getByRole('button',{name:'Publish to partners'}).click();

 await gp.as(member.gina);
 await expect(page.locator('.gp-session-row')).toContainText('Please reconfirm');
 await page.getByRole('button',{name:'Answer this session'}).click();
 await sessionSheet(page).getByRole('button',{name:'Accept',exact:true}).click();
 await gp.as(member.ben);
 await page.getByRole('button',{name:'Answer this session'}).click();
 await sessionSheet(page).getByRole('button',{name:'Accept',exact:true}).click();
 await expect(page.locator('.gp-session-row')).toContainText('Confirmed');

 await gp.endSession();
 await gp.as(member.gina);
 await page.getByRole('button',{name:'Record the shared result'}).click();
 await sessionSheet(page).getByLabel('Note (optional)').fill('Fictional shared note');
 await sessionSheet(page).getByRole('button',{name:'Save shared result'}).click();
 await expect(saved(page)).toContainText('Shared result saved');
 // The ended session is listed once: in the week on screen, or under recent sessions when another week is shown.
 await expect(page.locator('.gp-session-row')).toContainText('Result recorded');

 await gp.as(member.ben);
 await page.locator('.gp-session-row',{hasText:'Result recorded'}).click();
 await expect(sessionSheet(page)).toContainText('Recorded by Gina Example');
 await expect(sessionSheet(page).getByRole('button',{name:'Save shared result'})).toHaveCount(0);
 await expect(sessionSheet(page).getByRole('button',{name:'Correct the result'})).toBeVisible();
 const reports=await gp.db.query<{n:number}>('select count(*)::int n from gp_private.reports');
 expect(reports.rows[0].n).toBe(1);
 await gp.close();
});

test('session details: Contacts stays separate, unit leader publishes, a partner corrects the one result',async({page})=>{
 const gp=await openGospel(page,{as:member.gina});
 await page.getByRole('button',{name:'Plan a session'}).click();
 const plan=page.getByRole('dialog',{name:'Plan a session'});
 await plan.getByLabel('Date').fill(tomorrow);
 await plan.getByLabel('Ava Example').check();
 await plan.getByRole('button',{name:'Propose session'}).click();
 await page.locator('.gp-session-row').click();
 const sheet=sessionSheet(page);
 await expect(sheet.getByRole('link',{name:'Open in Contacts'})).toHaveAttribute('href','/modules/contacts');
 await expect(sheet.getByRole('link',{name:'Create follow-up in Contacts'})).toHaveAttribute('href','/modules/contacts');
 await expect(sheet).toContainText('Nothing from this session is shared');
 await expect(sheet.getByRole('button',{name:'Publish to partners'})).toHaveCount(0);
 await sheet.getByRole('button',{name:'Close session'}).click();

 // Ava leads unit A1, which includes both partners, so she may publish it.
 await gp.as(member.ava);
 await page.locator('.gp-session-row').click();
 await sessionSheet(page).getByRole('button',{name:'Publish to partners'}).click();
 await expect(saved(page)).toContainText('Partners are asked to confirm');
 for(const who of [member.ava,member.gina]){
  await gp.as(who);
  await page.getByRole('button',{name:'Answer this session'}).click();
  await sessionSheet(page).getByRole('button',{name:'Accept',exact:true}).click();
  await expect(saved(page)).toContainText('Your answer is saved');
 }
 await gp.endSession();
 await page.getByRole('button',{name:'Record the shared result'}).click();
 await sessionSheet(page).getByRole('button',{name:'Save shared result'}).click();
 await expect(saved(page)).toContainText('Shared result saved');

 await gp.as(member.ava);
 await page.locator('.gp-session-row',{hasText:'Result recorded'}).click();
 await sessionSheet(page).getByRole('button',{name:'Correct the result'}).click();
 await sessionSheet(page).getByLabel('Not held').check();
 await sessionSheet(page).getByLabel('Reason for the correction').fill('Fictional correction');
 await sessionSheet(page).getByRole('button',{name:'Save correction'}).click();
 await expect(saved(page)).toContainText('Shared result saved');
 await expect(page.locator('.gp-session-row')).toContainText('Recorded as not held');
 const reports=await gp.db.query<{n:number;current:number}>('select count(*)::int n,max(s.report_version)::int current from gp_private.reports r join gp_private.sessions s on s.id=r.session_id');
 expect(reports.rows[0]).toEqual({n:2,current:2});
 await gp.close();
});

test('manager sets up places and roles without seeing ministry records',async({page})=>{
 const gp=await openGospel(page,{as:member.gina,places:false});
 await expect(page.getByText('No approved meeting places yet')).toBeVisible();
 await expect(page.getByRole('button',{name:'Plan a session'})).toHaveCount(0);
 await gp.as(member.hugo);
 await page.getByRole('tab',{name:'Manage'}).click();
 await expect(page.getByText('Managing this app does not open any group plan')).toBeVisible();
 await page.getByLabel('New place').fill('Fictional Community Room');
 await page.getByRole('button',{name:'Add place'}).click();
 await expect(saved(page)).toContainText('Place added');
 await page.getByRole('button',{name:'Roles'}).click();
 await page.getByRole('combobox',{name:/^Member/}).selectOption('44444444-4444-4444-8444-000000000101');
 await page.getByRole('combobox',{name:/^Role/}).selectOption('schedule');
 await page.getByRole('combobox',{name:/^Scope/}).selectOption({label:'Demo Unit A1 only'});
 await page.getByRole('button',{name:'Assign role'}).click();
 await expect(saved(page)).toContainText('Role assigned');
 await expect(page.getByText('Ava Example · Scheduler')).toBeVisible();
 await capture(page,'gospel-manage-phone');
 await page.getByRole('tab',{name:'My Group'}).click();
 await expect(page.getByText('Demo Group B',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Add update'})).toHaveCount(0);
 await gp.as(member.gina);
 await expect(page.getByRole('tab',{name:'Manage'})).toHaveCount(0);
 await page.getByRole('tab',{name:'My Preaching'}).click();
 await expect(page.getByRole('button',{name:'Plan a session'})).toBeVisible();
 await gp.close();
});

test('revoked access clears the screen on the next refresh',async({page})=>{
 const gp=await openGospel(page,{as:member.gina});
 await expect(page.getByRole('heading',{name:'This week'})).toBeVisible();
 // Apps are open to every signed-in member (2026-10-24), so access ends by suspending the account.
 await gp.sql(`update app_private.account_links set technical_enabled=false where member_id='44444444-4444-4444-8444-000000000107'`);
 await gp.as(member.gina);
 await expect(page.getByText('is not available for this account or group')).toBeVisible();
 await expect(page.getByRole('heading',{name:'This week'})).toHaveCount(0);
 await gp.close();
});

test('tabs switch by swipe and the bottom navigation, with the center Apps launcher kept',async({page})=>{
 const gp=await openGospel(page,{as:member.isla});
 await expect(page.locator('.app-frame-heading')).toContainText('Gospel Planning');
 const swipe=(dx:number)=>page.locator('#gp-panel').evaluate((el,dx)=>{
  const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+40;
  const touch=(cx:number)=>new Touch({identifier:1,target:el,clientX:cx,clientY:y});
  el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(x)],changedTouches:[touch(x)]}));
  el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[touch(x+dx)]}));
 },dx);
 await swipe(-120);
 await expect(page.getByRole('tab',{name:'My Group'})).toHaveAttribute('aria-selected','true');
 await swipe(120);
 await expect(page.getByRole('tab',{name:'My Preaching'})).toHaveAttribute('aria-selected','true');
 await page.locator('.app-frame-nav').getByRole('button',{name:'My Group'}).click();
 await expect(page.getByRole('tab',{name:'My Group'})).toHaveAttribute('aria-selected','true');
 await expect(page.locator('.app-frame-nav .app-frame-apps')).toBeVisible();
 await expect(page.locator('.app-frame')).toHaveAttribute('data-lvz-module','gospel-planning');
 await gp.close();
});

test('dark appearance keeps the module style',async({page})=>{
 await page.addInitScript(()=>{try{localStorage.setItem('lvz.appearance.v1','dark');}catch{}});
 const gp=await openGospel(page,{as:member.gina});
 await expect(page.getByRole('heading',{name:'This week'})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-lvz-scheme','dark');
 await expect(page.locator('.app-frame')).toHaveAttribute('data-lvz-module','gospel-planning');
 await gp.close();
});

test('phone and desktop layouts fit without sideways scrolling',async({page})=>{
 const gp=await openGospel(page,{as:member.isla});
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:width>900?900:800});
  for(const tab of ['My Preaching','My Group']){
   await page.getByRole('tab',{name:tab}).click();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  }
  if(width!==320)await capture(page,'gospel-group-'+(width>900?'desktop':'phone'));
 }
 await gp.close();
});

test('protected endpoints refuse anonymous requests',async({request})=>{
 const read=await request.get('/api/gospel-planning?week=2026-10-26');
 expect(read.status()).toBe(401);
 expect(read.headers()['cache-control']).toContain('no-store');
 const write=await request.post('/api/gospel-planning/command',{data:{action:'availability.save',requestId:'51000000-0000-4000-8000-000000000001',payload:{expected:0,ranges:[]}}});
 expect(write.status()).toBe(401);
});
