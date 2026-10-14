import {notFound,redirect} from 'next/navigation';
import {requireMember} from '../../../lib/server/supabase';
import {parseModuleFeed} from '../../../lib/app-runtime';
import MorningPrayerLive from '../../../components/morning-prayer/MorningPrayerLive';
export const dynamic='force-dynamic';
export const metadata={title:'Morning Prayer · LV Zion Official',robots:{index:false,follow:false}};
export default async function Page(){
 let client;try{client=await requireMember();}catch{redirect('/sign-in');}
 const {data,error}=await client.rpc('member_module_home');
 if(error)notFound();
 try{const feed=parseModuleFeed(data);
  if(!feed.modules.some(m=>m.route==='/modules/work-mission-prayer'))notFound();
 }catch{notFound();}
 return <MorningPrayerLive/>;
}