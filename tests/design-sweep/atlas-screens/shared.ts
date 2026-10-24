// Shared fictional fixtures for the Atlas side-by-side captures. Fictional
// records only ("Example" names, demo groups); never hosted accounts or member data.
import type {Page} from '@playwright/test';
import {demoWorkspace,id,initialDemo} from '../../../lib/demo';

export type AtlasScreen={
 /** File name for the capture and the gallery entry, e.g. "contacts-list". */
 name:string;
 /** Human title for the gallery. */
 title:string;
 /** Atlas screen directory the composition is matched against, e.g. "contacts-list". */
 atlas:string;
 path:string;
 /** Run against the harness build (gated module clients without the server-side member check). */
 onHarness?:boolean;
 /** Also capture at 1280px. */
 wide?:boolean;
 setup?:(page:Page)=>Promise<unknown>;
 then?:(page:Page)=>Promise<unknown>;
 /** Notes on deliberate differences from the Atlas (real data, permissions). */
 notes?:string;
};

const modules=[
 ['10000000-0000-4000-8000-000000000001','/modules/study-rooms','Study Rooms','Rooms'],
 ['10000000-0000-4000-8000-000000000002','/modules/contacts','Contacts','Contacts'],
 ['10000000-0000-4000-8000-000000000003','/modules/work-mission-prayer','Work Mission Prayer','Prayer'],
 ['10000000-0000-4000-8000-000000000005','/modules/worship-duty','Worship Duty','Worship'],
 ['10000000-0000-4000-8000-000000000004','/modules/continuous-display','Church Display','Display'],
 ['10000000-0000-4000-8000-000000000006','/modules/gospel-planning','Groups & Gospel Planning','Gospel'],
].map(([mid,route,name,shortName])=>({id:mid,route,name,shortName,accent:'#6146c9',description:'Fictional module entry.',status:'approved',canManage:true}));
export const fictionalFeed={modules,activities:[],notifications:[],favorites:[modules[0].id,modules[3].id,modules[2].id,modules[1].id],favoriteVersion:1};

export async function anonymous(page:Page){
 await page.route('**/api/**',r=>r.fulfill({status:401,json:{error:'Sign in to continue.'}}));
}
type Workspace=ReturnType<typeof demoWorkspace>;
/** A signed-in fictional member (default: a regular member in Demo Group A). */
export async function member(page:Page,actor=id(4,107),change?:(w:Workspace)=>unknown,feed:unknown=fictionalFeed){
 const workspace=demoWorkspace(initialDemo(),actor);
 const body=change?change(workspace):workspace;
 await page.route('**/api/members',r=>r.fulfill({json:body}));
 await page.route('**/api/members/avatar',r=>r.fulfill({json:{initials:'GE'}}));
 await page.route('**/api/members/experience',r=>r.fulfill({json:feed}));
}
export const manager=id(4,105);
export const unassigned=(w:Workspace)=>({...w,self:{...w.self,status:'intake',groupId:null,unitId:null},permissions:{organization:false,memberManagement:false,departmentAdmin:false,technical:false}});
export {id};
