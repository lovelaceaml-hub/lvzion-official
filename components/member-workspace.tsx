'use client';
/**
 * Member workspace in the Liquid Opal material (Atlas main-week, organization-members,
 * organization-placement, organization-departments, organization-access and main-profile).
 * Tabs: My Week, My Group, Manage (leaders only) and Profile. Manage is split into the
 * Atlas areas the signed-in person is authorized for. Content is real data or an empty state.
 */
import {useEffect,useMemo,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {Action,Command,Person,Workspace} from '../lib/contracts';
import './members.css';
import {FrameControls} from './app-frame';
import {useSwipeTabs} from '../lib/use-swipe-tabs';
import OnboardingPanel from './onboarding-panel';
import type {InvitationInput} from './onboarding-panel';
import OrganizationPanel from './organization-panel';
import PlacementPicker from './placement-picker';
import LeadershipForm from './leadership-form';
import {unitPath} from '../lib/organization';
import {canManage,formatDay,localDay,weekDays} from '../lib/member-experience';
import type {MemberActivity} from '../lib/member-experience';
import {emptyModuleFeed,parseModuleFeed} from '../lib/app-runtime';
import type {ModuleFeed} from '../lib/app-runtime';
import {postJson} from '../lib/post-json';
import {DateStrip,EmptyState,Glass,IconBox,PageHeading,QuickGrid,Row,SearchField,SectionHeader,Segmented,Tag,TextAction,initialsOf} from './ui-kit';
import {CalendarDays,ChevronRight,ClipboardList,Contrast,FileText,MapPin,ShieldCheck,Sun,UsersRound} from './home-icons';

type Props={data:Workspace;execute:(command:Command)=>Promise<void>;demo?:boolean;invite?:(p:InvitationInput)=>Promise<void>};
type Tab='week'|'people'|'manage'|'profile';
type View='members'|'placement'|'departments'|'access';
type Circle='group'|'departments'|'unassigned';

const roleName=(role:string)=>role.replaceAll('_',' ');
const plural=(n:number,one:string,many:string)=>n+' '+(n===1?one:many);
function displayTime(time:string){const [h,m]=time.split(':').map(Number);return {clock:((h+11)%12+1)+':'+String(m).padStart(2,'0'),half:h>=12?'PM':'AM'};}
const longDay=(day:string)=>formatDay(day,{weekday:'long',month:'long',day:'numeric'});
/** "Group · Unit" for a placement, as on Home; the full path stays in forms and the editor. */
function shortPlace(w:Workspace,unitId?:string|null,groupId?:string|null){
 const unit=w.units.find(u=>u.id===unitId),group=w.groups.find(g=>g.id===(unit?.parentId??groupId));
 return [group?.name,unit?.name].filter(Boolean).join(' · ')||'Unassigned';
}
const viewCopy:Record<View,{title:string;lede:string}>={
 members:{title:'Manage with care.',lede:'Visibility follows the access you were granted.'},
 placement:{title:'Find the right place.',lede:'Verify each member before placing them.'},
 departments:{title:'Departments',lede:'Teams you are authorized to look after.'},
 access:{title:'Access review',lede:'Verify each person before deciding on access.'},
};

export default function MemberWorkspace({data:w,execute,demo=false,invite}:Props){
 const [tab,setTab]=useState<Tab>('week');const [selected,setSelected]=useState<Person|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const [search,setSearch]=useState('');const [memberSearch,setMemberSearch]=useState('');const [circle,setCircle]=useState<Circle>('group');
 const [view,setView]=useState<View|null>(null);const [contactsOpen,setContactsOpen]=useState(false);
 const [feed,setFeed]=useState<ModuleFeed>(emptyModuleFeed);
 const today=useMemo(()=>localDay(),[]);const [day,setDay]=useState(today);
 const commandRetry=useRef<{body:string;id:string}|null>(null);
 const manage=canManage(w);const perms=w.permissions;
 const dialog=useRef<HTMLDialogElement>(null);useEffect(()=>{if(selected)dialog.current?.showModal();},[selected]);
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const requested=params.get('tab');const area=params.get('view');
  if(requested&&['week','people','manage','profile'].includes(requested))setTab(requested as Tab);else if(manage&&window.location.pathname==='/members/manage')setTab('manage');
  if(area&&['members','placement','departments','access'].includes(area))setView(area as View);},[manage]);
 // The week shows the same authorized module activities as Home; previews have none.
 useEffect(()=>{if(demo)return;const controller=new AbortController();
  fetch('/api/members/experience',{cache:'no-store',signal:controller.signal}).then(async r=>{if(r.ok)setFeed(parseModuleFeed(await r.json()));}).catch(()=>{});
  return()=>controller.abort();},[demo]);
 async function send(action:Action,payload:Record<string,string>){const body=JSON.stringify({action,payload});if(commandRetry.current?.body!==body)commandRetry.current={body,id:crypto.randomUUID()};setBusy(true);setMessage('');try{await execute({action,payload,requestId:commandRetry.current.id});commandRetry.current=null;setMessage(demo?'Fictional change saved for this session.':'Change saved.');setSelected(null);}catch(e){setMessage(e instanceof Error?e.message:'Change failed.');}finally{setBusy(false);}}
 function submit(e:React.FormEvent<HTMLFormElement>,action:Action,extra:Record<string,string>={}){e.preventDefault();void send(action,{...Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>,...extra});}
 const placement=shortPlace(w,w.self.unitId,w.self.groupId);const groupName=w.groups.find(g=>g.id===w.self.groupId)?.name;
 const candidates=[...new Map([...w.directory,...w.managedMembers,...w.departments.flatMap(d=>d.members)].map(m=>[m.id,m])).values()];
 const managedDepartments=w.departments.filter(d=>d.canManage);
 const views=([
  ['members','Members',<UsersRound key="i"/>,perms.memberManagement||perms.organization],
  ['placement','Placement',<MapPin key="i"/>,perms.organization||w.transfers.length>0],
  ['departments','Departments',<ClipboardList key="i"/>,perms.departmentAdmin||managedDepartments.length>0],
  ['access','Access',<ShieldCheck key="i"/>,perms.organization||perms.memberManagement||perms.technical],
 ] as const).filter(v=>v[3]);
 const area:View=views.some(v=>v[0]===view)?view!:(views[0]?.[0]??'members');
 const tabKeys:Tab[]=['week','people',...(manage?['manage' as const]:[]),'profile'];
 const go=(next:Tab)=>{setTab(next);setMessage('');};
 const swipe=useSwipeTabs(tabKeys,tab,go);
 const openPlacement=()=>{setTab('manage');setView('placement');setMessage('');window.scrollTo({top:0});};

 // My Week: this week's days and the selected day's authorized activities.
 const days=weekDays(today);
 const activities=useMemo(()=>feed.activities.slice().sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime)),[feed.activities]);
 const dayItems=activities.filter(a=>a.date===day);const weekCount=activities.filter(a=>days.includes(a.date)).length;
 const routeFor=(a:MemberActivity)=>feed.modules.find(m=>m.id===a.moduleId)?.route;

 // My Group: directory, departments and (for organization leaders) unassigned signups.
 const circles=([['group','My group'],...(w.departments.length?[['departments','Departments']]:[]),...(perms.organization?[['unassigned','Unassigned']]:[])] as [Circle,string][]);
 const query=search.trim().toLowerCase();const matches=(name:string)=>name.toLowerCase().includes(query);
 const managedById=new Map(w.managedMembers.map(m=>[m.id,m]));
 const personRow=(p:Person,detail?:ReactNode,end?:ReactNode)=>{const editable=managedById.get(p.id);
  return <li key={p.id}><Row lead={<IconBox>{initialsOf(p.name)}</IconBox>} title={p.name} detail={detail??(editable?.unitId?w.units.find(u=>u.id===editable.unitId)?.name:undefined)} end={p.id===w.self.id?<Tag>You</Tag>:end} onClick={editable?()=>setSelected(editable):undefined}/></li>;};

 const statusTag=(p:Person)=>p.status==='inactive'?<Tag>Inactive</Tag>:p.status==='intake'?<Tag tone="warning">Unassigned</Tag>:null;
 const audit=<Glass className="member-card member-audit" aria-labelledby="member-audit-title">
  <SectionHeader id="member-audit-title" title="Recent authorized changes" note={w.audit.length?plural(w.audit.length,'entry','entries'):undefined}/>
  {w.audit.length?<ul className="ui-list">{w.audit.map(e=><li className="audit-row" key={e.id}><IconBox><FileText size={20}/></IconBox><span className="ui-row-body"><strong>{e.action.replaceAll('.',' / ')}</strong><small>{e.reason}</small><small>{new Date(e.at).toLocaleString()}</small></span></li>)}</ul>
   :<p className="member-quiet">No changes recorded in your authorized view.</p>}
 </Glass>;

 const heading=tab==='week'?{eyebrow:longDay(today),title:`Hello, ${w.self.name.split(' ')[0]}.`,lede:placement}
  :tab==='people'?{eyebrow:'Your community',title:'Member directory',lede:groupName?`Names only · ${groupName}`:'Names only. Contact details stay private.'}
  :tab==='manage'?{eyebrow:'Your responsibilities',...viewCopy[area]}
  :{eyebrow:'Your account',title:'My profile',lede:'Your details and your place in the community.'};

 return <main className="members-app" {...swipe}><FrameControls name={w.self.name} module={tab==='profile'?null:'members'} title={tab==='profile'?'Profile':'Members'} left={{label:'My Group',icon:'people',onClick:()=>go('people'),active:tab==='people'}} right={{label:'Profile',icon:'user',onClick:()=>go('profile'),active:tab==='profile'}} more={manage?[{label:'Manage',icon:'people',onClick:()=>go('manage')}]:[]}/>
 {demo&&<a className="demo-experience-link" href="/experience-preview">Explore the next-generation Home and My Week experience →</a>}
 {demo&&<p className="demo-note">Fictional preview · Changes stay in this page session · Not a real login</p>}
 <PageHeading eyebrow={heading.eyebrow} title={heading.title} lede={heading.lede}/>
 <nav className="member-tabs ui-segmented" aria-label="Member navigation">{([['week','My Week'],['people','My Group'],...(manage?[['manage','Manage']]:[]),['profile','Profile']] as [Tab,string][]).map(([key,label])=><button type="button" key={key} aria-current={tab===key?'page':undefined} onClick={()=>go(key)}>{label}</button>)}</nav>
 {message&&<p role="status" className="ui-notice member-message">{message}</p>}

 {tab==='week'&&<div className="member-view">
  <DateStrip label="Days this week" days={days.map(d=>{const count=activities.filter(a=>a.date===d).length;
   return {key:d,top:formatDay(d,{weekday:'short'}),day:Number(d.slice(-2)),bottom:count?<i className="member-dot" aria-hidden="true"/>:d===today?'Today':formatDay(d,{month:'short'}),
    label:'Select '+longDay(d)+(count?', '+plural(count,'activity','activities'):''),selected:d===day,onClick:()=>setDay(d)};})}/>
  <SectionHeader title={longDay(day)} action={day===today?<TextAction href="/members">Calendar</TextAction>:<TextAction onClick={()=>setDay(today)}>Today</TextAction>}/>
  <Glass className="member-agenda">
   {dayItems.length?<ol className="ui-timeline">{dayItems.map(a=>{const t=displayTime(a.startTime),route=routeFor(a);const inner=<>
    <span className="ui-timeline-time">{t.clock}<small>{t.half}</small></span><span className="ui-timeline-mark" aria-hidden="true"/>
    <span className="ui-timeline-body"><strong>{a.title}</strong><small>{[a.context,a.location].filter(Boolean).join(' · ')}</small></span></>;
    return <li key={a.id}>{route?<a className="ui-timeline-row" href={route}>{inner}</a>:<div className="ui-timeline-row">{inner}</div>}</li>;})}</ol>
   :<EmptyState icon={<CalendarDays/>} title={day===today?'Nothing scheduled today':'Nothing scheduled'}>Activities from the apps you are assigned to appear here.</EmptyState>}
  </Glass>
  <Glass tight className="member-note"><Row lead={<IconBox round><Sun size={22}/></IconBox>} title={weekCount?'This week':'Space for what matters'} detail={weekCount?plural(weekCount,'activity is','activities are')+' scheduled this week.':'Nothing is scheduled for you this week.'}/></Glass>
 </div>}

 {tab==='people'&&<div className="member-view">
  <SearchField label="Find a name" placeholder="Search your group" value={search} onChange={e=>setSearch(e.target.value)}/>
  {circles.length>1&&<Segmented label="Directory view" options={circles} value={circle} onChange={setCircle}/>}
  {circle==='group'&&<Glass tight as="section" aria-label="Your group directory"><ul className="ui-list name-list">{w.directory.filter(p=>matches(p.name)).map(p=>personRow(p))}</ul>
   {!w.directory.some(p=>matches(p.name))&&<EmptyState icon={<UsersRound/>} title={query?'No matching names':'No names yet'}>{query?'Try another spelling.':'Members appear here once they are placed in your group.'}</EmptyState>}</Glass>}
  {circle==='departments'&&w.departments.map(d=><Glass tight as="section" key={d.id} aria-label={d.name} className="member-circle"><SectionHeader level={3} title={d.name} note={plural(d.members.length,'member','members')}/>
   <ul className="ui-list">{d.members.filter(p=>matches(p.name)).map(p=>personRow(p))}</ul></Glass>)}
  {circle==='unassigned'&&<Glass tight as="section" aria-label="Unassigned signups">{(w.unassignedMembers??[]).filter(m=>matches(m.name)).length?<ul className="ui-list">{(w.unassignedMembers??[]).filter(m=>matches(m.name)).map(m=><li key={m.id}><Row lead={<IconBox>{initialsOf(m.name)}</IconBox>} title={m.name} detail="Unassigned · awaiting verification" end={<Tag>Review</Tag>}/></li>)}</ul>
   :<EmptyState icon={<UsersRound/>} title="No members are waiting">New signups appear here after they confirm their email.</EmptyState>}</Glass>}
  {manage&&views.some(v=>v[0]==='placement')&&<button type="button" className="ui-button ui-button-secondary ui-button-block member-cta" onClick={openPlacement}>View placement workspace<ChevronRight size={20}/></button>}
 </div>}

 {tab==='manage'&&<div className="member-view">
  {views.length>1&&<QuickGrid label="Management areas" items={views.map(([key,label,icon])=>({key,label,icon,current:area===key,onClick:()=>{setView(key);setMessage('');}}))}/>}
  {area==='members'&&<>
   {perms.memberManagement&&<section className="member-card member-directory" aria-labelledby="members-managed-title">
    <SectionHeader id="members-managed-title" title="Members you manage" note={`${w.managedMembers.length} authorized`}/>
    <SearchField label="Find a member" placeholder="Find a member" value={memberSearch} onChange={e=>setMemberSearch(e.target.value)}/>
    <div className="ui-glass ui-glass-tight"><ul className="ui-list name-list">{w.managedMembers.filter(p=>p.name.toLowerCase().includes(memberSearch.trim().toLowerCase())).map(p=><li key={p.id}><Row className="member-row" lead={<IconBox>{initialsOf(p.name)}</IconBox>} title={p.name} detail={shortPlace(w,p.unitId,p.groupId)} end={statusTag(p)} onClick={()=>setSelected(p)}/></li>)}</ul>
     {!w.managedMembers.length&&<EmptyState icon={<UsersRound/>} title="No members in your scope">Members you are authorized to manage appear here.</EmptyState>}
     <details className="member-disclosure"><summary>{demo?'Add a fictional member':'Add a member record'}</summary><form onSubmit={e=>submit(e,'member.create')}><label>Name<input name="name" required minLength={2} maxLength={120}/></label><PlacementPicker data={w} manageableOnly unitLabel="Primary unit"/><Reason/><button disabled={busy||!w.units.some(u=>u.canManage)}>Create member record</button><p className="fine-print">Creates a person and primary placement, not a login account.</p></form></details>
    </div>
    {views.some(v=>v[0]==='placement')&&<button type="button" className="ui-button ui-button-secondary ui-button-block member-cta" onClick={openPlacement}>View placement workspace<ChevronRight size={20}/></button>}
   </section>}
   {perms.organization&&<Glass className="member-card" aria-labelledby="members-leadership-title"><SectionHeader id="members-leadership-title" title="Organizational leadership"/>
    <details className="member-disclosure"><summary>Appoint organizational leadership</summary><LeadershipForm data={w} busy={busy} onSubmit={e=>submit(e,'role.appoint')}/></details>
    <details className="member-disclosure"><summary>End an appointment</summary><form onSubmit={e=>submit(e,'role.end')}><label>Active appointment<select name="id">{w.appointments.filter(r=>!r.endedAt&&r.memberId!==w.self.id&&!r.departmentId&&r.role!=='technical_admin').map(r=><option key={r.id} value={r.id}>{w.managedMembers.find(p=>p.id===r.memberId)?.name??'Member'} · {roleName(r.role)}</option>)}</select></label><Reason/><button disabled={busy}>End appointment</button></form></details>
   </Glass>}
  </>}
  {area==='placement'&&<>
   <OnboardingPanel view="placement" data={w} execute={execute} demo={demo} invite={invite??(async()=>{throw new Error('Invitation delivery unavailable.');})}/>
   {!!w.transfers.length&&<Glass className="member-card" aria-labelledby="members-transfers-title"><SectionHeader id="members-transfers-title" title="Transfers needing attention" note={plural(w.transfers.length,'request','requests')}/>{w.transfers.map(t=><form className="sub-card" key={t.id} onSubmit={e=>submit(e,'transfer.decide',{id:t.id})}><Row lead={<IconBox>{initialsOf(t.name)}</IconBox>} title={t.name} detail={'Destination: '+unitPath(w,t.unitId)} end={<Tag tone="warning">{t.status}</Tag>}/><label>Decision<select name="decision">{t.canDecide&&<><option value="accepted">Accept into receiving group</option><option value="rejected">Reject request</option></>}{t.requestedBy===w.self.id&&<option value="cancelled">Cancel my request</option>}</select></label><Reason/><button disabled={busy||(!t.canDecide&&t.requestedBy!==w.self.id)}>Record decision</button></form>)}</Glass>}
   <OrganizationPanel data={w} execute={execute}/>
  </>}
  {area==='departments'&&<>
   {managedDepartments.map(d=><DepartmentCard key={d.id} name={d.name} id={d.id} members={d.members}>
    <details className="member-disclosure"><summary>Change membership</summary><form onSubmit={e=>submit(e,'department.membership',{departmentId:d.id})}><label>Visible member<select name="memberId">{candidates.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Change<select name="operation"><option value="add">Add membership</option><option value="end">End membership</option></select></label><Reason/><button disabled={busy}>Update department</button></form></details>
   </DepartmentCard>)}
   <OnboardingPanel view="departments" data={w} execute={execute} demo={demo} invite={invite??(async()=>{throw new Error('Invitation delivery unavailable.');})}/>
  </>}
  {area==='access'&&<>
   <OnboardingPanel view="access" data={w} execute={execute} demo={demo} invite={invite??(async()=>{throw new Error('Invitation delivery unavailable.');})}/>
   {perms.technical&&<Glass className="member-card member-callout" aria-labelledby="members-technical-title"><ShieldCheck size={24}/><div><h2 id="members-technical-title">Technical administration</h2><p>Your technical appointment does not grant access to church member management or department records. A separate scoped appointment is required.</p></div></Glass>}
  </>}
  {audit}
 </div>}

 {tab==='profile'&&<div className="member-view">
  <Glass className="member-identity"><span className="member-avatar" aria-hidden="true">{initialsOf(w.self.name)}</span><h2>{w.self.name}</h2><p>{placement}</p><Tag>{w.self.status==='inactive'?'Inactive member':'Active member'}</Tag></Glass>
  <Glass tight><ul className="ui-list">
   <li><Row lead={<IconBox><MapPin size={22}/></IconBox>} title="My placement" detail={w.self.unitId?unitPath(w,w.self.unitId).replaceAll(' / ',' · '):placement}/></li>
   <li><button type="button" className="ui-row" aria-expanded={contactsOpen} aria-controls="member-contacts" onClick={()=>setContactsOpen(!contactsOpen)}><IconBox><FileText size={22}/></IconBox><span className="ui-row-body"><strong>Contact information</strong><small>{[w.contacts.email,w.contacts.phone].filter(Boolean).join(' · ')||'Add your own private contact details'}</small></span><ChevronRight size={18} className={contactsOpen?'member-chevron-open':undefined}/></button></li>
   <li><Row href="/appearance" lead={<IconBox><Contrast size={22}/></IconBox>} title="Appearance" detail="Light, dark or match this device"/></li>
  </ul></Glass>
  {contactsOpen&&<Glass id="member-contacts" className="member-card" aria-labelledby="member-contacts-title"><SectionHeader id="member-contacts-title" title="Contact information"/><form onSubmit={e=>submit(e,'profile.contacts',{memberId:w.self.id})}><label>Personal email<input type="email" name="email" maxLength={254} defaultValue={w.contacts.email??''}/></label><label>Phone<input type="tel" name="phone" maxLength={30} defaultValue={w.contacts.phone??''}/></label><Reason/><button disabled={busy}>Save my contact details</button><p className="fine-print">These are private profile contacts. This does not change your verified sign-in email.</p></form></Glass>}
  <Glass tight aria-labelledby="member-roles-title" as="section" className="member-roles"><SectionHeader id="member-roles-title" title="Roles and departments"/>
   <ul className="ui-list">
    {w.departments.map(d=><li key={d.id}><Row lead={<IconBox><ClipboardList size={22}/></IconBox>} title={d.name} detail="Department" end={<Tag>{d.canManage?'Management assigned':'Member'}</Tag>}/></li>)}
    {w.appointments.filter(r=>r.memberId===w.self.id&&!r.endedAt).map(r=><li key={r.id}><Row lead={<IconBox><ShieldCheck size={22}/></IconBox>} title={roleName(r.role)} detail={r.effective?'Active scope':'Outside current scope'}/></li>)}
   </ul>
   {!w.departments.length&&!w.appointments.some(r=>r.memberId===w.self.id&&!r.endedAt)&&<p className="member-quiet">No department membership or appointment assigned.</p>}
   <p className="fine-print">Appointments continue until an authorized person ends them. A group move changes effective access, not the historical appointment.</p>
  </Glass>
  {!demo&&<button type="button" className="ui-button ui-button-secondary ui-button-block member-cta" onClick={async()=>{const r=await postJson('/api/auth/sign-out',{});if(r.ok)location.assign('/sign-in');else setMessage('Sign-out failed. Please try again.');}}>Sign out</button>}
 </div>}

 {selected&&<dialog ref={dialog} onCancel={()=>setSelected(null)} aria-label="Manage member" className="ui-sheet member-dialog" data-no-swipe><div className="ui-sheet-body">
  <div className="member-dialog-head"><IconBox>{initialsOf(selected.name)}</IconBox><div><h2>{selected.name}</h2><p>{unitPath(w,selected.unitId)}</p></div><button type="button" className="ui-button ui-button-secondary" onClick={()=>setSelected(null)} aria-label="Close member editor">Close</button></div>
  <div className="ui-glass"><form onSubmit={e=>submit(e,'member.rename',{memberId:selected.id})}><label>Official display name<input name="name" defaultValue={selected.name} required minLength={2} maxLength={120}/></label><Reason/><button disabled={busy}>Save name</button></form></div>
  {selected.status!=='intake'&&<details className="member-disclosure ui-glass"><summary>Change primary placement</summary><form onSubmit={e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string,string>;const dest=w.units.find(u=>u.id===p.unitId);void send(dest?.parentId!==selected.groupId&&!perms.organization?'transfer.request':'member.move',{...p,memberId:selected.id});}}><PlacementPicker data={w} excludeUnitId={selected.unitId} unitLabel="Destination unit"/><Reason/><button disabled={busy}>Submit placement change</button><p className="fine-print">Cross-group moves need receiving-group acceptance unless a separately authorized administrator transfers directly.</p></form></details>}
  {perms.organization&&selected.status!=='intake'&&selected.id!==w.self.id&&<details className="member-disclosure ui-glass"><summary>Change active status</summary><form onSubmit={e=>submit(e,'member.status',{memberId:selected.id,status:selected.status==='active'?'inactive':'active'})}><Reason/><button disabled={busy}>{selected.status==='active'?'Make inactive':'Reactivate'}</button><p className="fine-print">History is retained. Suspended sessions do not regain access after reactivation; a fresh sign-in is required.</p></form></details>}
 </div></dialog>}
 <footer className="member-footer">LV Zion Official · {demo?'Synthetic records only':'Permission-scoped member workspace'}</footer></main>;
}
/** Atlas organization-departments card: icon, name, real member count, permission tag and a secondary pill that opens the members. */
function DepartmentCard({id,name,members,children}:{id:string;name:string;members:Person[];children:ReactNode}){
 const [open,setOpen]=useState(false);
 return <Glass className="member-card member-department" aria-labelledby={'dept-'+id}>
  <IconBox><ClipboardList size={26}/></IconBox>
  <h2 id={'dept-'+id}>{name}</h2><p className="member-quiet">{plural(members.length,'member','members')}</p><Tag>Independent department permission</Tag>
  <button type="button" className="ui-button ui-button-secondary member-toggle" aria-expanded={open} aria-controls={'dept-body-'+id} onClick={()=>setOpen(!open)}>{open?'Hide members':'View members'}<ChevronRight size={20} className={open?'member-chevron-open':undefined}/></button>
  {open&&<div className="member-department-body" id={'dept-body-'+id}>{members.length?<ul className="ui-list">{members.map(m=><li key={m.id}><Row lead={<IconBox>{initialsOf(m.name)}</IconBox>} title={m.name}/></li>)}</ul>:<p className="member-quiet">No members yet.</p>}{children}</div>}
 </Glass>;
}
function Reason(){return <label>Reason for this change<input name="reason" required minLength={5} maxLength={500} placeholder="Explain what changed and why"/></label>;}
