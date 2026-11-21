import './festival-sky.css';

type Scene = 'open' | 'forward' | 'back' | 'success';

// From and to positions as viewport percentages, size in pixels, and delay.
const particles = [
  ['heart', 'rose', 5, 78, 28, 18, 45, 40],
  ['heart', 'blush', 93, 72, 69, 16, 37, 72],
  ['heart', 'rose', 26, 101, 15, 48, 29, 160],
  ['heart', 'lavender', 73, 97, 96, 38, 26, 112],
  ['heart', 'blush', 4, 43, 27, 2, 20, 138],
  ['heart', 'lavender', 98, 46, 80, 0, 20, 192],
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

export function openFestivalSky(dialog: HTMLDialogElement, direction: Scene) {
  const sky = document.createElement('span');
  if (typeof sky.showPopover !== 'function') return;
  // A manual popover sits above the modal without changing its focus or hit testing.
  sky.popover = 'manual';
  sky.inert = true;
  sky.setAttribute('aria-hidden', 'true');
  sky.className = 'cc-festival-sky';
  sky.dataset.direction = direction;
  for (const [shape, color, startX, startY, endX, endY, size, delay] of particles) {
    const particle = document.createElement('i');
    particle.dataset.shape = shape;
    particle.dataset.color = color;
    particle.style.setProperty('--particle-x', startX + '%');
    particle.style.setProperty('--particle-y', startY + '%');
    particle.style.setProperty('--particle-dx', (endX - startX) + 'vw');
    particle.style.setProperty('--particle-dy', (endY - startY) + 'dvh');
    particle.style.setProperty('--particle-size', size + 'px');
    particle.style.setProperty('--particle-delay', delay + 'ms');
    sky.append(particle);
  }
  dialog.append(sky);
  try {
    sky.showPopover();
    return sky;
  } catch {
    sky.remove();
  }
}
