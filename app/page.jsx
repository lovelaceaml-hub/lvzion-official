import {redirect} from 'next/navigation';
import {requireMember} from '../lib/server/supabase';
export const dynamic='force-dynamic';
export default async function Home(){
 let signedIn=false;
 try{await requireMember();signedIn=true;}catch{}
 redirect(signedIn?'/members':'/sign-in');
}
