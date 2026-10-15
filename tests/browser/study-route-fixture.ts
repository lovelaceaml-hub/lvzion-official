// Synthetic transport for the real module route. No hosted accounts or preview pages.
import type {Page} from '@playwright/test';
import {addDay,demoSchedule,simulate,vegasDay,type Booking,type Schedule} from '../../lib/study-rooms/domain';
import {simulateAdmin,type AdminData} from '../../lib/study-rooms/admin';
import {parseHistoryQuery,previewHistory} from '../../lib/study-rooms/history';

export async function openStudyRoute(page:Page,{manager=false,nowMinute=540}:{manager?:boolean;nowMinute?:number}={}){
 const today=vegasDay(),base=demoSchedule(today,today,manager);
 let admin:AdminData={resources:base.resources.map(r=>({...r,active:true,version:1})),closures:[]};
 let bookings:Booking[]=[...base.bookings,{id:'93000000-0000-4000-8000-000000000099',resourceId:base.resources[2].id,resourceIds:[base.resources[2].id,base.resources[4].id],resourceNames:['Room 3','Board 1'],day:addDay(today,-1),start:780,end:840,state:'cancelled',mine:true,label:'You',hold:false,purpose:'other',detail:'Fictional historical example',cancelReason:'Fictional plans changed',version:2}];
 const receipts=new Set<string>();
 function schedule(day:string):Schedule{return {...demoSchedule(day,today,manager),nowMinute,bookingsOpen:true,resources:admin.resources.filter(r=>r.active),bookings,blocks:[...demoSchedule(day,today).blocks,...admin.closures.filter(c=>c.active&&c.day===day).map(c=>({resourceId:c.resourceId,start:c.start,end:c.end,label:'Scheduled closure'}))]};}
 await page.route('**/api/study-rooms?**',r=>r.fulfill({json:schedule(new URL(r.request().url()).searchParams.get('day')??today)}));
 await page.route('**/api/study-rooms/history?**',r=>r.fulfill({json:previewHistory(bookings,parseHistoryQuery(new URL(r.request().url()).searchParams),manager)}));
 await page.route('**/api/study-rooms/command',async r=>{try{const command=r.request().postDataJSON();if(!receipts.has(command.requestId)){bookings=simulate(schedule(command.day??today),command).bookings;receipts.add(command.requestId);}await r.fulfill({json:{ok:true}});}catch(error){await r.fulfill({status:400,json:{error:(error as Error).message}});}});
 await page.route('**/api/study-rooms/admin',async r=>{try{if(r.request().method()==='POST')admin=simulateAdmin(admin,schedule(today),r.request().postDataJSON());await r.fulfill({json:admin});}catch(error){await r.fulfill({status:400,json:{error:(error as Error).message}});}});
 await page.route('**/api/study-rooms/operations',r=>r.fulfill({json:{version:1,bookingsOpen:true,newSystemBookings:bookings.length,weekly:[],specialDays:[]}}));
 await page.goto('/modules/study-rooms');
 return {async setManager(value:boolean){manager=value;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));}};
}
