// Groups & Gospel Planning has no Atlas screens of its own. Its tabs are composed from the closest
// Liquid Opal screens: My Preaching from main-week (week chips over a glass list), My Group from
// organization-members (glass cards of avatar rows with tags) and Manage from mission-manage (pill
// segmented control over glass form cards). Every capture runs the real migrations in a disposable
// PGlite database (tests/browser/gospel-route-fixture.ts) with fictional members, and the sample
// records below are created through the real command route, so states and counts are what the SQL returns.
import {test,type Page} from '@playwright/test';
import {type AtlasScreen} from './shared';
import {openGospel,member as people} from '../../browser/gospel-route-fixture';
import {addDays,mondayOf,vegasDay,type Workspace} from '../../../lib/gospel-planning/contract';

type Gospel=Awaited<ReturnType<typeof openGospel>>;
const mid=(n:number)=>'44444444-4444-4444-8444-'+String(n).padStart(12,'0');
const unitA1='33333333-3333-4333-8333-000000000001';
const today=()=>vegasDay();
const week=()=>mondayOf(today());
let counter=0;

async function frame(page:Page){
 await page.route('**/api/members/avatar',r=>r.fulfill({json:{initials:'EX'}}));
 await page.route('**/api/members/experience',r=>r.fulfill({json:{modules:[],activities:[],notifications:[],favorites:[],favoriteVersion:1}}));
}
async function read(page:Page,day=week()):Promise<Workspace>{
 return page.evaluate(async w=>(await fetch('/api/gospel-planning?week='+w)).json(),day);
}
async function command(page:Page,action:string,payload:Record<string,unknown>){
 const requestId='70000000-0000-4000-8000-'+String(++counter).padStart(12,'0');
 const result=await page.evaluate(async body=>{const r=await fetch('/api/gospel-planning/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {ok:r.ok,body:await r.text()};},{action,requestId,payload});
 if(!result.ok)throw Error(action+' failed: '+result.body);
}
/** Creates a session as `by`, then has the publisher and the partners act on it. */
async function session(gp:Gputs,{by,date,from,to,with:partners,publishBy,accept=[]}:{by:number;date:string;from:string;to:string;with:number[];publishBy?:number;accept?:number[]}){
 const {page}=gp;
 await gp.as(by);
 const before=await read(page,mondayOf(date));
 await command(page,'session.create',{date,from,to,locationId:before.locations[0].id,participants:[mid(by),...partners.map(mid)]});
 const created=(await read(page,mondayOf(date))).sessions.filter(s=>!before.sessions.some(b=>b.id===s.id))[0];
 if(!publishBy)return;
 await gp.as(publishBy);
 await command(page,'session.publish',{id:created.id,expected:created.version});
 for(const who of accept){
  await gp.as(who);
  const s=(await read(page,mondayOf(date))).sessions.find(x=>x.id===created.id)!;
  const self=s.participants.find(p=>p.self)!;
  await command(page,'session.respond',{id:s.id,expected:s.version,expectedResponse:self.responseVersion,response:'accepted'});
 }
}
type Gputs=Gospel&{page:Page};

/** Gina's week: availability, one confirmed session, one waiting for her answer, one still proposed. */
async function preachingWeek(gp:Gputs){
 const t=today();
 await gp.as(people.gina);
 await command(gp.page,'availability.save',{expected:0,ranges:[{date:addDays(t,1),from:'09:00',to:'13:00',repeatWeeks:3,skip:[]},{date:addDays(t,3),from:'15:00',to:'18:00',repeatWeeks:1,skip:[]}]});
 await session(gp,{by:people.gina,date:addDays(t,1),from:'10:00',to:'11:00',with:[people.ben],publishBy:people.isla,accept:[people.ben,people.gina]});
 await session(gp,{by:people.gina,date:addDays(t,3),from:'15:30',to:'16:30',with:[people.ava],publishBy:people.ava,accept:[people.ava]});
 await session(gp,{by:people.gina,date:addDays(t,9),from:'11:00',to:'12:00',with:[people.ben]});
}
/** Isla's group: a private member update, a published plan with a newer draft, and a request to the overseer. */
async function groupWeek(gp:Gputs){
 const w=week(),page=gp.page;
 await gp.as(people.isla);
 await command(page,'update.create',{week:w,unitId:unitA1,aboutMemberId:mid(people.gina),assigneeId:mid(people.isla),body:'Example update: would like a partner for weekday mornings.',support:'',nextAction:'Example: pair with a partner from Unit A1'});
 await command(page,'plan.save',{week:w,expected:0,review:'Example review: sessions this week were planned at approved public places.',plan:'Example plan: two partner sessions in the library lobby on weekday mornings.',nextAction:'Example: confirm partners by Wednesday',responsibleId:mid(people.ava)});
 await command(page,'plan.publish',{week:w,expected:1});
 await command(page,'plan.save',{week:w,expected:1,review:'Example review: sessions this week were planned at approved public places.',plan:'Example plan: two partner sessions in the library lobby, and one in the park pavilion.',nextAction:'Example: confirm partners by Wednesday',responsibleId:mid(people.ava)});
 await command(page,'request.create',{week:w,reviewerId:mid(people.eira),body:'Example request: guidance on pairing new members for their first sessions.'});
}
async function open(page:Page,as:number,seed?:(gp:Gputs)=>Promise<unknown>,places=true){
 test.setTimeout(180000);
 await frame(page);
 const gp=await openGospel(page,{as:seed?people.hugo:as,places});
 const g={...gp,page} as Gputs;
 if(seed){await seed(g);await gp.as(as);}
 return g;
}
const tab=(name:string)=>async(page:Page)=>{await page.getByRole('tab',{name}).click();await page.evaluate(()=>scrollTo(0,0));};
/** Scrolls so the element is just under the top of the viewport, for the lower half of a tab. */
const scrollNear=(selector:string)=>async(page:Page)=>{await page.locator(selector).first().evaluate(el=>scrollBy(0,el.getBoundingClientRect().top-90));};
const why='Groups & Gospel Planning has no Atlas screen of its own; this tab is composed from the closest Liquid Opal screen in the same component language as its siblings. Fictional members and "Example" records are created through the real command route against the real migrations in a disposable database; real members see only their authorized records.';

const screens:AtlasScreen[]=[
 {name:'gospel-preaching',title:'My Preaching (member)',atlas:'main-week',path:'/modules/gospel-planning',setup:p=>open(p,people.gina,preachingWeek),
  notes:'Matched to main-week and mission-schedule: the next session as a frosted card with its date block and one gradient action, the week as round date chips (a dot marks a day with sessions) over a glass list with status tags, a floating tray with the gradient "Plan a session" pill, later sessions and the availability card. '+why},
 {name:'gospel-preaching-more',title:'My Preaching, lower half (member)',atlas:'main-week',path:'/modules/gospel-planning',setup:p=>open(p,people.gina,preachingWeek),then:scrollNear('.gp-week-head'),
  notes:'The week strip and list, the floating "Plan ahead" tray with its gradient pill, sessions after this week and the availability card. '+why},
 {name:'gospel-preaching-empty',title:'My Preaching (new member, nothing planned)',atlas:'main-week',path:'/modules/gospel-planning',setup:p=>open(p,people.gina),
  notes:'A member with access but no sessions or availability yet: neutral empty states, the week chips and the plan tray. No sample sessions are shown. '+why},
 {name:'gospel-preaching-leader',title:'My Preaching (group leader)',atlas:'main-week',path:'/modules/gospel-planning',setup:p=>open(p,people.isla,preachingWeek),
  notes:'A group leader sees the sessions in the shown week that they may publish or change alongside their own. '+why},
 {name:'gospel-group-leader',title:'My Group (group leader)',atlas:'organization-members',path:'/modules/gospel-planning',setup:p=>open(p,people.isla,async gp=>{await preachingWeek(gp);await groupWeek(gp);}),then:tab('My Group'),
  notes:'Matched to organization-members: the four Wayfinders sections as glass cards with numbered gradient steps; Member Updates and Requests as avatar rows with status tags, Gospel Review as count tiles (real counts from the SQL), the published plan and the leader draft with the gradient Publish pill. No search or segmented filter: the four sections are always shown together, in order. '+why},
 {name:'gospel-group-leader-more',title:'My Group, lower half (group leader)',atlas:'organization-members',path:'/modules/gospel-planning',setup:p=>open(p,people.isla,async gp=>{await preachingWeek(gp);await groupWeek(gp);}),
  then:async p=>{await tab('My Group')(p);await scrollNear('#gp-gospel-review')(p);},
  notes:'Gospel Review counts (the first tile filled), the published plan, the leader draft with its gradient Publish pill, and the overseer request row. '+why},
 {name:'gospel-group-member',title:'My Group (member)',atlas:'organization-members',path:'/modules/gospel-planning',setup:p=>open(p,people.gina,groupWeek),then:tab('My Group'),
  notes:'An ordinary member sees the published review and plan only; member updates, drafts and overseer requests stay private to leaders. '+why},
 {name:'gospel-manage',title:'Manage: places (module manager)',atlas:'mission-manage',path:'/modules/gospel-planning',setup:p=>open(p,people.hugo),then:tab('Manage'),
  notes:'Matched to mission-manage: the "Setup only" callout, a pill segmented control (Places, Roles) and glass cards for the list and the add form with one gradient pill. '+why},
 {name:'gospel-manage-roles',title:'Manage: roles (module manager)',atlas:'mission-manage',path:'/modules/gospel-planning',setup:p=>open(p,people.hugo),
  then:async p=>{await tab('Manage')(p);await p.getByRole('button',{name:'Roles'}).click();},
  notes:'Gospel roles as avatar rows (the fixture grants Isla Publisher and Eira Overseer), then the assign form. '+why},
 {name:'gospel-session-sheet',title:'Session sheet (member)',atlas:'study-confirm',path:'/modules/gospel-planning',setup:p=>open(p,people.gina,preachingWeek),
  then:async p=>{await p.getByRole('button',{name:'Answer this session'}).click();},
  notes:'The bottom sheet for a session waiting on the member: a frosted summary with the date block, partner rows with initials and the gradient Accept pill. '+why},
];
export default screens;
