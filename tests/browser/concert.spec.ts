// Healing Concert on the real module routes; API calls run the actual SQL in a disposable PGlite
// database (concert-route-fixture.ts). Fictional people only. Scans use the photo fallback with a
// generated QR image, since the test browser has no camera.
import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import {PEACE_CONCERT_TITLE} from '../../lib/concert/branding';
import {member,openConcert} from './concert-route-fixture';

// Building the disposable database replays every migration, which can be slow on a busy machine.
test.describe.configure({timeout:120000});
const shots=process.env.LVZ_SCREENSHOT_DIR;
async function capture(page:Page,name:string){if(shots)await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
async function scanPhoto(page:Page,url:string){
 await page.locator('.cc-photo input').setInputFiles({name:'ticket.png',mimeType:'image/png',buffer:await QRCode.toBuffer(url,{width:600,margin:2})});
}

test('member RSVPs and can download a QR for their personal invite link',async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await page.goto('/install');
 const fx=await openConcert(page,{as:member.ava,featured:true});
 await page.goto('/modules/concert');
 await expect(page.getByRole('heading',{name:PEACE_CONCERT_TITLE})).toBeVisible();
 await expect(page.getByText('4:30–6:00 PM Pacific',{exact:true})).toBeVisible();
 await expect(page.getByText('Fictional Main Hall')).toBeVisible();
 const rsvp=page.getByRole('button',{name:'RSVP',exact:true});
 await expect(rsvp).toBeInViewport({ratio:1});
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(568);
 await capture(page,'concert-member-rsvp');
 await rsvp.click();
 await page.getByLabel('How many people, including you').selectOption('2');
 await page.getByRole('button',{name:'RSVP and get my ticket'}).click();
 await expect(page.getByRole('img',{name:'Ticket QR code'}).locator('svg')).toBeVisible();
 await expect(page.getByRole('heading',{name:PEACE_CONCERT_TITLE})).toBeVisible();
 await expect(page.getByText('4:30–6:00 PM Pacific',{exact:true})).toBeVisible();
 await expect(page.getByText('Party of 2',{exact:true})).toBeVisible();
 await expect(page.getByText('Fictional Main Hall',{exact:true})).toBeVisible();
 await capture(page,'concert-member-ticket');
 await page.getByRole('button',{name:'Invite',exact:true}).first().click();
 await expect(page.getByRole('heading',{name:PEACE_CONCERT_TITLE})).toBeVisible();
 const link=page.getByText(/\/concert\/i\/[A-Za-z0-9_-]{22}$/);
 await expect(link).toBeVisible();
 const qr=page.getByRole('img',{name:'Invitation QR code to open the guest RSVP'});
 await expect(qr).toBeVisible();
 const {pixels,width,height}=await qr.evaluate(async (img:HTMLImageElement)=>{
  await img.decode();
  const canvas=document.createElement('canvas');
  canvas.width=img.width;
  canvas.height=img.height;
  const context=canvas.getContext('2d')!;
  context.drawImage(img,0,0,canvas.width,canvas.height);
  const image=context.getImageData(0,0,canvas.width,canvas.height);
  return {pixels:Array.from(image.data),width:image.width,height:image.height};
 });
 expect(jsQR(Uint8ClampedArray.from(pixels),width,height)?.data).toBe(await link.textContent());
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('link',{name:'Download invitation QR'}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('healing-concert-rsvp-qr.png');
 const source=await qr.getAttribute('src');
 expect(source).toMatch(/^data:image\/png;base64,/);
 expect(await readFile(await download.path())).toEqual(Buffer.from(source!.split(',')[1],'base64'));
 await capture(page,'concert-member-invite');
 await page.emulateMedia({media:'print'});
 await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeHidden();
 await expect(page.getByRole('button',{name:'Print invitation'})).toBeHidden();
 await expect(qr).toBeVisible();
 if(shots)await page.pdf({path:`${shots}/concert-print-proof.pdf`,format:'Letter',printBackground:true});
 await page.emulateMedia({media:'screen'});
 await expect(page.getByRole('button',{name:'Guest list'})).toHaveCount(0);
 await fx.close();
});

test('door staff scan: welcome, already checked in, invalid, and the guest list updates',async({page})=>{
 await page.goto('/install');
 const fx=await openConcert(page,{as:member.ava,featured:true});
 await page.goto('/modules/concert');
 await page.getByRole('button',{name:'RSVP',exact:true}).click();
 await page.getByRole('button',{name:'RSVP and get my ticket'}).click();
 await expect(page.getByRole('img',{name:'Ticket QR code'})).toBeVisible();
 const guest=await fx.guestRsvp(member.ava,'Gail Guest','gail@example.invalid',3);

 fx.as(member.ben);
 await page.goto('/modules/concert/scan');
 await expect(page.getByText('Only concert door staff can scan tickets')).toBeVisible();

 fx.as(member.devin);
 await page.goto('/modules/concert/scan');
 await expect(page.getByText(PEACE_CONCERT_TITLE,{exact:true})).toBeVisible();
 await expect(page.getByText('Scan from a photo',{exact:true})).toBeVisible();
 await scanPhoto(page,guest);
 await expect(page.locator('.cc-result')).toContainText('Welcome, Gail Guest');
 await expect(page.locator('.cc-result')).toContainText('Party of 3');
 await capture(page,'concert-scan-welcome');
 await scanPhoto(page,guest);
 await expect(page.locator('.cc-result')).toContainText('Already checked in');
 await capture(page,'concert-scan-already');
 await scanPhoto(page,'https://example.invalid/not-a-ticket');
 await expect(page.locator('.cc-result')).toContainText('Not a valid ticket');

 await page.goto('/modules/concert#guests');
 await expect(page.getByText('Gail Guest')).toBeVisible();
 await expect(page.getByText(/invited by Ava Example/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Undo'})).toHaveCount(1);
 await page.getByRole('button',{name:'Check in'}).first().click();
 await expect(page.getByRole('button',{name:'Undo'})).toHaveCount(2);
 await capture(page,'concert-guest-list');
 await page.getByRole('button',{name:'More'}).click();
 await page.getByRole('button',{name:'Concert settings'}).click();
 await page.getByRole('button',{name:'Add flyer itinerary to draft'}).click();
 await expect(page.getByLabel('Details for guests (optional)')).toHaveValue(/5:00 PM — Choir & Orchestra Performances/);
 await page.getByRole('button',{name:'Save changes'}).click();
 await expect(page.getByText('Saved.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'My ticket'}).click();
 await page.getByRole('button',{name:'Concert details',exact:true}).click();
 await expect(page.getByText('Closing Remarks',{exact:true})).toBeVisible();
 await fx.close();
});

test('manager sets up the concert; signed-out visitors are asked to sign in',async({page})=>{
 await page.goto('/install');
 const fx=await openConcert(page,{as:member.devin,event:false});
 await page.goto('/modules/concert');
 await page.getByRole('button',{name:'Set up the concert'}).click();
 await page.getByLabel('Date').fill('2030-12-06');
 await page.getByLabel('Doors open').fill('17:30');
 await page.getByLabel('Starts').fill('18:00');
 await page.getByLabel('Venue').fill('Fictional Main Hall');
 await capture(page,'concert-settings');
 await page.getByRole('button',{name:'Create concert'}).click();
 await expect(page.getByText('The concert is open for RSVPs.')).toBeVisible();
 await expect(page.getByRole('button',{name:'RSVP',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'More'}).click();
 await page.getByRole('button',{name:'Concert settings'}).click();
 await page.getByRole('button',{name:'Add a song'}).click();
 await page.getByRole('button',{name:'Add a song'}).click();
 const songs=page.getByRole('group',{name:/^Song /});
 await songs.nth(0).getByLabel('No.').fill('121');
 await songs.nth(0).getByLabel('Song 1 title').fill('Fictional Opening Song');
 await songs.nth(0).getByLabel('Time').fill('3:08');
 await songs.nth(0).getByLabel('Performers').fill('Brass ensemble');
 await songs.nth(1).getByLabel('Song 2 title').fill('Fictional Second Song');
 await songs.nth(1).getByLabel('Performers').fill('Choir + Orchestra');
 await page.getByRole('button',{name:'Move song 2 up'}).click();
 await page.getByRole('button',{name:'Save program'}).click();
 await expect(page.getByText('Program saved.')).toBeVisible();
 await capture(page,'concert-program-editor');
 await page.getByRole('button',{name:'My ticket'}).click();
 await page.getByRole('button',{name:'Concert program',exact:true}).click();
 const program=page.getByRole('region',{name:'Program'});
 await expect(program.locator('li strong')).toHaveText(['Fictional Second Song','Fictional Opening Song']);
 await expect(program).toContainText('Brass ensemble');
 await expect(program).not.toContainText('3:08');
 await expect(program).not.toContainText('121');
 await capture(page,'concert-program-public');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 fx.as(null);
 await page.goto('/modules/concert');
 await expect(page.getByRole('link',{name:'Sign in'}).last()).toBeVisible();
 await page.goto('/concert/i/not-a-real-invite');
 await expect(page.getByRole('heading',{name:'This invitation link is not valid'})).toBeVisible();
 await fx.close();
});
