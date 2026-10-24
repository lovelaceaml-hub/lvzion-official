// Worship Duty (Atlas worship-*).
import {member,type AtlasScreen} from './shared';
const screens:AtlasScreen[]=[
 {name:'worship-denied',title:'Worship Duty (not granted)',atlas:'worship-calendar',path:'/modules/worship-duty',onHarness:true,setup:async p=>{await member(p);await p.route('**/api/worship-duty**',r=>r.fulfill({status:403,json:{error:'Worship Duty access is not granted.'}}));}},
];
export default screens;
