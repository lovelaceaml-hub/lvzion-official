import {isRecord,type DisplayMothersLove} from './live-contract.ts';
/**
 * The newest published recognition in the public Mother's Love TV feed, as id and time only. lvz.app uses it
 * to jump to the Mother's Love slide when a new recognition arrives (Anthony, 2026-11-13). Names and messages
 * never leave this function.
 */
export const MOTHERS_LOVE_FEED_URL='https://mothers-love.vercel.app/api/display/color-polish';
export function latestRecognition(feed:unknown):DisplayMothersLove{
 if(!isRecord(feed)||!Array.isArray(feed.recognitions))throw Error('Unexpected Mother\'s Love feed.');
 let latestId:string|null=null,latestAt:string|null=null,latestMs=-Infinity;
 for(const r of feed.recognitions){
  if(!isRecord(r)||r.status!=='published'||typeof r.id!=='string'||!/^[A-Za-z0-9-]{8,128}$/.test(r.id)||typeof r.firstPublishedAt!=='string')continue;
  const ms=Date.parse(r.firstPublishedAt);
  if(Number.isFinite(ms)&&ms>latestMs){latestMs=ms;latestId=r.id;latestAt=new Date(ms).toISOString();}
 }
 return{latestId,latestAt};
}
