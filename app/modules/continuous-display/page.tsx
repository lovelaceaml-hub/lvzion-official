import {notFound,redirect} from 'next/navigation';
import AppHeader from '../../../components/app-header';
import {requireMember} from '../../../lib/server/supabase';
import {parseModuleFeed} from '../../../lib/app-runtime';
import DisplayManager from '../../../components/display-manager';
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
 if(!module.canManage)return <div className="ui-page"><AppHeader homeHref="/members"/><main className="ui-main ui-narrow"><h1 className="ui-title">Church Display</h1><p className="ui-lede">Your account can see this app but cannot manage displays. Ask the display owner for a manager grant.</p></main></div>;
 return <DisplayManager/>;
}
