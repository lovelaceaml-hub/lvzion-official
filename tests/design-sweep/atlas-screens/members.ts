// Members and organization (Atlas organization-*), plus the member workspace tabs My Week
// and Profile (Atlas main-week, main-profile). Fixtures are fictional ("Example" names, demo groups).
import {addCalendarDays,localDay} from '../../../lib/member-experience';
import {fictionalEnrollment} from '../../../lib/enrollment-demo';
import {fictionalFeed,id,manager,member,unassigned,type AtlasScreen} from './shared';

const [rooms,,prayer,worship]=fictionalFeed.modules;
const uuid=(n:number)=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
/** The fictional feed with example activities around today (church-local). */
function examples(){
 const today=localDay(),later=addCalendarDays(today,2);
 const activity=(n:number,moduleId:string,title:string,date:string,startTime:string,endTime:string,context:string,location?:string)=>({id:uuid(n),moduleId,title,date,startTime,endTime,context,location:location??null,source:'approved-module'});
 return {...fictionalFeed,activities:[
  activity(1,rooms.id,'Example room reservation',today,'11:00','11:30','30-minute reservation · example','Example Room 2'),
  activity(2,worship.id,'Example duty rehearsal',today,'17:30','18:30','Duty assignment · example'),
  activity(3,prayer.id,'Example prayer gathering',today,'21:00','21:30','Group activity · example'),
  activity(4,worship.id,'Example service duty',later,'09:00','10:00','Duty assignment · example'),
 ]};
}
const departmentManager=id(4,102);
const withSignup=(w:object)=>({...w,unassignedMembers:[fictionalEnrollment]});
const sample='Fictional example records stand in for real data; real members see only their authorized records.';
const screens:AtlasScreen[]=[
 {name:'organization-members',title:'Member directory (My Group, leader)',atlas:'organization-members',path:'/members/manage?tab=people',setup:p=>member(p,manager,withSignup),
  notes:'The My Group tab: search, pill segmented My group / Departments / Unassigned (Unassigned only with organization access), initials rows and the placement button. Rows show names only; leaders can open a member they manage. The workspace tab rail (My Week, My Group, Manage, Profile) sits under the heading. '+sample},
 {name:'organization-directory-member',title:'My Group (ordinary member)',atlas:'organization-members',path:'/members/manage?tab=people',setup:p=>member(p),
  notes:'An ordinary member sees names in their own group only, with no Unassigned view and no placement button.'},
 {name:'organization-manage',title:'Manage: members you manage',atlas:'organization-members',path:'/members/manage?tab=manage',setup:p=>member(p,manager,withSignup),
  notes:'Manage opens on the areas this person is authorized for (Members, Placement, Departments, Access) as rounded tiles; Members lists the managed directory with status tags and opens the member editor sheet. '+sample},
 {name:'organization-placement',title:'Manage: placement',atlas:'organization-placement',path:'/members/manage?tab=manage&view=placement',setup:p=>member(p,manager,withSignup),
  notes:'A fictional unassigned signup: the member summary card, the age category, group and unit fields with the verification choice and reason, and one gradient primary. The age category, group and unit structure follows below. '+sample},
 {name:'organization-member-editor',title:'Manage: member editor sheet',atlas:'organization-placement',path:'/members/manage?tab=manage',setup:p=>member(p,manager),
  then:async p=>{await p.getByRole('button',{name:/Ben Example/}).click();await p.getByText('Change primary placement',{exact:true}).click();},
  notes:'Tapping a managed member opens the editor as a bottom sheet: rename, change primary placement (the placement fields and gradient primary, as on the Atlas placement screen) and, with organization access, active status. '+sample},
 {name:'organization-departments',title:'Manage: departments',atlas:'organization-departments',path:'/members/manage?tab=manage&view=departments',setup:p=>member(p,departmentManager),
  notes:'A fictional department manager and administrator: one card per managed department with its real member count and members; membership changes open below. No per-department workspace exists, so there is no "View department" link. '+sample},
 {name:'organization-access',title:'Manage: access review',atlas:'organization-access',path:'/members/manage?tab=manage&view=access',setup:p=>member(p,manager),
  notes:'Pending account requests with requested date, decision, record match, identity verification and reason; reviewed requests follow, then the "Access is deliberate" note, invitations and account controls. No Pending/Reviewed toggle: both lists stay visible so a decision is seen landing. '+sample},
 {name:'members-week',title:'My Week tab',atlas:'main-week',path:'/members/manage?tab=week',setup:p=>member(p,undefined,undefined,examples()),
  notes:'Day chips for this week, the selected day\'s authorized activities from the same module feed as Home, and a week note. No Week/Month/Agenda control: the full calendar is Home (Calendar link). '+sample},
 {name:'main-profile',title:'Profile (assigned member)',atlas:'main-profile',path:'/members/manage?tab=profile',setup:p=>member(p),
  notes:'Base palette. Identity card with initials, real placement and status; rows for placement, contact information (opens the private contacts form) and Appearance; roles and departments; Sign out. No notification or motion toggles: those settings do not exist.'},
 {name:'main-profile-unassigned',title:'Profile (unassigned member)',atlas:'main-profile',path:'/members/manage?tab=profile',setup:p=>member(p,id(4,107),unassigned),
  notes:'Base palette. A new member waiting for placement: identity card with an Unassigned tag, the placement card, submitted names, Appearance and history.'},
];
export default screens;
