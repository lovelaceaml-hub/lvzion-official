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
 for(const path of ['command','batch','meeting'])await page.route('**/api/morning-prayer/'+path,async r=>{
  commands.push(r.request().postDataJSON());data={...data,version:data.version+1};await r.fulfill({json:{version:data.version}});
 });
 await page.goto('/modules/work-mission-prayer');
 await expect(page.getByRole('heading',{name:'Your next gathering'})).toBeVisible();
 return {commands,setData:(value:typeof data)=>{data=value;},get data(){return data;}};
}
test('real client supports Home Schedule Me Manage across phone and tablet widths',async({page})=>{
 await setup(page);
 await page.getByRole('button',{name:'Schedule',exact:true}).click();
 await expect(page.getByRole('region',{name:'Monthly Morning Prayer gathering calendar'})).toBeVisible();
 await page.getByRole('button',{name:'Me',exact:true}).click();
 await expect(page.getByRole('button',{name:'Confirm hosting'})).toBeVisible();
 await page.getByRole('button',{name:'Manage',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Private Zoom access'})).toBeVisible();
 for(const width of [320,390,768,1024]){
  await page.setViewportSize({width,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 }
});
test('recurrence previews exact weekdays and requires confirmation before writing',async({page})=>{
 const f=await setup(page);await page.getByRole('button',{name:'Manage',exact:true}).click();
 const panel=page.getByTestId('wm-bulk-schedule');
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
 const f=await setup(page);await page.getByRole('button',{name:'Manage',exact:true}).click();
 const panel=page.getByTestId('wm-revision-editor');
 await panel.getByLabel('Material to revise').selectOption('reading-draft');
 await panel.getByLabel('I checked this revision against the approved source.').check();
 await panel.getByLabel('Title',{exact:true}).fill('Fictional corrected title');
 await expect(panel.getByLabel('I checked this revision against the approved source.')).not.toBeChecked();
 await panel.getByRole('button',{name:'Create reviewable correction'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0].action).toMatchObject({type:'material_draft',key:'reading-draft',sourceChecked:false,body:{title:'Fictional corrected title'}});
});
test('owner permissions use explicit capability choices',async({page})=>{
 const f=await setup(page);await page.getByRole('button',{name:'Manage',exact:true}).click();
 const panel=page.getByTestId('wm-member-access');
 await panel.getByRole('combobox',{name:/^Member/}).selectOption(id(11));
 await panel.getByLabel('Quick permission set').selectOption('Host');
 await panel.getByRole('button',{name:'Save member capabilities'}).click();
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
