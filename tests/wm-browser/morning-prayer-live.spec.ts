import {test,expect,type Page} from '@playwright/test';
import {vegasToday,vegasInstant} from '../../lib/morning-prayer/time';
const caps=['view_schedule','join_gathering','volunteer_host','review_requests','manage_schedule','view_materials','edit_materials','publish_materials'];
const id=(n:number)=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
const nextDate=()=>new Date(Date.now()+86400000).toISOString().slice(0,10);
function fixture(manager=true){
 const date=nextDate();
 const occ={id:id(1),date,originalDate:date,startsAt:vegasInstant(date,'07:00'),endsAt:vegasInstant(date,'07:30'),timezone:'America/Los_Angeles',kind:'gathering',host:'Host needed',isMine:false,hostConfirmed:false,verified:true,revision:1};
 return {version:1,occurrences:[occ],upcoming:[occ],ownHosting:[{...occ,host:'You',isMine:true}],requests:[],materials:[],drafts:[],eligibleHosts:[],capabilities:manager?caps:['view_schedule','view_materials'],timezone:'America/Los_Angeles',setupComplete:true,joinWindowMinutes:10,meetingStates:[{occurrenceId:id(1),ready:false,configured:false}],materialCatalog:[{key:'reading-draft',kind:'reading',revision:1,body:{title:'Fictional draft title',summary:'Fictional source wording',items:['Fictional point'],sourceLabel:'Fictional chapter 1'}}]};
}
async function setup(page:Page,manager=true){
 let data=fixture(manager);const commands:any[]=[];
 await page.route('**/api/morning-prayer?**',r=>r.fulfill({json:data}));
 await page.route('**/api/morning-prayer/access',async r=>{
  if(r.request().method()==='GET')return r.fulfill(manager?{json:{ownerId:id(10),version:data.version,members:[{id:id(11),name:'Fictional Member',status:'active',placement:'Fictional Group',enabled:true,capabilities:[],moduleAccess:false,hostEligible:false}]}}:{status:403,json:{error:'Denied'}});
  commands.push(r.request().postDataJSON());data={...data,version:data.version+1};await r.fulfill({json:{version:data.version}});
 });
 for(const path of ['command','batch','meeting','setup'])await page.route('**/api/morning-prayer/'+path,async r=>{
  commands.push(r.request().postDataJSON());data={...data,version:data.version+1};await r.fulfill({json:{version:data.version}});
 });
 await page.goto('/modules/work-mission-prayer');
 await expect(page.getByRole('heading',{name:'Your next gathering'})).toBeVisible();
 return {commands,setData:(value:typeof data)=>{data=value;},get data(){return data;}};
}
async function useMonthTextFallback(page:Page){
 await page.addInitScript(()=>{
  const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'type')!;
  Object.defineProperty(HTMLInputElement.prototype,'type',{...descriptor,set(value:string){descriptor.set!.call(this,value==='month'?'text':value);}});
  const setAttribute=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(name:string,value:string){setAttribute.call(this,name,this instanceof HTMLInputElement&&name==='type'&&value==='month'?'text':value);};
 });
}
test('real client supports Home Schedule Me Manage across phone and tablet widths',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Schedule',exact:true}).click();
 await expect(page.getByRole('group',{name:'Days this week'})).toBeVisible();
 await page.getByRole('button',{name:'Month',exact:true}).click();
 await expect(page.getByRole('region',{name:'Monthly Morning Prayer gathering calendar'})).toBeVisible();
 await page.getByRole('button',{name:'Me',exact:true}).click();
 await expect(page.getByRole('button',{name:'Confirm hosting'})).toBeVisible();
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 await expect(page.getByText('Meeting link',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Official Zoom join link')).toBeHidden();
 for(const width of [320,390,768,1024]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 }
});
test('recurrence previews exact weekdays and requires confirmation before writing',async({page})=>{
 const f=await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 const panel=page.getByTestId('wm-bulk-schedule');
 await panel.locator('summary').click();
 await panel.getByLabel('First date').fill(nextDate());
 await panel.getByLabel('Last date').fill(nextDate());
 const labels=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 await panel.getByLabel(labels[new Date(nextDate()+'T12:00:00Z').getUTCDay()],{exact:true}).check();
 await panel.getByRole('button',{name:'Preview selected dates'}).click();
 await expect(panel.getByRole('button',{name:/Save .* dates/})).toBeDisabled();
 await panel.getByLabel('I verified this selected range against the official schedule.').check();
 await panel.getByRole('button',{name:/Save .* dates/}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0].occurrences).toHaveLength(1);
 expect(f.commands[0].occurrences[0].date).toBe(nextDate());
});
test('unpublished draft can be corrected and edits reset source attestation',async({page})=>{
 const f=await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 await page.getByRole('button',{name:'Materials',exact:true}).click();
 const panel=page.getByTestId('wm-revision-editor');
 await panel.locator('summary').click();
 await panel.getByLabel('Material to revise').selectOption('reading-draft');
 await panel.getByLabel('I checked this revision against the approved source.').check();
 await panel.getByLabel('Title',{exact:true}).fill('Fictional corrected title');
 await expect(panel.getByLabel('I checked this revision against the approved source.')).not.toBeChecked();
 await panel.getByRole('button',{name:'Create reviewable correction'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0].action).toMatchObject({type:'material_draft',key:'reading-draft',sourceChecked:false,body:{title:'Fictional corrected title'}});
});
test('owner permissions use explicit capability choices',async({page})=>{
 const f=await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 await page.getByRole('button',{name:'People',exact:true}).click();
 const panel=page.getByTestId('wm-member-access');
 await panel.getByRole('combobox',{name:/^Member/}).selectOption(id(11));
 await panel.getByLabel('Access level').selectOption('Host');
 await expect(panel.getByLabel('Access level')).toHaveValue('Host');
 await panel.getByRole('button',{name:'Save access'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0].action).toMatchObject({type:'grant',memberId:id(11)});
 expect(f.commands[0].action.capabilities).toContain('volunteer_host');
 expect(f.commands[0].action.capabilities).not.toContain('review_requests');
});
test('member has no manager controls and denied refresh clears private state',async({page})=>{
 await setup(page,false);
 await expect(page.getByRole('button',{name:'Manage',exact:true})).toHaveCount(0);
 await page.route('**/api/morning-prayer?**',r=>r.fulfill({status:403,json:{error:'Access revoked'}}));
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.locator('main [role=alert]')).toContainText('Access revoked');
 await expect(page.getByRole('heading',{name:'Your next gathering'})).toHaveCount(0);
});
test('older refresh cannot restore a private schedule after a newer denial',async({page})=>{
 const f=await setup(page);let release:()=>void=()=>{};
 const held=new Promise<void>(r=>{release=r;});let calls=0;
 await page.route('**/api/morning-prayer?**',async r=>{
  calls++;if(calls===1){await held;await r.fulfill({json:f.data}).catch(()=>{});}
  else await r.fulfill({status:403,json:{error:'Access revoked'}});
 });
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect.poll(()=>calls).toBe(1);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.locator('main [role=alert]')).toContainText('Access revoked');release();
 await expect(page.getByRole('heading',{name:'Your next gathering'})).toHaveCount(0);
});

