// Study Rooms (Atlas study-*, the Liquid Opal reference app).
import {member,type AtlasScreen} from './shared';
import {openStudyRoute} from '../../browser/study-route-fixture';
const denied=async(p:import('@playwright/test').Page)=>{await member(p);await p.route('**/api/study-rooms/access',r=>r.fulfill({status:403,json:{error:'Group leader access required.'}}));};
const screens:AtlasScreen[]=[
 {name:'study-availability',title:'Study Rooms availability',atlas:'study-availability',path:'/modules/study-rooms',wide:true,setup:async p=>{await denied(p);await openStudyRoute(p,{nowMinute:600});}},
];
export default screens;
