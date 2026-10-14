import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {requireMember} from '../../../lib/server/supabase';
import {parseModuleFeed} from '../../../lib/app-runtime';
export const dynamic='force-dynamic';
export default async function MorningPrayer(){
 let client;try{client=await requireMember();}catch{redirect('/sign-in');}
 const {data,error}=await client.rpc('member_module_home');if(error)notFound();
 let feed;try{feed=parseModuleFeed(data);}catch{notFound();}
 if(!feed.modules.some(m=>m.route==='/modules/work-mission-prayer'))notFound();
 return <main style={{maxWidth:650,margin:'auto',padding:28,fontFamily:'Arial,sans-serif'}}><Link href="/members">‹ LV Zion Home</Link><h1>Work Mission · Morning Prayer</h1><h2>Not activated</h2><p>Gathering schedules, daily readings, PWP activities and hosting requests are in development. No real member schedule, source material or meeting credentials are exposed here.</p></main>;
}
