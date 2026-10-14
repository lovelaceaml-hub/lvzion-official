'use client';
import {useEffect,useState}from'react';
import MemberHome from '../../components/member-home';
import type{Workspace}from'../../lib/contracts';
import '../../components/members.css';
export default function Members(){
 const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  const refresh=async()=>{try{const r=await fetch('/api/members',{cache:'no-store',signal:controller.signal});
   const payload=await r.json();if(!r.ok){setData(null);throw new Error(payload.error??'Member workspace unavailable.');}
   setData(payload);setError('');
  }catch(e){if(!controller.signal.aborted){setData(null);setError(e instanceof Error?e.message:'Member workspace unavailable.');}}};
  void refresh();const onFocus=()=>{void refresh();};
  window.addEventListener('focus',onFocus);
  return()=>{controller.abort();window.removeEventListener('focus',onFocus);};
 },[]);
 if(!data)return <main className="auth-box"><h1>My Week</h1><p role="status">{error||'Loading your authorized member space…'}</p>
  {error&&<p><a href="/sign-in">Sign in</a> · <a href="/experience-preview">View fictional home preview</a></p>}</main>;
 return <MemberHome workspace={data} manageHref="/members/manage"/>;
}
