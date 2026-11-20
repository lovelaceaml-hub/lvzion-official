/* This preview links to official registration only. It does not collect any personal data. */
const player = document.querySelector('#concert-promo');
const fallback = document.querySelector('#promo-fallback');
const note = document.querySelector('#video-note');
const configuredSource = document.querySelector('meta[name="concert-promo-path"]')?.content;
if (configuredSource) {
  const source = new URL(configuredSource, window.location.href);
  if (source.origin === window.location.origin) {
    const showFallback = () => {
      player.hidden = true;
      fallback.hidden = false;
      note.textContent = 'CONCERT PROMO · VIDEO UNAVAILABLE';
    };
    player.addEventListener('error', showFallback);
    player.src = source.href;
    player.hidden = false;
    fallback.hidden = true;
    note.textContent = 'CONCERT PROMO';
  }
}
const hero = document.querySelector('.hero');
const surface = document.querySelector('#motion-art');
const toggle = document.querySelector('#motion-button');
const ink = surface.getContext('2d', {alpha:true});
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const palette=['#d46081','#77a6df','#eda75c','#69a760','#a688c5','#e49a93'];
const particles = Array.from({length:33},(_,i)=>({x:((i*43+11)%103)/100,y:((i*31+17)%101)/100,
  size:2.1 + i%6*.92,color:palette[i%palette.length], phase:i*1.669,speed:.038+i%7*.007}));
let visible = true, paused = false, frame = 0, t = 0, last = null, w=0,h=0;
const fract = x=>x-Math.floor(x);
const pathY = (u, base, phase) => base + Math.sin(u*8.3-t*.94 + phase)*h*.034 + Math.sin(u*14.1-t*.64 + 1.3)*h*.014;
function draw(){
  ink.clearRect(0,0,w,h);
  const spacing=Math.max(3.25,w*.006), ribbonBase=h*.857;
  const grad=ink.createLinearGradient(0,0,w,0);
  grad.addColorStop(0,'#d46c98bd');grad.addColorStop(.28,'#e6969ab0');grad.addColorStop(.6,'#e3ac60c5');
  grad.addColorStop(1,'#a48b57b0');
  ink.strokeStyle=grad;ink.lineWidth=w>750?1.25:.85;
  for(let k=0;k<5;k++){
    ink.beginPath();
    for(let i=0;i<=42;i++){const u=i/42;const y=pathY(u,ribbonBase,0)+k*spacing;i?ink.lineTo(u*w,y):ink.moveTo(0,y);}
    ink.stroke();
  }
  for(let j=0;j<9;j++){
    const u=fract(.097*t+j*.123);
    const x=u*w, y=pathY(u,ribbonBase,0)+(j%5)*spacing;
    const r=w>830?3.5:2.2;
    ink.globalAlpha=Math.min(1,u*13,(1-u)*13)*.78;ink.fillStyle=palette[j%palette.length];ink.strokeStyle=ink.fillStyle;
    ink.beginPath();ink.ellipse(x,y,r*1.12,r*.76,-.27,0,2*Math.PI);ink.fill();
    ink.beginPath();ink.moveTo(x+r,y);ink.lineTo(x+r,y-r*3.7);
    if(j%2) ink.quadraticCurveTo(x+r*3.45,y-r*3.05,x+r*2.8,y-r*2.2);
    ink.stroke();
  }
  for(const p of particles){
    const life=fract(p.y+t*p.speed);
    const base = p.x < .5 ? .02 + p.x*.52 : .73+(p.x-.50)*.52;
    const x=(base + Math.sin(p.phase+t*.84)*.056)*w;const y=(1.03-life*1.12)*h;
    const r=p.size*(w>750?1.45:1);
    ink.save();ink.translate(x,y);ink.rotate(.25*Math.sin(p.phase+t*.7));
    ink.globalAlpha=Math.sin(life*Math.PI)*.78;ink.fillStyle=p.color;
    ink.beginPath();
    ink.moveTo(0,r*.83);
    ink.bezierCurveTo(-r*1.6,-r*.18,-r*.95,-r*1.15,0,-r*.41);
    ink.bezierCurveTo(r*.95,-r*1.15,r*1.6,-r*.18,0,r*.83);
    ink.fill();ink.restore();
  }
  ink.globalAlpha=1;
}
function resize(){
  if(!ink||reduced.matches)return;
  const rect=surface.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  w=rect.width;h=rect.height;
  const ratio=Math.min(1.5,devicePixelRatio||1);
  surface.width=Math.round(w*ratio);surface.height=Math.round(h*ratio);
  ink.setTransform(ratio,0,0,ratio,0,0);draw();
}
function tick(now){
  if(last!==null)t+=Math.min(.05,(now-last)*.001);last=now;draw();frame=requestAnimationFrame(tick);
}
function update(){
  const enabled=Boolean(ink)&&!reduced.matches;
  const active=enabled&&!paused&&visible&&!document.hidden;
  toggle.hidden=!enabled;
  hero.classList.toggle('motion-ready',enabled);
  hero.classList.toggle('paused',paused);
  hero.classList.toggle('offscreen',!visible||document.hidden);
  if(active&&!frame){last=null;frame=requestAnimationFrame(tick);}
  if(!active&&frame){cancelAnimationFrame(frame);frame=0;last=null;}
}
toggle.addEventListener('click',()=>{
  paused=!paused;
  toggle.querySelector('span').textContent=paused?'Play motion':'Pause motion';
  update();
});
const motionState=()=>({active:Boolean(frame),paused,elapsed:t});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
  visible=entries.some(entry=>entry.isIntersecting && entry.intersectionRatio >= .15);update();
},{threshold:.15}).observe(hero);
if('ResizeObserver' in window)new ResizeObserver(resize).observe(surface);
else addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',update);
reduced.addEventListener?.('change',()=>{resize();update();});
resize();update();
