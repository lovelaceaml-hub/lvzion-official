// Fictional, in-memory UI simulator ONLY. Never imported by server authorization.
import type { Command, Person, Workspace, Entry } from './contracts.ts';
export const id=(kind:number,n:number)=>`${String(kind).repeat(8)}-${String(kind).repeat(4)}-4${String(kind).repeat(3)}-8${String(kind).repeat(3)}-${String(n).padStart(12,'0')}`;
type Role=Workspace['appointments'][number];
export type DemoState={people:Person[];categories:Entry[];groups:Entry[];units:Entry[];departments:(Entry&{members:Person[]})[];roles:Role[];transfers:Workspace['transfers'];audit:Workspace['audit'];contacts:Record<string,Workspace['contacts']>;history:{memberId:string;unitId:string;endedAt:string}[]};
export function initialDemo():DemoState {
 const names=['Ava','Ben','Cara','Devin','Eira','Finn','Gina','Hugo','Isla'];
 const people=names.map((name,i)=>({id:id(4,i+101),name:`${name} Example`,status:(i===5?'inactive':'active') as Person['status'],groupId:id(2,[2,3,5,7].includes(i)?2:1),unitId:id(3,[2,3,5,7].includes(i)?3:[1,8].includes(i)?2:1)}));
 return {people,categories:[{id:id(1,1),name:'Demo Age Category'}],groups:[{id:id(2,1),name:'Demo Group A',parentId:id(1,1)},{id:id(2,2),name:'Demo Group B',parentId:id(1,1)}],units:[{id:id(3,1),name:'Demo Unit A1',parentId:id(2,1)},{id:id(3,2),name:'Demo Unit A2',parentId:id(2,1)},{id:id(3,3),name:'Demo Unit B1',parentId:id(2,2)}],departments:[{id:id(6,1),name:'Demo Hospitality',members:people.filter(p=>[101,103,107].some(n=>id(4,n)===p.id)).map(({id,name})=>({id,name}))},{id:id(6,2),name:'Demo Education',members:[]}],roles:[
 {id:id(8,1),memberId:id(4,101),role:'unit_leader',unitId:id(3,1),effective:true},
 {id:id(8,2),memberId:id(4,102),role:'department_manager',departmentId:id(6,1),effective:true},
 {id:id(8,3),memberId:id(4,103),role:'group_leader',groupId:id(2,2),effective:true},
 {id:id(8,4),memberId:id(4,104),role:'technical_admin',effective:true},
 {id:id(8,5),memberId:id(4,105),role:'pastoral_staff',effective:true}],transfers:[],audit:[],contacts:{},history:[]};
}
function has(s:DemoState,actor:string,role:string,scope?:string):boolean {
 const p=s.people.find(x=>x.id===actor); if(!p || p.status!=='active')return false;
 return s.roles.some(r=>r.memberId===actor && r.role===role && !r.endedAt && (!scope || [r.unitId,r.groupId,r.departmentId].includes(scope)) && (role!=='unit_leader'||p.unitId===r.unitId) && (role!=='group_leader'||p.groupId===r.groupId));
}
function org(s:DemoState,a:string){return has(s,a,'pastoral_staff')||has(s,a,'member_administrator');}
function unit(s:DemoState,a:string,u?:string){const item=s.units.find(x=>x.id===u);return !!item&&(org(s,a)||has(s,a,'unit_leader',u)||has(s,a,'group_leader',item.parentId));}
function member(s:DemoState,a:string,p?:Person){return !!p&&(org(s,a)||unit(s,a,p.unitId));}
function department(s:DemoState,a:string,d:string){return has(s,a,'department_administrator')||has(s,a,'department_manager',d);}
export function demoWorkspace(s:DemoState,actor:string):Workspace {
 const self=s.people.find(p=>p.id===actor); if(!self || self.status!=='active')throw new Error('This fictional account is inactive. Its history remains, but access is suspended.');
 const isOrg=org(s,actor); const manager=isOrg||has(s,actor,'unit_leader')||has(s,actor,'group_leader');
 const directory=s.people.filter(p=>p.status==='active'&&p.groupId===self.groupId).map(({id,name})=>({id,name}));
 return {self:self as Workspace['self'],permissions:{organization:isOrg,memberManagement:manager,departmentAdmin:has(s,actor,'department_administrator'),technical:has(s,actor,'technical_admin')},contacts:s.contacts[actor]??{},directory,managedMembers:s.people.filter(p=>member(s,actor,p)),categories:s.categories.filter(c=>manager||s.groups.find(g=>g.id===self.groupId)?.parentId===c.id),groups:s.groups.filter(g=>manager||g.id===self.groupId),units:s.units.filter(u=>manager||u.parentId===self.groupId).map(u=>({...u,canManage:unit(s,actor,u.id)})),departments:s.departments.filter(d=>department(s,actor,d.id)||d.members.some(m=>m.id===actor)).map(d=>({...d,canManage:department(s,actor,d.id),members:department(s,actor,d.id)?d.members:[]})),appointments:s.roles.filter(r=>r.memberId===actor||(isOrg&&!['technical_admin','department_manager','department_administrator'].includes(r.role))).map(r=>({...r,effective:!r.endedAt&&has(s,r.memberId,r.role,r.unitId??r.groupId??r.departmentId)})),transfers:s.transfers.filter(t=>t.status==='pending'&&(member(s,actor,s.people.find(p=>p.id===t.memberId))||has(s,actor,'group_leader',s.units.find(u=>u.id===t.unitId)?.parentId))).map(t=>({...t,canDecide:isOrg||(t.requestedBy!==actor&&has(s,actor,'group_leader',s.units.find(u=>u.id===t.unitId)?.parentId))})),audit:s.audit.filter(e=>member(s,actor,s.people.find(p=>p.id===e.memberId))||e.memberId===actor).slice(0,30)};
}
export function demoCommand(state:DemoState,actor:string,c:Command):DemoState {
 const s=structuredClone(state); const w=demoWorkspace(s,actor); const p=c.payload; let target=s.people.find(m=>m.id===p.memberId); const u=s.units.find(x=>x.id===p.unitId); const stamp=new Date().toISOString();
 const deny=()=>{throw new Error('That change is outside this fictional account’s authorized scope.');};
 if(p.reason.trim().length<5)throw new Error('Provide a meaningful reason.');
 switch(c.action){
 case 'member.create':if(!unit(s,actor,p.unitId)||!u)return deny();target={id:crypto.randomUUID(),name:p.name.trim(),status:'active',groupId:u.parentId,unitId:u.id};s.people.push(target);break;
 case 'member.rename':if(!member(s,actor,target)||!target)return deny();target.name=p.name.trim();for(const d of s.departments)for(const m of d.members)if(m.id===target.id)m.name=target.name;break;
 case 'member.status':if(!org(s,actor)||!target||target.id===actor)return deny();if(!['active','inactive'].includes(p.status))return deny();target.status=p.status as Person['status'];break;
 case 'member.move':case 'transfer.request':{
 if(!member(s,actor,target)||!target||!u||target.unitId===u.id)return deny();
 if(c.action==='transfer.request'){if(target.groupId===u.parentId||s.transfers.some(t=>t.memberId===target!.id&&t.status==='pending'))return deny();s.transfers.push({id:crypto.randomUUID(),memberId:target.id,name:target.name,status:'pending',unitId:u.id,requestedBy:actor,canDecide:false});}
 else{if(!unit(s,actor,u.id)||(target.groupId!==u.parentId&&!org(s,actor)))return deny();s.history.push({memberId:target.id,unitId:target.unitId!,endedAt:stamp});target.unitId=u.id;target.groupId=u.parentId;for(const t of s.transfers)if(t.memberId===target.id&&t.status==='pending')t.status='cancelled';}break;}
 case 'transfer.decide':{const t=s.transfers.find(t=>t.id===p.id&&t.status==='pending');if(!t)return deny();const dest=s.units.find(u=>u.id===t.unitId);target=s.people.find(m=>m.id===t.memberId);if(!dest||!target)return deny();if(p.decision==='cancelled'){if(t.requestedBy!==actor&&!org(s,actor))return deny();}else if(!org(s,actor)&&(t.requestedBy===actor||!has(s,actor,'group_leader',dest.parentId)))return deny();if(p.decision==='accepted'){if(!member(s,t.requestedBy,target))return deny();s.history.push({memberId:target.id,unitId:target.unitId!,endedAt:stamp});target.groupId=dest.parentId;target.unitId=dest.id;}t.status=p.decision;break;}
 case 'department.membership':{const d=s.departments.find(d=>d.id===p.departmentId);if(!d||!department(s,actor,d.id)||!target)return deny();if(![...w.directory,...w.departments.flatMap(d=>d.members)].some(m=>m.id===target!.id))return deny();if(p.operation==='add'&&target.status==='active'&&!d.members.some(m=>m.id===target!.id))d.members.push({id:target.id,name:target.name});else if(p.operation==='end')d.members=d.members.filter(m=>m.id!==target!.id);else return deny();break;}
 case 'role.appoint':case 'role.end':{const r=s.roles.find(r=>r.id===p.id);const role=c.action==='role.end'?r?.role:p.role;const who=c.action==='role.end'?r?.memberId:target?.id;if(!role||!who||who===actor)return deny();if(['department_manager','department_administrator'].includes(role)){if(!has(s,actor,'department_administrator'))return deny();}else if(role==='technical_admin'){if(!has(s,actor,'technical_admin'))return deny();}else if(!org(s,actor))return deny();if(c.action==='role.end'){if(!r||r.endedAt)return deny();r.endedAt=stamp;}else{if(!target||target.status!=='active')return deny();if(role==='unit_leader'&&target.unitId!==p.unitId)return deny();if(role==='group_leader'&&target.groupId!==p.groupId)return deny();s.roles.push({id:crypto.randomUUID(),memberId:who,role,unitId:role==='unit_leader'?p.unitId:undefined,groupId:role==='group_leader'?p.groupId:undefined,departmentId:role==='department_manager'?p.departmentId:undefined,effective:true});}break;}
 case 'organization.create':{if(p.kind==='department'){if(!has(s,actor,'department_administrator'))return deny();s.departments.push({id:crypto.randomUUID(),name:p.name,members:[]});}else{if(!org(s,actor))return deny();const item={id:crypto.randomUUID(),name:p.name,parentId:p.parentId};if(p.kind==='category')s.categories.push(item);else if(p.kind==='group'&&s.categories.some(x=>x.id===p.parentId))s.groups.push(item);else if(p.kind==='unit'&&s.groups.some(x=>x.id===p.parentId))s.units.push(item);else return deny();}break;}
 case 'profile.contacts':if(p.memberId!==actor)return deny();s.contacts[actor]={email:p.email,phone:p.phone};break;
 case 'invitation.create':throw new Error('Invitations require the verified server-side account workflow; this preview never sends email.');
 default:return deny();
 }
 s.audit.unshift({id:s.audit.length+1,at:stamp,action:c.action,memberId:target?.id??actor,reason:p.reason});return s;
}
