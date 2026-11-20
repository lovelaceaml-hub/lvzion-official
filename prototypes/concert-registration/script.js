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
const ribbons = [
  {base:.235, amp:.151, phase:.2, tilt:-.24, speed:.97, colors:[[97,180,223],[154,188,229],[218,125,171]]},
  {base:.526, amp:.168, phase:2.55, tilt:.54, speed:-.85, colors:[[241,138,156],[229,103,146],[244,177,84]]},
  {base:.805, amp:.150, phase:4.15, tilt:-.20, speed:1.12, colors:[[104,174,123],[235,175,78],[226,119,141]]},
];
const rgba = (rgb,alpha) => 'rgba('+rgb.join(',')+','+alpha+')';
const mix = (a,b,u) => a.map((v,i)=>Math.round(v+(b[i]-v)*u));
function pathY(u,layer,offset=0) {
  const phase=layer.phase+t*layer.speed;
  const large=Math.sin(u*6.27-phase)*layer.amp;
  const curl=Math.sin(u*12.6+phase*.63)*.046;
  return h*(layer.base+large+curl+(u-.5)*layer.tilt+offset);
}
function path(layer,offset=0,reverse=false) {
  for(let i=0;i<=52;i++){
    const u=(reverse?52-i:i)/52, x=w*u, y=pathY(u,layer,offset);
    if(i===0&&!reverse) ink.moveTo(x,y); else ink.lineTo(x,y);
  }
}
function lightWash(){
  const x=w*(.36+.28*Math.sin(t*.52));
  const y=h*(.40+.24*Math.cos(t*.43));
  const glow=ink.createRadialGradient(x,y,0,x,y,Math.max(w,h)*.48);
  glow.addColorStop(0,'rgba(255,250,202,.74)');
  glow.addColorStop(.29,'rgba(255,214,136,.29)');
  glow.addColorStop(1,'rgba(255,237,157,0)');
  ink.fillStyle=glow;ink.fillRect(0,0,w,h);
}
function draw(){
  ink.clearRect(0,0,w,h);
  lightWash();
  const spread=Math.min(.104, Math.max(.05, w/h*.102));
  for(const [n,layer] of ribbons.entries()){
    const [l,m,r]=layer.colors;
    // A translucent silk body gives each moving score genuine width and depth.
    const body=ink.createLinearGradient(0,0,w,h*.2);
    body.addColorStop(0,rgba(l,.25));body.addColorStop(.30,rgba(l,.34));
    body.addColorStop(.58,rgba(m,.22));body.addColorStop(1,rgba(r,.41));
    ink.beginPath();path(layer,-spread*.56);path(layer,spread*.56,true);ink.closePath();
    ink.fillStyle=body;ink.fill();
    const line=ink.createLinearGradient(0,0,w,h*.20);
    line.addColorStop(0,rgba(l,.65));line.addColorStop(.41,rgba(m,.57));line.addColorStop(1,rgba(r,.72));
    ink.lineCap='round';ink.lineJoin='round';
    ink.beginPath();path(layer);
    ink.strokeStyle=rgba(m,.13);ink.lineWidth=Math.max(10,Math.min(32,h*.034));ink.stroke();
    for(let j=-2;j<=2;j++){
      ink.beginPath();path(layer,j*spread*.17);
      ink.strokeStyle=j===0?'rgba(255,250,220,.90)':line;
      ink.lineWidth=j===0?2.6:1.1;
      ink.stroke();
    }
    for(let j=0;j<4;j++){
      const u=fract((n%2?-1:1)*t*(.115+n*.014)+j*.263+n*.063);
      const x=u*w,y=pathY(u,layer,((j%3)-1)*spread*.17);
      const veil=Math.min(1,u*9,(1-u)*9), radius=Math.max(9,Math.min(19,w*.037));
      const flare=ink.createRadialGradient(x,y,0,x,y,radius*2);
      flare.addColorStop(0,rgba([255,250,213],.96*veil));
      flare.addColorStop(.28,rgba(m,.51*veil));flare.addColorStop(1,rgba(m,0));
      ink.fillStyle=flare;ink.beginPath();ink.arc(x,y,radius*2,0,Math.PI*2);ink.fill();
      ink.fillStyle=rgba(mix(l,r,u),.61*veil);
      ink.beginPath();ink.ellipse(x,y,2.7,2,-.24,0,Math.PI*2);ink.fill();
      if(j%2===1){
        ink.beginPath();ink.moveTo(x+2.6,y);ink.lineTo(x+2.6,y-9.7);
        ink.quadraticCurveTo(x+8.8,y-7.8,x+7.9,y-4.2);
        ink.strokeStyle=ink.fillStyle;ink.lineWidth=1.25;ink.stroke();
      }
    }
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
