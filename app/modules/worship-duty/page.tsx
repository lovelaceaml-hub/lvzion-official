import {redirect} from 'next/navigation';
import {requireMember} from '../../../lib/server/supabase';
import {reviewEnabled} from '../../../lib/worship-duty/api-contract';
import ConnectedWorkspace from '../../../components/worship-duty/connected-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Worship Duty · LV Zion',robots:{index:false,follow:false}};
export default async function Page(){
 let authenticated=false;
 try{await requireMember();authenticated=true;}catch{}
 if(!authenticated)redirect('/sign-in');
 if(reviewEnabled(process.env))return <ConnectedWorkspace/>;
 return <main style={{maxWidth:560,margin:'48px auto',padding:24}}><a href="/members">‹ My Week</a><h1>Worship Duty</h1><h2>Not activated</h2><p>The authenticated application is implemented for isolated testing. No live schedule or member import has been enabled.</p><p>Activation requires the reviewed migrations, an accountable department owner, scoped grants and verified hosted account tests. A browser role selector cannot enable this route.</p><a href="/worship-duty-preview/connected">Review the fictional workflow rehearsal</a></main>;
}
