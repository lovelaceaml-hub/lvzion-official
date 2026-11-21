import {PEACE_CONCERT_TITLE, PEACE_CONCERT_TITLE_LINES} from '../../lib/concert/branding';
import type {NamedTicket} from '../../lib/concert/registration';

const width = 640;
const height = 890;
const center = width / 2;
const ivory = '#fffaee';
const navy = '#193459';

function png(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(Error('Image unavailable')), 'image/png',
  ));
}

// Draw the flyer foliage directly so exporting a ticket only needs its own QR.
function drawSprig(ctx: CanvasRenderingContext2D, x: number, direction: number) {
  ctx.save();
  ctx.translate(x, 155);
  ctx.scale(direction, 1);
  ctx.strokeStyle = '#527452';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(38, -37, 47, -96);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const y = -16 - 19 * i;
    const stem = 13 + 12 * i - i * i;
    ctx.fillStyle = i % 2 ? '#447454' : '#80a077';
    ctx.beginPath();
    ctx.ellipse(stem - 4, y - 8, 6, 14, -0.45, 0, Math.PI * 2);
    ctx.ellipse(stem + 8, y - 2, 13, 5, -0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPass(ctx: CanvasRenderingContext2D, image: HTMLImageElement, title: string, name: string, index: number, count: number) {
  ctx.fillStyle = ivory;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = navy;
  ctx.fillRect(0, 0, width, 10);
  ctx.textAlign = 'center';
  drawSprig(ctx, 18, 1);
  drawSprig(ctx, width - 18, -1);
  ctx.fillStyle = navy;
  if (title === PEACE_CONCERT_TITLE) {
    const [intro, love, peace] = PEACE_CONCERT_TITLE_LINES;
    ctx.font = '600 22px Arial, sans-serif';
    ctx.fillText(intro, center, 45);
    ctx.fillStyle = '#c53158';
    ctx.font = 'bold 56px Arial, sans-serif';
    ctx.fillText(love, center, 100);
    ctx.fillStyle = navy;
    ctx.font = 'bold 35px Arial, sans-serif';
    ctx.fillText(peace, center, 142);
  } else {
    ctx.font = 'bold 38px Arial, sans-serif';
    ctx.fillText(title, center, 99, width - 166);
  }

  ctx.fillStyle = '#bf3058';
  ctx.beginPath();
  ctx.moveTo(100, 164);
  ctx.lineTo(540, 164);
  ctx.lineTo(526, 185);
  ctx.lineTo(540, 206);
  ctx.lineTo(100, 206);
  ctx.lineTo(114, 185);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px Arial, sans-serif';
  ctx.fillText('Admission ticket · ' + (index + 1) + ' of ' + count, center, 192);

  ctx.fillStyle = navy;
  ctx.font = 'bold 33px Arial, sans-serif';
  ctx.fillText(name, center, 252, width - 56);
  const qrSize = 552;
  const left = (width - qrSize) / 2;
  ctx.fillStyle = '#c1ceba';
  ctx.fillRect(left - 5, 269, qrSize + 10, qrSize + 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(left - 3, 271, qrSize + 6, qrSize + 6);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, left, 274, qrSize, qrSize);

  ctx.fillStyle = navy;
  ctx.fillRect(0, 845, width, 45);
  ctx.fillStyle = ivory;
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText('LV Zion', center, 874);
  ctx.fillStyle = '#ec9eae';
  ctx.font = '24px Georgia, serif';
  ctx.fillText('♪', 246, 875);
  ctx.fillText('♫', 394, 875);
}

export async function passImages(tickets: NamedTicket[], title: string) {
  const canvases = await Promise.all(tickets.map(async (ticket, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Image unavailable');
    const image = new Image();
    const source = ticket.svg ? URL.createObjectURL(new Blob([ticket.svg], {type: 'image/svg+xml'})) : ticket.url + '/qr';
    try {
      image.src = source;
      await image.decode();
      drawPass(ctx, image, title, ticket.name, index, tickets.length);
    } finally {
      if (ticket.svg) URL.revokeObjectURL(source);
    }
    return canvas;
  }));
  const files = await Promise.all(canvases.map(async (canvas, i) => new File([await png(canvas)],
    'Concert-' + (i + 1) + '-' + tickets[i].name.replace(/[^\p{L}\p{N} -]/gu, '').slice(0, 65) + '.png', {type: 'image/png'})));
  let sheet = files[0];
  if (files.length > 1) {
    const canvas = document.createElement('canvas');
    const columns = files.length > 3 ? 2 : 1;
    canvas.width = width * columns;
    canvas.height = height * Math.ceil(files.length / columns);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Image unavailable');
    ctx.fillStyle = ivory;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvases.forEach((image, i) => ctx.drawImage(image, (i % columns) * width, Math.floor(i / columns) * height));
    sheet = new File([await png(canvas)], 'Concert-party-tickets.png', {type: 'image/png'});
  }
  return {files, sheet};
}
