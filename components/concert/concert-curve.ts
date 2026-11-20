// Both forms share the same closed path parameter, so the moving lights and their
// wakes stay attached to the constellation as the tilted ellipse opens into a heart.
export function concertCurve(angle: number, heart: number, tilt: number) {
  const s = Math.sin(angle), c = Math.cos(angle);
  const ovalX = s * .97 + c * .12;
  const ovalY = -c * .8 - s * .3;
  const heartX = s ** 3;
  const heartY = -(13*c - 5*Math.cos(2*angle) - 2*Math.cos(3*angle) - Math.cos(4*angle) + 2) / 17;
  return {
    x: ovalX + heart * (heartX - ovalX) + tilt * c * .065,
    y: ovalY + heart * (heartY - ovalY),
  };
}
