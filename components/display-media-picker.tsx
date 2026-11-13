'use client';
import {useRef,useState} from 'react';
import {DISPLAY_IMAGE_TYPES,DISPLAY_MEDIA_MAX_BYTES,DISPLAY_VIDEO_TYPES,type DisplaySlide} from '../lib/continuous-display/live-contract';
type Tone='info'|'success'|'warning'|'danger';
/** Seconds of a local video file, read before upload so the slide's time matches the video. */
function videoSeconds(file:File):Promise<number|null>{
 return new Promise(resolve=>{
  const url=URL.createObjectURL(file),video=document.createElement('video');
  const done=(value:number|null)=>{URL.revokeObjectURL(url);resolve(value);};
  video.preload='metadata';video.muted=true;
  video.onloadedmetadata=()=>done(Number.isFinite(video.duration)?Math.ceil(video.duration):null);
  video.onerror=()=>done(null);
  setTimeout(()=>done(null),8000);
  video.src=url;
 });
}
/**
 * Choose a picture or video for a slide. The file goes straight from this device to the display's
 * private storage through a one-time upload link; it reaches a TV only after the playlist that uses
 * it is approved and published.
 */
export function DisplayMediaPicker({slide,screenId,busy,onUploaded,onStatus}:{
 slide:DisplaySlide;screenId:string;busy:boolean;
 onUploaded:(media:string,seconds:number|null)=>void;onStatus:(text:string,tone?:Tone)=>void;
}){
 const input=useRef<HTMLInputElement>(null);
 const [uploading,setUploading]=useState(false);
 const types=slide.kind==='video'?DISPLAY_VIDEO_TYPES:DISPLAY_IMAGE_TYPES;
 const noun=slide.kind==='video'?'video':'picture';
 async function upload(file:File){
  if(!(file.type in types)){onStatus(slide.kind==='video'?'Choose an MP4 or WebM video.':'Choose a JPG, PNG or WebP picture.');return;}
  if(file.size>DISPLAY_MEDIA_MAX_BYTES){onStatus(`That ${noun} is over 50 MB. Choose a smaller file.`);return;}
  setUploading(true);onStatus(`Uploading the ${noun}…`,'info');
  try{
   const seconds=slide.kind==='video'?await videoSeconds(file):null;
   const r=await fetch('/api/display/manage',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
    body:JSON.stringify({action:'mediaUpload',screenId,contentType:file.type,size:file.size})});
   const data=await r.json() as {media?:string;uploadUrl?:string;error?:string};
   if(!r.ok||!data.media||!data.uploadUrl)throw Error(data.error||'The upload could not start.');
   const put=await fetch(data.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});
   if(!put.ok)throw Error(`The ${noun} could not be uploaded. Check the connection and try again.`);
   onUploaded(data.media,seconds);
   onStatus(`The ${noun} is uploaded. Save the draft, then approve and publish to put it on the TV.`,'success');
  }catch(e){onStatus(e instanceof Error?e.message:'The upload failed.');}
  finally{setUploading(false);if(input.current)input.current.value='';}
 }
 return <div className="cd-media-picker">
  <input ref={input} type="file" accept={Object.keys(types).join(',')} className="ui-visually-hidden" tabIndex={-1} aria-hidden="true"
   onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);}} disabled={busy||uploading}/>
  <button type="button" className="ui-button ui-button-secondary" disabled={busy||uploading} onClick={()=>input.current?.click()}>
   {uploading?'Uploading…':slide.media?`Replace ${noun}`:`Choose ${noun}`}
  </button>
  <p className="ui-hint">{slide.media?`A ${noun} is attached. The preview shows how it fits the TV.`:slide.kind==='video'?'MP4 or WebM, up to 50 MB. Widescreen (16:9) looks best.':'JPG, PNG or WebP, up to 50 MB. Widescreen (16:9) looks best.'}</p>
 </div>;
}
