// Day Sheet evidence screenshots from fictional fixture data only. Run with:
// node scripts/test-morning-prayer-browser.mjs morning-prayer-screens.spec.ts
import {test,expect,type Page} from '@playwright/test';
import {vegasToday,vegasInstant} from '../../lib/morning-prayer/time';
const out=process.env.LVZ_WM_SHOTS||'docs/design/work-mission-day-sheet';
const caps=['view_schedule','join_gathering','volunteer_host','review_requests','manage_schedule','view_materials','edit_materials','publish_materials'];
const id=(n:number)=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
const day=(offset:number)=>{const d=new Date(vegasToday()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
function occurrence(n:number,offset:number,host:string,extra:Record<string,unknown>={}){
 const date=day(offset);
 return {id:id(n),date,originalDate:date,startsAt:vegasInstant(date,'05:00'),endsAt:vegasInstant(date,'05:30'),timezone:'America/Los_Angeles',kind:'gathering',host,isMine:host==='You',hostConfirmed:true,verified:true,revision:1,...extra};
}
function fixture(){
 const month=vegasToday().slice(0,7);
 const occ=[occurrence(1,1,'Fictional Host A'),occurrence(2,2,'Host needed',{hostConfirmed:false}),occurrence(3,3,'You',{hostConfirmed:false}),occurrence(4,4,'Fictional Host B',{verified:false}),occurrence(5,5,'Pray Daily',{kind:'app_day'})].filter(o=>o.date.startsWith(month));
 const pwp={key:'pwp-'+month+'-week-1',kind:'pwp',revision:1,body:{title:'Fictional week one activities',summary:'Fictional summary for the first week of the month.',items:['Fictional activity one','Fictional activity two'],sourceLabel:'Fictional approved source'}};
 return {version:1,occurrences:occ,upcoming:occ.filter(o=>o.kind==='gathering'),ownHosting:occ.filter(o=>o.isMine),
  requests:[{id:id(31),occurrenceId:id(2),kind:'volunteer',status:'pending',revision:1,date:day(2),isMine:false,requester:'Fictional Member',note:''}],
  materials:[pwp],drafts:[{...pwp,key:'reading-x',kind:'reading',id:id(21),sourceState:'checked',body:{...pwp.body,title:'Fictional reading draft'}}],
  eligibleHosts:[{id:id(11),name:'Fictional Member'}],capabilities:caps,timezone:'America/Los_Angeles',setupComplete:true,joinWindowMinutes:10,
  meetingStates:occ.map(o=>({occurrenceId:o.id,ready:o.id===id(1),configured:o.id===id(1)})),materialCatalog:[pwp]};
}
async function open(page:Page){
 const data=fixture();
 await page.route('**/api/morning-prayer?**',r=>r.fulfill({json:data}));
 await page.route('**/api/morning-prayer/access',r=>r.fulfill({json:{ownerId:id(10),version:1,members:[{id:id(11),name:'Fictional Member',status:'active',placement:'Fictional Group',enabled:true,capabilities:['view_schedule'],moduleAccess:true,hostEligible:false}]}}));
 await page.goto('/modules/work-mission-prayer');
 await expect(page.getByRole('heading',{name:'Your next gathering'})).toBeVisible();
}
for(const [name,size] of [['phone',{width:390,height:844}],['narrow',{width:320,height:720}],['desktop',{width:1280,height:900}]] as const)
 test('Day Sheet screens: '+name,async({page})=>{
  await page.setViewportSize(size);await open(page);
  for(const tab of ['Home','Schedule','Me','Manage']){
   await page.getByRole('button',{name:tab,exact:true}).first().click();
   await page.waitForTimeout(300);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
   // Grow the window to the page height so the fixed phone tab bar is captured at the bottom.
   await page.setViewportSize({width:size.width,height:Math.max(size.height,await page.evaluate(()=>document.documentElement.scrollHeight))});
   await page.screenshot({path:`${out}/${tab.toLowerCase()}-${name}.png`});
   await page.setViewportSize(size);
  }
 });
