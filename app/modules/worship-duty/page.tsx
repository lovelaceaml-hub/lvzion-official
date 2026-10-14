import {redirect} from 'next/navigation';
import Link from 'next/link';
import {requireMember} from '../../../lib/server/supabase';
import {worshipOperationalEnabled} from '../../../lib/worship-duty/activation';
import {parseModuleFeed} from '../../../lib/app-runtime';
import ConnectedWorkspace from '../../../components/worship-duty/connected-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Worship Duty · LV Zion',robots:{index:false,follow:false}};
export default async function Page(){
 let client;
 try{client=await requireMember();}catch{redirect('/sign-in');}
 if(!worshipOperationalEnabled(process.env))return <main style={{maxWidth:560,margin:'40px auto',padding:24}}><Link href="/members">‹ My Week</Link><h1>Worship Duty</h1><p>Worship Duty is not activated. Your existing assignments are unchanged.</p></main>;
 const {data,error}=await client.rpc('member_module_home');
 if(error)return <main style={{padding:24}}><Link href="/members">‹ My Week</Link><h1>Worship Duty</h1><p>Unable to verify module access. Please sign in again.</p></main>;
 try{
  const feed=parseModuleFeed(data);
  if(!feed.modules.some(m=>m.route==='/modules/worship-duty'))return <main style={{maxWidth:560,margin:'40px auto',padding:24}}><Link href="/members">‹ My Week</Link><h1>Worship Duty</h1><p>Access to this module has not been assigned to your member account.</p></main>;
 }catch{return <main style={{padding:24}}><Link href="/members">‹ My Week</Link><h1>Worship Duty</h1><p>Module access could not be verified.</p></main>;}
 return <ConnectedWorkspace/>;
}
