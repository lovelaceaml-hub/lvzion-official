import type{DisplayKind,DisplayRooms,DisplaySlide} from '../lib/continuous-display/live-contract';
type Props={
 slide?:DisplaySlide|null;preview?:boolean;
 /** Where a picture or video file is opened from; the TV and manager previews use different checks. */
 mediaSrc?:(name:string)=>string;
 /** Today's room bookings for a rooms slide; null when the room feed is unavailable. */
 rooms?:DisplayRooms|null;
 /** Las Vegas wall-clock "HH:MM" used to mark the booking in progress. */
 nowClock?:string;
 /** Called when a video finishes or cannot play, so the TV moves on. */
 onMediaEnd?:()=>void;
};
const eyebrows:Record<DisplayKind,string>={announcement:'Announcement',schedule:'Schedule',event:'Upcoming event',campaign:'Campaign',image:'Picture',video:'Video',rooms:'Study rooms'};
function dateParts(value?:string){
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(d.getTime()))return null;
 return{day:String(Number(value.slice(8,10))),month:d.toLocaleDateString('en-US',{month:'long',timeZone:'UTC'}),year:value.slice(0,4),weekday:d.toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'})};
}
/** "16:00" as "4:00 PM". */
export function clockLabel(value:string){
 const [h,m]=value.split(':').map(Number);
 return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;
}
const MAX_ROOM_ROWS=7;
const mark=<p className="cd-mark" aria-hidden="true">LV<span>Zion</span></p>;
function RoomsBoard({slide,rooms,nowClock,preview}:{slide:DisplaySlide;rooms?:DisplayRooms|null;nowClock?:string;preview:boolean}){
 const date=rooms?dateParts(rooms.date):null;
 // Finished bookings drop off so the board shows what is happening now and next.
 const open=rooms?rooms.bookings.filter(b=>!nowClock||b.end>nowClock):[];
 const shown=open.slice(0,MAX_ROOM_ROWS),more=open.length-shown.length;
 let message:string|null=null;
 if(rooms===undefined)message=preview?'Today’s study-room bookings appear here on the TV: room and time only.':'Loading today’s room bookings…';
 else if(rooms===null)message='Room bookings are not available right now.';
 else if(!open.length)message=rooms.bookings.length?'No more study-room bookings today.':'No study rooms are booked today.';
 return <section className="cd-slide cd-kind-rooms" aria-label={slide.title}>
  <div className="cd-art" aria-hidden="true"><i/><i/><i/></div>
  <div className="cd-copy cd-rooms-copy">
   <p className="cd-eyebrow">{date?`${date.weekday}, ${date.month} ${date.day}`:eyebrows.rooms}</p>
   <h1>{slide.title}</h1>
   {slide.body&&<p className="cd-body">{slide.body}</p>}
   {message?<p className="cd-rooms-empty">{message}</p>
   :<div className="cd-rooms" role="list">{shown.map((b,i)=>{
     const now=!!nowClock&&b.start<=nowClock&&nowClock<b.end;
     return <div className="cd-room-row" role="listitem" data-now={now||undefined} key={i}>
      <strong>{b.room}</strong><span>{clockLabel(b.start)} to {clockLabel(b.end)}</span>{now&&<em>In use now</em>}
     </div>;})}
    {more>0&&<p className="cd-rooms-more">and {more} more later today</p>}
   </div>}
  </div>
  {mark}
  {preview&&<span className="cd-preview-mark">Preview, not on the TV</span>}
 </section>;
}
function MediaSlide({slide,preview,mediaSrc,onMediaEnd}:{slide:DisplaySlide;preview:boolean;mediaSrc?:(name:string)=>string;onMediaEnd?:()=>void}){
 const src=slide.media&&mediaSrc?mediaSrc(slide.media):null;
 const fit=slide.fit??'contain';
 return <section className={`cd-slide cd-kind-media cd-fit-${fit}`} aria-label={slide.title}>
  {src&&slide.kind==='image'&&<img className="cd-media" src={src} alt={slide.title} decoding="async"/>}
  {/* TVs play without sound, so videos are always muted. */}
  {src&&slide.kind==='video'&&<video className="cd-media" src={src} muted playsInline autoPlay preload="auto"
   loop={preview} aria-label={slide.title} onEnded={onMediaEnd} onError={onMediaEnd}/>}
  {!src&&<p className="cd-rooms-empty cd-media-missing">{slide.kind==='video'?'Upload a video for this slide.':'Upload a picture for this slide.'}</p>}
  {slide.body&&<p className="cd-media-caption">{slide.body}</p>}
  {preview&&<span className="cd-preview-mark">Preview, not on the TV</span>}
 </section>;
}
export default function DisplayVisual({slide,preview=false,mediaSrc,rooms,nowClock,onMediaEnd}:Props){
 if(!slide)return <section className="cd-slide cd-fallback"><div className="cd-art" aria-hidden="true"><i/><i/><i/></div><div className="cd-copy"><p className="cd-eyebrow">LV Zion</p><h1>Welcome.</h1><p className="cd-body">The display is taking a quiet moment.</p></div></section>;
 if(slide.kind==='image'||slide.kind==='video')return <MediaSlide slide={slide} preview={preview} mediaSrc={mediaSrc} onMediaEnd={onMediaEnd}/>;
 if(slide.kind==='rooms')return <RoomsBoard slide={slide} rooms={rooms} nowClock={nowClock} preview={preview}/>;
 const date=dateParts(slide.date);
 return <section className={`cd-slide cd-style-${slide.style} cd-kind-${slide.kind}`} aria-label={slide.title}>
  <div className="cd-art" aria-hidden="true"><i/><i/><i/></div>
  {slide.kind==='schedule'&&date&&<aside className="cd-date-rail"><span>{date.weekday}</span><strong>{date.day}</strong><span>{date.month} {date.year}</span></aside>}
  <div className="cd-copy">
   <p className="cd-eyebrow">{eyebrows[slide.kind]}</p>
   <h1>{slide.title}</h1>
   {slide.kind==='schedule'&&slide.rows?.length?<div className="cd-rows">{slide.rows.map((r,i)=><div className="cd-row" key={i}><strong>{r.time}</strong><span>{r.label}</span></div>)}</div>:<p className="cd-body">{slide.body}</p>}
   {slide.kind==='event'&&<div className="cd-event-meta"><strong>{date?`${date.weekday}, ${date.month} ${date.day}`:slide.date}</strong><span>{slide.time}</span><span>{slide.location}</span></div>}
  </div>
  {mark}
  {preview&&<span className="cd-preview-mark">Preview, not on the TV</span>}
 </section>;
}
