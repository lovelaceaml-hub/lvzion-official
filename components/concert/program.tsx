import type {ProgramItem} from '../../lib/concert/domain';
/** The concert program: order, title and performers. Server- and client-safe (no hooks). */
export default function Program({items,heading='Program'}:{items:ProgramItem[];heading?:string}){
 if(!items.length)return null;
 return <section className="cc-program" aria-labelledby="cc-program-title">
  <h2 id="cc-program-title">{heading}</h2>
  <ol>{items.map(item=><li key={item.position}>
   <span className="cc-program-number" aria-hidden="true">{item.position}</span>
   <span className="cc-program-body"><strong>{item.title}</strong>{item.performers?<span>{item.performers}</span>:null}</span>
  </li>)}</ol>
 </section>;
}
