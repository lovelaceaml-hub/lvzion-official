import {openManagement} from './study-navigation';
import {startReservation} from './study-navigation';
import {test,expect,type Page} from '@playwright/test';
import {demoSchedule,vegasDay} from '../../lib/study-rooms/domain';
import {openStudyRoute} from './study-route-fixture';
/** Compact booking layout checks on synthetic data. Set LVZ_SCREENSHOT_DIR for review screenshots. */
const shots=process.env.LVZ_SCREENSHOT_DIR;
async function capture(page:Page,name:string){if(shots)await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
async function checkLayout(page:Page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 const small=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('.sr-app button:not(:disabled),.sr-app a,.sr-app summary')].filter(e=>e.offsetParent&&!e.closest('dialog:not([open])')).map(e=>({name:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,40),h:e.getBoundingClientRect().height})).filter(x=>x.h<44));
 expect(small).toEqual([]);
}
for(const width of [320,390,1280])test(`member view at ${width}px keeps 44px targets and no sideways scroll`,async({page})=>{
 await page.setViewportSize({width,height:width>900?900:780});
 await openStudyRoute(page);
 await expect(page.getByRole('button',{name:'Schedule',exact:true})).toBeVisible();
 await checkLayout(page);await capture(page,`member-availability-${width}`);
 await page.getByRole('button',{name:'Bookings',exact:true}).click();
 await expect(page.locator('.sr-my-list')).toContainText('Example contact');
 await checkLayout(page);await capture(page,`member-mine-${width}`);
 await startReservation(page);
 await expect(page.getByRole('dialog',{name:'Reserve a resource'})).toBeVisible();
 await capture(page,`member-reserve-sheet-${width}`);
});
for(const width of [390,1280])test(`owner setup view at ${width}px keeps the closed gate and fits`,async({page})=>{
 await page.setViewportSize({width,height:width>900?900:780});
 const schedule={...demoSchedule(vegasDay(),vegasDay(),true),bookingsOpen:false,canManage:true};
 await page.route('**/api/study-rooms?**',route=>route.fulfill({status:200,json:schedule}));
 await page.route('**/api/study-rooms/admin',route=>route.fulfill({status:200,json:{resources:schedule.resources.map(r=>({...r,active:true,version:1})),closures:[]}}));
 await page.route('**/api/study-rooms/operations',route=>route.fulfill({status:200,json:{version:1,bookingsOpen:false,newSystemBookings:0,weekly:[{weekday:2,start:1170,end:1230,label:'Evening service'}],specialDays:[]}}));
 await page.goto('/modules/study-rooms');
 await expect(page.locator('.sr-gate')).toContainText('Bookings are paused.');
 await openManagement(page);
 await expect(page.getByRole('heading',{name:'Inventory & service calendar'})).toBeVisible();
 await checkLayout(page);await capture(page,`owner-setup-${width}`);
});
test('signed-out shell explains access and offers sign in',async({page})=>{
 await page.goto('/modules/study-rooms');
 await expect(page.getByRole('heading',{name:'Study Room Reservation'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Sign in'})).toBeVisible();
 await expect(page.getByRole('status')).not.toHaveText('Checking your reservation access…');
 await checkLayout(page);await capture(page,'signed-out-390');
});
test('Home navigation and swipe between booking views work',async({page})=>{
 await openStudyRoute(page);
 await expect(page.getByRole('button',{name:'Schedule',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Home',exact:true})).toHaveAttribute('href','/members');
 await expect(page.getByRole('button',{name:'Schedule',exact:true})).toHaveAttribute('aria-current','page');
 const panel=page.locator('.sr-panel');const box=(await panel.boundingBox())!;
 const y=box.y+40;
 await panel.dispatchEvent('touchstart',{touches:[{identifier:1,clientX:300,clientY:y}],changedTouches:[{identifier:1,clientX:300,clientY:y}]});
 await panel.dispatchEvent('touchend',{touches:[],changedTouches:[{identifier:1,clientX:150,clientY:y+5}]});
 await expect(page.getByRole('button',{name:'Bookings',exact:true})).toHaveAttribute('aria-current','page');
});

test('selecting an open 30-minute cell prepares a reservation without saving it',async({page})=>{
 await page.setViewportSize({width:390,height:780});
 await openStudyRoute(page);
 await page.getByRole('button',{name:'Room 2, 11:00 AM, available'}).click();
 const summary=page.locator('.sr-reserve-dock');
 await expect(summary).toContainText('Room 2');await capture(page,'selected-tile-390');
 await expect(page.getByRole('button',{name:'Room 2, 11:00 AM, available'})).toHaveAttribute('aria-pressed','true');
 await summary.getByRole('button',{name:'Reserve'}).click();
 const dialog=page.getByRole('dialog',{name:'Reserve a resource'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByLabel('Start',{exact:true})).toHaveValue('660');
 await expect(dialog.getByLabel('End',{exact:true})).toHaveValue('690');
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
});
test('center Apps button opens only authorized modules without leaving Study Rooms',async({page})=>{
 await page.setViewportSize({width:390,height:780});
 await page.route('**/api/members/experience',route=>route.fulfill({json:{
  modules:[{id:'92000000-0000-4000-8000-000000000001',name:'Study Room Reservation',shortName:'SR',description:'Only assigned modules',accent:'#1f5c4d',status:'approved',route:'/modules/study-rooms',canManage:false}],
  activities:[],notifications:[],favorites:[],favoriteVersion:0
 }}));
 await openStudyRoute(page);
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 await expect(nav.locator(':scope > *').nth(2)).toHaveAttribute('aria-label','Open apps');
 await nav.getByRole('button',{name:'Open apps'}).click();
 const dialog=page.getByRole('dialog',{name:'Apps'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('link',{name:'Study Room Reservation'})).toHaveAttribute('href','/modules/study-rooms');
 await expect(new URL(page.url()).pathname).toBe('/modules/study-rooms');
 await dialog.getByRole('button',{name:'Close apps'}).click();
 await expect(dialog).not.toBeVisible();
 await checkLayout(page);
});


test('date strip stays within the booking window and clears a selection',async({page})=>{
 await openStudyRoute(page);
 await expect(page.getByRole('button',{name:'Previous day',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Room 2, 11:00 AM, available',exact:true}).click();
 await expect(page.getByRole('button',{name:'Reserve',exact:true})).toBeVisible();
 const dates=await page.locator('.sr-day').evaluateAll(es=>es.map(e=>e.getAttribute('data-date')));
 await page.getByRole('button',{name:'Next day',exact:true}).click();
 await expect(page.locator('.sr-day[aria-pressed="true"]')).toHaveAttribute('data-date',dates[1]!);
 await expect(page.locator('.sr-selection-summary')).toHaveCount(0);
 await page.locator('.sr-day').last().click();
 await expect(page.getByRole('button',{name:'Next day',exact:true})).toBeDisabled();
});

test('fresh occupied slot disables Reserve without writing a reservation',async({page})=>{
 const day=vegasDay(),s={...demoSchedule(day,day),nowMinute:540,bookingsOpen:true};
 let taken=false,writes=0;
 await page.route('**/api/study-rooms?**',r=>r.fulfill({json:{...s,bookings:taken?[...s.bookings,{id:'synthetic-competing-booking',resourceId:s.resources[1].id,day,start:660,end:690,state:'confirmed',mine:false,label:'Occupied'}]:s.bookings}}));
 await page.route('**/api/study-rooms/command',r=>{writes++;return r.fulfill({json:{ok:true}});});
 await page.goto('/modules/study-rooms');
 await page.getByRole('button',{name:'Room 2, 11:00 AM, available',exact:true}).click();
 await expect(page.getByRole('button',{name:'Reserve',exact:true})).toBeVisible();
 taken=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.getByRole('button',{name:'Reserve',exact:true})).toBeDisabled();
 expect(writes).toBe(0);
});

test('an empty inventory has no invented rooms or reservation action',async({page})=>{
 const day=vegasDay();
 await page.route('**/api/study-rooms?**',r=>r.fulfill({json:{...demoSchedule(day,day),resources:[],bookings:[],blocks:[],bookingsOpen:true}}));
 await page.goto('/modules/study-rooms');
 await expect(page.getByText(/No room available/)).toBeVisible();
 await expect(page.locator('.sr-scroll')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Reserve',exact:true})).toHaveCount(0);
});

test('reference layout uses separate open tiles and a labelled hourly rail',async({page})=>{
 await openStudyRoute(page);
 await expect(page.getByRole('button',{name:'Study rooms',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('columnheader',{name:'Time',exact:true})).toBeVisible();
 const hour=page.getByRole('rowheader',{name:'11:00 AM',exact:true});
 await expect(hour).toHaveText('11 AM');
 await expect(page.getByRole('rowheader',{name:'11:30 AM',exact:true})).toBeEmpty();
 const tile=page.getByRole('button',{name:'Room 2, 11:00 AM, available',exact:true});
 await expect(tile).toHaveText('+ Open');
 await expect(page.getByRole('button',{name:'Reserve',exact:true})).toBeEnabled();
 await tile.click();
 await expect(page.locator('.sr-selection-summary')).toContainText('11:00 AM');
 await page.getByRole('button',{name:'Reserve',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Reserve a resource'})).toBeVisible();
});
