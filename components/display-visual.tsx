import type{DisplayKind,DisplaySlide} from '../lib/continuous-display/live-contract';
type Props={slide?:DisplaySlide|null;preview?:boolean};
const eyebrows:Record<DisplayKind,string>={announcement:'Announcement',schedule:'Schedule',event:'Upcoming event',campaign:'Campaign'};
function dateParts(value?:string){
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(d.getTime()))return null;
 return{day:String(Number(value.slice(8,10))),month:d.toLocaleDateString('en-US',{month:'long',timeZone:'UTC'}),year:value.slice(0,4),weekday:d.toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'})};
}
const mark=<p className="cd-mark" aria-hidden="true">LV<span>Zion</span></p>;
export default function DisplayVisual({slide,preview=false}:Props){
 if(!slide)return <section className="cd-slide cd-fallback"><div className="cd-art" aria-hidden="true"><i/><i/><i/></div><div className="cd-copy"><p className="cd-eyebrow">LV Zion</p><h1>Welcome.</h1><p className="cd-body">The display is taking a quiet moment.</p></div></section>;
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
