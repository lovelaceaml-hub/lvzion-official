import {redirect,notFound} from 'next/navigation';
import {requireMember} from '../../../../lib/server/supabase';
import {worshipOperationalEnabled} from '../../../../lib/worship-duty/activation';
import {parseSetupState} from '../../../../lib/worship-duty/setup-contract';
import SetupWorkspace from '../../../../components/worship-duty/setup-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Worship Duty setup | LV Zion',robots:{index:false,follow:false}};
export default async function Page(){
 let client;try{client=await requireMember();}catch{redirect('/sign-in');}
 if(!worshipOperationalEnabled(process.env))notFound();
 const r=await client.rpc('worship_setup_workspace');if(r.error)notFound();
 try{parseSetupState(r.data);}catch{notFound();}
 return <SetupWorkspace/>;
}
