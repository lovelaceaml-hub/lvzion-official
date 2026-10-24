/**
 * Liquid Opal component kit, ported from Anthony's Theme Atlas (tools/screen.css,
 * material-opal). Every app composes its screens from these pieces; the look
 * comes from the ui- classes in styles/lvz-ui.css and each app's palette in
 * styles/lvz-tokens.css. Content is always real data or a neutral empty state.
 * Contract: docs/design/LVZ-DESIGN-CONTRACT.md.
 */
import type {ComponentProps,ReactNode} from 'react';
import {ChevronRight,Search} from './home-icons';

const cx=(...names:(string|false|null|undefined)[])=>names.filter(Boolean).join(' ');

/** Eyebrow, large title and one sentence. */
export function PageHeading({eyebrow,title,lede,id,children}:{eyebrow?:ReactNode;title:ReactNode;lede?:ReactNode;id?:string;children?:ReactNode}){
 return <header className="ui-heading">
  {eyebrow?<p className="ui-eyebrow">{eyebrow}</p>:null}
  <h1 id={id}>{title}</h1>
  {lede?<p>{lede}</p>:null}
  {children}
 </header>;
}

/** The one filled gradient card on a screen. `art` is a large outline icon. */
export function Hero({tag,title,detail,action,art,className,titleId,...rest}:{tag?:ReactNode;title:ReactNode;detail?:ReactNode;action?:ReactNode;art?:ReactNode;titleId?:string}&Omit<ComponentProps<'section'>,'title'>){
 return <section className={cx('ui-hero',className)} aria-labelledby={titleId} {...rest}>
  <div className="ui-hero-copy">
   {tag?<span className="ui-tag">{tag}</span>:null}
   <h2 id={titleId}>{title}</h2>
   {detail?<p>{detail}</p>:null}
   {action}
  </div>
  {art?<span className="ui-hero-art" aria-hidden="true">{art}</span>:null}
 </section>;
}

/** A section title with an optional "See all" action on the right. */
export function SectionHeader({title,id,action,note,level=2}:{title:ReactNode;id?:string;action?:ReactNode;note?:ReactNode;level?:2|3}){
 const Tag=level===2?'h2':'h3';
 return <div className="ui-section-head"><Tag id={id}>{title}</Tag>{note?<span>{note}</span>:null}{action}</div>;
}

/** "See all" style text action: a link when href is given, otherwise a button. */
export function TextAction({children,href,onClick,label}:{children:ReactNode;href?:string;onClick?:()=>void;label?:string}){
 const inner=<>{children}<ChevronRight size={16}/></>;
 return href?<a className="ui-text-action" href={href} aria-label={label}>{inner}</a>:<button type="button" className="ui-text-action" onClick={onClick} aria-label={label}>{inner}</button>;
}

/** Frosted glass panel. */
export function Glass({tight,className,as='section',ref:_ref,...rest}:{tight?:boolean;as?:'section'|'div'|'article'|'aside'}&ComponentProps<'section'>){
 const Tag=as;
 return <Tag className={cx('ui-glass',tight&&'ui-glass-tight',className)} {...rest}/>;
}

export type QuickItem={key:string;label:string;icon:ReactNode;href?:string;onClick?:()=>void;current?:boolean};
/** Rounded square quick-access tiles (four across on a phone). */
export function QuickGrid({items,label}:{items:QuickItem[];label:string}){
 return <ul className="ui-quick-grid" aria-label={label}>{items.map(item=><li key={item.key}>
  {item.href?<a className="ui-quick" href={item.href} aria-current={item.current?'page':undefined}>{item.icon}<span>{item.label}</span></a>
   :<button type="button" className="ui-quick" onClick={item.onClick} aria-pressed={item.current}>{item.icon}<span>{item.label}</span></button>}
 </li>)}</ul>;
}

/** A label, a large figure and a short note. Pass onClick or href to make it a control. */
export function StatTile({label,value,note,tone,href,onClick,pressed}:{label:ReactNode;value:ReactNode;note?:ReactNode;tone?:'accent';href?:string;onClick?:()=>void;pressed?:boolean}){
 const inner=<><span>{label}</span><strong>{value}</strong>{note?<small>{note}</small>:null}</>;
 if(href)return <a className="ui-stat" data-tone={tone} href={href}>{inner}</a>;
 if(onClick)return <button type="button" className="ui-stat" data-tone={tone} onClick={onClick} aria-pressed={pressed}>{inner}</button>;
 return <div className="ui-stat" data-tone={tone}>{inner}</div>;
}
export function StatGrid({children,label}:{children:ReactNode;label?:string}){
 return <div className="ui-stats" role={label?'group':undefined} aria-label={label}>{children}</div>;
}

