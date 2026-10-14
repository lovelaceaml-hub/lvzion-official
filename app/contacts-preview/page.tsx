import {notFound} from 'next/navigation';
import ContactsWorkspace from '../../components/contacts/workspace-r2';
export const dynamic='force-dynamic';
export const metadata={title:'Contacts preview | LV Zion Official',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 if(process.env.VERCEL_ENV==='production')notFound();
 const p=await searchParams;const view=typeof p.view==='string'&&['shared','detail','leader'].includes(p.view)?p.view:'';
 return <ContactsWorkspace initialView={view}/>;
}
