import{notFound,redirect}from'next/navigation';
import{requireMember}from'../../../lib/server/supabase';
import{parseModuleFeed}from'../../../lib/app-runtime';
import AppHeader from'../../../components/app-header';
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
 return <div className="ui-page">
  <AppHeader homeHref="/members"/>
  <main className="ui-main ui-narrow">
   <p className="ui-kicker">Authorized app</p>
   <h1 className="ui-title">{module.name}</h1>
   <p className="ui-lede">{module.description||'Module description is not available.'}</p>
   <section className="ui-notice">
    <strong>Module integration pending</strong>
    <p>The app is explicitly assigned to your account, but its individual functions have not yet been implemented in this shared platform. No personal records are displayed here.</p>
   </section>
   <a className="ui-link" href="/members">Back to Home</a>
  </main>
 </div>;
}
