import{notFound,redirect}from'next/navigation';
import{requireMember}from'../../../lib/server/supabase';
import{parseModuleFeed}from'../../../lib/app-runtime';
import Link from'next/link';
export const dynamic='force-dynamic';
export default async function AuthorizedModuleLanding({params}:{params:Promise<{key:string}>}){
 const{key}=await params;if(!/^[a-z][a-z0-9-]{2,48}$/.test(key))notFound();
 let client;
 try{client=await requireMember();}catch{redirect('/sign-in');}
 const{data,error}=await client.rpc('member_module_home');
 if(error)notFound();
 let feed;
 try{feed=parseModuleFeed(data);}catch{notFound();}
 const module=feed.modules.find(m=>m.route===('/modules/'+key));
 if(!module)notFound();
 return <main style={{minHeight:'100dvh',padding:'30px 22px',maxWidth:670,margin:'auto',background:'#f6f8f5',color:'#244b42',fontFamily:'Arial,sans-serif'}}>
  <Link href="/members" style={{color:'#306f63',fontSize:13}}>← LV Zion Home</Link>
  <p style={{letterSpacing:2,fontSize:11,marginTop:36}}>AUTHORIZED MODULE LANDING</p>
  <h1 style={{font:'38px Georgia,serif'}}>{module.name}</h1>
  <p style={{color:'#6b8179',lineHeight:1.6}}>{module.description||'Module description is not available.'}</p>
  <section style={{padding:24,borderRadius:18,background:'#fff',border:'1px solid #dbe8de'}}>
   <strong>Module integration pending</strong>
   <p style={{lineHeight:1.6,fontSize:14}}>The app is explicitly assigned to your account, but its individual functions have not yet been implemented in this shared platform. No personal records are displayed here.</p>
  </section>
 </main>;
}
