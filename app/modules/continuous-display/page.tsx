import {notFound,redirect} from 'next/navigation';
import AppHeader from '../../../components/app-header';
import {requireMember} from '../../../lib/server/supabase';
import {parseModuleFeed} from '../../../lib/app-runtime';
import DisplayManager from '../../../components/display-manager';
import {EmptyState,Glass,PageHeading} from '../../../components/ui-kit';
import {Monitor} from '../../../components/home-icons';
import '../../../components/display-visual.css';
import '../../../components/display-manager.css';
import '../../../components/display-operations.css';
export const dynamic='force-dynamic';
export const metadata={title:'Church Display · LV Zion Official'};
export default async function ChurchDisplayModule(){
 let client;
 try{client=await requireMember();}catch{redirect('/sign-in');}
 const{data,error}=await client.rpc('member_module_home');
 if(error)notFound();
 let feed;
 try{feed=parseModuleFeed(data);}catch{notFound();}
 const module=feed.modules.find(m=>m.route==='/modules/continuous-display');
 if(!module)notFound();
 if(!module.canManage)return <div className="ui-page"><AppHeader homeHref="/members"/><main className="ui-main ui-narrow">
  <PageHeading eyebrow="Church Display" title="Your displays"/>
  <Glass className="cd-state"><EmptyState icon={<Monitor/>} title="No manager access">Your account can see this app but cannot manage displays. Ask the display owner for a manager grant.</EmptyState></Glass>
 </main></div>;
 return <DisplayManager/>;
}
