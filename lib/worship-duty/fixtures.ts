import type {Actor,Member,Service,Song,State} from './domain.ts';
import {CATALOG} from './domain.ts';
const person=(id:string,name:string,groupId:string,departments:Member['departments'],qualifications:Member['qualifications']):Member=>({id,name,groupId,unit:groupId==='group-a'?'Demo Unit A1':'Demo Unit B1',active:true,departments,qualifications,manualOnly:[],unavailablePeriods:[],daysOff:[],serviceAvailability:{}});
export const DEMO_PEOPLE:Member[]=[
 person('alex','Alex Example','group-a',['Usher Brothers','Worship'],['usher_1','usher_2','thanks_prayer','closing_prayer']),
 person('casey','Casey Example','group-a',['Worship'],['presider']),
 person('morgan','Morgan Example','group-b',['Worship'],['opening_prayer']),
 person('jordan','Jordan Example','group-b',['Usher Brothers'],['usher_1','usher_2','lobby_security']),
 person('riley','Riley Example','group-a',['Usher Brothers','Worship'],['usher_1','usher_2','lobby_security','thanks_prayer','closing_prayer']),
 {...person('sage','Sage Example','group-b',['Usher Brothers'],['usher_1','usher_2','lobby_security']),manualOnly:['Usher Brothers']},
 {...person('avery','Avery Example','group-b',['Usher Brothers'],['usher_1','usher_2']),unavailablePeriods:['Morning']},
 {...person('quinn','Quinn Example','group-a',['Worship'],['thanks_prayer','closing_prayer']),active:false},
 person('taylor','Taylor Example','group-a',[],[])
];
export const PREVIEW_ACTORS:{label:string;actor:Actor}[]=[
 {label:'Member · Alex',actor:{memberId:'alex',enabled:true,manageDepartments:[],songEditor:false}},
 {label:'Presider · Casey',actor:{memberId:'casey',enabled:true,manageDepartments:[],songEditor:false}},
 {label:'Worship leader + song editor · Morgan',actor:{memberId:'morgan',enabled:true,manageDepartments:['Worship'],songEditor:true}},
 {label:'Usher leader · Jordan',actor:{memberId:'jordan',enabled:true,manageDepartments:['Usher Brothers'],songEditor:false}},
 {label:'Technical admin only · Taylor',actor:{memberId:'taylor',enabled:true,manageDepartments:[],songEditor:false}}
];
export const DEMO_SONGS:readonly Song[]=[
 {id:'demo-01',title:'Demo song 01',seconds:185},
 {id:'demo-02',title:'Demo song 02',seconds:214},
 {id:'demo-03',title:'Demo song 03',seconds:166},
 {id:'demo-04',title:'Demo song 04',seconds:201},
 {id:'demo-05',title:'Demo song 05',seconds:232},
 {id:'demo-06',title:'Demo song 06',seconds:179}
];
const service=(id:string,worship:string,period:Service['period'],start:string,end:string,assignments:Service['assignments']):Service=>({id,worship,period,startsAt:start,endsAt:end,status:'published',version:1,assignments});
export function demoState():State {
 return structuredClone({
  members:DEMO_PEOPLE,
  services:[
   service('sat-am','Sabbath Day','Morning','2026-10-17T17:00:00Z','2026-10-17T19:00:00Z',{presider:'casey',opening_prayer:'morgan',thanks_prayer:'alex',closing_prayer:'riley',usher_1:'alex',lobby_security:'jordan'}),
   service('sat-pm','Sabbath Day','Afternoon','2026-10-17T21:30:00Z','2026-10-17T23:00:00Z',{presider:'casey',opening_prayer:'morgan',closing_prayer:'riley',usher_2:'alex'}),
   service('tue','Third Day','Evening','2026-10-21T02:30:00Z','2026-10-21T04:00:00Z',{presider:'casey',opening_prayer:'morgan',closing_prayer:'alex',usher_1:'alex'}),
   service('next-sat','Sabbath Day','Morning','2026-10-24T17:00:00Z','2026-10-24T19:00:00Z',{presider:'casey',opening_prayer:'morgan',thanks_prayer:'riley'})
  ],
  requests:[],
  programs:[{serviceId:'sat-am',preparation:['demo-01','demo-02'],glory:'demo-03',thanks:'demo-04',choir:'',status:'draft',version:0}]
 });
}
export const DEMO_CATALOG_COUNT=CATALOG.length;
