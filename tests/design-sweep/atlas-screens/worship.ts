// Worship Duty (Atlas worship-*). Fictional fixtures only: "Example" names, example songs and
// services on dates relative to today. Production services and assignments come only from
// records configured for this app.
import type {Page,Route} from '@playwright/test';
import {CATALOG,hasDuty} from '../../../lib/worship-duty/domain';
import type {Department,Duty} from '../../../lib/worship-duty/domain';
import {serviceInstant,vegasDate} from '../../../lib/worship-duty/service-time';
import {member,type AtlasScreen} from './shared';

const id=(n:number)=>'55555555-5555-4555-8555-'+String(n).padStart(12,'0');
const ME=id(900);
const today=vegasDate(new Date().toISOString());
const shift=(offset:number)=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
const weekday=(date:string)=>new Date(date+'T12:00:00Z').getUTCDay();
const names=['Avery Example','Rowan Example','Jordan Example','Taylor Example','Casey Example','Morgan Example','Riley Example','Quinn Example'];
type Role='member'|'presider'|'manager';
type Slot={worship:string;period:'Morning'|'Afternoon'|'Evening';start:string;end:string};
const SATURDAY:Slot[]=[{worship:'Sabbath Day',period:'Morning',start:'10:00',end:'11:30'},{worship:'Sabbath Day',period:'Evening',start:'19:30',end:'21:00'}];
const TUESDAY:Slot[]=[{worship:'Third Day',period:'Evening',start:'20:00',end:'21:15'}];

/** A month of fictional services: Saturday morning and evening, Tuesday evening, from last week on. */
function workspace(role:Role){
 const managed:Department[]=role==='manager'?['Worship','Usher Brothers']:[];
 const services=[] as Record<string,unknown>[];let n=0,mine=0;
 for(let offset=-6;offset<=40;offset++){
  const date=shift(offset),slots=weekday(date)===6?SATURDAY:weekday(date)===2?TUESDAY:[];
  for(const slot of slots){
   n++;
   const future=offset>0,first=future&&mine===0;
   const duties=CATALOG.filter(d=>hasDuty(slot,d.id)&&['Worship','Usher Sisters','Usher Brothers','Lobby','Media'].includes(d.department));
   const assignments=duties.map((d,i)=>{
    const own=(first&&d.id===(role==='presider'?'presider':'usher_2'))||(future&&mine===1&&slot.period==='Evening'&&d.id==='opening_prayer');
    const filled=own||(i+n)%5!==0;
    const visible=role==='manager'&&managed.includes(d.department)||d.department==='Worship';
    return {dutyId:d.id,filled,isMine:own,memberId:filled?(own?ME:id(100+((i+n)%names.length))):null,name:own?'You':!filled?'Not filled':visible?names[(i+n)%names.length]:'Assigned member',availabilityConflict:filled?false:null};
   });
   if(assignments.some(a=>a.isMine))mine++;
   const isPresider=assignments.some(a=>a.isMine&&a.dutyId==='presider');
   services.push({id:id(n),worship:slot.worship,period:slot.period,startsAt:serviceInstant(date+'T'+slot.start),endsAt:serviceInstant(date+'T'+slot.end),
    status:offset>21?'draft':'published',version:3,canPlan:isPresider,assignments});
  }
 }
 const mineServices=services.filter(s=>(s.assignments as {isMine:boolean}[]).some(a=>a.isMine));
 const second=mineServices[1];
 const requests=[
  ...(second&&role==='member'?[{id:id(500),serviceId:second.id,dutyId:'opening_prayer',isMine:true,status:'pending',stale:false}]:[]),
  ...(role==='manager'?[{id:id(501),serviceId:services[4].id,dutyId:'usher_1',isMine:false,status:'pending',stale:false}]:[]),
 ];
 const planned=services.find(s=>s.canPlan);
 const programs=planned?[{serviceId:planned.id,status:'draft',version:2,items:[{section:'preparation',position:1,songId:id(701)},{section:'preparation',position:2,songId:id(704)},{section:'glory',position:1,songId:id(702)}]}]:[];
 return {memberId:ME,timezone:'America/Los_Angeles',now:new Date().toISOString(),manageDepartments:managed,services,requests,daysOff:[],availabilityVersion:1,programs};
}
const empty={memberId:ME,timezone:'America/Los_Angeles',now:new Date().toISOString(),manageDepartments:[],services:[],requests:[],daysOff:[],availabilityVersion:1,programs:[]};
const songs=['Example song of praise','Example morning hymn','Example song of thanks','Example evening song','Example closing song'].map((title,i)=>({id:id(701+i),code:'EX-'+(101+i),title,seconds:180+i*25}));

