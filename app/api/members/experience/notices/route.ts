import{requireMember}from'../../../../../lib/server/supabase';
import{body,reply}from'../../../../../lib/server/http';
import{parseNoticeRead}from'../../../../../lib/app-runtime';
export async function POST(request:Request){
 try{
  const noticeId=parseNoticeRead(await body(request));
  const client=await requireMember();
  const{data,error}=await client.rpc('mark_module_notice_read',{p_notice_id:noticeId});
  if(error)return reply({error:'Notification could not be updated.'},409);
  return reply({ok:data===true});
 }catch{return reply({error:'Invalid or unauthorized notification update.'},400);}
}
