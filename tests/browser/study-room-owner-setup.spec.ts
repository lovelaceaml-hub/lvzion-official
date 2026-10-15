import {test,expect} from '@playwright/test';
import {demoSchedule,vegasDay} from '../../lib/study-rooms/domain';
/** Synthetic API transport against real app route; production database gate remains authoritative. */
test('designated owner can inspect resources while cutover keeps every booking control closed',async({page})=>{
 const schedule={...demoSchedule(vegasDay(),vegasDay(),true),bookingsOpen:false,canManage:true};
 const admin={resources:schedule.resources.map(resource=>({...resource,active:true,version:1})),closures:[]};
 await page.route('**/api/study-rooms?**',route=>route.fulfill({status:200,json:schedule}));
 await page.route('**/api/study-rooms/admin',route=>route.fulfill({status:200,json:admin}));
 await page.route('**/api/study-rooms/operations',route=>route.fulfill({status:200,json:{version:1,bookingsOpen:false,newSystemBookings:0,weekly:[],specialDays:[]}}));
 await page.goto('/modules/study-rooms');
 await expect(page.getByRole('heading',{name:/Study Room/i})).toBeVisible();
 await expect(page.locator('.sr-demo[role=status]')).toContainText('Reservations are not open yet.');
 await expect(page.getByRole('button',{name:/Bookings Not Open/})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Place a hold'})).toBeDisabled();
 await expect(page.getByRole('button',{name:/Room 1, 10:00 AM/})).toBeDisabled();
 await expect(page.getByRole('heading',{name:'Manage resources'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Resources & date closures'})).toBeVisible();
});
