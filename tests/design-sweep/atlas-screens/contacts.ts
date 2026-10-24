// Contacts (Atlas contacts-*), on the harness build. Every Contacts API call is intercepted
// with fictional responses in the shapes the authenticated adapter returns (lib/contacts/server-contract.ts).
// Fictional "Example" names, example.invalid addresses and a 555 number only; never member data.
import type {Page} from '@playwright/test';
import {member,type AtlasScreen} from './shared';

const uuid=(n:number)=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=uuid(1);
const contact=(n:number,name:string,lifecycle:'new'|'active'|'paused'|'closed',extra:{archived?:boolean;doNotContact?:boolean;preferred?:string}={})=>
 ({id:uuid(100+n),version:2,name,ownerId:owner,lifecycle,preferred:extra.preferred??'unknown',doNotContact:extra.doNotContact??false,archived:extra.archived??false});
const contacts=[
 contact(1,'Avery Example','active',{preferred:'text'}),
 contact(2,'Rowan Example','new'),
 contact(3,'Jordan Example','paused'),
 contact(4,'Casey Example','active',{preferred:'email'}),
 contact(5,'Morgan Example','closed'),
 contact(6,'Quinn Example','closed',{archived:true}),
];
/** Fictional times around now, so "Today" and "Tomorrow" tags render as they would for real follow-ups. */
function avery(){
 const at=(hours:number)=>new Date(Date.now()+hours*36e5).toISOString();
 return {...contacts[0],
  methods:[{kind:'phone',value:'(702) 555-0147'},{kind:'email',value:'avery@example.invalid'}],
  interactions:[
   {id:uuid(201),author:owner,at:at(-50),text:'Example note: agreed to talk again later this week. Fictional record.',visibility:'author',supersedes:null},
   {id:uuid(202),author:owner,at:at(-150),text:'Example note: prefers a short text before a call.',visibility:'author',supersedes:null},
  ],
  followUps:[
   {id:uuid(301),assignee:owner,due:at(26),action:'Example check-in call',state:'scheduled',completedAt:null,reason:null},
   {id:uuid(302),assignee:owner,due:at(-74),action:'Example first conversation',state:'completed',completedAt:at(-73),reason:null},
  ]};
}
const agenda=[1,2,3].map(n=>({id:uuid(400+n),title:'Private Contacts activity',href:'/modules/contacts',deliveryEnabled:false}));

async function populated(page:Page){
 await member(page);
 await page.route('**/api/contacts/workspace',r=>r.fulfill({json:{memberId:owner,canCreate:true,contacts,nextCursor:null}}));
 await page.route('**/api/contacts/agenda',r=>r.fulfill({json:agenda}));
 await page.route('**/api/contacts/detail',r=>r.fulfill({json:avery()}));
 await page.route('**/api/contacts/duplicates',r=>r.fulfill({json:[]}));
}
async function empty(page:Page){
 await member(page);
 await page.route('**/api/contacts/workspace',r=>r.fulfill({json:{memberId:owner,canCreate:true,contacts:[],nextCursor:null}}));
 await page.route('**/api/contacts/agenda',r=>r.fulfill({json:[]}));
}
const openAvery=async(p:Page)=>{await p.getByRole('button',{name:/Avery Example/}).click();await p.getByRole('heading',{name:'Avery Example',level:2}).waitFor();};
const fictional='Fictional contacts, notes and follow-ups stand in for the owner\'s private records.';
const followUpNote='The follow-up count comes from the private agenda, which carries no dates, so "Due today" and the Today/Upcoming/Completed segments cannot be shown; the tiles show scheduled follow-ups and open contacts instead.';

const screens:AtlasScreen[]=[
 {name:'contacts-list',title:'My contacts',atlas:'contacts-list',path:'/modules/contacts',onHarness:true,wide:true,setup:populated,
  notes:fictional+' '+followUpNote+' Rows show initials, a next-step summary and the status tag: the list has no due dates, so there is no per-row "Today" tag. Segments are Open, Closed, Archived and All; New, Active and Paused open from Overview.'},
 {name:'contacts-list-empty',title:'My contacts (no contacts yet)',atlas:'contacts-list',path:'/modules/contacts',onHarness:true,setup:empty,
  notes:'Empty data: the workspace has no contacts and no follow-ups, so the tiles read 0 and the card shows its empty state.'},
 {name:'contacts-detail',title:'Contact record',atlas:'contacts-detail',path:'/modules/contacts',onHarness:true,wide:true,setup:populated,then:openAvery,
  notes:fictional+' The pairs show the preferred method, the phone and email available to the owner and who is responsible ("Last updated" is not in the record). Mark done is the secondary pill, as in the Atlas; status actions and duplicate review follow below.'},
 {name:'contacts-notes',title:'Private notes',atlas:'contacts-notes',path:'/modules/contacts',onHarness:true,setup:populated,
  then:async p=>{await openAvery(p);await p.getByRole('button',{name:/Private notes/}).click();await p.getByRole('heading',{name:'Private notes',level:2}).waitFor();},
  notes:fictional+' The composer saves an author-only note directly ("Save note"); notes cannot be edited after saving.'},
 {name:'contacts-followups',title:'Follow-ups',atlas:'contacts-followups',path:'/modules/contacts',onHarness:true,setup:populated,
  then:async p=>{await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Follow-ups',exact:true}).click();await p.getByRole('heading',{name:'Your assigned follow-ups'}).waitFor();},
  notes:followUpNote+' By privacy rule the agenda never shows names, phone numbers or times, so each row reads "Private Contacts activity".'},
 {name:'contacts-overview',title:'Overview',atlas:'contacts-list',path:'/modules/contacts',onHarness:true,setup:populated,
  then:async p=>{await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();await p.getByRole('dialog',{name:'More options'}).getByRole('button',{name:'Overview',exact:true}).click();await p.getByRole('heading',{name:'Your contacts at a glance'}).waitFor();},
  notes:'No Atlas screen: Overview reuses the contacts-list composition (tiles and a glass card of rows). Each count opens that status in My contacts. '+fictional},
 {name:'contacts-add',title:'Add contact form',atlas:'contacts-notes',path:'/modules/contacts',onHarness:true,setup:populated,
  then:async p=>{await p.getByRole('button',{name:'Add contact'}).click();await p.getByRole('heading',{name:'Add contact',level:2}).waitFor();},
  notes:'No Atlas form screen: the form follows the contacts-notes composer (title above, fields in one glass card, gradient Save pill).'},
];
export default screens;