async function open(page:Page,body:unknown){
 await member(page);
 await page.route('**/api/worship-duty**',(route:Route)=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/setup'))return route.fulfill({json:setup});
  const kind=url.searchParams.get('kind');
  if(kind==='candidates')return route.fulfill({json:{kind:'candidates',serviceId:url.searchParams.get('serviceId'),dutyId:url.searchParams.get('dutyId') as Duty,version:3,hasMore:false,
   candidates:names.slice(0,5).map((name,i)=>({id:id(100+i),name,eligible:i!==3,reason:i===3?'unavailable':'available',manualOnly:false,paired:false}))}});
  if(kind==='songs')return route.fulfill({json:{kind:'songs',serviceId:url.searchParams.get('serviceId'),songs,hasMore:false}});
  return route.fulfill({json:body});
 });
}
const setupServices=[3,7,10,14].map((offset,i)=>{const date=shift(offset+((6-weekday(shift(offset)))+7)%7);return {id:id(800+i),worship:i===2?'Third Day':'Sabbath Day',period:i%2?'Evening':'Morning',startsAt:serviceInstant(date+'T10:00'),endsAt:serviceInstant(date+'T11:30'),status:i===3?'draft':'published',version:1};});
const setup={version:4,departments:['Worship','Usher Sisters','Usher Brothers','Lobby','Translation','Media','Parking Lot','Offering'],membersHasMore:false,songsHasMore:false,servicesHasMore:false,services:setupServices,
 members:names.slice(0,4).map((name,i)=>({id:id(100+i),name,departments:i===0?['Worship','Usher Brothers']:['Lobby'],duties:i===0?['presider','opening_prayer','usher_1']:['lobby_1'],hasAccess:true,managerDepartments:i===0?['Worship']:[],manualDepartments:[],songEditor:i===0,availabilityVersion:1,serviceAvailability:[]})),
 songs:songs.map(s=>({...s,active:true}))};

