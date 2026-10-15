import {test,expect,type Page} from '@playwright/test';
import {demoSchedule,vegasDay} from '../../lib/study-rooms/domain';
import {openStudyRoute} from './study-route-fixture';
/** Day Sheet layout checks on synthetic data. Set LVZ_SCREENSHOT_DIR to also save review screenshots. */
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
 await expect(page.getByRole('button',{name:'Reserve Now'})).toBeVisible();
 await checkLayout(page);await capture(page,`member-availability-${width}`);
 await page.getByRole('button',{name:'My Reservations',exact:true}).click();
 await expect(page.locator('.sr-my-list')).toContainText('Example contact');
 await checkLayout(page);await capture(page,`member-mine-${width}`);
 await page.getByRole('button',{name:'Reserve Now'}).click();
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
 await expect(page.getByRole('button',{name:/Bookings Not Open/})).toBeDisabled();
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
test('header wordmark goes home and tab content swipes',async({page})=>{
 await openStudyRoute(page);
 await expect(page.getByRole('button',{name:'Reserve Now'})).toBeVisible();
 await expect(page.getByRole('link',{name:'LV Zion home',exact:true})).toHaveAttribute('href','/members');
 await expect(page.getByRole('button',{name:'Availability',exact:true})).toHaveAttribute('aria-current','page');
 const panel=page.locator('.sr-panel');const box=(await panel.boundingBox())!;
 const y=box.y+40;
 await panel.dispatchEvent('touchstart',{touches:[{identifier:1,clientX:300,clientY:y}],changedTouches:[{identifier:1,clientX:300,clientY:y}]});
 await panel.dispatchEvent('touchend',{touches:[],changedTouches:[{identifier:1,clientX:150,clientY:y+5}]});
 await expect(page.getByRole('button',{name:'My Reservations',exact:true})).toHaveAttribute('aria-current','page');
});
