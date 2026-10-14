import {test,expect} from '@playwright/test';
import {addDay,demoSchedule,vegasDay} from '../../lib/study-rooms/domain';
/** Synthetic intercepted transport only; these are client race tests, not hosted Auth certification. */
test('history denial invalidates an older in-flight schedule response',async({page})=>{
 const fixture=demoSchedule(vegasDay());let reads=0,delivered=false;let release!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/study-rooms?**',async route=>{
  reads++;if(reads===2)await held;
  try{await route.fulfill({status:200,json:fixture});}catch{/* The client correctly aborts a superseded request. */}finally{if(reads===2)delivered=true;}
 });
 await page.route('**/api/study-rooms/history?**',route=>route.fulfill({status:401,json:{error:'Synthetic access revoked.'}}));
 await page.goto('/modules/study-rooms');await page.getByRole('button',{name:'My Reservations',exact:true}).click();
 await expect(page.locator('.sr-my-list')).toContainText('Example contact');
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>reads).toBe(2);
 await page.getByRole('button',{name:'History',exact:true}).click();await expect(page.getByRole('status')).toContainText('Synthetic access revoked.');
 release();await expect.poll(()=>delivered).toBe(true);
 await expect(page.getByRole('button',{name:'My Reservations',exact:true})).toHaveCount(0);await expect(page.getByText('Example contact')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeEnabled();
 // A new read, not the old response, may restore a now-authorized workspace.
 await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('button',{name:'My Reservations',exact:true})).toBeVisible();expect(reads).toBe(3);
});
test('reschedule date access denial clears the whole private workspace',async({page})=>{
 const day=vegasDay(),fixture=demoSchedule(day);
 await page.route('**/api/study-rooms?**',route=>{const next=new URL(route.request().url()).searchParams.get('day');return route.fulfill({status:next===day?200:403,json:next===day?fixture:{error:'Synthetic reservation grant revoked.'}});});
 await page.goto('/modules/study-rooms');await page.getByRole('button',{name:'My Reservations',exact:true}).click();await page.getByRole('button',{name:'Edit / reschedule'}).click();
 await page.getByRole('dialog',{name:'Change reservation'}).getByLabel('New date',{exact:true}).fill(addDay(day,1));
 await expect(page.getByRole('status')).toContainText('Synthetic reservation grant revoked.');
 await expect(page.getByRole('dialog',{name:'Change reservation'})).toHaveCount(0);await expect(page.getByText('Example contact')).toHaveCount(0);
});
test('midnight refresh switches yesterday to the new Las Vegas booking day',async({page})=>{
 await page.clock.setFixedTime(new Date('2026-10-15T06:59:00Z'));
 const days:string[]=[];
 await page.route('**/api/study-rooms?**',route=>{const day=new URL(route.request().url()).searchParams.get('day')!;days.push(day);return route.fulfill({status:200,json:demoSchedule(day)});});
 await page.goto('/modules/study-rooms');await expect(page.locator('.sr-date input')).toHaveValue('2026-10-14');
 await page.clock.setFixedTime(new Date('2026-10-15T07:01:00Z'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.locator('.sr-date input')).toHaveValue('2026-10-15');expect(days).toEqual(['2026-10-14','2026-10-15']);
});
test('write access denial clears data without a second automatic read restoring it',async({page})=>{
 const fixture=demoSchedule(vegasDay());let reads=0;
 await page.route('**/api/study-rooms?**',route=>{reads++;return route.fulfill({status:200,json:fixture});});
 await page.route('**/api/study-rooms/command',route=>route.fulfill({status:403,json:{error:'Synthetic write access revoked.'}}));
 await page.goto('/modules/study-rooms');await page.getByRole('button',{name:'My Reservations',exact:true}).click();await page.getByRole('button',{name:'Cancel reservation',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Cancel reservation'});await dialog.getByLabel('Reason',{exact:true}).fill('Synthetic cancellation');await dialog.getByRole('button',{name:'Confirm cancellation'}).click();
 await expect(page.getByRole('status')).toContainText('Synthetic write access revoked.');expect(reads).toBe(1);await expect(page.getByRole('button',{name:'My Reservations',exact:true})).toHaveCount(0);
});
