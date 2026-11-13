import {NextResponse,type NextRequest} from 'next/server';
import {authAdminClient,requireMember} from '../../../../../lib/server/supabase';
import {DEVICE_COOKIE,deviceDigest} from '../../../../../lib/server/display';
import {signedMediaUrl} from '../../../../../lib/server/display-media';
import {isMediaName,isUuid,isRecord} from '../../../../../lib/continuous-display/live-contract';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const denied=()=>new NextResponse(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
/**
 * A paired TV, or anyone on the open lvz.app/display link, may open a picture or video only while the published
 * playlist they are shown uses it. A display
 * manager may preview one for a screen they hold a permission on (?screen=<id>). Either way the
 * answer is a short redirect to a signed link; the bucket itself is private.
 */
export async function GET(request:NextRequest,{params}:{params:Promise<{name:string}>}){
 const {name}=await params;
 if(!isMediaName(name))return denied();
 let allowed=false;
 const token=request.cookies.get(DEVICE_COOKIE)?.value;
 const screen=request.nextUrl.searchParams.get('screen');
 try{
  if(screen!==null){
   if(!isUuid(screen))return denied();
   const client=await requireMember();
   const r=await client.rpc('display_media_authorize',{p_screen:screen,p_purpose:'view'});
   allowed=!r.error&&r.data===true;
  }else{
   const admin=authAdminClient();
   const uses=(data:unknown)=>isRecord(data)&&Array.isArray(data.slides)&&data.slides.some(s=>isRecord(s)&&s.media===name);
   if(token&&token.length<=128){
    const r=await admin.rpc('display_device_snapshot_r2',{p_token_digest:deviceDigest(token)});
    allowed=!r.error&&uses(r.data);
   }
   // The open link plays the main screen's published playlist, so its files open too, and nothing else.
   if(!allowed){const r=await admin.rpc('display_public_snapshot');allowed=!r.error&&uses(r.data);}
  }
 }catch{allowed=false;}
 if(!allowed)return denied();
 const url=await signedMediaUrl(name);
 if(!url)return denied();
 return NextResponse.redirect(url,{status:302,headers:{'Cache-Control':'private, max-age=300','Referrer-Policy':'no-referrer'}});
}
