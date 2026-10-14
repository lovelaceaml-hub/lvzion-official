import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { requireMember } from '../../../lib/server/supabase';
import { parseModuleFeed } from '../../../lib/app-runtime';
export const dynamic='force-dynamic';
export default async function WorkMissionPrayer(){
 let client;try{client=await requireMember();}catch{redirect('/sign-in');}
 const {data,error}=await client.rpc('member_module_home');if(error)notFound();
 let feed;try{feed=parseModuleFeed(data);}catch{notFound();}
 if(!feed.modules.some(m=>m.route==='/modules/work-mission-prayer'))notFound();
 return <main style={{maxWidth:650,margin:'auto',padding:28,fontFamily:'Arial,sans-serif'}}><Link href="/members">‹ LV Zion Home</Link><h1>Work Mission Prayer Gatherings</h1><h2>Not activated</h2><p>The gathering schedule, named permissions, protected source access and publication workflow have not been activated. No real lessons or meeting credentials are available here.</p></main>;
}