/** Rounded search field with a leading icon. The input keeps its own accessible name. */
export function SearchField({label,className,...input}:{label:string}&ComponentProps<'input'>){
 return <label className={cx('ui-search',className)}><Search size={20}/><span className="ui-visually-hidden">{label}</span><input type="search" {...input}/></label>;
}

/** Pill segmented control; the active option is the filled gradient pill. */
export function Segmented<T extends string>({options,value,onChange,label,className}:{options:readonly (readonly [T,ReactNode])[];value:T;onChange:(value:T)=>void;label:string;className?:string}){
 return <div className={cx('ui-segmented',className)} role="group" aria-label={label}>
  {options.map(([key,text])=><button type="button" key={key} aria-pressed={value===key} onClick={()=>onChange(key)}>{text}</button>)}
 </div>;
}

export type DateChip={key:string;top:ReactNode;day:ReactNode;bottom?:ReactNode;label:string;selected?:boolean;onClick?:()=>void;href?:string};
/** Strip of rounded day chips; the selected chip is filled. */
export function DateStrip({days,label}:{days:DateChip[];label:string}){
 return <div className="ui-daystrip" role="group" aria-label={label}>{days.map(d=>{
  const inner=<><span>{d.top}</span><strong>{d.day}</strong><small>{d.bottom}</small></>;
  return d.href?<a key={d.key} className="ui-day" href={d.href} aria-label={d.label} aria-current={d.selected?'date':undefined}>{inner}</a>
   :<button type="button" key={d.key} className="ui-day" aria-label={d.label} aria-pressed={Boolean(d.selected)} onClick={d.onClick}>{inner}</button>;
 })}</div>;
}

/** Rounded icon or initials box at the start of a row. */
export function IconBox({children,round}:{children:ReactNode;round?:boolean}){
 return <span className="ui-icon-box" data-round={round?'true':undefined} aria-hidden="true">{children}</span>;
}

/** A list row: leading icon or avatar, title, detail, optional end slot, chevron when it navigates. */
export function Row({lead,title,detail,end,href,onClick,chevron=Boolean(href||onClick),label,className}:{lead?:ReactNode;title:ReactNode;detail?:ReactNode;end?:ReactNode;href?:string;onClick?:()=>void;chevron?:boolean;label?:string;className?:string}){
 const inner=<>{lead}<span className="ui-row-body"><strong>{title}</strong>{detail?<small>{detail}</small>:null}</span>{end}{chevron?<ChevronRight size={18}/>:null}</>;
 if(href)return <a className={cx('ui-row',className)} href={href} aria-label={label}>{inner}</a>;
 if(onClick)return <button type="button" className={cx('ui-row',className)} onClick={onClick} aria-label={label}>{inner}</button>;
 return <div className={cx('ui-row',className)}>{inner}</div>;
}

export function Tag({children,tone}:{children:ReactNode;tone?:'warning'|'success'|'danger'}){
 return <span className="ui-tag" data-tone={tone}>{children}</span>;
}

/** Floating selection tray: summary on the left, the primary action on the right. */
export function Tray({eyebrow,summary,children,className,...rest}:{eyebrow?:ReactNode;summary:ReactNode}&ComponentProps<'div'>){
 return <div className={cx('ui-tray',className)} {...rest}><div className="ui-tray-summary">{eyebrow?<small>{eyebrow}</small>:null}<strong>{summary}</strong></div>{children}</div>;
}

/** Icon empty state: one bold line, one sentence and, if useful, one action. */
export function EmptyState({icon,title,children,action,role}:{icon:ReactNode;title:ReactNode;children?:ReactNode;action?:ReactNode;role?:'status'|'alert'}){
 return <div className="ui-empty-state" role={role}><span className="ui-empty-icon" aria-hidden="true">{icon}</span><strong>{title}</strong>{children?<p>{children}</p>:null}{action}</div>;
}

/** Initials for an avatar box. */
export function initialsOf(name:string){return name.trim().split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();}
