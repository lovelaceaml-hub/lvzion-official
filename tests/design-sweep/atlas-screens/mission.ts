// Work Mission Prayer (Atlas mission-*).
import {member,type AtlasScreen} from './shared';
const empty={version:1,occurrences:[],upcoming:[],ownHosting:[],requests:[],materials:[],drafts:[],eligibleHosts:[],capabilities:['view_schedule','join_gathering'],timezone:'America/Los_Angeles',setupComplete:true,joinWindowMinutes:10,meetingStates:[],materialCatalog:[]};
const screens:AtlasScreen[]=[
 {name:'mission-home',title:'Work Mission home (empty)',atlas:'mission-home',path:'/modules/work-mission-prayer',onHarness:true,setup:async p=>{await member(p);await p.route('**/api/morning-prayer?**',r=>r.fulfill({json:empty}));}},
];
export default screens;
