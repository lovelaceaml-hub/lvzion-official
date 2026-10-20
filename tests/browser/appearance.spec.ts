import {test,expect} from '@playwright/test';
import {openStudyRoute} from './study-route-fixture';

test('theme selection survives navigation and reload, then restores the existing module design',async({page})=>{
 await page.goto('/appearance');
 await expect(page.getByRole('radio',{name:'Current app design',exact:false})).toBeChecked();
 await expect(page.getByRole('radio')).toHaveCount(25);
 await page.getByRole('radio',{name:'Midnight Sapphire',exact:false}).check();
 await expect(page.locator('html')).toHaveAttribute('data-lvz-theme','midnight-sapphire');
 await page.reload();await expect(page.getByRole('radio',{name:'Midnight Sapphire',exact:false})).toBeChecked();
 await openStudyRoute(page);
 expect(await page.locator('.app-frame').evaluate(el=>getComputedStyle(el).getPropertyValue('--lvz-ground').trim())).toBe('#061122');
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();
 await expect(page.locator('.sr-app')).toHaveAttribute('data-view','more');
 await page.getByRole('link',{name:'Appearance',exact:true}).click();
 await page.getByRole('button',{name:'Use current app design'}).click();
 await openStudyRoute(page);
 expect(await page.locator('.app-frame').evaluate(el=>getComputedStyle(el).getPropertyValue('--lvz-ground').trim())).toBe('#eee8fa');
 await expect(page.locator('html')).not.toHaveAttribute('data-lvz-theme');
});
test('the shared More menu exposes appearance without changing module actions',async({page})=>{
 await page.goto('/display-operations-review');
 const nav=page.getByRole('navigation',{name:'Main navigation'});await expect(nav.locator(':scope > button, :scope > a')).toHaveCount(5);
 await nav.getByRole('button',{name:'More',exact:true}).click();
 const menu=page.getByRole('dialog',{name:'More options'});await expect(menu.getByRole('link',{name:'Appearance',exact:true})).toHaveAttribute('href','/appearance');
 await page.keyboard.press('Escape');await expect(nav.getByRole('button',{name:'More',exact:true})).toBeFocused();
});
test('theme choices work with keyboard selection and at a narrow width',async({page})=>{
 await page.setViewportSize({width:320,height:844});await page.goto('/appearance');
 const radio=page.getByRole('radio',{name:'Current app design',exact:false});await radio.focus();await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('radio',{name:'Layered Tabs',exact:false})).toBeChecked();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const control=await page.locator('.appearance-option').first().boundingBox();expect(control!.height).toBeGreaterThanOrEqual(44);
});
test('a blocked preference store applies the theme for the session with honest feedback',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value:()=>{throw new Error('blocked');}});Object.defineProperty(Storage.prototype,'setItem',{value:()=>{throw new Error('blocked');}});});
 await page.goto('/appearance');await page.getByRole('radio',{name:'Liquid Opal',exact:false}).check();
 await expect(page.locator('html')).toHaveAttribute('data-lvz-theme','liquid-opal');
 await expect(page.getByRole('status')).toContainText('could not save');
});
test('another tab can update or clear the appearance preference',async({page,context})=>{
 await page.goto('/appearance');
 const other=await context.newPage();await other.goto('/appearance');
 await other.getByRole('radio',{name:'Rose Quartz',exact:false}).check();
 await expect(page.getByRole('radio',{name:'Rose Quartz',exact:false})).toBeChecked();
 await other.getByRole('button',{name:'Use current app design'}).click();
 await expect(page.getByRole('radio',{name:'Current app design',exact:false})).toBeChecked();
 await other.close();
});
test('selected themes keep the real planner and reservation review usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/appearance');
 await page.getByRole('radio',{name:'Sculpted Ceramic',exact:false}).check();await openStudyRoute(page);
 await page.getByRole('button',{name:'Room 2, 11:00 AM, available',exact:true}).click();
 await page.locator('.sr-reserve-dock').getByRole('button',{name:'Reserve',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.keyboard.press('Escape');
 await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
});
