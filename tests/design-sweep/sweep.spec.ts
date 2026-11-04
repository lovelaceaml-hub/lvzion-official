// Screen-by-screen design sweep from fictional fixtures only. Run through
// `node scripts/design-sweep.mjs <output-dir>`; it is not part of the browser suite.
import {test,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {demoWorkspace,id,initialDemo} from '../../lib/demo';
import {openStudyRoute} from '../browser/study-route-fixture';

const out=process.env.LVZ_SWEEP_OUT||'docs/audit/sweep';
const harness=process.env.LVZ_SWEEP_HARNESS||'';
const modules=[
 ['10000000-0000-4000-8000-000000000001','/modules/study-rooms','Study Rooms','Rooms','#7041a8'],
 ['10000000-0000-4000-8000-000000000002','/modules/contacts','Contacts','Contacts','#086568'],
 ['10000000-0000-4000-8000-000000000003','/modules/work-mission-prayer','Work Mission Prayer','Prayer','#6d5436'],
 ['10000000-0000-4000-8000-000000000004','/modules/continuous-display','Church Display','Display','#49643e'],
].map(([mid,route,name,shortName,accent])=>({id:mid,route,name,shortName,accent,description:'Fictional module entry.',status:'approved',canManage:true}));
const feed={modules,activities:[],notifications:[],favorites:[],favoriteVersion:0};

async function anonymous(page:Page){
 await page.route('**/api/**',r=>r.fulfill({status:401,json:{error:'Sign in to continue.'}}));
}
async function member(page:Page,actor=id(4,107),change?:(w:ReturnType<typeof demoWorkspace>)=>unknown){
 const workspace=demoWorkspace(initialDemo(),actor);
 const body=change?change(workspace):workspace;
 await page.route('**/api/members',r=>r.fulfill({json:body}));
 await page.route('**/api/members/avatar',r=>r.fulfill({json:{initials:'GE'}}));
 await page.route('**/api/members/experience',r=>r.fulfill({json:feed}));
}
const unassigned=(w:ReturnType<typeof demoWorkspace>)=>({...w,self:{...w.self,status:'intake',groupId:null,unitId:null},permissions:{organization:false,memberManagement:false,departmentAdmin:false,technical:false}});

type Screen={name:string;path:string;dark?:boolean;onHarness?:boolean;setup?:(page:Page)=>Promise<unknown>;then?:(page:Page)=>Promise<unknown>};
const screens:Screen[]=[
 {name:'01-root-signed-out',path:'/',setup:anonymous},
 {name:'02-sign-in',path:'/sign-in',setup:anonymous},
 {name:'03-sign-up',path:'/sign-up',setup:anonymous},
 {name:'04-sign-up-password-focused',path:'/sign-up',setup:anonymous,then:async p=>{await p.locator('input[type=password]').first().focus().catch(()=>{});}},
 {name:'05-reset-password',path:'/reset-password',setup:anonymous},
 {name:'06-request-access',path:'/request-access',setup:anonymous},
 {name:'07-members-signed-out',path:'/members',setup:anonymous},
 {name:'08-appearance-signed-out',path:'/appearance',setup:anonymous},
 {name:'09-study-rooms-signed-out',path:'/modules/study-rooms',setup:anonymous},
 {name:'10-study-access-signed-out',path:'/modules/study-rooms/members',setup:anonymous},
 {name:'11-install',path:'/install',setup:anonymous},
 {name:'12-home-unassigned',path:'/members',setup:p=>member(p,id(4,107),unassigned)},
 {name:'13-home-member',path:'/members',setup:p=>member(p)},
 {name:'14-home-apps-sheet',path:'/members',setup:p=>member(p),then:async p=>{await p.getByRole('button',{name:'Open apps'}).click();}},
 {name:'15-home-more-sheet',path:'/members',setup:p=>member(p),then:async p=>{await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'More',exact:true}).click();}},
 {name:'16-profile-member',path:'/members/manage?tab=profile',setup:p=>member(p)},
 {name:'17-profile-unassigned',path:'/members/manage?tab=profile',setup:p=>member(p,id(4,107),unassigned)},
 {name:'18-members-manager',path:'/members/manage',setup:p=>member(p,id(4,105))},
 {name:'19-members-manage-tab',path:'/members/manage?tab=manage',setup:p=>member(p,id(4,105))},
 {name:'20-appearance-member',path:'/appearance',setup:p=>member(p)},
 {name:'21-study-rooms-member',path:'/modules/study-rooms',setup:async p=>{await member(p);await p.route('**/api/study-rooms/access',r=>r.fulfill({status:403,json:{error:'Group leader access required.'}}));}},
 {name:'22-study-rooms-manager',path:'/modules/study-rooms',setup:async p=>{await member(p,id(4,105));await p.route('**/api/study-rooms/access',r=>r.fulfill({status:403,json:{error:'Group leader access required.'}}));}},
 {name:'23-study-access-leader',path:'/modules/study-rooms/members',setup:async p=>{await member(p,id(4,103));await p.route('**/api/study-rooms/access',r=>r.fulfill({json:{groups:[{id:id(2,2),name:'Demo Group B',members:[{id:id(4,103),name:'Cara Example',unit:'Demo Unit B1',automatic:true,enabled:false,locked:false,self:true},{id:id(4,108),name:'Hugo Example',unit:'Demo Unit B1',automatic:false,enabled:true,locked:false,self:false}]}]}}));}},
 {name:'24-study-access-denied',path:'/modules/study-rooms/members',setup:async p=>{await member(p);await p.route('**/api/study-rooms/access',r=>r.fulfill({status:403,json:{error:'Group leader access required.'}}));}},
 {name:'25-contacts-owner',path:'/modules/contacts',onHarness:true,setup:async p=>{await member(p);await p.route('**/api/contacts/workspace',r=>r.fulfill({json:{memberId:'fictional-owner',contacts:[],nextCursor:null}}));await p.route('**/api/contacts/agenda',r=>r.fulfill({json:[]}));}},
 {name:'26-contacts-denied',path:'/modules/contacts',onHarness:true,setup:async p=>{await member(p);await p.route('**/api/contacts/**',r=>r.fulfill({status:403,json:{error:'Contacts access is not granted.'}}));}},
 {name:'27-work-mission-empty',path:'/modules/work-mission-prayer',onHarness:true,setup:async p=>{await member(p);await p.route('**/api/morning-prayer?**',r=>r.fulfill({json:{version:1,occurrences:[],upcoming:[],ownHosting:[],requests:[],materials:[],drafts:[],eligibleHosts:[],capabilities:['view_schedule','join_gathering'],timezone:'America/Los_Angeles',setupComplete:true,joinWindowMinutes:10,meetingStates:[],materialCatalog:[]}}));}},
 {name:'28-work-mission-denied',path:'/modules/work-mission-prayer',onHarness:true,setup:async p=>{await member(p);await p.route('**/api/morning-prayer**',r=>r.fulfill({status:403,json:{error:'Morning Prayer access is not granted.'}}));}},
 {name:'29-display-manager',path:'/modules/continuous-display',onHarness:true,setup:async p=>{await member(p);await p.route('**/api/display/manage',r=>r.fulfill({json:{screens:[]}}));}},
 {name:'30-display-review-fixture',path:'/display-operations-review',setup:async p=>{await member(p);await p.route('**/api/display/manage',r=>r.fulfill({json:{screens:[]}}));}},
 {name:'31-display-player-unpaired',path:'/display',setup:anonymous},
 {name:'32-member-preview-org',path:'/member-preview',setup:p=>member(p,id(4,105))},
 {name:'33-unknown-route',path:'/does-not-exist',setup:anonymous},
 // Dark appearance (System on a dark device) for the base and each module style.
 {name:'40-dark-sign-in',path:'/sign-in',dark:true,setup:anonymous},
 {name:'41-dark-home-member',path:'/members',dark:true,setup:p=>member(p)},
 {name:'42-dark-members-manager',path:'/members/manage?tab=manage',dark:true,setup:p=>member(p,id(4,105))},
 {name:'43-dark-study-rooms',path:'/modules/study-rooms',dark:true,setup:async p=>{await member(p);await p.route('**/api/study-rooms/access',r=>r.fulfill({status:403,json:{error:'Group leader access required.'}}));}},
 {name:'44-dark-contacts',path:'/modules/contacts',dark:true,onHarness:true,setup:async p=>{await member(p);await p.route('**/api/contacts/workspace',r=>r.fulfill({json:{memberId:'fictional-owner',contacts:[],nextCursor:null}}));await p.route('**/api/contacts/agenda',r=>r.fulfill({json:[]}));}},
 {name:'45-dark-work-mission',path:'/modules/work-mission-prayer',dark:true,onHarness:true,setup:async p=>{await member(p);await p.route('**/api/morning-prayer?**',r=>r.fulfill({json:{version:1,occurrences:[],upcoming:[],ownHosting:[],requests:[],materials:[],drafts:[],eligibleHosts:[],capabilities:['view_schedule','join_gathering'],timezone:'America/Los_Angeles',setupComplete:true,joinWindowMinutes:10,meetingStates:[],materialCatalog:[]}}));}},
 {name:'46-dark-display-manager',path:'/modules/continuous-display',dark:true,onHarness:true,setup:async p=>{await member(p);await p.route('**/api/display/manage',r=>r.fulfill({json:{screens:[]}}));}},
 {name:'47-dark-appearance',path:'/appearance',dark:true,setup:p=>member(p)},
];

