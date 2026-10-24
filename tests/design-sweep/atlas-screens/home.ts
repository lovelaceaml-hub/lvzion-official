// Home, My Week, Apps sheet, notifications, Profile, sign in and sign up (Atlas main-*).
import {anonymous,member,unassigned,id,type AtlasScreen} from './shared';
const screens:AtlasScreen[]=[
 {name:'main-home',title:'Home',atlas:'main-home',path:'/members',wide:true,setup:p=>member(p)},
 {name:'main-apps',title:'Apps sheet',atlas:'main-apps',path:'/members',setup:p=>member(p),then:async p=>{await p.getByRole('button',{name:'Open apps'}).click();}},
 {name:'main-profile',title:'Profile',atlas:'main-profile',path:'/members/manage?tab=profile',setup:p=>member(p)},
 {name:'main-profile-unassigned',title:'Profile (unassigned)',atlas:'main-profile',path:'/members/manage?tab=profile',setup:p=>member(p,id(4,107),unassigned)},
 {name:'main-signin',title:'Sign in',atlas:'main-signin',path:'/sign-in',setup:anonymous},
 {name:'main-signup',title:'Sign up',atlas:'main-signup',path:'/sign-up',setup:anonymous},
];
export default screens;
