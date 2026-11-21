import './festival-sky.css';
import {setFestivalCurve, type FestivalSweep} from './festival-paths';

export type FestivalDirection = 'open' | 'forward' | 'back' | 'success';
export type FestivalExpression = 'greeting' | 'inclusiveness' | 'consideration' | 'gratitude';
export type FestivalAccent = 'original' | FestivalExpression;
type MakeExpression = (kind: FestivalExpression) => HTMLElement;

// From and to positions as viewport percentages, size in pixels, and delay.
type Flight = readonly [
  shape: 'heart' | 'star' | 'leaf', color: string, startX: number, startY: number,
  endX: number, endY: number, size: number, delay: number,
];

const originalHearts = [
  ['heart', 'rose', 5, 78, 28, 18, 45, 40],
  ['heart', 'blush', 93, 72, 69, 16, 37, 72],
  ['heart', 'rose', 26, 101, 15, 48, 29, 160],
  ['heart', 'lavender', 73, 97, 96, 38, 26, 112],
  ['heart', 'blush', 4, 43, 27, 2, 20, 138],
  ['heart', 'lavender', 98, 46, 80, 0, 20, 192],
] as const satisfies readonly Flight[];

const starsAndLeaves = [
  ['star', 'gold', 16, 81, 25, 26, 31, 35],
  ['star', 'gold', 85, 67, 68, 29, 30, 20],
  ['star', 'pearl', 2, 53, 19, 10, 24, 102],
  ['star', 'pearl', 96, 42, 87, 6, 21, 95],
  ['star', 'gold', 31, 91, 14, 67, 17, 194],
  ['star', 'pearl', 68, 88, 89, 56, 17, 179],
  ['leaf', 'sage', -6, 81, 55, 33, 76, 30],
  ['leaf', 'gold', 18, 95, 86, 53, 53, 47],
  ['leaf', 'sage', -8, 56, 56, 9, 37, 98],
  ['leaf', 'rose', 53, 96, 107, 52, 49, 134],
  ['leaf', 'gold', 9, 53, 70, -3, 29, 148],
  ['leaf', 'sage', 42, 85, 102, 34, 39, 185],
] as const;

// Each pair shares an edge of the screen so the center stays readable.
const hearts: Record<FestivalAccent, readonly Flight[]> = {
  original:originalHearts,
  greeting:originalHearts,
  inclusiveness:[
    ['heart', 'coral', 0, 74, 21, 33, 44, 40], ['heart', 'lilac', 27, 71, 24, 32, 30, 70],
    ['heart', 'lilac', 97, 77, 79, 38, 42, 102], ['heart', 'coral', 73, 73, 76, 37, 30, 132],
    ['heart', 'blush', 5, 48, 16, 8, 19, 153], ['heart', 'rose', 91, 50, 82, 12, 21, 177],
  ],
  consideration:[
    ['heart', 'blush', 1, 80, 16, 27, 40, 30], ['heart', 'lavender', 2, 88, 17, 35, 24, 120],
    ['heart', 'lavender', 91, 68, 77, 19, 36, 70], ['heart', 'blush', 94, 76, 80, 27, 22, 160],
    ['heart', 'rose', 57, 99, 88, 66, 23, 139], ['heart', 'blush', 54, 103, 85, 70, 15, 205],
  ],
  gratitude:[
    ['heart', 'honey', 3, 70, 18, 19, 47, 38], ['heart', 'champagne', 87, 70, 78, 16, 40, 63],
    ['heart', 'champagne', 25, 95, 10, 39, 27, 129], ['heart', 'honey', 76, 94, 94, 43, 30, 111],
    ['heart', 'blush', 4, 48, 20, 8, 18, 161], ['heart', 'champagne', 94, 48, 84, 6, 19, 189],
  ],
};

// Small gold glints move out from the supplied illustration. Offsets are in pixels.
type Glint = readonly [x: number, y: number, size: number, delay: number];
const glints: Record<FestivalExpression, readonly Glint[]> = {
  greeting:[[10, -25, 9, 20], [25, -16, 13, 65], [31, 1, 7, 115]],
  inclusiveness:[[-27, -8, 10, 60], [-11, -25, 13, 15], [10, -24, 8, 110]],
  consideration:[[-26, -9, 11, 20], [-17, -22, 7, 90], [18, -24, 12, 125]],
  gratitude:[[-27, -8, 12, 20], [-16, -25, 9, 65], [1, -32, 17, 0], [19, -25, 11, 85], [30, -7, 14, 45]],
};

function expressionImage(kind: FestivalExpression) {
  const art = document.createElement('img');
  art.alt = '';
  art.src = '/concert/festival-' + kind + '.webp';
  return art;
}

function createExpression(kind: FestivalExpression, makeExpression: MakeExpression) {
  const expression = document.createElement('span');
  expression.className = 'cc-sky-expression';
  expression.dataset.shape = 'expression';
  expression.dataset.expression = kind;
  expression.append(makeExpression(kind));
  for (const [x, y, size, delay] of glints[kind]) {
    const glint = document.createElement('i');
    glint.className = 'cc-sky-glint';
    glint.style.setProperty('--glint-x', x + 'px');
    glint.style.setProperty('--glint-y', y + 'px');
    glint.style.setProperty('--glint-size', size + 'px');
    glint.style.setProperty('--glint-delay', delay + 'ms');
    expression.append(glint);
  }
  return expression;
}

export function createFestivalSky(direction: FestivalDirection, sweep: FestivalSweep = 'breeze',
  accent: FestivalAccent = 'original', makeExpression: MakeExpression = expressionImage) {
  const sky = document.createElement('span');
  sky.inert = true;
  sky.setAttribute('aria-hidden', 'true');
  sky.className = 'cc-festival-sky';
  sky.dataset.direction = direction;
  sky.dataset.accent = accent;
  sky.dataset.sweep = sweep;
  const flights = [...hearts[accent], ...starsAndLeaves];
  for (const [index, [shape, color, startX, startY, endX, endY, size, delay]] of flights.entries()) {
    const particle = document.createElement('i');
    particle.dataset.shape = shape;
    particle.dataset.color = color;
    if (sweep === 'breeze') {
      particle.style.setProperty('--particle-x', startX + '%');
      particle.style.setProperty('--particle-y', startY + '%');
      particle.style.setProperty('--particle-dx', (endX - startX) + 'vw');
      particle.style.setProperty('--particle-dy', (endY - startY) + 'dvh');
    } else {
      setFestivalCurve(particle, sweep, index, 'sky');
    }
    particle.style.setProperty('--particle-size', size + 'px');
    particle.style.setProperty('--particle-delay', delay + 'ms');
    sky.append(particle);
  }
  if (accent !== 'original') sky.append(createExpression(accent, makeExpression));
  return sky;
}

export function openFestivalSky(dialog: HTMLDialogElement, direction: FestivalDirection, sweep: FestivalSweep, accent: FestivalAccent) {
  const sky = createFestivalSky(direction, sweep, accent);
  // A manual popover covers the viewport without moving focus or intercepting taps.
  const native = typeof sky.showPopover === 'function';
  if (native) sky.popover = 'manual';
  dialog.append(sky);
  if (!native) return sky;
  try {
    sky.showPopover();
  } catch {
    // Retain a click-through inline layer if the native top layer is unavailable.
    sky.removeAttribute('popover');
  }
  return sky;
}
