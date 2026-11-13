import ConcertWorkspace from '../../../components/concert/workspace';
// Access is enforced by /api/concert (session, approved module, manager checks in SQL); the page
// itself holds no data, so a signed-out visitor sees a sign-in prompt from the workspace.
export const metadata={title:'Healing Concert · LV Zion',robots:{index:false,follow:false}};
export default function Page(){return <ConcertWorkspace/>;}
