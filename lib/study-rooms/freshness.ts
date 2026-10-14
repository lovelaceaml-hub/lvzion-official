/** Only invalidation signals cross tabs; never member names, purposes or booking payloads. */
export function broadcastStudyChange():void{
 if(typeof BroadcastChannel==='undefined')return;
 try{const channel=new BroadcastChannel('lvz-study-room-changes');channel.postMessage('changed');channel.close();}catch{/* Polling and focus remain available in restricted browsers. */}
}
export function subscribeStudyRefresh(refresh:()=>Promise<unknown>,milliseconds=20000):()=>void{
 if(typeof window==='undefined')return ()=>{};
 let disposed=false,running=false;
 async function run(){if(disposed||running||document.visibilityState==='hidden'||!navigator.onLine)return;running=true;try{await refresh();}catch{/* The caller owns visible error feedback. */}finally{running=false;}}
 const listener=()=>{void run();};
 let channel:BroadcastChannel|undefined;
 try{if(typeof BroadcastChannel!=='undefined'){channel=new BroadcastChannel('lvz-study-room-changes');channel.onmessage=event=>{if(event.data==='changed')listener();};}}catch{/* Focus/online/poll fallback. */}
 window.addEventListener('focus',listener);window.addEventListener('online',listener);document.addEventListener('visibilitychange',listener);
 const timer=window.setInterval(listener,milliseconds);
 return ()=>{disposed=true;window.clearInterval(timer);channel?.close();window.removeEventListener('focus',listener);window.removeEventListener('online',listener);document.removeEventListener('visibilitychange',listener);};
}
