import {loadSharedEvent} from '../../../lib/concert/shared-event';
import {concertPromoMedia} from '../../../lib/concert/promo-media';
import ConcertWorkspace from '../../../components/concert/workspace';
// Access is enforced by /api/concert (session, approved module, manager checks in SQL); the page
// itself holds no data, so a signed-out visitor sees a sign-in prompt from the workspace.
export const metadata={title:'Event Invitation and Registration · LV Zion',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Page() {
  const shared = await loadSharedEvent();
  return <ConcertWorkspace media={concertPromoMedia()} shared={shared.state === 'ready' ? shared : undefined}/>;
}
