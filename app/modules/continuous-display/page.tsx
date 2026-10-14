import {notFound,redirect} from 'next/navigation';
import Link from 'next/link';
import {requireMember} from '../../../lib/server/supabase';
import {parseModuleFeed} from '../../../lib/app-runtime';
import DisplayManager from '../../../components/display-manager';
import '../../../components/display-visual.css';
import '../../../components/display-manager.css';
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
 if(!module.canManage)return <main className="cd-manage"><Link href="/members">← My Week</Link><h1>Church Display</h1><p>Your account is not granted independent display management rights.</p></main>;
 return <DisplayManager/>;
}
