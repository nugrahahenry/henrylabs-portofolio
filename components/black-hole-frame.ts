export function blackHoleFrame(width: number, height: number, growth = 1) {
  const t = Math.min(1, Math.max(0, growth));
  const endX = width < height ? .82 : .86;
  return {
    x: .96 + (endX - .96) * t,
    y: .94 - .08 * t,
    diameter: Math.min(width * .9, height * .7),
    scale: .08 + t * .92,
  };
}
