import type {Workspace,Command} from './contracts';
import {demoWorkspace,initialDemo,id} from './demo.ts';
export const fictionalEnrollment={id:'cccccccc-cccc-4ccc-8ccc-000000000001',name:'Jamie Example',email:'jamie@example.invalid',createdAt:'2026-10-14T10:00:00Z'};
export function unassignedPreview():Workspace{return{self:{id:fictionalEnrollment.id,name:fictionalEnrollment.name,status:'intake',groupId:null,unitId:null},permissions:{organization:false,memberManagement:false,departmentAdmin:false,technical:false},contacts:{email:fictionalEnrollment.email},directory:[],managedMembers:[],categories:[],groups:[],units:[],departments:[],appointments:[],transfers:[],audit:[{id:1,at:fictionalEnrollment.createdAt,action:'enrollment.created',memberId:fictionalEnrollment.id,reason:'Email confirmed; awaiting independent membership verification'}],enrollment:{state:'unassigned',placementHistory:[]},unassignedMembers:[]};}
export function enrollmentLeaderPreview():Workspace{const w=demoWorkspace(initialDemo(),id(4,105));return{...w,unassignedMembers:[fictionalEnrollment]};}
export function applyEnrollmentPreview(w:Workspace,c:Command):Workspace{
 if(!w.permissions.organization||!w.unassignedMembers?.some(m=>m.id===c.payload.memberId))throw new Error('Enrollment unavailable.');
 if(c.payload.reason?.trim().length<5)throw new Error('Document verification or the decision.');
 if(c.action==='enrollment.assign'&&(c.payload.verified!=='yes'||!w.units.some(u=>u.id===c.payload.unitId&&u.canManage)))throw new Error('Verify membership and choose an authorized unit.');
 if(!['enrollment.assign','enrollment.reject'].includes(c.action))throw new Error('Invalid decision.');
 const enrollment=w.unassignedMembers.find(m=>m.id===c.payload.memberId)!;const unit=w.units.find(u=>u.id===c.payload.unitId);
 const person={id:enrollment.id,name:enrollment.name,status:c.action==='enrollment.assign'?'active' as const:'inactive' as const,groupId:unit?.parentId,unitId:unit?.id};
 return{...w,managedMembers:[...w.managedMembers,person],unassignedMembers:[],audit:[{id:999,at:new Date().toISOString(),action:c.action,memberId:c.payload.memberId,reason:c.payload.reason},...w.audit]};
}
