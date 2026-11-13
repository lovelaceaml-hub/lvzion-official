import 'server-only';
import {churchToday,projectRooms,ROOMS_FEED_URL} from '../continuous-display/rooms';
import type {DisplayRooms} from '../continuous-display/live-contract';
// One shared read a minute per server instance; the lvrooms CDN also caches it for a minute.
let cached:{at:number;value:DisplayRooms}|null=null;
export async function todaysRooms(now=Date.now()):Promise<DisplayRooms|null>{
 const today=churchToday(now);
 if(cached&&now-cached.at<60000&&cached.value.date===today)return cached.value;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
 try{
  const r=await fetch(ROOMS_FEED_URL,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('Room feed unavailable');
  const value=projectRooms(await r.json(),today);
  cached={at:now,value};return value;
 }catch{
  // A stale copy from earlier today is better than an empty board; otherwise the slide shows its quiet state.
  return cached&&cached.value.date===today&&now-cached.at<15*60000?cached.value:null;
 }finally{clearTimeout(timer);}
}
