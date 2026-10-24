import {openManagement} from './study-navigation';
import {startReservation} from './study-navigation';
import {test,expect} from '@playwright/test';
import {demoSchedule,vegasDay} from '../../lib/study-rooms/domain';
import type {WeeklyServiceInterval} from '../../lib/study-rooms/operations';

/** Synthetic transport only: validates client UI, NOT real hosted member sign-in. */
function fixture(){
 const day=vegasDay(),schedule={...demoSchedule(day,day,true),blocks:[],bookings:[],bookingsOpen:false,canManage:true};
 const admin={resources:schedule.resources.map(r=>({...r,active:true,version:1})),closures:[]};
 let operations={version:1,bookingsOpen:false,newSystemBookings:0,weekly:[] as WeeklyServiceInterval[],specialDays:[] as {day:string;blocks:{start:number;end:number;label:string}[];reason:string}[]};
 const commands:any[]=[];
 return {day,schedule,admin,commands,get operations(){return operations;},apply(cmd:any){
  commands.push(cmd);operations={...operations,version:operations.version+1};
  if(cmd.action==='weekly.replace')operations.weekly=cmd.blocks;
  if(cmd.action==='day.replace')operations.specialDays=[{day:cmd.day,blocks:cmd.blocks,reason:cmd.reason}];
  if(cmd.action==='day.reset')operations.specialDays=[];
 }};
}
async function setup(page:import('@playwright/test').Page,manager=true,bookingsOpen=false){
 const f=fixture();
 await page.route('**/api/study-rooms?**',route=>route.fulfill({status:200,json:{...f.schedule,canManage:manager,bookingsOpen}}));
 await page.route('**/api/study-rooms/admin',route=>route.fulfill({status:200,json:f.admin}));
 await page.route('**/api/study-rooms/operations',async route=>{
  if(route.request().method()==='POST'){const cmd=route.request().postDataJSON();f.apply(cmd);return route.fulfill({status:200,json:{ok:true,version:f.operations.version}});}
  return route.fulfill({status:200,json:{...f.operations,bookingsOpen}});
 });
 await page.goto('/modules/study-rooms');
 if(manager)await openManagement(page);
 return f;
}
test('manager can configure inventory during an application-local booking pause',async({page})=>{
 const f=await setup(page);
 await expect(page.getByRole('heading',{name:'Inventory & service calendar'})).toBeVisible();
 await expect(page.getByText(/Booking status: Paused/)).toBeVisible();
 await expect(page.locator('.sr-gate')).toContainText('Bookings are paused.');
 await page.getByText('Add a room, whiteboard or TV').click();
 await page.getByLabel('New resource kind').selectOption('whiteboard');
 await page.getByLabel('New resource name').fill('New Large Whiteboard');
 await page.getByLabel('Inventory change reason').fill('Fictional inventory expansion');
 await page.getByRole('button',{name:'Add resource'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0]).toMatchObject({action:'resource.add',kind:'whiteboard',name:'New Large Whiteboard',expectedVersion:1});
 await expect(page.locator('.sr-gate')).toContainText('Bookings are paused.');
 await expect(page.getByText(/Reservations: 0/)).toBeVisible();
});
test('weekly calendars start empty and save only explicitly added intervals',async({page})=>{
 const f=await setup(page);
 await page.getByText('Manage weekly service restrictions').click();
 await expect(page.getByText('No weekly restrictions configured.')).toBeVisible();
 await page.getByRole('button',{name:'Add weekly interval'}).click();
 await page.getByLabel('Weekly day 1').selectOption('3');
 await page.getByLabel('Weekly label 1').fill('Fictional room cleaning');
 await page.getByLabel('Weekly starts 1').selectOption('1080');
 await page.getByLabel('Weekly ends 1').selectOption('1110');
 await page.getByLabel('Weekly change reason').fill('Explicit fictional weekly restriction');
 await page.getByRole('button',{name:'Review and save weekly restrictions'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0]).toMatchObject({action:'weekly.replace',expectedVersion:1,blocks:[{weekday:3,start:1080,end:1110,label:'Fictional room cleaning'}]});
});
test('manager can save an empty weekly calendar and remove the final interval',async({page})=>{
 const f=await setup(page);
 await page.getByText('Manage weekly service restrictions').click();
 await page.getByLabel('Weekly change reason').fill('Keep the calendar intentionally empty');
 await page.getByRole('button',{name:'Review and save weekly restrictions'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0]).toMatchObject({action:'weekly.replace',blocks:[],expectedVersion:1});
 await page.getByRole('button',{name:'Add weekly interval'}).click();
 await page.getByRole('button',{name:'Remove weekly interval 1'}).click();
 await expect(page.getByText('No weekly restrictions configured.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Review and save weekly restrictions'})).toBeEnabled();
 await page.getByLabel('Weekly change reason').fill('Remove the final unsaved restriction');
 await page.getByRole('button',{name:'Review and save weekly restrictions'}).click();
 await expect.poll(()=>f.commands.length).toBe(2);
 expect(f.commands[1]).toMatchObject({action:'weekly.replace',blocks:[],expectedVersion:2});
});
test('bookings can operate with an empty calendar without another service',async({page})=>{
 await setup(page,true,true);
 await expect(page.getByRole('button',{name:'Schedule',exact:true})).toBeEnabled();
 await expect(page.getByText(/Booking status: Open/)).toBeVisible();
 await expect(page.getByText(/original scheduler|scheduler transition|cutover|lvrooms\.web\.app/i)).toHaveCount(0);
 await startReservation(page);
 await expect(page.getByRole('dialog',{name:'Reserve a resource'})).toBeVisible();
});
test('special-day override can intentionally contain no service restrictions',async({page})=>{
 const f=await setup(page);
 await page.getByText('Special dates & service overrides').click();
 await page.getByLabel('Special day reason').fill('Explicit unrestricted date');
 await page.getByRole('button',{name:'Save special-day override'}).click();
 await expect.poll(()=>f.commands.length).toBe(1);
 expect(f.commands[0]).toMatchObject({action:'day.replace',day:f.day,blocks:[],expectedVersion:1});
 await expect(page.getByText(/An override exists for this date/)).toBeVisible();
});
test('a regular member cannot see private manager policy controls',async({page})=>{
 await setup(page,false);
 await expect(page.getByRole('button',{name:'Bookings',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Inventory & service calendar'})).toHaveCount(0);
 await expect(page.locator('.sr-gate')).toContainText('Bookings are paused.');
});
test('anonymous operations API cannot read or edit the policy',async({request})=>{
 const r=await request.get('/api/study-rooms/operations');
 expect(r.status()).toBe(401);expect(r.headers()['cache-control']).toContain('no-store');
 const w=await request.post('/api/study-rooms/operations',{data:{action:'weekly.replace',blocks:[],reason:'Unauthorized change',expectedVersion:1,requestId:'51000000-0000-4000-8000-000000000001'}});
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

