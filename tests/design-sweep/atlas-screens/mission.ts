// Work Mission Prayer (Atlas mission-*). Fictional fixtures only: "Example" hosts, example
// wording and dates relative to today. Real dates, materials, links and grants are owner-sourced.
import type {Page} from '@playwright/test';
import {vegasInstant,vegasToday} from '../../../lib/morning-prayer/time';
import {member,type AtlasScreen} from './shared';

const memberCaps=['view_schedule','join_gathering','view_materials','volunteer_host'];
const managerCaps=['view_schedule','join_gathering','volunteer_host','review_requests','manage_schedule','view_materials','edit_materials','publish_materials'];
const id=(n:number)=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
const day=(offset:number)=>{const d=new Date(vegasToday()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
function occurrence(n:number,offset:number,host:string,extra:Record<string,unknown>={}){
 const date=day(offset);
 return {id:id(n),date,originalDate:date,startsAt:vegasInstant(date,'07:00'),endsAt:vegasInstant(date,'07:30'),timezone:'America/Los_Angeles',kind:'gathering',host,isMine:host==='You',hostConfirmed:true,verified:true,revision:1,readingKey:null,...extra};
}
const body=(title:string,summary:string,items:string[])=>({title,summary,items,sourceLabel:'Example approved source'});
function populated(capabilities:string[]){
 const month=vegasToday().slice(0,7);
 const occurrences=[
  occurrence(1,-1,'Jordan Example'),
  occurrence(2,1,'Rowan Example',{readingKey:'reading-example-1'}),
  occurrence(3,2,'Host needed',{hostConfirmed:false}),
  occurrence(4,3,'You',{hostConfirmed:false}),
  occurrence(5,4,'Avery Example'),
  occurrence(6,5,'Pray Daily',{kind:'app_day'}),
  occurrence(7,6,'Casey Example',{verified:false}),
  occurrence(8,8,'Jordan Example'),
 ];
 const materials=[
  {key:'pwp-'+month+'-week-1',kind:'pwp',revision:1,body:body('Example week one focus','Example summary of the weekly activities for this design capture.',['Example activity one','Example activity two'])},
  {key:'pwp-'+month+'-week-2',kind:'pwp',revision:1,body:body('Example week two focus','Example summary for the second week.',['Example activity'])},
  {key:'reading-example-1',kind:'reading',revision:1,body:body('Example reading title','Example reading summary, not real source wording.',['Example point one','Example point two'])},
  {key:'reading-example-2',kind:'reading',revision:2,body:body('Another example reading','Example reading summary.',['Example point'])},
 ];
 const future=occurrences.filter(o=>o.date>=vegasToday());
 return {version:1,occurrences,upcoming:future.filter(o=>o.kind==='gathering'),ownHosting:future.filter(o=>o.isMine),
  requests:[
   {id:id(31),occurrenceId:id(3),kind:'volunteer',status:'pending',revision:1,date:day(2),isMine:true,requester:'You',note:''},
   ...(capabilities.includes('review_requests')?[{id:id(32),occurrenceId:id(3),kind:'volunteer',status:'pending',revision:1,date:day(2),isMine:false,requester:'Avery Example',note:''}]:[]),
  ],
  materials,materialCatalog:materials,
  drafts:capabilities.includes('publish_materials')?[{...materials[1],key:'reading-example-3',kind:'reading',id:id(21),sourceState:'checked',body:body('Example reading draft','Example draft summary.',['Example draft point'])}]:[],
  eligibleHosts:capabilities.includes('manage_schedule')?[{id:id(11),name:'Avery Example'}]:[],capabilities,timezone:'America/Los_Angeles',setupComplete:true,joinWindowMinutes:10,
  meetingStates:occurrences.map(o=>({occurrenceId:o.id,ready:false,configured:o.id===id(2)})),meetingAccessConfigured:true};
}
const empty={version:1,occurrences:[],upcoming:[],ownHosting:[],requests:[],materials:[],drafts:[],eligibleHosts:[],capabilities:['view_schedule','join_gathering'],timezone:'America/Los_Angeles',setupComplete:true,joinWindowMinutes:10,meetingStates:[],materialCatalog:[]};

async function open(page:Page,workspace:unknown){
 await member(page);
 await page.route('**/api/morning-prayer?**',r=>r.fulfill({json:workspace}));
 await page.route('**/api/morning-prayer/access',r=>r.fulfill({json:{ownerId:id(10),version:1,members:[{id:id(11),name:'Avery Example',status:'active',placement:'Demo Group A',enabled:true,capabilities:['view_schedule'],moduleAccess:true,hostEligible:false}]}}));
}
const withoutFocus=(w:ReturnType<typeof populated>)=>({...w,materials:w.materials.filter(m=>m.kind!=='pwp')});
const more=async(page:Page,label:string)=>{
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();
 await page.getByRole('dialog',{name:'More options'}).getByRole('button',{name:label,exact:true}).click();
};
const path='/modules/work-mission-prayer';
const sample='Fictional "Example" hosts, wording and dates relative to today stand in for owner-sourced records.';
const screens:AtlasScreen[]=[
 {name:'mission-home',title:'Work Mission home',atlas:'mission-home',path,onHarness:true,setup:p=>open(p,populated(memberCaps)),
  notes:'The filled hero is the weekly focus only because a published PWP exists for the month (Week pills choose the week); the next gathering is the glass card. The week strip shows the next seven days. '+sample},
 {name:'mission-home-next',title:'Work Mission home (no weekly focus)',atlas:'mission-home',path,onHarness:true,setup:p=>open(p,withoutFocus(populated(memberCaps))),
  notes:'No PWP is published for the month, so the next real gathering becomes the filled hero instead of an invented focus. '+sample},
 {name:'mission-home-empty',title:'Work Mission home (nothing scheduled)',atlas:'mission-home',path,onHarness:true,setup:p=>open(p,empty),
  notes:'Empty data: no focus and no gathering, so a neutral empty state replaces the hero and the week strip has no dots.'},
 {name:'mission-schedule',title:'Host schedule (week)',atlas:'mission-schedule',path,onHarness:true,setup:p=>open(p,populated(memberCaps)),
  then:async p=>{await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Schedule',exact:true}).click();},
  notes:'Week chips cover the selected week within the loaded month (with previous and next week controls); tags come from each date\'s real state. A volunteer card and tray appear only with the hosting permission. '+sample},
 {name:'mission-schedule-volunteer',title:'Host schedule (volunteering)',atlas:'mission-schedule',path,onHarness:true,setup:p=>open(p,populated(memberCaps)),
  then:async p=>{await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Schedule',exact:true}).click();
   await p.getByRole('group',{name:'Open dates'}).locator('label').first().click();await p.getByRole('heading',{name:'Volunteer to host'}).scrollIntoViewIfNeeded();},
  notes:'With the hosting permission, open confirmed dates can be chosen; the floating tray carries the count and the request (each request still waits for a coordinator). '+sample},
 {name:'mission-schedule-month',title:'Host schedule (month)',atlas:'mission-schedule',path,onHarness:true,setup:p=>open(p,populated(memberCaps)),
  then:async p=>{await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Schedule',exact:true}).click();await p.getByRole('button',{name:'Month',exact:true}).click();},
  notes:'Month is the second view of the same pill control; it keeps the existing calendar with its key. '+sample},
 {name:'mission-session',title:'Gathering detail',atlas:'mission-session',path,onHarness:true,setup:p=>open(p,populated(memberCaps)),
  then:async p=>{await p.getByRole('button',{name:/View gathering/}).first().click();},
  notes:'Pairs show real times, host and the meeting state (joining opens only through the server window; the link is never displayed). There is no song data, so the Atlas "Preparation song" row is omitted. '+sample},
 {name:'mission-materials',title:'Materials',atlas:'mission-materials',path,onHarness:true,setup:p=>open(p,populated(memberCaps)),then:p=>more(p,'Materials'),
  notes:'Published PWP and readings only, filtered by All, PWP or Readings (there are no songs or references in the data). Rows open to the full wording and source. Reached from More and the wide top tabs. '+sample},
 {name:'mission-me',title:'Me (hosting and requests)',atlas:'mission-schedule',path,onHarness:true,setup:p=>open(p,populated(memberCaps)),
  then:async p=>{await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Me',exact:true}).click();},
  notes:'Me has no Atlas screen; it uses the host-schedule list composition for your hosting dates and requests. '+sample},
 {name:'mission-manage',title:'Manage (schedule)',atlas:'mission-manage',path,onHarness:true,setup:p=>open(p,populated(managerCaps)),
  then:async p=>{await more(p,'Manage');await p.getByText('Add a gathering',{exact:true}).click();},
  notes:'A fictional manager. Forms stay closed until opened (one is opened here); host, reading and meeting link are assigned per confirmed date below, as the existing rules require. '+sample},
 {name:'mission-manage-materials',title:'Manage (materials)',atlas:'mission-manage',path,onHarness:true,setup:p=>open(p,populated(managerCaps)),
  then:async p=>{await more(p,'Manage');await p.getByRole('button',{name:'Materials',exact:true}).click();},
  notes:'Drafts waiting for publication are glass rows with tags; review and publish stay separate steps. '+sample},
];
export default screens;