test('Manage starts with focused sections and closed setup forms',async({page})=>{
 await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 await expect(page.getByLabel('Start (Las Vegas)',{exact:true})).toBeHidden();
 await expect(page.getByLabel('Official Zoom join link')).toBeHidden();
 await expect(page.getByTestId('wm-revision-editor')).toHaveCount(0);
 await expect(page.getByTestId('wm-member-access')).toHaveCount(0);
 await page.getByRole('button',{name:'Materials',exact:true}).click();
 await expect(page.getByTestId('wm-bulk-schedule')).toHaveCount(0);
 await expect(page.getByLabel('Title',{exact:true})).toBeHidden();
 await expect(page.getByText('New reading or PWP',{exact:true})).toBeVisible();
});
test('PWP draft uses month and week choices without exposing database keys',async({page})=>{
 const f=await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 await page.getByRole('button',{name:'Materials',exact:true}).click();
 await page.getByText('New reading or PWP',{exact:true}).click();
 await expect(page.getByLabel('Unique material key')).toHaveCount(0);
 await page.getByLabel('PWP month').fill('2026-12');
 await page.getByRole('combobox',{name:'Week',exact:true}).selectOption('3');
 await page.getByLabel('Title',{exact:true}).fill('Fictional December PWP');
 await page.getByLabel('Summary',{exact:true}).fill('Fictional source wording');
 await page.getByLabel('Activities or points (one per line, up to five)').fill('Fictional activity');
 await page.getByLabel('Source',{exact:true}).fill('Fictional approved chapter');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0].action).toMatchObject({type:'create_material',kind:'pwp',key:'pwp-2026-12-week-3',sourceChecked:false});
 await expect(page.getByLabel('Title',{exact:true})).toHaveValue('');
});
test('reading drafts receive separate private identifiers for each successful create',async({page})=>{
 const f=await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 await page.getByRole('button',{name:'Materials',exact:true}).click();
 await page.getByText('New reading or PWP',{exact:true}).click();
 await page.getByRole('combobox',{name:'Type',exact:true}).selectOption('reading');
 for(let n=1;n<=2;n++){
  await page.getByLabel('Title',{exact:true}).fill('Fictional reading '+n);
  await page.getByLabel('Summary',{exact:true}).fill('Fictional source wording');
  await page.getByLabel('Activities or points (one per line, up to five)').fill('Fictional point');
  await page.getByLabel('Source',{exact:true}).fill('Fictional source');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect.poll(()=>f.commands.length).toBe(n);
  await expect(page.getByLabel('Title',{exact:true})).toHaveValue('');
 }
 expect(f.commands[0].action.key).not.toBe(f.commands[1].action.key);
 expect(f.commands[0].action.key).toMatch(/^reading-[0-9a-f-]+$/);
});
test('accepted save with unavailable readback never reports a confirmed saved result',async({page})=>{
 const f=await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 const panel=page.getByTestId('wm-bulk-schedule');await panel.locator('summary').click();
 await panel.getByLabel('First date').fill(nextDate());await panel.getByLabel('Last date').fill(nextDate());
 await panel.getByLabel(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(nextDate()+'T12:00:00Z').getUTCDay()],{exact:true}).check();
 await panel.getByRole('button',{name:'Preview selected dates'}).click();
 await panel.getByLabel('I verified this selected range against the official schedule.').check();
 await page.route('**/api/morning-prayer?**',r=>r.fulfill({status:503,json:{error:'Refresh unavailable'}}));
 await panel.getByRole('button',{name:/Save .* dates/}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 await expect(page.locator('main [role=status]')).toContainText('Change accepted. Refresh to confirm the result.');
 await expect(page.locator('main [role=alert]')).toContainText('Refresh unavailable');
});
test('clean interface supports keyboard disclosure and phone/desktop evidence',async({page})=>{
 await setup(page);
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/lvz-wm-simple-home-phone.png'});
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 const summary=page.getByTestId('wm-bulk-schedule').locator('summary');
 await summary.focus();await page.keyboard.press('Enter');
 await expect(page.getByLabel('First date')).toBeVisible();
 await page.keyboard.press('Enter');
 await expect(page.getByLabel('First date')).toBeHidden();
 await page.screenshot({path:'/tmp/lvz-wm-simple-manage-phone.png'});
 await page.setViewportSize({width:1280,height:900});
 await page.screenshot({path:'/tmp/lvz-wm-simple-manage-desktop.png'});
});
test('publication keeps full source review available before the publish action',async({page})=>{
 const f=await setup(page);
 f.setData({...f.data,drafts:[{...f.data.materialCatalog[0],id:id(21),sourceState:'checked'}]} as any);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 await page.getByRole('button',{name:'Materials',exact:true}).click();
 await expect(page.getByRole('button',{name:'Publish',exact:true})).toBeHidden();
 await page.getByText('Review draft',{exact:true}).click();
 await expect(page.getByText('Fictional point',{exact:true})).toBeVisible();
 await expect(page.getByText('Source: Fictional chapter 1',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Publish',exact:true}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0].action).toMatchObject({type:'material_publish',materialId:id(21)});
});
test('new material form blocks empty required details before sending a command',async({page})=>{
 const f=await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 await page.getByRole('button',{name:'Materials',exact:true}).click();
 await page.getByText('New reading or PWP',{exact:true}).click();
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(page.getByLabel('Title',{exact:true})).toBeFocused();
 expect(f.commands).toHaveLength(0);
});
test('month text fallback keeps partial entries editable and loads only complete months',async({page})=>{
 await useMonthTextFallback(page);
 await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 const month=page.getByLabel('Month',{exact:true});
 const reads:string[]=[];
 page.on('request',request=>{if(request.url().includes('/api/morning-prayer?'))reads.push(request.url());});
 await expect(month).toHaveAttribute('type','text');
 await month.fill('2026-');
 await expect(month).toHaveValue('2026-');
 await expect(page.getByTestId('wm-bulk-schedule')).toBeVisible();
 expect(reads).toHaveLength(0);
 await month.fill('2026-99');
 await expect(month).toHaveValue('2026-99');
 expect(reads).toHaveLength(0);
 await month.fill('2026-12');
 await expect.poll(()=>reads.some(url=>url.includes('from=2026-12-01&to=2026-12-31'))).toBe(true);
 await expect(page.getByLabel('Month',{exact:true})).toHaveValue('2026-12');
 await expect(page.locator('main [role=alert]')).toHaveCount(0);
});
test('PWP text fallback rejects an invalid month before creating a draft',async({page})=>{
 await useMonthTextFallback(page);
 const f=await setup(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Manage',exact:true}).click();
 await page.getByRole('button',{name:'Materials',exact:true}).click();
 await page.getByText('New reading or PWP',{exact:true}).click();
 const month=page.getByLabel('PWP month');
 await expect(month).toHaveAttribute('type','text');
 await month.fill('2026-99');
 await page.getByLabel('Title',{exact:true}).fill('Fictional title');
 await page.getByLabel('Summary',{exact:true}).fill('Fictional summary');
 await page.getByLabel('Activities or points (one per line, up to five)').fill('Fictional point');
 await page.getByLabel('Source',{exact:true}).fill('Fictional source');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(month).toBeFocused();
 expect(await month.evaluate(element=>(element as HTMLInputElement).validity.patternMismatch)).toBe(true);
 expect(f.commands).toHaveLength(0);
});
test('persistent Home links home and a deliberate swipe changes tabs without wrapping',async({page})=>{
 await setup(page);
 await expect(page.getByRole('link',{name:'Home',exact:true})).toHaveAttribute('href','/members');
 const content=page.locator('main [data-testid=wm-content]');
 const swipe=async(dx:number,dy=0,ms=150)=>content.evaluate(async(el,[dx,dy,ms])=>{
  const touch=(x:number,y:number)=>new Touch({identifier:1,target:el,clientX:x,clientY:y});
  el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[touch(200,300)],changedTouches:[touch(200,300)]}));
  await new Promise(r=>setTimeout(r,ms));
  el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[touch(200+dx,300+dy)]}));
 },[dx,dy,ms]);
 const current=()=>page.locator('nav[aria-label="Main navigation"] [aria-current=page]');
 await swipe(80);await expect(page.getByRole('heading',{name:'Your next gathering'})).toBeVisible();
 await swipe(-80);await expect(current()).toHaveText('Schedule');
 await swipe(-40);await expect(current()).toHaveText('Schedule');
 await swipe(-80,70);await expect(current()).toHaveText('Schedule');
 await swipe(-80,0,700);await expect(current()).toHaveText('Schedule');
});

