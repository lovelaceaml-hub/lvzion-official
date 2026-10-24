'use client';
import {useCallback,useEffect,useState} from 'react';
import '../../../../components/study-rooms/group-access.css';
import {accessState,type GroupAccessData,type GroupAccessMember} from '../../../../lib/study-rooms/group-access';

async function call(options?:RequestInit):Promise<GroupAccessData>{
 const response=await fetch('/api/study-rooms/access',{...options,cache:'no-store',headers:{'content-type':'application/json'}});
 let result;
 try{result=await response.json();}catch{throw Error('The server response could not be read. Please refresh.');}
 if(!response.ok)throw Object.assign(Error(result.error??'Unavailable.'),{status:response.status});
 return result as GroupAccessData;
}

function MemberRow({member,busy,toggle}:{member:GroupAccessMember;busy:boolean;toggle:(m:GroupAccessMember)=>void}){
 const state=accessState(member);
 return <li className="ui-row sr-access-row">
  <div className="ui-row-body">
   <strong>{member.name}{member.self?' (you)':''}</strong>
   <small>{member.unit} · {state.note}</small>
  </div>
  <button type="button" role="switch" aria-checked={state.on} aria-label={`Study Rooms for ${member.name}`}
   className="sr-switch" disabled={state.fixed||busy} onClick={()=>toggle(member)}>
   <span aria-hidden="true"/>
  </button>
 </li>;
}

export default function GroupAccess(){
 const [data,setData]=useState<GroupAccessData|null>(null),[error,setError]=useState(''),[denied,setDenied]=useState<0|401|403>(0);
 const [busy,setBusy]=useState(''),[message,setMessage]=useState('');
 const load=useCallback(async()=>{
  try{setData(await call());setError('');}
  catch(e){const status=(e as {status?:number}).status;if(status===401||status===403)setDenied(status);setError((e as Error).message);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function toggle(m:GroupAccessMember){
  setBusy(m.id);setMessage('');setError('');
  try{
   setData(await call({method:'POST',body:JSON.stringify({action:m.enabled?'disable':'enable',memberId:m.id})}));
   setMessage(m.enabled?`${m.name} can no longer book study rooms.`:`${m.name} can now book study rooms.`);
  }catch(e){setError((e as Error).message);await load();}
  finally{setBusy('');}
 }

 return <div className="ui-page">
  <main className="ui-main ui-narrow">
   <a className="ui-link sr-access-back" href="/modules/study-rooms">Back to Study Rooms</a>
   <h1 className="ui-title">Who can book</h1>
   <p className="ui-lede">Every signed-in member can book. Turn booking on for members of your group who have no app account yet.</p>
   {message&&<p role="status" className="ui-notice" data-tone="success">{message}</p>}
   {error&&<p role="alert" className="ui-notice" data-tone={denied?'warning':'danger'}>{denied===401?'Sign in to manage who can book.':denied===403?'Only group leaders can change who books in their group.':error}</p>}
   {denied===401&&<a className="ui-button" href="/sign-in">Sign in</a>}
   {!data&&!error&&<p className="ui-empty">Loading your group…</p>}
   {data?.groups.map(g=><section key={g.id} aria-labelledby={'group-'+g.id}>
    <h2 className="ui-section-title" id={'group-'+g.id}>{g.name}</h2>
    {g.members.length?<ul className="ui-list">{g.members.map(m=><MemberRow key={m.id} member={m} busy={busy===m.id} toggle={m2=>{void toggle(m2);}}/>)}</ul>
     :<p className="ui-empty">No members are placed in this group yet.</p>}
   </section>)}
  </main>
 </div>;
}
