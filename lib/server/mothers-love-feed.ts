import 'server-only';
import {latestRecognition,MOTHERS_LOVE_FEED_URL} from '../continuous-display/mothers-love';
import type {DisplayMothersLove} from '../continuous-display/live-contract';
// One shared read every 10 seconds per server instance, and only while a Mother's Love slide is published.
let cached:{at:number;value:DisplayMothersLove}|null=null;
export async function latestMothersLove(now=Date.now()):Promise<DisplayMothersLove|null>{
 if(cached&&now-cached.at<10000)return cached.value;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
 try{
  const r=await fetch(MOTHERS_LOVE_FEED_URL,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('Mother\'s Love feed unavailable');
  const value=latestRecognition(await r.json());
  cached={at:now,value};return value;
 }catch{return cached?.value??null;}
 finally{clearTimeout(timer);}
}
