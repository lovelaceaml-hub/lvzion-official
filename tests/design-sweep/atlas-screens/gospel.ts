// Groups & Gospel Planning (no Atlas screens; same component language, matched to main-week).
import {type AtlasScreen} from './shared';
import {openGospel,member as people} from '../../browser/gospel-route-fixture';
const screens:AtlasScreen[]=[
 {name:'gospel-preaching',title:'My Preaching',atlas:'main-week',path:'/modules/gospel-planning',setup:p=>openGospel(p,{as:people.isla})},
];
export default screens;
