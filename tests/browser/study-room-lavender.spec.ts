import {test,expect,type Locator,type Page} from '@playwright/test';
import {openStudyRoute} from './study-route-fixture';

// Synthetic real-route checks for the approved attached tabs and floating controls.
// Colors and decorative effects are reviewed visually; these assertions protect access to the schedule.
async function box(locator:Locator){
 const value=await locator.boundingBox();
 expect(value).not.toBeNull();
 return value!;
}
async function capture(page:Page,name:string){
 if(process.env.LVZ_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.LVZ_SCREENSHOT_DIR}/${name}.png`,fullPage:true});
}

test('compiled glass surfaces retain supported backdrop blur',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await openStudyRoute(page);
 test.skip(!await page.evaluate(()=>CSS.supports('backdrop-filter','blur(6px)')),'This browser does not support the unprefixed backdrop filter.');
 for(const surface of [page.locator('.sr-reserve-dock'),page.getByRole('navigation',{name:'Main navigation'})]){
  await expect(surface).toBeVisible();
  // Inspect the loaded production CSS, not source declarations: minification
  // must retain a filter recognized by this browser alongside WebKit support.
  await expect(surface).not.toHaveCSS('backdrop-filter','none');
  await expect(surface).toHaveCSS('backdrop-filter',/blur\(/);
 }
});

for(const width of [320,390,1280]){
 const height=width>900?900:844;

 test(`attached resource tabs filter the grid and preserve the chosen date at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height});
  await openStudyRoute(page);
  const header=page.getByRole('banner',{name:'Application header'});
  const tabs=page.locator('.sr-header-tabs');
  await expect(tabs).toHaveCount(1);
  await expect(header.locator('.app-frame-header-content .sr-header-tabs')).toHaveCount(1);
  await expect(tabs.getByRole('button')).toHaveCount(3);
  await expect(page.locator('.sr-day')).toHaveCount(4);
  await page.locator('.sr-day').nth(1).click();
  const selectedDate=await page.locator('.sr-day[aria-pressed="true"]').getAttribute('data-date');
  expect(selectedDate).toBeTruthy();
  for(const [label,columns] of [
   ['Whiteboards',['Time','Board 1','Board 2','Board 3','Board 4','Board 5']],
   ['TVs',['Time','TV 1','TV 2','TV 3']],
   ['Study rooms',['Time','Room 1','Room 2','Room 3','Room 4']],
  ] as const){
   await expect(page.getByRole('button',{name:label,exact:true})).toHaveCount(1);
   const tab=tabs.getByRole('button',{name:label,exact:true});
   await tab.click();
   await expect(tab).toHaveAttribute('aria-pressed','true');
   await expect(tabs.locator('[aria-pressed="true"]')).toHaveCount(1);
   await expect(page.locator('.sr-scroll').getByRole('columnheader')).toHaveText([...columns]);
   await expect(page.locator('.sr-day[aria-pressed="true"]')).toHaveAttribute('data-date',selectedDate!);
  }
  const [headerBox,tabsBox,datesBox,gridBox]=await Promise.all([
   box(header),box(tabs),box(page.locator('.sr-date-window')),box(page.locator('.sr-scroll')),
  ]);
  expect(tabsBox.y).toBeGreaterThanOrEqual(headerBox.y);
  expect(tabsBox.y+tabsBox.height).toBeLessThanOrEqual(headerBox.y+headerBox.height+1);
  expect(datesBox.y).toBeGreaterThanOrEqual(headerBox.y+headerBox.height-1);
  expect(datesBox.y+datesBox.height).toBeLessThanOrEqual(gridBox.y+1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await capture(page,`lavender-header-tabs-${width}`);
 });

 test(`full-height grid stays usable beneath the floating Reserve card at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height});
  await openStudyRoute(page);
  const scroll=page.locator('.sr-scroll'),tray=page.locator('.sr-reserve-dock');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  await expect(scroll).toBeVisible();
  await expect(tray.getByRole('button',{name:'Reserve',exact:true})).toBeEnabled();
  await expect.poll(async()=>{
   const grid=await box(scroll);
   return Math.abs(grid.y+grid.height-height);
  }).toBeLessThanOrEqual(2);
  const before=await box(scroll),beforeTop=await scroll.evaluate(el=>el.scrollTop);
  const openSlot=page.getByRole('button',{name:'Room 2, 11:00 AM, available',exact:true});
  await openSlot.click();
  await expect(openSlot).toHaveAttribute('aria-pressed','true');
  await expect(tray.locator('.sr-selection-summary')).toContainText('Room 2');
  const after=await box(scroll);
  expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.height-before.height)).toBeLessThanOrEqual(1);
  expect(await scroll.evaluate(el=>el.scrollTop)).toBe(beforeTop);
  const trayBox=await box(tray),navBox=await box(nav),appsBox=await box(nav.getByRole('button',{name:'Open apps'}));
  expect(trayBox.y).toBeGreaterThan(after.y);
  expect(trayBox.y+trayBox.height).toBeLessThan(after.y+after.height);
  expect(trayBox.x).toBeGreaterThanOrEqual(after.x-1);
  expect(trayBox.x+trayBox.width).toBeLessThanOrEqual(after.x+after.width+1);
  expect(trayBox.y+trayBox.height).toBeLessThanOrEqual(Math.min(navBox.y,appsBox.y)+1);
  await capture(page,`lavender-selected-overlay-${width}`);

  // Padding inside the scroller must let the final time slot clear both floating surfaces.
  // An ordinary click, with no force, also proves the controls do not intercept that slot.
  await scroll.evaluate(el=>el.scrollTop=el.scrollHeight);
  const finalSlot=page.getByRole('button',{name:'Room 2, 10:30 PM, available',exact:true});
  await expect(finalSlot).toBeInViewport({ratio:1});
  const finalBox=await box(finalSlot),headerRow=await box(scroll.getByRole('columnheader',{name:'Time',exact:true}));
  const floating=await box(tray);
  expect(finalBox.y).toBeGreaterThanOrEqual(headerRow.y+headerRow.height-1);
  expect(finalBox.y+finalBox.height).toBeLessThanOrEqual(floating.y-1);
  await finalSlot.click();
  await expect(finalSlot).toHaveAttribute('aria-pressed','true');
  await expect(tray.locator('.sr-selection-summary')).toContainText('10:30 PM');
  await capture(page,`lavender-last-slot-${width}`);
  await tray.getByRole('button',{name:'Reserve',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Reserve a resource'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Start',{exact:true})).toHaveValue('1350');
  await expect(dialog.getByLabel('End',{exact:true})).toHaveValue('1380');
 });
}
