// Contacts (Atlas contacts-*).
import {member,type AtlasScreen} from './shared';
const screens:AtlasScreen[]=[
 {name:'contacts-list',title:'Contacts list (empty)',atlas:'contacts-list',path:'/modules/contacts',onHarness:true,setup:async p=>{await member(p);await p.route('**/api/contacts/workspace',r=>r.fulfill({json:{memberId:'fictional-owner',contacts:[],nextCursor:null}}));await p.route('**/api/contacts/agenda',r=>r.fulfill({json:[]}));}},
];
export default screens;
