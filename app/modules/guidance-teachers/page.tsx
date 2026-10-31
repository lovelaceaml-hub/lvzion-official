import {redirect} from 'next/navigation';
import {requireMember} from '../../../lib/server/supabase';
import GuidanceWorkspace from '../../../components/guidance-teachers/workspace';
import '../../../styles/guidance-teachers-tokens.css';
export const dynamic='force-dynamic';
export const metadata={title:'Guidance Teachers · LV Zion',robots:{index:false,follow:false}};
export default async function Page(){
 try{await requireMember();}catch{redirect('/sign-in');}
 return <GuidanceWorkspace/>;
}
