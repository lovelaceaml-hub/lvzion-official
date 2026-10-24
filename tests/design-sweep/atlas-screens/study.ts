// Study Rooms (Atlas study-*, the Liquid Opal reference app). Fictional fixtures only:
// the synthetic Study Rooms transport (demo rooms, boards and TVs, "Example contact")
// and "Example" members for Who can book.
import type {Page} from '@playwright/test';
import {member,type AtlasScreen} from './shared';
import {openStudyRoute} from '../../browser/study-route-fixture';

const denied=async(p:Page)=>{await member(p);await p.route('**/api/study-rooms/access',r=>r.fulfill({status:403,json:{error:'Group leader access required.'}}));};
const open=async(p:Page,manager=false)=>{await denied(p);await openStudyRoute(p,{nowMinute:620,manager});};
const nav=(p:Page)=>p.getByRole('navigation',{name:'Main navigation'});
async function pick(p:Page){await p.getByRole('button',{name:'Room 2, 11:00 AM, available',exact:true}).click();}
async function manage(p:Page){await nav(p).getByRole('button',{name:'More',exact:true}).click();await p.getByRole('button',{name:'Manage bookings & resources',exact:true}).click();}
const person=(n:number,name:string,extra:Record<string,unknown>={})=>({id:'44444444-4444-4444-8444-'+String(n).padStart(12,'0'),name,unit:'Demo Unit B1',automatic:false,enabled:false,locked:false,self:false,...extra});

const fixtures='Fictional fixtures: the demo inventory (4 rooms, 5 boards, 3 TVs) and one "Example contact" reservation stand in for real records.';
const screens:AtlasScreen[]=[
 {name:'study-availability',title:'Study Rooms availability',atlas:'study-availability',path:'/modules/study-rooms',wide:true,setup:p=>open(p),then:pick,
  notes:'Four bookable dates with previous/next arrows (the real booking window) instead of five chips; the full service day scrolls inside the planner card with the Las Vegas time marker. The tray button keeps the name Reserve. '+fixtures},
 {name:'study-bookings',title:'My reservations',atlas:'study-bookings',path:'/modules/study-rooms',setup:p=>open(p),then:async p=>{await nav(p).getByRole('button',{name:'Bookings',exact:true}).click();},
  notes:'Reservations are read per date, so the date chips replace the Upcoming/Past/Canceled tabs; past and cancelled records live in History. The callout states the real privacy rule. '+fixtures},
 {name:'study-confirm',title:'Review reservation',atlas:'study-confirm',path:'/modules/study-rooms',setup:p=>open(p),
  then:async p=>{await pick(p);await p.getByRole('button',{name:'Reserve',exact:true}).click();const d=p.getByRole('dialog',{name:'Reserve a resource'});await d.getByLabel('Contact name').fill('Example contact');await d.getByRole('button',{name:'Review reservation'}).click();},
  notes:'Review is step 2 of the reservation sheet, opened from the tray; the purpose is chosen on step 1 because a purpose and its private detail are required.'},
 {name:'study-history',title:'Reservation history',atlas:'study-history',path:'/modules/study-rooms',setup:p=>open(p),
  then:async p=>{await nav(p).getByRole('button',{name:'More',exact:true}).click();await p.getByRole('button',{name:'Reservation history',exact:true}).click();},
  notes:'The history API pages by a 31-day date range, so the range fields replace the search box and state tabs; each row keeps its state tag and private details on demand. '+fixtures},
 {name:'study-resources',title:'Resource inventory (manager)',atlas:'study-resources',path:'/modules/study-rooms',setup:p=>open(p,true),
  then:async p=>{await manage(p);await p.locator('#sr-inventory-title').evaluate(el=>el.parentElement!.scrollIntoView({block:'start'}));},
  notes:'Manager only. Cards come from the real inventory with Available or Unavailable; capacity is not recorded, so it is not shown. Holds, renames and closures sit in the same Manage view. '+fixtures},
 {name:'study-rules',title:'Service calendar (manager)',atlas:'study-rules',path:'/modules/study-rooms',setup:p=>open(p,true),
  then:async p=>{await manage(p);await p.getByText('Manage weekly service restrictions').click();await p.locator('#sr-operations-title').evaluate(el=>el.parentElement!.scrollIntoView({block:'start'}));},
  notes:'Manager only. The real policy is the weekly restriction calendar and special dates (no duration or advance-booking selects exist); booking pause is shown as status because it is not a member-editable switch.'},
 {name:'study-members',title:'Who can book (group leaders)',atlas:'organization-access',path:'/modules/study-rooms/members',
  setup:async p=>{await member(p);await p.route('**/api/study-rooms/access',r=>r.fulfill({json:{groups:[{id:'22222222-2222-4222-8222-000000000002',name:'Demo Group B',members:[person(103,'Cara Example',{automatic:true,self:true}),person(104,'Devin Example',{enabled:true,locked:true}),person(108,'Hugo Example'),person(110,'Jade Example',{enabled:true})]}]}}));},
  notes:'No Atlas Study Rooms screen covers group access; matched to the access review composition (heading, glass list card, callout). Fictional "Example" members.'},
];
export default screens;
