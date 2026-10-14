import {requireMember}from'../../../../lib/server/supabase';
import{reply}from'../../../../lib/server/http';
import{parseModuleFeed}from'../../../../lib/app-runtime';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const client=await requireMember();
  const {data,error}=await client.rpc('member_module_home');
  if(error)return reply({error:'Module experience not configured.'},503);
  return reply(parseModuleFeed(data));
 }catch{return reply({error:'Authorized member session required.'},401);}
}
