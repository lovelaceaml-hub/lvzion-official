import {test,expect} from '@playwright/test';
import {demoSchedule,vegasDay} from '../../lib/study-rooms/domain';

/** Synthetic transport only: validates deployed client UI, NOT real hosted member sign-in. */
const weekly=[
 {weekday:2,start:1170,end:1230,label:'Evening service'},
 {weekday:6,start:600,end:660,label:'Morning service'},
 {weekday:6,start:870,end:930,label:'Afternoon service'},
 {weekday:6,start:1170,end:1230,label:'Evening service'},
];
function fixture(){
 const day=vegasDay(),schedule={...demoSchedule(day,day,true),bookingsOpen:false,canManage:true};
 const admin={resources:schedule.resources.map(r=>({...r,active:true,version:1})),closures:[]};
 let operations={version:1,bookingsOpen:false,newSystemBookings:0,weekly,specialDays:[] as {day:string;blocks:{start:number;end:number;label:string}[];reason:string}[]};
 const commands:any[]=[];
 return {day,schedule,admin,commands,get operations(){return operations;},apply(cmd:any){
  commands.push(cmd);operations={...operations,version:operations.version+1};
  if(cmd.action==='weekly.replace')operations.weekly=cmd.blocks;
  if(cmd.action==='day.replace')operations.specialDays=[{day:cmd.day,blocks:cmd.blocks,reason:cmd.reason}];
  if(cmd.action==='day.reset')operations.specialDays=[];
 }};
}
async function setup(page:import('@playwright/test').Page,manager=true){
 const f=fixture();
 await page.route('**/api/study-rooms?**',route=>route.fulfill({status:200,json:{...f.schedule,canManage:manager}}));
 await page.route('**/api/study-rooms/admin',route=>route.fulfill({status:200,json:f.admin}));
 await page.route('**/api/study-rooms/operations',async route=>{
  if(route.request().method()==='POST'){const cmd=route.request().postDataJSON();f.apply(cmd);return route.fulfill({status:200,json:{ok:true,version:f.operations.version}});}
  return route.fulfill({status:200,json:f.operations});
 });
 await page.goto('/modules/study-rooms');
 return f;
}
test('manager can configure inventory while live booking remains disabled',async({page})=>{
 const f=await setup(page);
 await expect(page.getByRole('heading',{name:'Inventory & service calendar'})).toBeVisible();
 await expect(page.getByText(/Closed — original scheduler remains authoritative/)).toBeVisible();
 await expect(page.getByRole('button',{name:/Bookings Not Open/})).toBeDisabled();
 await page.getByText('Add a room, whiteboard or TV').click();
 await page.getByLabel('New resource kind').selectOption('whiteboard');
 await page.getByLabel('New resource name').fill('New Large Whiteboard');
 await page.getByLabel('Inventory change reason').fill('Fictional inventory expansion');
 await page.getByRole('button',{name:'Add resource'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0]).toMatchObject({action:'resource.add',kind:'whiteboard',name:'New Large Whiteboard',expectedVersion:1});
 await expect(page.getByRole('button',{name:/Bookings Not Open/})).toBeDisabled();
 await expect(page.getByText(/New-system bookings: 0/)).toBeVisible();
});
test('weekly service editing retains all explicit intervals and version',async({page})=>{
 const f=await setup(page);
 await page.getByText('Manage weekly service restrictions').click();
 await expect(page.getByLabel('Weekly label 1')).toHaveValue('Evening service');
 await page.getByRole('button',{name:'Add weekly interval'}).click();
 await page.getByLabel('Weekly day 5').selectOption('3');
 await page.getByLabel('Weekly label 5').fill('Wednesday Academy');
 await page.getByLabel('Weekly starts 5').selectOption('1170');
 await page.getByLabel('Weekly ends 5').selectOption('1230');
 await page.getByLabel('Weekly change reason').fill('Reviewable approved weekly change');
 await page.getByRole('button',{name:'Review and save weekly restrictions'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0].action).toBe('weekly.replace');
 expect(f.commands[0].expectedVersion).toBe(1);
 expect(f.commands[0].blocks).toHaveLength(5);
 expect(f.commands[0].blocks[4]).toMatchObject({weekday:3,start:1170,end:1230,label:'Wednesday Academy'});
 await expect(page.getByRole('button',{name:/Bookings Not Open/})).toBeDisabled();
});
test('special-day override can intentionally replace all weekly services',async({page})=>{
 const f=await setup(page);
 await page.getByText('Special dates & service overrides').click();
 await page.getByLabel('Special day reason').fill('Special all-day preaching schedule');
 await page.getByRole('button',{name:'Save special-day override'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0]).toMatchObject({action:'day.replace',day:f.day,blocks:[],expectedVersion:1});
 await expect(page.getByText(/An override exists for this date/)).toBeVisible();
 await expect(page.getByRole('button',{name:/Bookings Not Open/})).toBeDisabled();
});
test('a regular member cannot see private manager policy controls',async({page})=>{
 await setup(page,false);
 await expect(page.getByRole('button',{name:'My Reservations'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Inventory & service calendar'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Bookings Not Open/})).toBeDisabled();
});
test('anonymous operations API cannot read or edit the policy',async({request})=>{
 const r=await request.get('/api/study-rooms/operations');
 expect(r.status()).toBe(401);expect(r.headers()['cache-control']).toContain('no-store');
 const w=await request.post('/api/study-rooms/operations',{data:{action:'resource.add',kind:'room',name:'Bypass',reason:'Unauthorized change',expectedVersion:1,requestId:'51000000-0000-4000-8000-000000000001'}});
 expect(w.status()).toBe(401);expect(w.headers()['cache-control']).toContain('no-store');
});
test('manager editor does not overflow narrow phone or tablet',async({page})=>{
 await setup(page);
 await page.getByText('Manage weekly service restrictions').click();
 for(const width of [360,390,768,1024]){
  await page.setViewportSize({width,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow,'viewport '+width).toBeLessThanOrEqual(1);
 }
});
