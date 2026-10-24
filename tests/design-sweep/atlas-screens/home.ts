// Home, My Week (the Home Week view), Apps sheet, notifications, sign in and sign up (Atlas main-*).
// Profile belongs to the Members screen list. Fixtures are fictional ("Example" titles only).
import {addCalendarDays,localDay} from '../../../lib/member-experience';
import {anonymous,fictionalFeed,manager,member,type AtlasScreen} from './shared';

const [rooms,contacts,prayer,worship]=fictionalFeed.modules;
const uuid=(n:number)=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
/** The fictional feed with example activities around today (church-local) and example notices. */
function examples(){
 const today=localDay(),tomorrow=addCalendarDays(today,1),later=addCalendarDays(today,3);
 const activity=(n:number,moduleId:string,title:string,date:string,startTime:string,endTime:string,context:string,location?:string)=>({id:uuid(n),moduleId,title,date,startTime,endTime,context,location:location??null,source:'approved-module'});
 return {...fictionalFeed,
  activities:[
   activity(1,rooms.id,'Example room reservation',today,'11:00','11:30','30-minute reservation · example','Example Room 2'),
   activity(2,worship.id,'Example duty rehearsal',today,'17:30','18:30','Duty assignment · example'),
   activity(3,prayer.id,'Example prayer gathering',today,'21:00','21:30','Group activity · example'),
   activity(4,rooms.id,'Example study session',tomorrow,'10:00','11:00','Reservation · example','Example Room 1'),
   activity(5,worship.id,'Example service duty',later,'09:00','10:00','Duty assignment · example'),
  ],
  notifications:[
   {id:uuid(11),moduleId:worship.id,route:worship.route,title:'Example assignment ready',description:'Worship Duty · fictional update',createdAt:new Date().toISOString(),readAt:null,requiresAction:false},
   {id:uuid(12),moduleId:rooms.id,route:rooms.route,title:'Example reservation reminder',description:'Study Rooms · Example Room 2 at 11:00 AM',createdAt:new Date().toISOString(),readAt:null,requiresAction:false},
   {id:uuid(13),moduleId:contacts.id,route:contacts.route,title:'Example follow-up updated',description:'Contacts · fictional status',createdAt:new Date(Date.now()-864e5*2).toISOString(),readAt:new Date().toISOString(),requiresAction:false},
  ]};
}
const empty='Empty data: the fictional feed has no activities, so the hero and agenda show their neutral empty states.';
const sample='Fictional example activities and notices stand in for real module data; real members see only their authorized records.';
const screens:AtlasScreen[]=[
 {name:'main-home',title:'Home',atlas:'main-home',path:'/members',wide:true,setup:p=>member(p,undefined,undefined,examples()),notes:sample},
 {name:'main-home-empty',title:'Home (nothing scheduled)',atlas:'main-home',path:'/members',setup:p=>member(p),notes:empty},
 {name:'main-week',title:'My Week (Home, Week view)',atlas:'main-week',path:'/members',setup:p=>member(p,undefined,undefined,examples()),
  then:async p=>{await p.locator('.lvz-period-tabs').getByRole('button',{name:'Week',exact:true}).click();},
  notes:'Week and Calendar live in the Home segmented control (Today, Week, Calendar) with swipe; the dock Calendar action opens Calendar. '+sample},
 {name:'main-apps',title:'Apps sheet',atlas:'main-apps',path:'/members',setup:p=>member(p),then:async p=>{await p.getByRole('button',{name:'Open apps'}).click();},
  notes:'Tiles come from the authorized module feed, with a pin toggle for favorites; "Recently used" is omitted because no usage history is recorded.'},
 {name:'main-inbox',title:'Notifications',atlas:'main-inbox',path:'/members',setup:p=>member(p,manager,undefined,examples()),
  then:async p=>{await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Notifications'}).click();},
  notes:'A fictional manager: Needs action holds scope-derived review items, Recent holds module notices. No "Mark all as read": there is no bulk read API. '+sample},
 {name:'main-signin',title:'Sign in',atlas:'main-signin',path:'/sign-in',setup:anonymous,notes:'Signed out: no dock or avatar, by contract.'},
 {name:'main-signup',title:'Sign up',atlas:'main-signup',path:'/sign-up',setup:anonymous,notes:'Signup is closed on the loopback server, so the closed notice shows and the button is disabled. The heading keeps "Create your account."'},
];
export default screens;
