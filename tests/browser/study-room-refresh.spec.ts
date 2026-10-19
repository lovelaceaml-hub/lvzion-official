import{test,expect}from'@playwright/test';
import{demoSchedule,vegasDay}from'../../lib/study-rooms/domain';
/** Browser-only synthetic transport fixtures. Not genuine hosted Auth or PostgREST evidence. */
test('focus refresh clears private data when application access is revoked',async({page})=>{
 const schedule=demoSchedule(vegasDay());let revoked=false,reads=0;
 await page.route('**/api/study-rooms?**',async route=>{reads++;await route.fulfill({status:revoked?401:200,json:revoked?{error:'Authorized sign-in required.'}:schedule});});
 await page.goto('/modules/study-rooms');await page.getByRole('button',{name:'Bookings',exact:true}).click();await expect(page.locator('.sr-my-list')).toContainText('Example contact');
 revoked=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.getByRole('status')).toContainText('Authorized sign-in required.');await expect(page.getByText('Example contact')).toHaveCount(0);await expect(page.getByRole('button',{name:'Bookings',exact:true})).toHaveCount(0);expect(reads).toBeGreaterThanOrEqual(2);
});
test('cross-tab invalidation refreshes the private schedule without sending a booking payload',async({page})=>{
 let schedule=demoSchedule(vegasDay()),reads=0;
 await page.route('**/api/study-rooms?**',async route=>{reads++;await route.fulfill({status:200,json:schedule});});
 await page.goto('/modules/study-rooms');await page.getByRole('button',{name:'Bookings',exact:true}).click();await expect(page.locator('.sr-my-list')).toContainText('Example contact');
 schedule={...schedule,bookings:schedule.bookings.map(b=>b.mine?{...b,state:'cancelled' as const,version:2}:b)};
 await page.evaluate(()=>{const channel=new BroadcastChannel('lvz-study-room-changes');channel.postMessage('changed');channel.close();});
 await expect(page.locator('.sr-my-list')).toContainText('Cancelled');await expect(page.locator('.sr-my-list')).toContainText('Revision 2');expect(reads).toBeGreaterThanOrEqual(2);
});
test('stale cancellation refreshes the newer revision and reports conflict instead of success',async({page})=>{
 let schedule=demoSchedule(vegasDay()),writes=0;
 await page.route('**/api/study-rooms?**',async route=>{await route.fulfill({status:200,json:schedule});});
 await page.route('**/api/study-rooms/command',async route=>{writes++;expect(route.request().postDataJSON().expectedVersion).toBe(1);schedule={...schedule,bookings:schedule.bookings.map(b=>b.mine?{...b,version:2}:b)};await route.fulfill({status:409,json:{code:'STALE_VERSION',error:'This reservation changed on another screen. Close the form and reopen the refreshed reservation.'}});});
 await page.goto('/modules/study-rooms');await page.getByRole('button',{name:'Bookings',exact:true}).click();await page.getByRole('button',{name:'Cancel reservation',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Cancel reservation'});await dialog.getByLabel('Reason',{exact:true}).fill('Fictional stale cancellation');await dialog.getByRole('button',{name:'Confirm cancellation'}).click();
 await expect(dialog.getByRole('alert')).toContainText('changed on another screen');await expect(page.locator('.sr-my-list')).toContainText('Revision 2');await expect(page.locator('.sr-my-list')).toContainText('Confirmed');expect(writes).toBe(1);await expect(page.getByText('Reservation cancelled; history retained.')).toHaveCount(0);
});

test('anonymous private history is denied with no-store response',async({request})=>{
 const result=await request.get('/api/study-rooms/history?from=2026-10-01&to=2026-10-31');expect(result.status()).toBe(401);expect(result.headers()['cache-control']).toContain('no-store');expect(await result.text()).not.toContain('Example contact');
});

