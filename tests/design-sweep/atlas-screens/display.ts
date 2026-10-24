// Continuous Display management (Atlas display-*).
import {member,type AtlasScreen} from './shared';
const screens:AtlasScreen[]=[
 {name:'display-devices',title:'Church Display (no screens)',atlas:'display-devices',path:'/modules/continuous-display',onHarness:true,setup:async p=>{await member(p);await p.route('**/api/display/manage',r=>r.fulfill({json:{screens:[]}}));}},
];
export default screens;
