import {expect,type Page} from '@playwright/test';
export async function startReservation(page:Page){
 await page.getByRole('button',{name:'Schedule',exact:true}).click();
 const slot=page.locator('.sr-scroll button[data-available="true"]').first();
 await expect(slot).toBeEnabled();await slot.click();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
}
export async function openManagement(page:Page){
 await page.getByRole('button',{name:'More',exact:true}).click();
 await page.getByRole('button',{name:'Manage bookings & resources',exact:true}).click();
}
