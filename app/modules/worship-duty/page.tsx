import {redirect} from 'next/navigation';
import Link from 'next/link';
import {requireMember} from '../../../lib/server/supabase';
import {worshipOperationalEnabled} from '../../../lib/worship-duty/activation';
import {parseModuleFeed} from '../../../lib/app-runtime';
import ConnectedWorkspace from '../../../components/worship-duty/connected-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Worship Duty · LV Zion',robots:{index:false,follow:false}};
function Notice({children}:{children:string}){
 return <main style={{maxWidth:560,margin:'40px auto',padding:24}}><Link href="/members">‹ My Week</Link><h1>Worship Duty</h1><p>{children}</p></main>;
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
