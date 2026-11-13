// Healing Concert on the real module routes; API calls run the actual SQL in a disposable PGlite
// database (concert-route-fixture.ts). Fictional people only. Scans use the photo fallback with a
// generated QR image, since the test browser has no camera.
import {test,expect,type Page} from '@playwright/test';
import QRCode from 'qrcode';
import {member,openConcert} from './concert-route-fixture';

// Building the disposable database replays every migration, which can be slow on a busy machine.
test.describe.configure({timeout:120000});
const shots=process.env.LVZ_SCREENSHOT_DIR;
async function capture(page:Page,name:string){if(shots)await page.screenshot({path:`${shots}/${name}.png`,fullPage:true});}
async function scanPhoto(page:Page,url:string){
 await page.locator('.cc-photo input').setInputFiles({name:'ticket.png',mimeType:'image/png',buffer:await QRCode.toBuffer(url,{width:600,margin:2})});
}

test('member RSVPs, sees the QR ticket and an invite link',async({page})=>{
 await page.goto('/install');
 const fx=await openConcert(page,{as:member.ava});
 await page.goto('/modules/concert');
 await expect(page.getByRole('heading',{name:'Healing Concert'})).toBeVisible();
 await expect(page.getByText('Fictional Main Hall')).toBeVisible();
 await capture(page,'concert-member-rsvp');
 await page.getByLabel('How many people, including you').selectOption('2');
 await page.getByRole('button',{name:'RSVP and get my ticket'}).click();
 await expect(page.getByRole('img',{name:'Ticket QR code'}).locator('svg')).toBeVisible();
 await expect(page.getByText('Party of 2 · Fictional Main Hall')).toBeVisible();
 await capture(page,'concert-member-ticket');
 await page.getByRole('button',{name:'Invite',exact:true}).first().click();
 await expect(page.getByText(/\/concert\/i\/[A-Za-z0-9_-]{22}$/)).toBeVisible();
 await capture(page,'concert-member-invite');
 await expect(page.getByRole('button',{name:'Guest list'})).toHaveCount(0);
 await fx.close();
});

test('door staff scan: welcome, already checked in, invalid, and the guest list updates',async({page})=>{
 await page.goto('/install');
 const fx=await openConcert(page,{as:member.ava});
 await page.goto('/modules/concert');
 await page.getByRole('button',{name:'RSVP and get my ticket'}).click();
 await expect(page.getByRole('img',{name:'Ticket QR code'})).toBeVisible();
 const guest=await fx.guestRsvp(member.ava,'Gail Guest','gail@example.invalid',3);

 fx.as(member.ben);
 await page.goto('/modules/concert/scan');
 await expect(page.getByText('Only concert door staff can scan tickets')).toBeVisible();

 fx.as(member.devin);
 await page.goto('/modules/concert/scan');
 await expect(page.getByText('Scan from a photo')).toBeVisible();
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
 await expect(page.getByRole('button',{name:'RSVP and get my ticket'})).toBeVisible();
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
 const program=page.getByRole('region',{name:'Program'});
 await expect(program.locator('li strong')).toHaveText(['Fictional Second Song','Fictional Opening Song']);
 await expect(program).toContainText('Brass ensemble');
 await expect(program).not.toContainText('3:08');
 await expect(program).not.toContainText('121');
 await capture(page,'concert-program-public');
 fx.as(null);
 await page.goto('/modules/concert');
 await expect(page.getByRole('link',{name:'Sign in'}).last()).toBeVisible();
 await page.goto('/concert/i/not-a-real-invite');
 await expect(page.getByRole('heading',{name:'This invitation link is not valid'})).toBeVisible();
 await fx.close();
});
