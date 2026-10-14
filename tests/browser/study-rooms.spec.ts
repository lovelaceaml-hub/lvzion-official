import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T16:00:00.000Z')}); // 09:00 in Las Vegas
});

test('study room review opens on phone with legacy inventory and date window',async({page})=>{
 await page.goto('/study-rooms-preview');
 await expect(page.getByRole('heading',{name:'Make room for learning.'})).toBeVisible();
 await expect(page.getByText('Fictional reservations only.')).toBeVisible();
 await expect(page.getByText('4',{exact:true}).first()).toBeVisible();
 await expect(page.getByRole('button',{name:'Reserve now'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Sat 17/})).toBeVisible();
});

test('selecting whiteboards and TVs shows their resource-specific schedules',async({page})=>{
 await page.goto('/study-rooms-preview');
 await page.getByRole('button',{name:/Boards/}).click();
 await expect(page.getByRole('heading',{name:'Board 5'})).toBeVisible();
 await page.getByRole('button',{name:/TVs/}).click();
 await expect(page.getByRole('heading',{name:'TV 3'})).toBeVisible();
});

test('simulated multi-resource booking is visible and cancellable but never posts',async({page})=>{
 const mutations:string[]=[];
 page.on('request',r=>{if(r.method()!=='GET')mutations.push(r.url());});
 await page.goto('/study-rooms-preview');
 await page.getByRole('button',{name:'Reserve now'}).click();
 await expect(page.getByRole('dialog',{name:'Reserve a study space'})).toBeVisible();
 await page.getByRole('checkbox',{name:'TV'}).check();
 await page.getByRole('textbox',{name:'Contact name'}).fill('Demo contact only');
 await page.getByRole('button',{name:'Add fictional reservation'}).click();
 await expect(page.getByText('Sample reservation added to this preview only.')).toBeVisible();
 await expect(page.getByText('Room 1 · TV 1')).toBeVisible();
 await page.getByRole('button',{name:'Cancel sample reservation'}).click();
 await expect(page.getByText('Sample reservation cancelled in this preview.')).toBeVisible();
 expect(mutations).toHaveLength(0);
});

test('service exclusions prevent a Saturday morning booking',async({page})=>{
 await page.goto('/study-rooms-preview');
 await page.getByRole('button',{name:/Sat 17/}).click();
 await page.getByRole('button',{name:'Reserve now'}).click();
 await page.getByRole('textbox',{name:'Contact name'}).fill('Demo contact');
 await page.getByLabel('Start').selectOption('10:00');
 await page.getByLabel('End').selectOption('11:00');
 await expect(page.getByText(/cannot overlap morning service/)).toBeVisible();
 await page.getByRole('button',{name:'Add fictional reservation'}).click();
 await expect(page.getByRole('dialog',{name:'Reserve a study space'}).getByRole('alert')).toContainText('cannot overlap morning service');
});

test('priority overrides are explicitly unavailable until access rules are approved',async({page})=>{
 await page.goto('/study-rooms-preview');
 await page.getByRole('button',{name:'Reserve now'}).click();
 await expect(page.getByText(/Force override.*deliberately disabled/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Add fictional reservation'})).toBeVisible();
});

test('fixed Reserve now and resource tabs work on a narrow phone',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 await page.goto('/study-rooms-preview');
 await expect(page.getByRole('button',{name:'Reserve now'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
