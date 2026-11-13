import {test,expect}from '@playwright/test';
// Fictional playlist and fictional room bookings only; no real member, booking or file is used.
const media='0123456789abcdef0123456789abcdef';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAJCAIAAAC0SDtlAAAAEklEQVR4nGNgYGD4z0AEGFUIAAH/AQFmXH2jAAAAAElFTkSuQmCC','base64');
test('TV shows a picture, skips a video that cannot play, then today’s rooms without names',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 const instant=Date.parse('2026-11-14T12:00:00-08:00');
 await page.clock.install({time:new Date(instant)});
 const mediaRequests:string[]=[];
 await page.route('**/api/display/media/**',async route=>{
  const url=new URL(route.request().url());mediaRequests.push(url.pathname);
  if(url.pathname.endsWith('.png'))await route.fulfill({status:200,contentType:'image/png',body:png});
  else await route.fulfill({status:404,body:''});
 });
 await page.route('**/api/display/device',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  paired:true,screen:'Lobby Display',version:4,serverTime:new Date(instant).toISOString(),leaseUntil:new Date(instant+30000).toISOString(),
  operatingHours:[],overrideSlideId:null,overrideUntil:null,motionMode:'standard',
  slides:[
   {id:'pic-1',kind:'image',style:'editorial',title:'Fictional flyer',media:media+'.png',body:'Sample caption',duration:6},
   {id:'vid-1',kind:'video',style:'editorial',title:'Fictional promo',media:media+'.mp4',duration:60},
   {id:'rooms-1',kind:'rooms',style:'editorial',title:'Study rooms today',duration:20}
  ],
  rooms:{date:'2026-11-14',bookings:[
   {room:'Room 1',start:'09:00',end:'10:00'},
   {room:'Room 2',start:'11:00',end:'14:00'},
   {room:'Room 1',start:'16:00',end:'17:30'}
  ]}
 })}));
 await page.goto('/display');
 const picture=page.getByRole('img',{name:'Fictional flyer'});
 await expect(picture).toBeVisible();
 await expect(picture).toHaveAttribute('src','/api/display/media/'+media+'.png');
 await expect(page.getByText('Sample caption')).toBeVisible();
 // The picture's 6 seconds pass; the video cannot load, so the TV moves on well before its 60 seconds.
 await page.clock.runFor(6500);
 await page.clock.runFor(1500);
 const board=page.getByRole('region',{name:'Study rooms today'});
 await expect(board).toBeVisible();
 expect(mediaRequests).toContain('/api/display/media/'+media+'.mp4');
 await expect(board.getByText('Saturday, November 14')).toBeVisible();
 // The finished 9 AM booking has dropped off; the 11 AM to 2 PM booking is marked as in use.
 await expect(board.getByRole('listitem')).toHaveCount(2);
 await expect(board.getByRole('listitem').first()).toContainText('Room 2');
 await expect(board.getByRole('listitem').first()).toContainText('11:00 AM to 2:00 PM');
 await expect(board.getByText('In use now')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('a rooms slide says so plainly when the room feed is unavailable',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});
 const now=Date.now();
 await page.route('**/api/display/device',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  paired:true,screen:'Lobby Display',version:5,serverTime:new Date(now).toISOString(),leaseUntil:new Date(now+30000).toISOString(),
  operatingHours:[],overrideSlideId:null,overrideUntil:null,motionMode:'standard',rooms:null,
  slides:[{id:'rooms-1',kind:'rooms',style:'editorial',title:'Study rooms today',duration:20}]
 })}));
 await page.goto('/display');
 await expect(page.getByText('Room bookings are not available right now.')).toBeVisible();
});
test('phone editor adds a picture and a rooms board in one tap each and saves them in the draft',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const now=Date.now(),iso=(shift:number)=>new Date(now+shift).toISOString();
 const screenId='30000000-0000-4000-8000-000000000001',writes:Record<string,unknown>[]=[];
 const screen={id:screenId,label:'Lobby Display',enabled:true,draftVersion:1,items:[],startsAt:iso(-3600000),endsAt:iso(604800000),
  approvedVersion:null,publishedVersion:0,publishedAt:null,publishedUntil:null,devices:[],history:[],configVersion:0,operatingHours:[],
  publishedItems:[],overrideSlideId:null,overrideUntil:null};
 let uploaded:{type:string;bytes:number}|null=null;
 await page.route('https://upload.invalid/**',async route=>{
  uploaded={type:route.request().headers()['content-type'],bytes:route.request().postDataBuffer()?.length??0};
  await route.fulfill({status:200,contentType:'application/json',body:'{}'});
 });
 await page.route('**/api/display/media/**',route=>route.fulfill({status:200,contentType:'image/png',body:png}));
 await page.route('**/api/display/manage',async route=>{
  if(route.request().method()==='GET'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({screens:[screen]})});return;}
  const data=route.request().postDataJSON();writes.push(data);
  const body=data.action==='mediaUpload'?{media:media+'.png',uploadUrl:'https://upload.invalid/object/upload/sign/display-media/x?token=t'}:{draftVersion:2};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto('/display-operations-review');
 await page.getByRole('button',{name:'Picture',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'flyer.png',mimeType:'image/png',buffer:png});
 await expect(page.getByText('The picture is uploaded.')).toBeVisible();
 expect(uploaded).toEqual({type:'image/png',bytes:png.length});
 await expect(page.locator('.cd-frame img')).toHaveAttribute('src',`/api/display/media/${media}.png?screen=${screenId}`);
 await page.getByRole('button',{name:'Add study rooms'}).click();
 await expect(page.getByText('Today’s study-room bookings appear here on the TV: room and time only.')).toBeVisible();
 await page.getByRole('button',{name:'Save draft'}).click();
 await expect.poll(()=>writes.some(w=>w.action==='save')).toBeTruthy();
 const save=writes.find(w=>w.action==='save') as {slides:Record<string,unknown>[]};
 expect(save.slides.map(s=>s.kind)).toEqual(['image','rooms']);
 expect(save.slides[0].media).toBe(media+'.png');
 expect(writes.find(w=>w.action==='mediaUpload')).toEqual({action:'mediaUpload',screenId,contentType:'image/png',size:png.length});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
