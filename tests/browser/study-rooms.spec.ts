import {openManagement} from './study-navigation';
import {startReservation} from './study-navigation';
import {openStudyRoute} from './study-route-fixture';
import {test,expect} from '@playwright/test';
test('Study Rooms opens with room, whiteboard and TV availability',async({page})=>{
 await openStudyRoute(page);await expect(page.getByRole('group',{name:'Resource type'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Schedule',exact:true})).toBeVisible();await expect(page.getByRole('columnheader',{name:'Room 4'})).toBeVisible();
 await page.getByRole('button',{name:'Whiteboards',exact:true}).click();await expect(page.getByRole('columnheader',{name:'Board 5'})).toBeVisible();
 await page.getByRole('button',{name:'TVs',exact:true}).click();await expect(page.getByRole('columnheader',{name:'TV 3'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('Room booking has ordered purposes, available time range, review and private confirmation',async({page})=>{
 await openStudyRoute(page);await startReservation(page);const form=page.getByRole('dialog',{name:'Reserve a resource'});
 await expect(form.getByLabel('Purpose',{exact:true}).locator('option')).toHaveText(['Contact','New Member','Other']);
 await form.getByLabel('Contact name').fill('Fictional private contact');await form.getByLabel('Start',{exact:true}).selectOption('780');await form.getByLabel('End',{exact:true}).selectOption('840');
 await form.getByRole('button',{name:'Review reservation'}).click();await expect(form.getByText('1:00 PM to 2:00 PM')).toBeVisible();await form.getByRole('button',{name:'Confirm reservation'}).click();
 await expect(page.locator('.sr-success[role=status]')).toContainText('Reservation confirmed');await expect(page.getByText('Fictional private contact')).toBeVisible();
 await page.getByRole('button',{name:'Schedule',exact:true}).click();await expect(page.getByText('Fictional private contact')).toHaveCount(0);
});
test('Cancellation frees the time without deleting history',async({page})=>{
 await openStudyRoute(page);await page.getByRole('button',{name:'Bookings',exact:true}).click();await page.getByRole('button',{name:'Cancel reservation',exact:true}).click();const form=page.getByRole('dialog',{name:'Cancel reservation'});
 await form.getByLabel('Reason',{exact:true}).fill('Fictional schedule change');await form.getByRole('button',{name:'Confirm cancellation'}).click();await expect(page.getByText('Cancelled',{exact:true})).toBeVisible();await expect(page.getByRole('status')).toContainText('history retained');
});
test('Reservation-manager actions require explicit scope',async({page})=>{
 const fixture=await openStudyRoute(page);await expect(page.getByRole('button',{name:'Place a hold'})).toHaveCount(0);await fixture.setManager(true);await openManagement(page);await page.getByRole('button',{name:'Place a hold'}).click();const form=page.getByRole('dialog',{name:'Reserve a resource'});await expect(form.getByLabel('Hold reason')).toBeVisible();await expect(form.getByLabel('Purpose',{exact:true})).toHaveCount(0);
});
test('Unknown reservation identity cannot read or write protected endpoints',async({request})=>{
 const response=await request.get('/api/study-rooms?day=2026-10-14');expect(response.status()).toBe(401);expect(response.headers()['cache-control']).toContain('no-store');expect(await response.text()).not.toContain('Example contact');
 const write=await request.post('/api/study-rooms/command',{data:{action:'reserve',memberId:'fake'}});expect(write.status()).toBe(401); // Authentication now precedes body validation; no anonymous command processing.

});


