import {test,expect} from '@playwright/test';

const now=Date.parse('2026-10-14T18:00:00-07:00');
const date=(shift:number)=>new Date(now+shift).toISOString();
const u=(n:string)=>n+'0000000-0000-4000-8000-000000000001';
const intro={id:'welcome',kind:'announcement',style:'editorial',title:'Fictional welcome',
 body:'Illustrative content only.',duration:12};
const event={id:'sample-event',kind:'event',style:'event',title:'Fictional event',
 body:'Only for test',date:'2026-10-20',time:'3:00 PM',location:'Sample location',duration:12};
const baseScreen=()=>({
 id:'30000000-0000-4000-8000-000000000001',label:'Lobby Display',enabled:false,
 draftVersion:2,items:[intro,event],startsAt:date(-3600000),endsAt:date(604800000),
 approvedVersion:2,publishedVersion:2,publishedAt:date(-10000),
 publishedUntil:date(604800000),publishedFrom:date(-3600000),
 devices:[],history:[
  {id:'50000000-0000-4000-8000-000000000001',generation:2,publishedAt:date(-10000),until:date(604800000)},
  {id:'50000000-0000-4000-8000-000000000002',generation:1,publishedAt:date(-86400000),until:date(604800000)}
 ],configVersion:0,operatingHours:[],publishedItems:[intro,event],overrideSlideId:null as string|null,overrideUntil:null as string|null
});
test('fictional phone editor supports screen switching and versioned operating hours',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const screen=baseScreen(),writes:any[]=[];let screens:any[]=[screen];
 await page.route('**/api/display/manage',async route=>{
  if(route.request().method()==='GET'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({screens})});return;
  }
  const data=route.request().postDataJSON();writes.push(data);
  if(data.action==='hours'){const target=screens.find(s=>s.id===data.screenId);
   target.operatingHours=data.hours;target.configVersion++; }
  if(data.action==='createScreen'){const created={...baseScreen(),id:'30000000-0000-4000-8000-000000000002',label:data.label,enabled:false,
    draftVersion:0,items:[],approvedVersion:null,publishedVersion:0,history:[],publishedItems:[],devices:[],
    operatingHours:[],overrideSlideId:null,overrideUntil:null};screens=[...screens,created]; }
  await route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify(data.action==='createScreen'?{screenId:'30000000-0000-4000-8000-000000000002'}:{configVersion:1})});
 });
 await page.goto('/display-operations-review');await expect(page.getByRole('heading',{name:'Church Display'})).toBeVisible();
 await page.getByRole('button',{name:'Screens',exact:true}).click();
 await page.getByLabel('Limit playback to selected hours').check();
 await page.getByRole('button',{name:'Save operating hours'}).click();
 await expect.poll(()=>writes.some(w=>w.action==='hours'&&w.hours.length===7)).toBeTruthy();
 await page.getByLabel('Display name').fill('Fellowship Hall TV');
 await page.getByRole('button',{name:'+ Add an unpaired display'}).click();
 await expect(page.getByLabel('Choose display')).toHaveValue('30000000-0000-4000-8000-000000000002');
 await expect(page.getByText('Not paired yet')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('fictional owner can restore an approved version and emphasize only published text',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.clock.install({time:new Date(now)});
 const screen=baseScreen(),writes:any[]=[];
 page.on('dialog',dialog=>void dialog.accept());
 await page.route('**/api/display/manage',async route=>{
  if(route.request().method()==='GET'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({screens:[screen]})});return;
  }
  const data=route.request().postDataJSON();writes.push(data);
  if(data.action==='override'){screen.overrideSlideId=data.slideId;screen.overrideUntil=date(300000);}
  if(data.action==='clearOverride'){screen.overrideSlideId=null;screen.overrideUntil=null;}
  if(data.action==='restore'){screen.publishedVersion++;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
 });
 await page.goto('/display-operations-review');
 await page.getByRole('button',{name:'Publish',exact:true}).click();
 await expect(page.getByText('Fictional welcome').first()).toBeVisible();
 await page.getByRole('button',{name:'Feature approved slide'}).click();
 await expect.poll(()=>writes.some(w=>w.action==='override'&&w.slideId==='welcome'&&w.expectedGeneration===2)).toBeTruthy();
 await page.getByRole('button',{name:'End emphasis'}).click();
 await expect.poll(()=>writes.some(w=>w.action==='clearOverride')).toBeTruthy();
 await page.getByRole('button',{name:'Restore v1'}).click();
 await expect.poll(()=>writes.some(w=>w.action==='restore'&&w.expectedGeneration===2)).toBeTruthy();
});
test('fictional management never publishes unsaved per-slide scheduling edits',async({page})=>{
 await page.clock.install({time:new Date(now)});
 const screen=baseScreen(),writes:any[]=[];
 await page.route('**/api/display/manage',async route=>{
  if(route.request().method()==='GET'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({screens:[screen]})});return;
  }
  const data=route.request().postDataJSON();writes.push(data);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({draftVersion:3})});
 });
 await page.goto('/display-operations-review');await page.getByRole('button',{name:'Fictional welcome Announcement',exact:false}).first().click();
 await page.getByLabel('Show only during specific dates and times').check();
 await page.getByRole('button',{name:'Publish',exact:true}).click();
 await expect(page.getByRole('button',{name:'Publish approved playlist'})).toBeDisabled();
 await page.getByRole('button',{name:'Content',exact:true}).click();
 await page.getByRole('button',{name:'Save draft'}).click();
 await expect.poll(()=>writes.some(w=>w.action==='save'&&w.slides[0].startsAt&&w.slides[0].endsAt)).toBeTruthy();
 expect(writes.every(w=>w.action!=='publish')).toBe(true);
});
test('paired player respects Las Vegas operating hours and immediate approved emphasis',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 await page.clock.install({time:new Date(now)});
 let off=true,override=false,unavailable=false;
 await page.route('**/api/display/device',async route=>{
  if(unavailable){await route.fulfill({status:503,contentType:'application/json',body:'{}'});return;}
  const hours=Array.from({length:7},(_,day)=>({day,enabled:off?day!==3:true,start:420,end:1380}));
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   paired:true,screen:'Lobby Display',version:1,serverTime:new Date(Date.now()).toISOString(),
   leaseUntil:new Date(Date.now()+30000).toISOString(),slides:[intro,event],
   operatingHours:hours,overrideSlideId:override?'sample-event':null,
   overrideUntil:override?new Date(Date.now()+300000).toISOString():null
  })});
 });
 await page.goto('/display');await expect(page.getByRole('heading',{name:'Welcome.'})).toBeVisible();
 off=false;await page.clock.runFor(12100);await expect(page.locator('.cd-style-editorial')).toBeVisible();
 override=true;await page.clock.runFor(12100);await expect(page.locator('.cd-style-event')).toBeVisible();
 override=false;await page.clock.runFor(12100);await expect(page.locator('.cd-style-editorial')).toBeVisible();
 unavailable=true;await page.clock.runFor(32000);await expect(page.getByRole('heading',{name:'Welcome.'})).toBeVisible();
 expect(await page.locator('.cd-slide').count()).toBe(1);
});
