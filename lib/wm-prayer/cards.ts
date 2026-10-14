import type { RecapContent } from './domain';
export type CardStyle = 'outline' | 'lenses' | 'path';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
function lines(text:string,max:number):string[]{
  const output:string[]=[];let line='';
  for(const word of text.split(/\s+/)){if(line && `${line} ${word}`.length>max){output.push(line);line=word;}else line=line ? `${line} ${word}` : word;}
  if(line)output.push(line);return output;
}
function svgText(value:string,x:number,y:number,size:number,width:number,fill='#233d37',weight=400):string{
  return `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${lines(value,width).map((line,i)=>`<tspan x="${x}" dy="${i ? size*1.32 : 0}">${esc(line)}</tspan>`).join('')}</text>`;
}
/** Fictional prototype export only: built from the exact approved projection, never source/attendee metadata. */
export function cardSvg(content:RecapContent,style:CardStyle,revision:number,dateLabel='Fictional gathering'):string{
  const titleLines=lines(content.title,42).length;
  const introY=130+titleLines*45;
  const introLines=lines(content.centralMessage,63).length;
  const start=Math.max(350,introY+introLines*34+32);
  const palette=style==='path' ? ['#faf5e9','#e0d5ba'] : style==='lenses' ? ['#eff2eb','#d5dfd0'] : ['#ffffff','#d1dfd5'];
  let body=`<rect width="1080" height="900" rx="30" fill="${palette[0]}"/><rect x="1" y="1" width="1078" height="898" rx="30" fill="none" stroke="${palette[1]}"/>${svgText('FICTIONAL PREVIEW — NOT A REAL LESSON',46,52,19,80,'#536b59',700)}${svgText(content.title,46,117,42,42,'#233d37',700)}${svgText(content.centralMessage,46,introY,28,63)}`;
  if(style==='lenses'){
    content.points.forEach((p,i)=>{const x=46+i*331;body+=`<rect x="${x}" y="${start}" width="313" height="360" rx="18" fill="#ffffff" stroke="#cbd9c7"/>${svgText(`0${i+1}`,x+23,start+45,23,10,'#577451',700)}${svgText(p.label,x+23,start+94,29,15,'#233d37',700)}${svgText(p.text,x+23,start+170,26,18)}`;});
  }else{
    content.points.forEach((p,i)=>{const y=start+i*132;body+=style==='path' ? `<circle cx="68" cy="${y+7}" r="23" fill="#526a55"/>${svgText(String(i+1),60,y+15,24,4,'#fff',700)}${i<content.points.length-1 ? `<path d="M68 ${y+30}V${y+116}" stroke="#b8b098" stroke-width="3"/>` : ''}` : `<rect x="46" y="${y-18}" width="45" height="42" rx="9" fill="#e8eee5"/>${svgText(`0${i+1}`,53,y+10,20,4,'#44633f',700)}`;body+=`${svgText(p.label,112,y+10,29,50,'#233d37',700)}${svgText(p.text,112,y+50,27,59)}`;});
  }
  body+=`<path d="M46 800H1034" stroke="${palette[1]}"/>${svgText(`${dateLabel} · Revision ${revision}`,46,838,20,83,'#536b59')}${svgText('Summary-based fictional example. Graphic and explanation are separate.',46,873,18,99,'#536b59')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="900" viewBox="0 0 1080 900" role="img" aria-label="Fictional educational lesson card">${body}</svg>`;
}
