import {notFound} from 'next/navigation';
import DisplayManager from '../../components/display-manager';
import '../../components/display-manager.css';
import '../../components/display-visual.css';
import '../../components/display-operations.css';
export const dynamic='force-dynamic';
export const metadata={title:'Display Operations Review · Fictional',robots:'noindex,nofollow'};
/** A disconnected, fictional-only UI fixture for browser regression testing.
 * The real management API remains authenticated; test scripts intercept it with synthetic responses.
 */
export default function DisplayOperationsReview(){
 if(process.env.VERCEL_ENV==='production')notFound();
 return <><aside className="cd-review-banner">
  DEVELOPMENT ONLY · FICTIONAL TV MANAGEMENT · NOT A CHURCH PUBLICATION
 </aside><DisplayManager/></>;
}
