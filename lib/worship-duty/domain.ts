// Duty catalog and service policies shared by the interface and contracts. PostgreSQL remains authoritative.
export const CATALOG = [
 {id:'presider',label:'Presider',department:'Worship'},
 {id:'opening_prayer',label:'Opening Prayer',department:'Worship'},
 {id:'thanks_prayer',label:'Thanks Prayer',department:'Worship'},
 {id:'closing_prayer',label:'Closing Prayer',department:'Worship'},
 {id:'usher_door',label:'Usher Door',department:'Usher Sisters'},
 {id:'usher_front',label:'Usher Front',department:'Usher Sisters'},
 {id:'usher_back',label:'Usher Back',department:'Usher Sisters'},
 {id:'usher_1',label:'Usher #1',department:'Usher Brothers'},
 {id:'usher_2',label:'Usher #2',department:'Usher Brothers'},
 {id:'lobby_security',label:'Lobby Security',department:'Usher Brothers'},
 {id:'lobby_1',label:'Lobby Desk #1',department:'Lobby'},
 {id:'lobby_2',label:'Lobby Desk #2',department:'Lobby'},
 {id:'translation_1',label:'Translation #1',department:'Translation'},
 {id:'translation_2',label:'Translation #2',department:'Translation'},
 {id:'media_1',label:'Media Booth #1',department:'Media'},
 {id:'media_2',label:'Media Booth #2',department:'Media'},
 {id:'parking_1',label:'Parking #1',department:'Parking Lot'},
 {id:'parking_2',label:'Parking #2',department:'Parking Lot'},
 {id:'parking_3',label:'Parking #3',department:'Parking Lot'},
 {id:'parking_4',label:'Parking #4',department:'Parking Lot'},
 {id:'parking_5',label:'Parking #5',department:'Parking Lot'},
 {id:'offering_1',label:'Offering #1',department:'Offering'},
 {id:'offering_2',label:'Offering #2',department:'Offering'},
 {id:'offering_3',label:'Offering #3',department:'Offering'},
 {id:'offering_4',label:'Offering #4',department:'Offering'},
 {id:'offering_5',label:'Offering #5',department:'Offering'},
 {id:'offering_6',label:'Offering #6',department:'Offering'}
] as const;
export type Duty = typeof CATALOG[number]['id'];
export type Department = typeof CATALOG[number]['department'];
export const PERIODS = ['Early Morning','Morning','Afternoon','Evening','Commemoration'] as const;
export type Period = typeof PERIODS[number];
export const DUTY_IDS:readonly Duty[] = CATALOG.map(x=>x.id);
export const DEPARTMENTS:Department[] = [...new Set(CATALOG.map(x=>x.department))];
export const PRAYERS:readonly Duty[] = ['thanks_prayer','closing_prayer'];
export const USHERS:readonly Duty[] = ['usher_door','usher_front','usher_back','usher_1','usher_2'];
const meta = (id:Duty)=>CATALOG.find(x=>x.id===id)!;
export const dutyLabel = (id:Duty)=>meta(id).label;
export const departmentOf = (id:Duty)=>meta(id).department;
const clean = (s:string)=>s.trim().replace(/\s+/g,' ').toLowerCase();
export const pairKey = (a:Duty,b:Duty)=>[a,b].sort().join('|');
/** Normally one duty per service; only one prayer plus one actual usher may overlap. Opening Prayer never pairs. */
export function allowedTogether(duties:readonly Duty[],approvedPairs:readonly string[]=[]):boolean {
 if(duties.some(d=>!CATALOG.some(x=>x.id===d))||new Set(duties).size!==duties.length||duties.length>2)return false;
 if(duties.length<2)return true;
 if(duties.includes('opening_prayer'))return false;
 const [a,b]=duties;
 return (PRAYERS.includes(a)&&USHERS.includes(b))||(PRAYERS.includes(b)&&USHERS.includes(a))||approvedPairs.includes(pairKey(a,b));
}
export function hasChoir(worship:string):boolean {return ['sabbath day','third day'].includes(clean(worship));}
export function hasThanks(s:{worship:string;period:string}):boolean {
 const w=clean(s.worship)||'sabbath day';
 return clean(s.period)==='morning'&&(w==='sabbath day'||!['sabbath day','third day','prayer week','preaching week'].includes(w));
}
/** Thanks Prayer and Closing Prayer only exist for some services; every other catalog duty always applies. */
export function hasDuty(s:{worship:string;period:string},d:Duty):boolean {
 if(d==='thanks_prayer')return hasThanks(s);
 if(d==='closing_prayer')return hasChoir(s.worship||'Sabbath Day');
 return CATALOG.some(x=>x.id===d);
}
