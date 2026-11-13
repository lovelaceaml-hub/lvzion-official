import 'server-only';
import {authAdminClient} from './supabase';
export const DISPLAY_MEDIA_BUCKET='display-media';
// Signed links last an hour; reuse one for up to 45 minutes so a playing video keeps a stable source.
const links=new Map<string,{url:string;until:number}>();
export async function signedMediaUrl(name:string):Promise<string|null>{
 const hit=links.get(name),now=Date.now();
 if(hit&&hit.until>now)return hit.url;
 const {data,error}=await authAdminClient().storage.from(DISPLAY_MEDIA_BUCKET).createSignedUrl(name,3600);
 if(error||!data?.signedUrl)return null;
 if(links.size>200)links.clear();
 links.set(name,{url:data.signedUrl,until:now+45*60000});
 return data.signedUrl;
}
export async function signedUploadUrl(name:string):Promise<string|null>{
 const {data,error}=await authAdminClient().storage.from(DISPLAY_MEDIA_BUCKET).createSignedUploadUrl(name);
 return error||!data?.signedUrl?null:data.signedUrl;
}
