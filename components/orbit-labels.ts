export type OrbitLabelBox = { x: number; y: number; width: number; height: number };

// Only crowded, short viewports use this bounded nearest-free-position search.
export function placeOrbitLabel(x: number, y: number, width: number, height: number, frameWidth: number, frameHeight: number, occupied: OrbitLabelBox[]): OrbitLabelBox {
  let best = { x, y, width, height };
  let bestCost = Infinity;
  for (let row = -2; row <= 2; row++) for (let column = -2; column <= 2; column++) {
    const left = Math.max(4, Math.min(frameWidth - width - 4, x + column * (width + 8)));
    const top = Math.max(4, Math.min(frameHeight - height - 4, y + row * (height + 8)));
    let overlap = 0;
    for (const other of occupied) overlap += Math.max(0, Math.min(left + width + 8, other.x + other.width + 8) - Math.max(left, other.x))
      * Math.max(0, Math.min(top + height + 8, other.y + other.height + 8) - Math.max(top, other.y));
    const cost = overlap * 1e6 + (left - x) ** 2 + (top - y) ** 2;
    if (cost < bestCost) { bestCost = cost; best = { x: left, y: top, width, height }; }
  }
  return best;
}
