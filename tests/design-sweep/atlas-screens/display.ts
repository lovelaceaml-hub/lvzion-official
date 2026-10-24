// Continuous Display management (Atlas display-*). Fictional fixtures only: "Example" display
// names and slide wording, dates relative to now. Real screens, slides and devices are owner-sourced.
import type {Page} from '@playwright/test';
import {member,type AtlasScreen} from './shared';

const hour=3600000,day=24*hour;
const at=(shift:number)=>new Date(Date.now()+shift).toISOString();
const dayOf=(shift:number)=>at(shift).slice(0,10);
const slides=()=>[
 {id:'example-welcome',kind:'announcement',style:'editorial',title:'Example welcome message',body:'Example supporting line for this design capture.',duration:15},
 {id:'example-week',kind:'schedule',style:'schedule',title:'Example week ahead',body:'Example schedule.',duration:20,date:dayOf(2*day),rows:[{time:'7:00 PM',label:'Example activity one'},{time:'8:00 PM',label:'Example activity two'}]},
 {id:'example-event',kind:'event',style:'event',title:'Example community event',body:'Example event details.',duration:15,date:dayOf(5*day),time:'3:00 PM',location:'Example hall'},
 {id:'example-campaign',kind:'campaign',style:'campaign',title:'Example campaign',body:'Example campaign message.',duration:12},
];
const screen=(n:number,label:string,extra:Record<string,unknown>={})=>({
 id:'30000000-0000-4000-8000-00000000000'+n,label,enabled:true,draftVersion:3,items:slides(),
 startsAt:at(-hour),endsAt:at(14*day),approvedVersion:3,publishedVersion:3,publishedAt:at(-2*hour),publishedUntil:at(14*day),
 devices:[
  {id:'60000000-0000-4000-8000-000000000001',lastSeen:at(-5000),pairedAt:at(-20*day),revoked:false},
  {id:'60000000-0000-4000-8000-000000000002',lastSeen:at(-3*hour),pairedAt:at(-9*day),revoked:false},
 ],
 history:[
  {id:'50000000-0000-4000-8000-000000000003',generation:3,publishedAt:at(-2*hour),until:at(14*day)},
  {id:'50000000-0000-4000-8000-000000000002',generation:2,publishedAt:at(-6*day),until:at(10*day)},
 ],
 configVersion:1,operatingHours:[],motionMode:'standard',publishedItems:slides(),overrideSlideId:null,overrideUntil:null,...extra});
const populated=()=>({screens:[screen(1,'Example Lobby Display'),screen(2,'Example Hall Display',{enabled:false,devices:[],draftVersion:0,items:[],approvedVersion:null,publishedVersion:0,publishedItems:[],history:[]})]});

async function open(page:Page,body:unknown){
 await member(page);
 await page.route('**/api/display/manage',r=>r.request().method()==='GET'?r.fulfill({json:body})
  :r.fulfill({json:{code:'EXAM-PLE2-3456',expiresInSeconds:300}}));
}
const tab=(name:string)=>async(p:Page)=>{await p.locator('.ui-tabs').getByRole('button',{name,exact:true}).click();};
const path='/modules/continuous-display';
const sample='Fictional "Example" displays, slides and devices with dates relative to now stand in for owner-sourced records.';
const screens:AtlasScreen[]=[
 {name:'display-editor',title:'Content (slide editor)',atlas:'display-editor',path,onHarness:true,wide:true,setup:p=>open(p,populated()),
  notes:'Slide tiles choose the slide; the framed preview is the real TV slide component; fields sit in glass cards and a floating tray saves the draft. '+sample},
 {name:'display-editor-fields',title:'Content (fields)',atlas:'display-editor',path,onHarness:true,setup:p=>open(p,populated()),
  then:async p=>{await p.getByRole('heading',{name:'Slide 1',exact:true}).scrollIntoViewIfNeeded();await p.evaluate(()=>scrollBy(0,-120));},
  notes:'The slide fields in their glass card, with the save tray floating above the dock. '+sample},
 {name:'display-playlist',title:'Playlist',atlas:'display-playlist',path,onHarness:true,setup:p=>open(p,populated()),then:tab('Playlist'),
  notes:'Stat tiles count the real draft slides and paired TVs; rows keep the move controls; the tray saves the order. The Atlas Schedule and Published pills map to the Content and Publish tabs. '+sample},
 {name:'display-publish',title:'Publish (framed TV preview)',atlas:'display-tv',path,onHarness:true,wide:true,setup:p=>open(p,populated()),then:tab('Publish'),
  notes:'The real TV slide in a glass frame (the TV player itself is unchanged), then the draft, approved and published versions. '+sample},
 {name:'display-publish-live',title:'Publish (on the TV now)',atlas:'display-playlist',path,onHarness:true,setup:p=>open(p,populated()),
  then:async p=>{await tab('Publish')(p);await p.getByRole('heading',{name:'Approve, then publish'}).scrollIntoViewIfNeeded();await p.evaluate(()=>scrollBy(0,140));},
  notes:'Approval and publishing stay separate steps; the published playlist is listed as glass rows. '+sample},
 {name:'display-devices',title:'Screens (paired TVs)',atlas:'display-devices',path,onHarness:true,setup:p=>open(p,populated()),then:tab('Screens'),
  notes:'Stat tiles and tags come from real check-ins (online within 45 seconds). TVs have no names, so they are numbered. '+sample},
 {name:'display-devices-code',title:'Screens (pairing code)',atlas:'display-devices',path,onHarness:true,setup:p=>open(p,populated()),
  then:async p=>{await tab('Screens')(p);await p.getByRole('button',{name:'Create one-time pairing code'}).click();await p.getByText('EXAM-PLE2-3456').scrollIntoViewIfNeeded();await p.evaluate(()=>scrollBy(0,120));},
  notes:'A one-time code appears only after the manager creates it (fictional code here); settings are glass disclosures below. '+sample},
 {name:'display-devices-empty',title:'Church Display (no screens)',atlas:'display-devices',path,onHarness:true,setup:p=>open(p,{screens:[]}),
  notes:'No display is assigned to the account, so a neutral empty state replaces the tabs.'},
];
export default screens;
