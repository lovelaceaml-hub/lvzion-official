'use client';
import {useRef,useState} from 'react';

/**
 * Sends a management draft with a stable request ID per identical payload, so a retry
 * after a network failure replays the same receipt instead of applying the change twice.
 */
export function useReceiptSave<Draft extends object>(save:(command:Draft&{requestId:string})=>Promise<void>,success:string){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const receipts=useRef(new Map<string,string>());
 async function send(draft:Draft){
  setBusy(true);setError('');setMessage('');
  const key=JSON.stringify(draft);
  let id=receipts.current.get(key);
  if(!id){id=crypto.randomUUID();receipts.current.set(key,id);}
  try{await save({...draft,requestId:id});receipts.current.delete(key);setMessage(success);}
  catch(e){setError(e instanceof Error?e.message:'Could not save this change.');}
  finally{setBusy(false);}
 }
 return {busy,error,message,send};
}
