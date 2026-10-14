import {notFound} from 'next/navigation';
import ContactsPreview from '../../components/contacts/preview';
export const dynamic='force-dynamic';
export const metadata={title:'Contacts preview | LV Zion Official',robots:{index:false,follow:false}};
export default function Page(){if(process.env.VERCEL_ENV==='production')notFound();return <ContactsPreview/>;}
