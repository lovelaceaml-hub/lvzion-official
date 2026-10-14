import {test,expect} from '@playwright/test';
test('Study Room preview has fixed Reserve Now and room/board/TV availability',async({page})=>{
 await page.goto('/study-rooms-preview');await expect(page.getByRole('heading',{name:'Study Room Reservation'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Reserve Now'})).toBeVisible();await expect(page.getByRole('columnheader',{name:'Room 4'})).toBeVisible();
 await page.getByRole('button',{name:'Whiteboard',exact:true}).click();await expect(page.getByRole('columnheader',{name:'Board 5'})).toBeVisible();
 await page.getByRole('button',{name:'TV',exact:true}).click();await expect(page.getByRole('columnheader',{name:'TV 3'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('Room booking has ordered purposes, available time range, review and private confirmation',async({page})=>{
 await page.goto('/study-rooms-preview');await page.getByRole('button',{name:'Reserve Now'}).click();const form=page.getByRole('dialog',{name:'Reserve a resource'});
 await expect(form.getByLabel('Purpose',{exact:true}).locator('option')).toHaveText(['Contact','New Member','Other']);
 await form.getByLabel('Contact name').fill('Fictional private contact');await form.getByLabel('Start',{exact:true}).selectOption('780');await form.getByLabel('End',{exact:true}).selectOption('840');
 await form.getByRole('button',{name:'Review reservation'}).click();await expect(form.getByText('1:00 PM – 2:00 PM')).toBeVisible();await form.getByRole('button',{name:'Confirm reservation'}).click();
 await expect(page.getByRole('status')).toContainText('Demo reservation saved');await expect(page.getByText('Fictional private contact')).toBeVisible();
 await page.getByRole('button',{name:'Availability',exact:true}).click();await expect(page.getByText('Fictional private contact')).toHaveCount(0);
});
test('Cancellation frees the time without deleting history',async({page})=>{
 await page.goto('/study-rooms-preview');await page.getByRole('button',{name:'My Reservations',exact:true}).click();await page.getByRole('button',{name:'Cancel reservation',exact:true}).click();const form=page.getByRole('dialog',{name:'Cancel reservation'});
 await form.getByLabel('Reason',{exact:true}).fill('Fictional schedule change');await form.getByRole('button',{name:'Confirm cancellation'}).click();await expect(page.getByText('Cancelled',{exact:true})).toBeVisible();await expect(page.getByRole('status')).toContainText('history retained');
});
test('Reservation-manager actions are absent unless preview scope is explicitly enabled',async({page})=>{
 await page.goto('/study-rooms-preview');await expect(page.getByRole('button',{name:'Place a hold'})).toHaveCount(0);await page.getByLabel('Preview explicit reservation-manager permission').check();await page.getByRole('button',{name:'Place a hold'}).click();const form=page.getByRole('dialog',{name:'Reserve a resource'});await expect(form.getByLabel('Hold reason')).toBeVisible();await expect(form.getByLabel('Purpose',{exact:true})).toHaveCount(0);
});
test('Unknown reservation identity cannot read or write protected endpoints',async({request})=>{
 const response=await request.get('/api/study-rooms?day=2026-10-14');expect(response.status()).toBe(401);expect(response.headers()['cache-control']).toContain('no-store');expect(await response.text()).not.toContain('Example contact');
 const write=await request.post('/api/study-rooms/command',{data:{action:'reserve',memberId:'fake'}});expect(write.status()).toBe(401); // Authentication now precedes body validation; no anonymous command processing.

});

