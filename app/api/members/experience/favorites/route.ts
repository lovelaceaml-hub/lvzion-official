import{requireMember}from'../../../../../lib/server/supabase';
import{body,reply}from'../../../../../lib/server/http';
import{parseFavoriteChange}from'../../../../../lib/app-runtime';
export async function POST(request:Request){
 try{
  const {moduleIds,expectedVersion}=parseFavoriteChange(await body(request));
  const client=await requireMember();
  const{data,error}=await client.rpc('save_module_favorites',{p_module_ids:moduleIds,p_expected_version:expectedVersion});
  if(error)return reply({error:error.code==='40001'?'Favorites changed elsewhere. Refresh before retrying.':'Favorite update rejected.'},error.code==='42501'?403:409);
  return reply({favorites:data.favorites,favoriteVersion:data.favoriteVersion});
 }catch{return reply({error:'Invalid or unauthorized favorite update.'},400);}
}
