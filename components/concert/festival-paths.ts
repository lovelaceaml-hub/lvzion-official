type Point = readonly [x: number, y: number];
type Curve = readonly [start: Point, bend: Point, turn: Point, end: Point];

export const festivalSweeps = ['breeze', 'canopy', 'updraft', 'crossing', 'diagonal', 'fan'] as const;
export type FestivalSweep = typeof festivalSweeps[number];
type CurvedSweep = Exclude<FestivalSweep, 'breeze'>;

// Each group covers a different part of the scene. Coordinates are percentages
// of the layer, so a leaf can enter from outside the frame at any screen size.
const curves: Record<CurvedSweep, readonly Curve[]> = {
  canopy: [
    [[12, -14], [38, 18], [19, 60], [-6, 91]],
    [[46, -18], [29, 26], [61, 51], [55, 108]],
    [[82, -13], [62, 18], [85, 63], [104, 88]],
  ],
  updraft: [
    [[21, 115], [0, 72], [25, 29], [78, -13]],
    [[54, 112], [29, 94], [33, 44], [100, 9]],
    [[85, 109], [62, 70], [69, 38], [108, -7]],
  ],
  crossing: [
    [[-19, 30], [25, 15], [63, 52], [113, 36]],
    [[118, 76], [76, 93], [31, 44], [-12, 75]],
    [[-15, 64], [34, 50], [65, 24], [112, 5]],
    [[117, 39], [83, 45], [49, 77], [-11, 92]],
  ],
  diagonal: [
    [[112, -5], [96, 32], [40, 45], [-16, 77]],
    [[87, -19], [67, 17], [48, 69], [4, 113]],
    [[118, 24], [78, 29], [72, 71], [24, 112]],
  ],
  fan: [
    [[43, 110], [48, 71], [26, 34], [-14, 22]],
    [[53, 115], [62, 76], [76, 39], [114, 24]],
    [[57, 110], [36, 76], [43, 43], [56, -14]],
  ],
};

export function setFestivalCurve(element: HTMLElement, sweep: CurvedSweep, index: number,
  layer: 'card' | 'sky') {
  const lanes = curves[sweep];
  const lane = lanes[index % lanes.length];
  const trail = Math.floor(index / lanes.length);
  const spread = [0, -6, 7, -12, 13, 3][trail % 6];
  const point = ([x, y]: Point) => [x + spread, y + spread * .75] as const;
  const [[startX, startY], bend, turn, end] = lane.map(point);
  const sky = layer === 'sky';
  if (sky) {
    element.style.setProperty('--particle-x', startX + '%');
    element.style.setProperty('--particle-y', startY + '%');
  }
  const offsets = [[startX, startY] as const, bend, turn, end];
  for (const [waypoint, [x, y]] of offsets.entries()) {
    element.style.setProperty('--curve-x' + waypoint, (x - (sky ? startX : 50)) + (sky ? 'vw' : '%'));
    element.style.setProperty('--curve-y' + waypoint, (y - (sky ? startY : 50)) + (sky ? 'dvh' : '%'));
  }
}