const sections=(p:Page,name:string)=>p.getByRole('navigation',{name:'Worship workspace sections'}).getByRole('button',{name,exact:true}).click();
const path='/modules/worship-duty';
const sample='Fictional "Example" names, songs and services on dates relative to today stand in for records configured for this app.';
const screens:AtlasScreen[]=[
 {name:'worship-duties',title:'My Duties',atlas:'worship-duties',path,onHarness:true,wide:true,setup:p=>open(p,workspace('member')),
  notes:'Stat tiles count real published duties; the next duty is the large glass card with the service time strip and its actions (View service, Request change), later duties are compact cards with a date box and their own status tag. The Atlas Upcoming/Completed pill is replaced by the section pill shared by every view (Schedule, My Duties and, with permission, Presider and Manage). '+sample},
 {name:'worship-duties-empty',title:'My Duties (nothing assigned)',atlas:'worship-duties',path,onHarness:true,setup:p=>open(p,empty),
  notes:'Empty data: zero tiles and a neutral empty state; nothing is invented.'},
 {name:'worship-calendar',title:'Service calendar',atlas:'worship-calendar',path,onHarness:true,wide:true,setup:p=>open(p,workspace('member')),then:p=>sections(p,'Schedule'),
  notes:'Month grid in a glass card: a dot marks days with services, a ring marks days you serve, the filled pill is the chosen day. The chosen day lists its services as rows (opening the service detail) under a "You serve" strip when you have a duty. Only days with services can be chosen. '+sample},
 {name:'worship-service',title:'Service detail',atlas:'worship-service',path,onHarness:true,setup:p=>open(p,workspace('member')),then:async p=>{await p.locator('.wd-duty[data-next]').getByRole('button',{name:/View service/}).click();},
  notes:'Opened from a duty card or a calendar row. The strip shows the real start and end time and the service status; your duty and your Las Vegas day availability follow, then every duty by department ("Assigned member" where another group\'s name is hidden, "Not filled" when open). There is no choir song data in a service, so the Atlas "Choir selection" row is omitted. '+sample},
 {name:'worship-presider',title:'Presider preparation',atlas:'worship-presider',path,onHarness:true,setup:p=>open(p,workspace('presider')),then:p=>sections(p,'Presider'),
  notes:'The service card chooses among services the member presides. "Before the service" is a read-only readiness list derived from the plan itself (songs chosen, saved, confirmed), not an invented checklist; the song plan follows in glass cards with Save plan as the one gradient action. '+sample},
 {name:'worship-presider-plan',title:'Presider preparation (song plan)',atlas:'worship-presider',path,onHarness:true,setup:p=>open(p,workspace('presider')),then:async p=>{await sections(p,'Presider');await p.getByRole('heading',{name:'Song plan'}).evaluate(e=>e.scrollIntoView({block:'start'}));await p.mouse.wheel(0,-90);},
  notes:'Lower part of the same screen: preparation songs with reorder controls, the section songs and Save plan as the gradient pill. '+sample},
 {name:'worship-manage',title:'Assignment management',atlas:'worship-manage',path,onHarness:true,wide:true,setup:p=>open(p,workspace('manager')),then:async p=>{await sections(p,'Manage');await p.getByRole('heading',{name:'Monthly planner'}).scrollIntoViewIfNeeded();await p.getByRole('group',{name:'Service days this month'}).getByRole('button').last().click();},
  notes:'Round chips are the month\'s real service days; the department pill switches duty groups the manager schedules; the glass card carries the service strip (status tag) and the assignment selects; the open-assignment card counts real unfilled duties. On phones a callout at the top links to waiting change requests (listed after the planner); on wide screens they sit in the right column. '+sample},
 {name:'worship-manage-batch',title:'Assignment management (staged changes)',atlas:'worship-manage',path,onHarness:true,setup:p=>open(p,workspace('manager')),then:async p=>{await sections(p,'Manage');await p.getByRole('group',{name:'Service days this month'}).getByRole('button').last().click();await p.getByLabel('Proposed member',{exact:true}).selectOption({index:2});await p.getByRole('button',{name:'Stage assignment'}).click();await p.getByRole('button',{name:'Stage assignment'}).scrollIntoViewIfNeeded();},
  notes:'Staged changes ride in the floating tray (count, Discard, Review); saving still needs the visible batch review. '+sample},
 {name:'worship-manage-calendar',title:'Assignment management (calendar)',atlas:'worship-calendar',path,onHarness:true,setup:p=>open(p,workspace('manager')),then:async p=>{await sections(p,'Manage');await p.getByRole('button',{name:'Show calendar'}).click();await p.getByRole('heading',{name:'Monthly planner'}).scrollIntoViewIfNeeded();},
  notes:'The planner\'s calendar view reuses the Schedule month card. '+sample},
 {name:'worship-manage-edit',title:'Assignment management (one service)',atlas:'worship-manage',path,onHarness:true,setup:p=>open(p,workspace('manager')),then:async p=>{await sections(p,'Manage');await p.getByRole('button',{name:'Edit Presider'}).click();await p.getByRole('heading',{name:'Edit one service'}).evaluate(e=>e.scrollIntoView({block:'start'}));await p.mouse.wheel(0,-90);},
  notes:'Edit one service keeps per-duty editors; an open editor sits on a tinted panel inside the glass list. '+sample},
 {name:'worship-setup',title:'Setup',atlas:'worship-manage',path:path+'/setup',onHarness:true,setup:p=>open(p,workspace('member')),
  notes:'Owner setup in the same material: section pill, the create form as a glass card, services as rows with a date box and status tag. '+sample},
 {name:'worship-denied',title:'Worship Duty (not granted)',atlas:'worship-calendar',path,onHarness:true,setup:async p=>{await member(p);await p.route('**/api/worship-duty**',r=>r.fulfill({status:403,json:{error:'Worship Duty access is not granted.'}}));},
  notes:'A 403 clears the workspace and shows the access state in a glass card.'},
];
export default screens;
