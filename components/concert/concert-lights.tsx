'use client';

import {useEffect, useRef} from 'react';
import {concertCurve} from './concert-curve';

const TURN = Math.PI * 2;
const PALETTE = ['255,194,126', '255,145,173', '201,179,252', '255,233,203'];

function makeGlow(rgb: string, core: boolean) {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const pen = sprite.getContext('2d')!;
  const glow = pen.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, core ? '#fff9ec' : `rgba(${rgb},.3)`);
  glow.addColorStop(.12, `rgba(${rgb},${core ? .96 : .25})`);
  glow.addColorStop(.35, `rgba(${rgb},${core ? .46 : .14})`);
  glow.addColorStop(1, `rgba(${rgb},0)`);
  pen.fillStyle = glow;
  pen.fillRect(0, 0, 64, 64);
  return sprite;
}

function makeStars(count: number) {
  let seed = 11206;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const scatter = () => random() + random() + random() - 1.5;
  return Array.from({length: count}, () => ({
    phase: random() * TURN, spread: scatter(), depth: scatter(), drift: random(),
    flare: random() ** 4, color: Math.floor(random() * 4),
  }));
}

type Beat = {x: number; y: number; time: number; spacing: number};

function sampleBeat(points: Beat[], x: number, y: number, time: number) {
  const previous = points.at(-1);
  const distance = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
  if (previous && distance < 1.5) return;
  const speed = previous ? distance / Math.max(.008, time - previous.time) : 0;
  const spacing = Math.min(6, 1.6 + speed * .005);
  // Touch devices can coalesce a quick sweep into a single long segment.
  const steps = Math.max(1, Math.min(24, Math.ceil(distance / 8)));
  for (let step = 1; step <= steps; step++) {
    const u = step / steps;
    points.push(previous ? {
      x: previous.x + (x - previous.x) * u, y: previous.y + (y - previous.y) * u,
      time: previous.time + (time - previous.time) * u,
      spacing: previous.spacing + (spacing - previous.spacing) * u,
    } : {x, y, time, spacing});
  }
  if (points.length > 56) points.splice(0, points.length - 56);
}

function paintStaff(ctx: CanvasRenderingContext2D, points: Beat[], color: string, opacity: number) {
  if (points.length < 2 || opacity <= 0) return;
  ctx.strokeStyle = `rgba(${color},${opacity})`;
  ctx.lineWidth = 1.05;
  ctx.lineCap = 'round';
  for (let line = -2; line <= 2; line++) {
    ctx.beginPath();
    let lastX = 0, lastY = 0;
    points.forEach((point, i) => {
      const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
      const vx = after.x - before.x, vy = after.y - before.y;
      const length = Math.hypot(vx, vy) || 1;
      const taper = Math.sin(Math.PI * i / (points.length - 1)) ** .5;
      const offset = line * point.spacing * taper / length;
      const x = point.x - vy * offset, y = point.y + vx * offset;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.quadraticCurveTo(lastX, lastY, (lastX + x) / 2, (lastY + y) / 2);
      lastX = x; lastY = y;
    });
    ctx.lineTo(lastX, lastY);
    ctx.stroke();
  }
}

