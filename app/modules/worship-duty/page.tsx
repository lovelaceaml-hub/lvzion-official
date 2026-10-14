import {redirect} from 'next/navigation';
import {requireMember} from '../../../lib/server/supabase';
export const dynamic='force-dynamic';
export const metadata={title:'Worship Duty · LV Zion',robots:{index:false,follow:false}};
export default async function Page(){
 let authenticated=false;
 try {await requireMember();authenticated=true;}catch{}
 if(!authenticated)redirect('/sign-in');
 return <main style={{maxWidth:560,margin:'48px auto',padding:24}}><a href="/members">‹ My Week</a><h1>Worship Duty</h1><h2>Not activated</h2><p>The integrated application is in verification. There is no live schedule or member import in this review release.</p><p>Activation requires the reviewed database migration, an accountable department owner, scoped access grants and verified hosted account tests. This route cannot be enabled by a browser role selector.</p><a href="/worship-duty-preview">Review the fictional mobile prototype</a></main>;
}
