import * as THREE from "three";

export const DISTANT_STAR_COUNT = 1800;
export const COMPACT_STAR_COUNT = 1000;
export const FEEDING_DUST_COUNT = 240;

const spread = (index: number, step: number) => ((index + .5) * step) % 1;

export function distantStarPoint(index: number, out = new THREE.Vector3()) {
  const depth = 18 + spread(index, .438579) * 22;
  return out.set(
    (spread(index, .754877666) * 2 - 1) * (depth + 6.8) * .98,
    (spread(index, .569840296) * 2 - 1) * (depth + 6.8) * .5,
    -depth,
  );
}

// View-relative sources retain upper/side coverage across camera motion and aspect ratios.
export function dustStreamSource(index: number, out = new THREE.Vector3()) {
  const u = spread(index, .754877666), v = spread(index, .569840296);
  const lane = index % 4;
  const depth = -(11 + spread(index, .438579) * 3);
  if (lane < 2) return out.set(-.96 + u * 1.6, .64 + v * .32, depth);
  if (lane === 2) return out.set(-.98 + u * .12, -.5 + v * 1.2, depth);
  return out.set(-.96 + u * 1.3, -.96 + v * .22, depth);
}
