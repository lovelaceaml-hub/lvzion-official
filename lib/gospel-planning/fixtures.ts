import { INITIAL_CLOCK, expandRanges, localInstant, type Person, type Range, type Session, type State } from './domain.ts';
export const PERSONAS = [
  { id:'milo', label:'Member · Unit A' }, { id:'evan', label:'Invited partner · Unit A' },
  { id:'owen', label:'Member · Unit B' }, { id:'nolan', label:'Unit leader · Unit A' },
  { id:'ari', label:'Group leader + publisher' }, { id:'drew', label:'Assigned scheduler' },
  { id:'reese', label:'Assigned overseer' }, { id:'sage', label:'Other group member' },
  { id:'alex', label:'Technical administrator only' },
];
export function createFixture(): State {
  const people:Person[] = [
    {id:'milo',name:'Milo Chen',unitId:'u1',groupId:'g1',roles:[]},
    {id:'evan',name:'Evan Reed',unitId:'u1',groupId:'g1',roles:[]},
    {id:'owen',name:'Owen Gray',unitId:'u2',groupId:'g1',roles:[]},
    {id:'nolan',name:'Nolan Brooks',unitId:'u1',groupId:'g1',roles:[{kind:'unit-leader',scope:'u1'}]},
    {id:'ari',name:'Ari Cole',unitId:'u2',groupId:'g1',roles:[{kind:'group-leader',scope:'g1'},{kind:'publisher',scope:'g1'}]},
    {id:'drew',name:'Drew Lane',unitId:'u1',groupId:'g1',roles:[{kind:'scheduler',scope:'g1'}]},
    {id:'reese',name:'Reese Vale',unitId:'u2',groupId:'g1',roles:[{kind:'overseer',scope:'g1'}]},
    {id:'sage',name:'Sage Park',unitId:'u3',groupId:'g2',roles:[]},
    {id:'alex',name:'Alex Quinn',unitId:'u3',groupId:'g2',roles:[]},
  ].map(p=>({...p,roles:p.roles as Person['roles'],placementId:`placement-${p.id}-1`,active:true,appAccess:p.id!=='alex'}));
  const ranges:Range[]=['2026-10-13','2026-10-15','2026-10-16'].map(date=>({date,from:'14:00',to:'18:00',repeatWeeks:1,exceptions:[]}));
  const state:State={now:INITIAL_CLOCK,serial:100,people,groups:[{id:'g1',name:'Sample Wayfinders'},{id:'g2',name:'Sample Harbor'}],locations:[{id:'garden',name:'Sample Garden Entrance'},{id:'plaza',name:'Sample Civic Plaza'},{id:'courtyard',name:'Sample Library Courtyard'}],availability:Object.fromEntries(people.filter(p=>p.appAccess).map(p=>[p.id,{version:1,ranges:structuredClone(ranges),windows:expandRanges(ranges)}])),plans:[],items:[],requests:[],sessions:[],receipts:{},audit:[]};
  for(const group of state.groups) for(const week of ['2026-10-12','2026-10-19']) {
    const content={summary:'Review completed sessions together and keep unfinished actions visible.',activity:'Arrange two partner sessions this week. Review each invitation before accepting.',nextAction:'Group publisher: review the Friday proposal before Thursday evening.'};
    state.plans.push({id:`plan-${group.id}-${week}`,groupId:group.id,week,version:2,draft:{...content,activity:'Prepare Thursday and Friday sessions. Gather unit contributions before publication.'},published:week==='2026-10-12'?{version:1,content,authorId:'ari',at:INITIAL_CLOCK}:null});
  }
  const session=(id:string,date:string):Session=>({id,groupId:'g1',week:'2026-10-12',creatorId:'ari',version:1,start:localInstant(date,'15:00'),end:localInstant(date,'16:00'),locationId:'garden',phase:'published',participants:['milo','evan'],placements:{milo:'placement-milo-1',evan:'placement-evan-1'},availabilityVersions:{milo:1,evan:1},responses:{milo:{value:'pending',version:1},evan:{value:'pending',version:1}},commitments:{},history:[],reports:[]});
  state.sessions=[session('session-next','2026-10-15'),session('session-past','2026-10-13')];
  state.items=[
    {id:'update-a',groupId:'g1',week:'2026-10-12',unitId:'u1',authorId:'nolan',authorPlacementId:'placement-nolan-1',kind:'member-update',text:'Sample Unit A support request: help finding a suitable meeting time.',nextAction:'Discuss the available times privately.',responsibleId:'nolan',responsiblePlacementId:'placement-nolan-1',version:1},
    {id:'update-b',groupId:'g1',week:'2026-10-12',unitId:'u2',authorId:'ari',authorPlacementId:'placement-ari-1',kind:'member-update',text:'Sample Unit B restricted update. This must never appear in the shared group plan.',nextAction:'Review within Unit B.',responsibleId:'owen',responsiblePlacementId:'placement-owen-1',version:1},
  ];
  state.requests=[{id:'request-seed',groupId:'g1',week:'2026-10-12',authorId:'ari',authorPlacementId:'placement-ari-1',reviewerId:'reese',text:'Sample request: please review the proposed weekly coordination approach.',version:1,status:'open',history:[{authorId:'ari',text:'Sample request: please review the proposed weekly coordination approach.',status:'open',at:INITIAL_CLOCK}]}];
  return state;
}
