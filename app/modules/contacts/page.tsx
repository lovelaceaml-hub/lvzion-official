import {notFound} from 'next/navigation';
import {requireMemberOrRedirect} from '../../../lib/server/supabase';
import {contactsReleaseEnabled} from '../../../lib/server/contacts';
import ContactsLiveWorkspace from '../../../components/contacts/live-workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Contacts | LV Zion Official',robots:{index:false,follow:false}};
export default async function Page(){
 await requireMemberOrRedirect();
 if(!contactsReleaseEnabled())notFound();
 return <ContactsLiveWorkspace/>;
}
