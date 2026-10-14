import {ROSTER_HEADERS} from './roster-preflight';
import type {PreflightContext} from './roster-preflight';
export const sampleContext: PreflightContext = {
 units:[{id:'sample-unit-a',categoryCode:'CATEGORY-A',groupCode:'GROUP-1',unitCode:'UNIT-1'},{id:'sample-unit-b',categoryCode:'CATEGORY-A',groupCode:'GROUP-1',unitCode:'UNIT-2'},{id:'sample-unit-c',categoryCode:'CATEGORY-B',groupCode:'GROUP-2',unitCode:'UNIT-1'}],
 allowedUnitIds:['sample-unit-a','sample-unit-b'],
 existing:[{id:'sample-person-1',externalId:'existing-001',displayName:'Ava Brooks',unitId:'sample-unit-a'}]
};
const header = ROSTER_HEADERS.join(',')+'\n';
export const rosterScenarios = {
 clean:{label:'Clean roster',csv:header+'sample-101,Eli Rowan,CATEGORY-A,GROUP-1,UNIT-1,active,,\nsample-102,Noor Ellis,CATEGORY-A,GROUP-1,UNIT-2,active,,\nsample-103,Mira Quinn,CATEGORY-A,GROUP-1,UNIT-1,inactive,,\n'},
 duplicates:{label:'Possible duplicates',csv:header+'existing-001,Ava Brooks,CATEGORY-A,GROUP-1,UNIT-1,active,,\nsample-102,Eli Rowan,CATEGORY-A,GROUP-1,UNIT-1,active,,\nsample-102,Eli Rowan,CATEGORY-A,GROUP-1,UNIT-1,active,,\n'},
 placement:{label:'Placement problems',csv:header+'sample-201,Priya Wells,CATEGORY-B,GROUP-2,UNIT-1,active,,\nsample-202,Felix Stone,CATEGORY-A,GROUP-1,UNKNOWN,active,,\nsample-203,Mira Quinn,CATEGORY-A,GROUP-1,UNIT-1,active,,\n'}
};