for(const screen of screens)test(screen.name,async({page},info)=>{
 const dir=join(out,info.project.name);mkdirSync(dir,{recursive:true});
 const errors:string[]=[];
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300));});
 page.on('pageerror',e=>errors.push('pageerror: '+e.message.slice(0,300)));
 if(screen.onHarness&&!harness){test.skip(true,'No harness');return;}
 if(screen.dark)await page.emulateMedia({colorScheme:'dark'});
 await screen.setup?.(page);
 if(screen.path==='/modules/study-rooms'&&!screen.name.includes('signed-out')){
  await openStudyRoute(page,{manager:screen.name.includes('manager'),nowMinute:600});
 }else await page.goto((screen.onHarness?harness:'')+screen.path);
 await page.waitForLoadState('networkidle').catch(()=>{});
 await page.waitForTimeout(800);
 await screen.then?.(page).catch(e=>errors.push('step: '+String(e).slice(0,200)));
 await page.waitForTimeout(300);
 const metrics=await page.evaluate(()=>{
  // checkVisibility also excludes content inside closed <details> and hidden dialogs.
  const visible=(el:Element)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&el.checkVisibility({visibilityProperty:true,contentVisibilityAuto:true});};
  const nav=document.querySelector('.app-frame-nav');
  const navBox=nav&&visible(nav)?nav.getBoundingClientRect():null;
  window.scrollTo(0,document.documentElement.scrollHeight);
  // The part of an element actually on screen: its box clipped by every scrolling or clipping ancestor.
  // Cells scrolled out of view inside an inner scroll box are clipped, not covered.
  const shown=(el:Element)=>{let r=el.getBoundingClientRect(),top=r.top,bottom=r.bottom;for(let a=el.parentElement;a&&a!==document.body;a=a.parentElement){const o=getComputedStyle(a);if(o.overflowY!=='visible'||o.overflowX!=='visible'){const c=a.getBoundingClientRect();top=Math.max(top,c.top);bottom=Math.min(bottom,c.bottom);}}return bottom>top?{top,bottom}:null;};
  const covered=navBox?[...document.querySelectorAll('main input:not([type=hidden]),main select,main textarea,main button')].filter(el=>{if(!visible(el))return false;const r=shown(el),n=document.querySelector('.app-frame-nav')!.getBoundingClientRect();return r!==null&&r.bottom>n.top+2&&r.top<n.bottom;}).map(el=>(el.getAttribute('name')||el.getAttribute('aria-label')||el.textContent||el.tagName).trim().slice(0,40)):[];
  // An inner scroll box whose own visible bottom sits under the dock would keep its last items hidden at the end of its scroll.
  const scrollBoxesUnderDock=navBox?[...document.querySelectorAll('main *')].filter(el=>{const o=getComputedStyle(el);if(!/(auto|scroll)/.test(o.overflowY)||el.scrollHeight<=el.clientHeight+1||!visible(el))return false;const r=shown(el),n=document.querySelector('.app-frame-nav')!.getBoundingClientRect();return r!==null&&r.bottom>n.top+2;}).map(el=>(el.className||el.tagName).toString().slice(0,40)):[];
  window.scrollTo(0,0);
  const text=document.body.innerText;
  return {
   url:location.pathname+location.search,
   title:document.title,
   theme:document.documentElement.dataset.lvzTheme??null,
   h1:[...document.querySelectorAll('h1')].filter(visible).map(h=>h.textContent!.trim().slice(0,60)),
   header:document.querySelector('.app-frame-header')?.textContent?.trim().slice(0,60)??null,
   dockVisible:Boolean(navBox),
   brandMentions:(text.match(/LV\s*Zion/g)??[]).length,
   overflowX:document.documentElement.scrollWidth>innerWidth+1,
   coveredByDock:covered,
   scrollBoxesUnderDock,
   waiting:/Checking|Loading/i.test(text)?text.split('\n').find(l=>/Checking|Loading/i.test(l))?.slice(0,80):null,
   ground:getComputedStyle(document.body).backgroundColor,
   frameGround:document.querySelector('.app-frame')?getComputedStyle(document.querySelector('.app-frame')!).getPropertyValue('--lvz-ground').trim():null,
   accent:getComputedStyle(document.querySelector('.app-frame')??document.documentElement).getPropertyValue('--lvz-accent').trim(),
  };
 });
 await page.screenshot({path:join(dir,screen.name+'.png')});
 writeFileSync(join(dir,screen.name+'.json'),JSON.stringify({...metrics,errors},null,1));
});
