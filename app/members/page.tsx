'use client';
import {useEffect,useState}from'react';
import MemberHome from '../../components/member-home';
import type{Workspace}from'../../lib/contracts';
import '../../components/members.css';
import{emptyModuleFeed,parseModuleFeed}from'../../lib/app-runtime';
import type{ModuleFeed}from'../../lib/app-runtime';
export default function Members(){
 const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState('');
 const [experience,setExperience]=useState<ModuleFeed>(emptyModuleFeed);
 useEffect(()=>{
  const controller=new AbortController();
  const refresh=async()=>{try{const r=await fetch('/api/members',{cache:'no-store',signal:controller.signal});
   const payload=await r.json();if(!r.ok){setData(null);throw new Error(payload.error??'Member workspace unavailable.');}
   setData(payload);setError('');
   const modules=await fetch('/api/members/experience',{cache:'no-store',signal:controller.signal});
   if(modules.ok){
    try{setExperience(parseModuleFeed(await modules.json()));}catch{setExperience(emptyModuleFeed());}
   }else setExperience(emptyModuleFeed());
  }catch(e){if(!controller.signal.aborted){setData(null);setError(e instanceof Error?e.message:'Member workspace unavailable.');}}};
  void refresh();const onFocus=()=>{void refresh();};
  window.addEventListener('focus',onFocus);
  return()=>{controller.abort();window.removeEventListener('focus',onFocus);};
 },[]);
 if(!data)return <main className="auth-box"><h1>My Week</h1><p role="status">{error||'Loading your authorized member space…'}</p>
  {error&&<p><a href="/sign-in">Sign in</a> · <a href="/experience-preview">View fictional home preview</a></p>}</main>;
 return <MemberHome workspace={data} manageHref="/members/manage" experience={experience}
 onFavoriteUpdate={async(moduleIds,expectedVersion)=>{
  const response=await fetch('/api/members/experience/favorites',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({moduleIds,expectedVersion})});
  if(!response.ok)throw new Error('Favorites could not be updated.');
  const result=await response.json();
  setExperience(current=>({...current,favorites:result.favorites,favoriteVersion:result.favoriteVersion}));
  return result;
 }}
 onModuleNoticeRead={async noticeId=>{
  const response=await fetch('/api/members/experience/notices',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({noticeId})});
  if(!response.ok)throw new Error('Notification update failed.');
  setExperience(current=>({...current,notifications:current.notifications.map(n=>n.id===noticeId?{...n,readAt:new Date().toISOString()}:n)}));
 }}/>;

}
