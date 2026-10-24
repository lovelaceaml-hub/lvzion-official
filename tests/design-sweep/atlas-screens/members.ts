// Members and organization (Atlas organization-*).
import {member,manager,type AtlasScreen} from './shared';
const screens:AtlasScreen[]=[
 {name:'organization-members',title:'Members (manager)',atlas:'organization-members',path:'/members/manage',setup:p=>member(p,manager)},
 {name:'organization-manage',title:'Organization manage tab',atlas:'organization-placement',path:'/members/manage?tab=manage',setup:p=>member(p,manager)},
];
export default screens;
