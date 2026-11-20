import type {NamedTicket} from '../../lib/concert/registration';

function png(canvas:HTMLCanvasElement):Promise<Blob> {
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob ? resolve(blob) : reject(Error('Image unavailable')),'image/png'));
}

export async function passImages(tickets:NamedTicket[],title:string) {
  const canvases=await Promise.all(tickets.map(async (ticket,index)=>{
    const canvas=document.createElement('canvas');
    canvas.width=640; canvas.height=764;
    const ctx=canvas.getContext('2d');
    if (!ctx) throw Error('Image unavailable');
    const image=new Image();
    const source=ticket.svg ? URL.createObjectURL(new Blob([ticket.svg],{type:'image/svg+xml'})) : ticket.url+'/qr';
    try {
      image.src=source; await image.decode();
      ctx.fillStyle='#fff9ed';ctx.fillRect(0,0,640,764);
      ctx.fillStyle='#50263d';ctx.fillRect(0,0,640,98);
      ctx.fillStyle='#ffe3a1';ctx.textAlign='center';ctx.font='bold 23px Georgia';
      ctx.fillText(title,320,61,596);
      ctx.fillStyle='#43253b';ctx.font='bold 32px system-ui';ctx.fillText(ticket.name,320,158,592);
      ctx.imageSmoothingEnabled=false;ctx.drawImage(image,64,188,512,512);
      ctx.font='22px system-ui';ctx.fillText('Admission ticket · '+(index+1)+' of '+tickets.length,320,731);
    } finally { if(ticket.svg) URL.revokeObjectURL(source); }
    return canvas;
  }));
  const files=await Promise.all(canvases.map(async (canvas,i)=>new File([await png(canvas)],
    'Concert-'+(i+1)+'-'+tickets[i].name.replace(/[^\p{L}\p{N} -]/gu,'').slice(0,65)+'.png',{type:'image/png'})));
  let sheet=files[0];
  if(files.length>1){
    const canvas=document.createElement('canvas');
    const columns=files.length>3 ? 2 : 1;
    canvas.width=640*columns;canvas.height=764*Math.ceil(files.length/columns);
    const ctx=canvas.getContext('2d');
    if (!ctx) throw Error('Image unavailable');
    ctx.fillStyle='#fff9ed';ctx.fillRect(0,0,canvas.width,canvas.height);
    canvases.forEach((image,i)=>ctx.drawImage(image,(i%columns)*640,Math.floor(i/columns)*764));
    sheet=new File([await png(canvas)],'Concert-party-tickets.png',{type:'image/png'});
  }
  return {files,sheet};
}
