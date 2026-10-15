import {redirect} from 'next/navigation';
import {requireMember} from '../../../lib/server/supabase';
import {worshipOperationalEnabled} from '../../../lib/worship-duty/activation';
import {parseModuleFeed} from '../../../lib/app-runtime';
import ConnectedWorkspace from '../../../components/worship-duty/connected-workspace';
import AppHeader from '../../../components/app-header';
export const dynamic='force-dynamic';
export const metadata={title:'Worship Duty · LV Zion',robots:{index:false,follow:false}};
function Notice({children}:{children:string}){
 return <div className="ui-page"><AppHeader homeHref="/members"/><main className="ui-main ui-narrow"><h1 className="ui-title">Worship Duty</h1><p className="ui-lede">{children}</p><p><a className="ui-link" href="/members">Back to My Week</a></p></main></div>;
}
export default async function Page(){
 let client;
 try{client=await requireMember();}catch{redirect('/sign-in');}
 if(!worshipOperationalEnabled(process.env))return <Notice>Worship Duty is not activated. Your existing assignments are unchanged.</Notice>;
 const {data,error}=await client.rpc('member_module_home');
 if(error)return <Notice>Unable to verify module access. Please sign in again.</Notice>;
 try{
  if(!parseModuleFeed(data).modules.some(m=>m.route==='/modules/worship-duty'))return <Notice>Access to this module has not been assigned to your member account.</Notice>;
 }catch{return <Notice>Module access could not be verified.</Notice>;}
 const setup=await client.rpc('worship_setup_workspace');
 return <ConnectedWorkspace canSetup={!setup.error}/>;
}
