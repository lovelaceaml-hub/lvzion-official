import {notFound,redirect} from 'next/navigation';
import {requireMember} from '../../../lib/server/supabase';
export const dynamic='force-dynamic';
export const metadata={title:'Contacts | LV Zion Official',robots:{index:false,follow:false}};
export default async function Page(){try{await requireMember();}catch{redirect('/sign-in');}notFound();}
