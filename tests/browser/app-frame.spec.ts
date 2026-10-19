import {test,expect} from '@playwright/test';
import {openStudyRoute} from './study-route-fixture';
for(const width of [320,390,1280])test(`shared frame stays visible and opens authorized apps at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.route('**/api/members/avatar',r=>r.fulfill({json:{initials:'FE'}}));
 await page.route('**/api/members/experience',r=>r.fulfill({json:{modules:[],activities:[],notifications:[],favorites:[],favoriteVersion:0}}));
 await openStudyRoute(page,{nowMinute:855});
 const nav=page.getByRole('navigation',{name:'Main navigation'}),header=page.getByRole('banner',{name:'Application header'});
 await expect(header).toContainText('Study Rooms');await expect(header.getByRole('link',{name:'My profile'})).toHaveText('FE');
 await expect(nav.getByRole('button',{name:'Schedule',exact:true})).toHaveAttribute('aria-current','page');
 await nav.getByRole('button',{name:'Bookings',exact:true}).click();
 await expect(nav.getByRole('button',{name:'Bookings',exact:true})).toHaveAttribute('aria-current','page');
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 for(const el of [nav,header]){const b=await el.boundingBox();expect(b!.y).toBeGreaterThanOrEqual(0);expect(b!.y+b!.height).toBeLessThanOrEqual(844);}
 expect(await nav.locator(':scope > *').evaluateAll(items=>items.every(el=>el.getBoundingClientRect().height>=44))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await nav.getByRole('button',{name:'Open apps'}).click();
 await expect(page.getByRole('dialog',{name:'Apps',exact:true})).toContainText('No applications have been assigned');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Apps',exact:true})).toBeHidden();
 await nav.getByRole('button',{name:'Schedule',exact:true}).click();
 await page.evaluate(()=>window.scrollTo(0,0));
 if(process.env.LVZ_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.LVZ_SCREENSHOT_DIR}/shared-frame-${width}.png`,fullPage:true});
});
test('frame adapts to another module and remains on access-denied screens',async({page})=>{
 await page.goto('/display-operations-review');
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 await expect(page.getByRole('banner')).toContainText('Church Display');
 await expect(nav.getByRole('button',{name:'Content',exact:true})).toBeVisible();
 await expect(nav.getByRole('button',{name:'Screens'})).toBeVisible();
 await nav.getByRole('button',{name:'More',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'More options'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(nav.getByRole('button',{name:'More',exact:true})).toBeFocused();
});
test('avatar endpoint denies anonymous access without caching profile data',async({request})=>{
 const r=await request.get('/api/members/avatar');expect(r.status()).toBe(401);expect(r.headers()['cache-control']).toContain('no-store');expect(await r.json()).not.toHaveProperty('initials');
});
