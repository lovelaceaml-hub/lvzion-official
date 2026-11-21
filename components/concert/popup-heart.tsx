'use client';

import {useEffect, useRef} from 'react';
import {concertCurve} from './concert-curve';

const turn = Math.PI * 2;
const tones = ['#e85674','#be842e','#9367a2'];
const points = Array.from({length:84}, (_, i) => {
  const {x,y} = concertCurve(turn*i/84, 1, 0);
  return {x:32+26*x,y:22+20*y};
});
const outline = points.map(({x,y},i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' ')+'Z';

export function PosterHeart() {
  return <svg className="cc-poster-heart" viewBox="3.7 4.6 56.6 37.8" preserveAspectRatio="none" aria-hidden="true">
    <path d={outline} className="cc-heart-filament" fill="none" strokeWidth=".85" vectorEffect="non-scaling-stroke"/>
    <path d={outline} className="cc-heart-thread" fill="none" pathLength="100" stroke="#ffe6b5" strokeWidth="1.65"
      vectorEffect="non-scaling-stroke" strokeDasharray="4 46" strokeLinecap="round"/>
    {points.filter((_,i)=>i%3===0).map(({x,y},i)=><circle key={i} cx={x} cy={y} r={i%4===0?.35:.17} fill={i%2?'#fff0ce':'#ce7087'}/>)}
  </svg>;
}

export function HeartSignature() {
  return <svg className="cc-heart-signature" viewBox="0 0 64 46" aria-hidden="true">
    <path d={outline} fill="none" stroke="#bc727b" strokeWidth=".75"/>
    {points.map(({x,y},i)=><circle key={i} cx={x} cy={y} r={i%4===0?1.3:.7} fill={tones[i%3]}/>)}
    <path className="cc-heart-thread" d={outline} pathLength="100" fill="none" stroke="#fff9d9" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="7 43"/>
    {[9,28,54,66].map(i=><path key={i} transform={`translate(${points[i].x} ${points[i].y})`} fill="#fff3c9" stroke="#bd844b" strokeWidth=".4" d="M0-4 .8-.8 4 0 .8.8 0 4-.8.8-4 0-.8-.8Z"/>)}
  </svg>;
}

type Point = {x:number; y:number};
const ease = (t:number) => t*t*(3-2*t);
function arc(a: Point, b: Point, t: number, bow: number): Point {
  const u = ease(t);
  return {x:a.x+(b.x-a.x)*u+Math.sin(Math.PI*u)*bow, y:a.y+(b.y-a.y)*u};
}

// One transparent drawing surface in the dialog's top layer. It only paints
// during a gesture or opening, and never participates in layout or hit testing.
export function HeartFlight() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const dialog = canvas?.closest('dialog');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !dialog || !ctx) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let geometryDirty = true;
    const invalidate = () => { geometryDirty = true; };
    const geometry = new ResizeObserver(invalidate);
    geometry.observe(dialog);
    const posterStage = dialog.querySelector('.cc-poster-stage');
    if (posterStage) geometry.observe(posterStage);
    dialog.addEventListener('scroll', invalidate, true);
    function clear() {
      cancelAnimationFrame(frame);
      ctx!.clearRect(0,0,canvas!.width,canvas!.height);
    }
    function fly(event: Event) {
      clear();
      if (!dialog!.open || motion.matches || document.hidden) return;
      const pen = ctx!;
      const ratio = Math.min(2,window.devicePixelRatio || 1);
      const source = (event as CustomEvent<HTMLElement | undefined>).detail?.getBoundingClientRect();
      const poster = dialog!.querySelector<HTMLElement>('.cc-poster-stage')!;
      const badge = dialog!.querySelector<SVGSVGElement>('.cc-heart-signature')!;
      let w = 0, h = 0, rx = 0, ry = 0;
      let viablePoster = true;
      let center:Point, start:Point, dest:Point;
      function measure() {
        const bounds = canvas!.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return false;
        if (w !== bounds.width || h !== bounds.height) {
          w = bounds.width; h = bounds.height;
          canvas!.width = Math.ceil(w*ratio); canvas!.height = Math.ceil(h*ratio);
          pen.setTransform(ratio,0,0,ratio,0,0);
        }
        const art = poster.getBoundingClientRect(), signature = badge.getBoundingClientRect();
        dest = {x:signature.x+signature.width/2-bounds.x,y:signature.y+signature.height/2-bounds.y};
        start = source ? {x:source.left-bounds.x+Math.min(28,source.width/2), y:source.top-bounds.y+source.height/2} : {x:w*.5,y:h-5};
        viablePoster = art.bottom > bounds.top + 16;
        center = viablePoster ? {x:art.left+art.width/2-bounds.x,y:art.top+art.height*.46-bounds.y} : {x:w*.84,y:Math.max(26,Math.min(h-45,start.y-55))};
        rx = viablePoster ? art.width*.46 : 25; ry = viablePoster ? art.height*.53 : 21;
        return true;
      }
      function heart(t:number, side:number) {
        const p = concertCurve(Math.PI + side*Math.PI*ease(t),1,0);
        return {x:center.x+rx*p.x,y:center.y+ry*p.y};
      }
      function position(t:number, side:number) {
        if(t<.25) return arc(start,heart(0,side),t/.25,side*w*.12);
        if(t<.82) return heart((t-.25)/.57,side);
        return arc(heart(1,side),viablePoster?dest:center,(t-.82)/.18,side*rx*.22);
      }
      const duration = source ? 920 : 1480;
      const began = performance.now();
      geometryDirty = true;
      function paint(now:number) {
        if (geometryDirty && !measure()) return;
        geometryDirty = false;
        const progress = Math.min(1.23,(now-began)/duration);
        pen.clearRect(0,0,w,h);
        for (const side of [-1,1]) {
          const color = side===1?'#c3416a':'#a47323';
          for(let i=29;i>=0;i--) {
            const t=progress-i*.007;
            if(t<0 || t>1) continue;
            const pos=position(t,side), intensity=1-i/30;
            pen.globalAlpha=intensity*.91;
            pen.fillStyle=color;
            pen.beginPath();pen.arc(pos.x,pos.y,.6+intensity*1.25,0,turn);pen.fill();
            if(i%3===0) {
              const drift=(1-intensity)*10;
              pen.fillStyle=i%2?'#be7498':'#fff2bf';
              pen.beginPath();pen.arc(pos.x+drift*Math.sin(t*32+i),pos.y+drift*Math.cos(t*23+i),.8,0,turn);pen.fill();
            }
            if(i===0) {
              pen.shadowBlur=7;pen.shadowColor=color;pen.fillStyle='#fff9d8';
              pen.beginPath();pen.moveTo(pos.x,pos.y-5);pen.lineTo(pos.x+1.1,pos.y-1);pen.lineTo(pos.x+5,pos.y);pen.lineTo(pos.x+1,pos.y+1);pen.lineTo(pos.x,pos.y+5);pen.lineTo(pos.x-1,pos.y+1);pen.lineTo(pos.x-5,pos.y);pen.lineTo(pos.x-1,pos.y-1);pen.closePath();pen.fill();pen.shadowBlur=0;
            }
          }
        }
        pen.globalAlpha=1;
        if(progress<1.23) frame=requestAnimationFrame(paint);
      }
      frame=requestAnimationFrame(paint);
    }
    dialog.addEventListener('concert-heart',fly);
    dialog.addEventListener('close',clear);
    motion.addEventListener('change',clear);
    document.addEventListener('visibilitychange',clear);
    return () => {
      geometry.disconnect(); dialog.removeEventListener('scroll',invalidate,true);
      clear(); dialog.removeEventListener('concert-heart',fly);dialog.removeEventListener('close',clear);
      motion.removeEventListener('change',clear);document.removeEventListener('visibilitychange',clear);
    };
  },[]);
  return <canvas ref={ref} className="cc-heart-flight" aria-hidden="true"/>;
}