export default function ConcertLights({startsAt}: {startsAt: string}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    const start = Date.parse(startsAt);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const stars = makeStars(1060);
    const sparks = PALETTE.map(color => makeGlow(color, true));
    const veils = PALETTE.map(color => makeGlow(color, false));
    let width = 0, height = 0, frame = 0, last = 0, visible = false;

    const handles = Array.from(controls.current?.querySelectorAll('button') ?? []);
    const guides = handles.map(() => ({
      baseX: 0, baseY: 0, dx: 0, dy: 0, targetX: 0, targetY: 0,
      beats: [] as Beat[], releaseAt: -Infinity, sweepAt: -Infinity,
      offsetX: 0, offsetY: 0, pointer: null as number | null,
    }));
    const hover = {x: 0, y: 0, targetX: 0, targetY: 0};
    const surface = controls.current;
    const listeners = new AbortController();
    const options = {signal: listeners.signal};

    function position(event: PointerEvent) {
      const rect = surface!.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * width / rect.width,
        y: (event.clientY - rect.top) * height / rect.height,
      };
    }
    function resetHover() { hover.targetX = hover.targetY = 0; }
    surface?.parentElement?.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || event.buttons || Date.now() >= start || reduced.matches) return;
      const point = position(event);
      hover.targetX = (point.x / width - .5) * 13;
      hover.targetY = (point.y / height - .5) * 10;
    }, options);
    surface?.parentElement?.addEventListener('pointerleave', resetHover, options);

    handles.forEach((handle, index) => {
      const guide = guides[index];
      handle.addEventListener('pointerdown', event => {
        if (Date.now() >= start || reduced.matches || !event.isPrimary || event.button !== 0) return;
        const point = position(event);
        guide.pointer = event.pointerId;
        guide.targetX = guide.baseX + guide.dx;
        guide.targetY = guide.baseY + guide.dy;
        guide.offsetX = guide.targetX - point.x;
        guide.offsetY = guide.targetY - point.y;
        guide.beats.length = 0;
        guide.sweepAt = guide.releaseAt = -Infinity;
        sampleBeat(guide.beats, guide.targetX, guide.targetY, performance.now() / 1000);
        if (surface) surface.dataset.conducted = 'true';
        handle.setPointerCapture(event.pointerId);
        handle.dataset.held = 'true';
        resetHover();
      }, options);
      handle.addEventListener('pointermove', event => {
        if (guide.pointer !== event.pointerId) return;
        const point = position(event);
        guide.targetX = Math.min(width - 10, Math.max(10, point.x + guide.offsetX));
        guide.targetY = Math.min(height - 10, Math.max(10, point.y + guide.offsetY));
        sampleBeat(guide.beats, guide.targetX, guide.targetY, performance.now() / 1000);
      }, options);
      const release = () => {
        if (guide.pointer === null) return;
        guide.releaseAt = elapsed.current;
        guide.pointer = null;
        delete handle.dataset.held;
      };
      handle.addEventListener('pointerup', release, options);
      handle.addEventListener('lostpointercapture', release, options);
      handle.addEventListener('pointercancel', release, options);
      handle.addEventListener('click', event => {
        if (event.detail !== 0 || Date.now() >= start || reduced.matches) return;
        guide.beats.length = 0;
        guide.sweepAt = elapsed.current;
        guide.releaseAt = -Infinity;
        if (surface) surface.dataset.conducted = 'true';
      }, options);
    });

    function draw() {
      if (!ctx || !width || !height) return;
      const remaining = Math.max(0, (start - Date.now()) / 1000);
      const t = reduced.matches || remaining === 0 ? 0 : elapsed.current;
      const heart = 1, tilt = 0;
      const rx = Math.min(width * .46, height * 1.25);
      const ry = height * .43;
      const cx = width * .5;
      const cy = height * .5;
      const lead = t * .59 + 1.08;
      hover.x += (hover.targetX - hover.x) * .15;
      hover.y += (hover.targetY - hover.y) * .15;
      guides.forEach((guide, index) => {
        const base = concertCurve(lead + Math.PI * index, heart, tilt);
        guide.baseX = cx + rx * base.x + hover.x;
        guide.baseY = cy + ry * base.y + hover.y;
        guide.dx = guide.pointer === null ? guide.dx * .89 : guide.targetX - guide.baseX;
        guide.dy = guide.pointer === null ? guide.dy * .89 : guide.targetY - guide.baseY;
        const sweep = (t - guide.sweepAt) / .65;
        if (sweep >= 0 && sweep <= 1) {
          guide.dx = (index ? 1 : -1) * rx * .8 * Math.sin(sweep * Math.PI);
          guide.dy = -ry * .45 * Math.sin(sweep * TURN);
          sampleBeat(guide.beats, guide.baseX + guide.dx, guide.baseY + guide.dy, t);
        } else if (Number.isFinite(guide.sweepAt)) {
          guide.releaseAt = t;
          guide.sweepAt = -Infinity;
        }
        handles[index].style.transform = `translate(${guide.baseX + guide.dx}px, ${guide.baseY + guide.dy}px) translate(-50%, -50%)`;
      });
      function curve(angle: number) {
        const p = concertCurve(angle, heart, tilt);
        let dx = hover.x, dy = hover.y;
        // Move the whole adjoining arc, with the strongest pull at the held light.
        for (let i = 0; i < guides.length; i++) {
          const weight = ((1 + Math.cos(angle - lead - i * Math.PI)) * .5) ** 7;
          dx += weight * guides[i].dx;
          dy += weight * guides[i].dy;
        }
        p.x += dx / rx;
        p.y += dy / ry;
        return p;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      // The minute hand traces the same heart as the stars; no independent timer.
      const fraction = remaining === 0 || reduced.matches ? 1 : (60 - remaining % 60) % 60 / 60;
      ctx.beginPath();
      for (let i = 0; i <= Math.ceil(fraction * 160); i++) {
        const point = curve(Math.min(fraction, i / 160) * TURN);
        const x = cx + rx * point.x, y = cy + ry * point.y;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 1.15;
      ctx.strokeStyle = '#f8d29cb0';
      ctx.stroke();
      // Broad overlapping halos give the dust a luminous body at phone resolution.
      for (let i = 0; i < 96; i++) {
        const angle = i * TURN / 96;
        const p = curve(angle);
        const radius = rx * (.14 + .06 * Math.sin(2 * angle + t * .3));
        ctx.globalAlpha = .45;
        ctx.drawImage(veils[Math.sin(angle) > 0 ? 0 : 1],
          cx + p.x * rx - radius, cy + p.y * ry - radius, radius * 2, radius * 2);
      }
      for (const star of stars) {
        const angle = star.phase + t * .15 + .085 * Math.sin(star.phase * 4 + t * .3);
        const p = curve(angle);
        const wake = Math.abs(Math.cos(angle - lead)) ** 12;
        const dust = .023 + star.flare * .14;
        const x = cx + rx * (p.x + dust * star.spread);
        const y = cy + ry * (p.y + dust * star.depth * 1.8 + .018 * Math.sin(star.phase * 9 + t + star.drift));
        const size = (.85 + 3.8 * star.flare + wake * 1.5) * Math.min(1.5, .75 + rx / 500);
        ctx.globalAlpha = (.36 + star.drift * .54) * (.7 + .3 * Math.sin(angle * 3 + t * 1.4) ** 2);
        const color = star.flare > .72 ? star.color : Math.sin(angle) > 0 ? 0 : 1;
        ctx.drawImage(sparks[color], x - size, y - size, 2 * size, 2 * size);
      }
      ctx.globalAlpha = 1;
      guides.forEach((guide, index) => {
        if (guide.beats.length < 2) return;
        const age = Math.max(0, t - guide.releaseAt);
        const blend = Number.isFinite(guide.releaseAt) ? Math.min(1, age / .85) : 0;
        if (blend === 1) { guide.beats.length = 0; return; }
        const staff = guide.beats.map((beat, i) => {
          const u = i / (guide.beats.length - 1);
          const target = curve(lead + index * Math.PI - (1 - u) * 1.5);
          return {...beat, x: beat.x + (cx + rx * target.x - beat.x) * blend,
            y: beat.y + (cy + ry * target.y - beat.y) * blend};
        });
        paintStaff(ctx, staff, PALETTE[index], .88 * (1 - blend));
      });
      // Two moving sources have tapering wakes and fine diffraction rays.
      for (let source = 0; source < 2; source++) {
        const color = source === 0 ? 0 : 1;
        for (let j = 20; j >= 0; j--) {
          const p = curve(lead + Math.PI * source - j * .022);
          const x = cx + rx * p.x, y = cy + ry * p.y;
          const radius = (j === 0 ? 20 : 8) * Math.min(1.5, rx / 175);
          ctx.globalAlpha = j === 0 ? 1 : .58 * (1 - j / 21);
          ctx.drawImage(sparks[color], x - radius, y - radius, 2 * radius, 2 * radius);
          if (j === 0) {
            ctx.drawImage(sparks[color], x - radius * 1.4, y - 1.3, radius * 2.8, 2.6);
            ctx.drawImage(sparks[color], x - 1, y - radius * .55, 2, radius * 1.1);
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    function tick(now: number) {
      if (!last || now - last >= 32) {
        if (last) elapsed.current += Math.min(.1, (now - last) / 1000);
        last = now;
        draw();
      }
      if (Date.now() < start) frame = requestAnimationFrame(tick);
      else sync();
    }
    function sync() {
      cancelAnimationFrame(frame);
      last = 0;
      handles.forEach(handle => { handle.disabled = Date.now() >= start || reduced.matches; });
      if (reduced.matches || Date.now() >= start) {
        resetHover(); hover.x = hover.y = 0;
        guides.forEach(guide => {
          guide.pointer = null; guide.dx = guide.dy = 0;
          guide.releaseAt = guide.sweepAt = -Infinity;
          guide.beats.length = 0;
        });
        draw();
      }
      if (visible && !document.hidden && Date.now() < start && !reduced.matches) frame = requestAnimationFrame(tick);

    }

    const resize = new ResizeObserver(() => {
      width = element.clientWidth;
      height = element.clientHeight;
      const ratio = Math.min(devicePixelRatio, 2);
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    });
    resize.observe(element);
    const observer = new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; sync();});
    observer.observe(element);
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      cancelAnimationFrame(frame);

      listeners.abort();
      handles.forEach(handle => { delete handle.dataset.held; });
      resize.disconnect();
      observer.disconnect();
      reduced.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [startsAt]);
  return <><canvas className="ml-lights" ref={canvas} aria-hidden="true"/>
    <div className="ml-light-handles" ref={controls}>
      <button type="button" aria-label="Move the gold light" title="Drag the gold light"/>
      <button type="button" aria-label="Move the rose light" title="Drag the rose light"/>
    </div></>;
}
