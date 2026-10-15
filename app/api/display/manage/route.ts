import {requireMember} from '../../../../lib/server/supabase';
import {body,reply} from '../../../../lib/server/http';
import {parseDisplaySlides,isSlideId,isUuid,safeInstant} from '../../../../lib/continuous-display/live-contract';
import {parseOperatingHours,parseDisplayMotionMode} from '../../../../lib/continuous-display/operations';
import {createPairCode,deviceDigest,formatPairCode} from '../../../../lib/server/display';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Rpc={data:unknown;error:{code?:string;message?:string}|null};
const n=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<1e9?v:null;
function status(result:Rpc){return result.error?.code==='42501'?403:result.error?.code==='40001'?409:result.error?422:200;}
export async function GET(){
 try{
  const client=await requireMember();
  const r:Rpc=await client.rpc('display_management_state_r2');
  if(r.error)return reply({error:'Display management is not authorized or available.'},status(r));
  return reply(r.data);
 }catch{return reply({error:'Authorized display manager sign-in required.'},401);}
}
export async function POST(request:Request){
 let input:Record<string,unknown>;
 try{input=await body(request);}catch{return reply({error:'Invalid or untrusted request.'},400);}
 const action=input.action,screenId=input.screenId;
 if(action==='createScreen'){
  if(typeof input.label!=='string'||input.label.trim().length<3||[...input.label].length>80
     ||Object.keys(input).some(k=>k!=='action'&&k!=='label'))return reply({error:'Enter a valid screen name.'},400);
  try{
   const client=await requireMember();
   const r:Rpc=await client.rpc('display_create_screen',{p_label:input.label.trim()});
   if(r.error)return reply({error:'Only an authorized display owner may create screens.'},status(r));
   return reply({screenId:r.data});
  }catch{return reply({error:'Authorized display owner sign-in required.'},401);}
 }
 if(typeof action!=='string'||!isUuid(screenId))return reply({error:'Invalid display request.'},400);
 try{
  const client=await requireMember();
  let r:Rpc;
  if(action==='save'){
   const version=n(input.expectedVersion);
   if(version===null||!safeInstant(input.startsAt)||!safeInstant(input.endsAt))return reply({error:'Check the version and Las Vegas publication window.'},400);
   const start=Date.parse(input.startsAt),end=Date.parse(input.endsAt),now=Date.now();
   if(end<=now||start>=end||end-now>90*86400000||end-start>90*86400000)return reply({error:'Schedule the display for no more than 90 days.'},400);
   let slides;try{slides=parseDisplaySlides(input.slides);}catch(e){return reply({error:e instanceof Error?e.message:'Invalid slide'},400);}
   r=await client.rpc('display_save_draft',{p_screen:screenId,p_expected_version:version,p_items:slides,p_from:input.startsAt,p_until:input.endsAt});
   if(r.error)return reply({error:'Draft rejected. Reload if another operator made changes.'},status(r));
   return reply({draftVersion:Number(r.data)});
  }
  if(action==='approve'||action==='publish'){
   const version=n(input.expectedVersion);
   if(version===null)return reply({error:'Invalid revision.'},400);
   r=await client.rpc(action==='approve'?'display_approve_draft':'display_publish_approved',{p_screen:screenId,p_expected_version:version});
   if(r.error)return reply({error:'Review or publication rejected. Check the approved version and eligibility.'},status(r));
   return reply(action==='approve'?{approved:true}:{publishedVersion:Number(r.data)});
  }
  if(action==='pair'){
   const code=createPairCode();
   r=await client.rpc('display_issue_pairing',{p_screen:screenId,p_code_digest:deviceDigest(code)});
   if(r.error)return reply({error:'Pairing requires independent device permission.'},status(r));
   return reply({code:formatPairCode(code),expiresInSeconds:300});
  }
  if(action==='revoke'){
   if(!isUuid(input.deviceId))return reply({error:'Invalid device.'},400);
   r=await client.rpc('display_revoke_device',{p_device:input.deviceId});
   if(r.error)return reply({error:'Device revocation requires explicit permission.'},status(r));
   return reply({revoked:r.data===true});
  }
  if(action==='hours'){
   const version=n(input.expectedVersion);
   if(version===null)return reply({error:'Invalid operating-hours revision.'},400);
   let hours;try{hours=parseOperatingHours(input.hours);}catch{return reply({error:'Use valid, non-overlapping church operating hours.'},400);}
   r=await client.rpc('display_set_operating_hours',{p_screen:screenId,p_expected_version:version,p_hours:hours});
   if(r.error)return reply({error:'Operating hours could not be saved. Refresh and retry.'},status(r));
   return reply({configVersion:Number(r.data)});
  }
  if(action==='motion'){
   const version=n(input.expectedVersion);
   if(version===null)return reply({error:'Invalid screen configuration version.'},400);
   // parseDisplayMotionMode defaults a missing value to standard, so a missing choice is rejected first.
   if(input.motionMode===undefined)return reply({error:'Choose a display motion mode.'},400);
   let motionMode;try{motionMode=parseDisplayMotionMode(input.motionMode);}catch{return reply({error:'Unsupported display motion mode.'},400);}
   r=await client.rpc('display_set_motion',{p_screen:screenId,p_expected_version:version,p_mode:motionMode});
   if(r.error)return reply({error:'Motion settings could not be saved. Refresh and retry.'},status(r));
   return reply({configVersion:Number(r.data),motionMode});
  }
  if(action==='restore'){
   const generation=n(input.expectedGeneration);
   if(!isUuid(input.publicationId)||generation===null)return reply({error:'Choose a previously published version.'},400);
   r=await client.rpc('display_restore_publication',{p_screen:screenId,p_publication:input.publicationId,p_expected_generation:generation});
   if(r.error)return reply({error:'Restore requires original approved content within its unexpired publication window.'},status(r));
   return reply({publishedVersion:Number(r.data)});
  }
  if(action==='override'){
   const generation=n(input.expectedGeneration);
   const seconds=n(input.durationSeconds);
   if(generation===null||seconds===null||seconds<30||seconds>1800||!isSlideId(input.slideId))
    return reply({error:'Choose an approved slide and a notice duration between 30 seconds and 30 minutes.'},400);
   r=await client.rpc('display_set_override',{p_screen:screenId,p_slide_id:input.slideId,p_seconds:seconds,p_expected_generation:generation});
   if(r.error)return reply({error:'The selected notice is not eligible or your publication changed.'},status(r));
   return reply({overrideUntil:r.data});
  }
  if(action==='clearOverride'){
   r=await client.rpc('display_clear_override',{p_screen:screenId});
   if(r.error)return reply({error:'Removing a notice requires review and publishing rights.'},status(r));
   return reply({cleared:r.data===true});
  }
  return reply({error:'Unrecognized management action.'},400);
 }catch{return reply({error:'Authorized display manager sign-in required.'},401);}
}
