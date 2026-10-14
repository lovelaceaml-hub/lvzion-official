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
 return <><aside style={{padding:12,background:'#fff4d9',fontSize:13,fontWeight:700,textAlign:'center'}}>
  DEVELOPMENT ONLY · FICTIONAL TV MANAGEMENT · NOT A CHURCH PUBLICATION
 </aside><DisplayManager/></>;
}
