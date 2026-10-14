// A short-lived, tab-local handoff survives a reload between opening an email
// confirmation link and deliberately pressing Confirm. No tokens enter the server
// on a GET, localStorage, analytics, or the browser's visible URL after load.
const MAX_AGE=10*60*1000;
export function pendingConfirmation(key:string,incoming:URLSearchParams,required:string){
 const values=Object.fromEntries(incoming);
 if(typeof values[required]==='string'&&values[required].length>0&&JSON.stringify(values).length<=3000){
  try{sessionStorage.setItem(key,JSON.stringify({at:Date.now(),values}));}catch{}
  return values;
 }
 try{
  const saved=sessionStorage.getItem(key);
  if(!saved)return null;
  const value:unknown=JSON.parse(saved);
  if(value&&typeof value==='object'){
   const record=value as {at?:unknown;values?:unknown};
   if(typeof record.at==='number'&&Date.now()>=record.at&&Date.now()-record.at<MAX_AGE&&record.values&&typeof record.values==='object'){
    const old=record.values as Record<string,unknown>;
    if(typeof old[required]==='string'&&old[required].length>0)return old as Record<string,string>;
   }
  }
 }catch{}
 forgetConfirmation(key);
 return null;
}
export function forgetConfirmation(key:string){
 try{sessionStorage.removeItem(key);}catch{}
}
