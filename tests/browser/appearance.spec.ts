import {test,expect} from '@playwright/test';
import {openStudyRoute} from './study-route-fixture';

const ground=(page:import('@playwright/test').Page)=>page.locator('.app-frame').evaluate(el=>getComputedStyle(el).getPropertyValue('--lvz-ground').trim());

test('Dark survives reload and module navigation, and each app keeps its own style',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto('/appearance');
 await expect(page.getByRole('radio',{name:/^System\b/})).toBeChecked();
 await expect(page.getByRole('radio')).toHaveCount(3);
 await page.getByRole('radio',{name:/^Dark\b/}).check();
 await expect(page.locator('html')).toHaveAttribute('data-lvz-scheme','dark');
 await page.reload();await expect(page.getByRole('radio',{name:/^Dark\b/})).toBeChecked();
 expect(await ground(page)).toBe('#111027');
 await openStudyRoute(page);
 await expect(page.locator('.app-frame')).toHaveAttribute('data-lvz-module','study-rooms');
 expect(await ground(page)).toBe('#16111e');
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();
 await expect(page.locator('.sr-app')).toHaveAttribute('data-view','more');
 await page.getByRole('link',{name:'Appearance',exact:true}).click();
 await page.getByRole('radio',{name:/^Light\b/}).check();
 await openStudyRoute(page);
 expect(await ground(page)).toBe('#eee8fa');
 await expect(page.locator('html')).not.toHaveAttribute('data-lvz-scheme');
});
test('System follows the device setting',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await page.goto('/appearance');
 await expect(page.getByRole('radio',{name:/^System\b/})).toBeChecked();
 await expect(page.locator('html')).toHaveAttribute('data-lvz-scheme','dark');
 await page.emulateMedia({colorScheme:'light'});
 await expect(page.locator('html')).not.toHaveAttribute('data-lvz-scheme');
});
test('a theme saved by the earlier 24-theme release keeps working',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.addInitScript(()=>{try{if(!sessionStorage.getItem('seeded')){localStorage.setItem('lvz.appearance.v1','midnight-sapphire');sessionStorage.setItem('seeded','1');}}catch{}});
 await page.goto('/appearance');
 await expect(page.locator('html')).toHaveAttribute('data-lvz-scheme','dark');
 await expect(page.getByRole('radio',{name:/^Dark\b/})).toBeChecked();
});
test('the shared More menu exposes appearance without changing module actions',async({page})=>{
 await page.goto('/display-operations-review');
 const nav=page.getByRole('navigation',{name:'Main navigation'});await expect(nav.locator(':scope > button, :scope > a')).toHaveCount(5);
 await nav.getByRole('button',{name:'More',exact:true}).click();
 const menu=page.getByRole('dialog',{name:'More options'});await expect(menu.getByRole('link',{name:'Appearance',exact:true})).toHaveAttribute('href','/appearance');
 await page.keyboard.press('Escape');await expect(nav.getByRole('button',{name:'More',exact:true})).toBeFocused();
});
test('appearance choices work with the keyboard at a narrow width',async({page})=>{
 await page.setViewportSize({width:320,height:844});await page.goto('/appearance');
 const radio=page.getByRole('radio',{name:/^System\b/});await radio.focus();await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('radio',{name:/^Light\b/})).toBeChecked();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const control=await page.locator('.appearance-option').first().boundingBox();expect(control!.height).toBeGreaterThanOrEqual(44);
});
test('a blocked preference store applies the choice for the session with honest feedback',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value:()=>{throw new Error('blocked');}});Object.defineProperty(Storage.prototype,'setItem',{value:()=>{throw new Error('blocked');}});});
 await page.goto('/appearance');await page.getByRole('radio',{name:/^Dark\b/}).check();
 await expect(page.locator('html')).toHaveAttribute('data-lvz-scheme','dark');
 await expect(page.getByRole('status')).toContainText('could not save');
});
test('another tab can update the appearance preference',async({page,context})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto('/appearance');
 const other=await context.newPage();await other.goto('/appearance');
 await other.getByRole('radio',{name:/^Dark\b/}).check();
 await expect(page.getByRole('radio',{name:/^Dark\b/})).toBeChecked();
 await expect(page.locator('html')).toHaveAttribute('data-lvz-scheme','dark');
 await other.getByRole('radio',{name:/^System\b/}).check();
 await expect(page.getByRole('radio',{name:/^System\b/})).toBeChecked();
 await other.close();
});
test('dark appearance keeps the real planner and reservation review usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark'});
 await openStudyRoute(page);
 await page.getByRole('button',{name:'Room 2, 11:00 AM, available',exact:true}).click();
 await page.locator('.sr-reserve-dock').getByRole('button',{name:'Reserve',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.keyboard.press('Escape');
 await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
});
test('signed-out visitors see Sign in instead of member navigation',async({page})=>{
 await page.setViewportSize({width:375,height:667});
 await page.goto('/sign-up');
 await expect(page.getByRole('navigation',{name:'Main navigation'})).toHaveCount(0);
 await expect(page.getByRole('banner').getByRole('link',{name:'Sign in'})).toBeVisible();
 await expect(page.getByText('LV Zion',{exact:true})).toHaveCount(1);
 await page.goto('/modules/study-rooms');
 await expect(page.getByText('Sign in to reserve a study room.')).toBeVisible();
 await expect(page.getByRole('navigation',{name:'Main navigation'})).toHaveCount(0);
 await expect(page.getByRole('banner').getByRole('link',{name:'Sign in'})).toBeVisible();
});
test('the header title always goes Home',async({page})=>{
 await openStudyRoute(page);
 await expect(page.getByRole('banner').getByRole('link',{name:/Go to Home/})).toHaveAttribute('href','/');
});
