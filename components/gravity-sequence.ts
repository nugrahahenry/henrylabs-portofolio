export const GRAVITY_INTAKE_SECONDS = 32;
export const GRAVITY_REST_SECONDS = 30;
export const GRAVITY_BIRTH_SECONDS = 4;

export type ClosingScrollState = { peak: number; presence: number; returning: boolean };

function smooth(value: number, start: number, end: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function updateClosingScroll(state: ClosingScrollState, progress: number, dt: number, motionOn: boolean) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  // Keep the last encounter pose until the reader rejoins it or leaves it completely.
  if (state.peak === 0 && p > 0) state.presence = 1;
  state.peak = Math.max(state.peak, p);
  state.returning = p < state.peak - .002;
  const target = state.peak > 0 ? p > 0 && !state.returning ? 1 : p / state.peak : 0;
  const step = Number.isFinite(dt) ? Math.max(0, Math.min(dt, .04)) : 0;
  state.presence = motionOn ? state.presence + (target - state.presence) * (1 - Math.exp(-7 * step)) : target;
  if (Math.abs(state.presence - target) < .001) state.presence = target;
  if (p === 0 && state.presence === 0) { state.peak = 0; state.returning = false; }
  return state;
}

export function closingReturn(presence: number, out = { infall: 0, growth: 0, opacity: 0 }) {
  const p = Number.isFinite(presence) ? presence : 0;
  out.infall = smooth(p, .42, 1);
  out.growth = smooth(p, 0, .46);
  out.opacity = smooth(p, 0, .12);
  return out;
}

export function gravityVisitors(index: number) {
  const cycle = Math.max(0, Math.floor(Number.isFinite(index) ? index : 0));
  return { count: [3, 5, 3, 5, 5][cycle % 5], direction: cycle % 2 === 0 ? "left" as const : "top" as const };
}

export function gravityVisitorEntry(index: number) {
  // Camera coordinates keep the first distant silhouette above the Contact copy.
  const top = gravityVisitors(index).direction === "top";
  const cycle = Math.max(0, Math.floor(Number.isFinite(index) ? index : 0));
  return { x: top ? .16 : -.32, y: top ? .87 : .8, z: -78 - cycle % 3 * 4 };
}

export function gravityVisitorPose(progress: number, index: number, aspect: number, holeX: number, holeY: number) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const entry = gravityVisitorEntry(index);
  const approach = smooth(p, 0, .3);
  // Portrait layouts need a longer upper lane before crossing the Contact heading.
  const compact = 1 - smooth(aspect, .8, 1.2);
  const capture = smooth(p, .22 + compact * .28, 1);
  const x = entry.x + (.48 - entry.x) * approach * compact + Math.sin(approach * Math.PI) * .06;
  const y = entry.y - approach * (.1 - compact * .08);
  const targetX = holeX * 2 - 1, targetY = 1 - holeY * 2;
  const dx = (x - targetX) * aspect, dy = y - targetY;
  const angle = gravityApproachAngle(Math.atan2(dy, dx), capture) + Math.sin(capture * Math.PI) * (index % 2 ? .16 : -.24) * (1 - compact);
  const radius = Math.hypot(dx, dy) * Math.pow(1 - capture, 1.25);
  return {
    x: targetX + Math.cos(angle) * radius / aspect,
    y: targetY + Math.sin(angle) * radius,
    z: entry.z + (-8.8 - entry.z) * approach + capture * 4,
    approach, capture,
    scale: 1 - smooth(capture, .65, 1) * .65,
  };
}

export function gravityVisitorMember(progress: number, index: number) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const slot = Math.max(0, Math.min(4, Math.floor(index)));
  return {
    scale: [.95, .74, 1.1, .66, .88][slot],
    depth: [-.45, .7, -1.05, .34, -.7][slot],
    phase: slot * 2.399,
    opacity: smooth(p, slot * .002, .08 + slot * .005) * (1 - smooth(p, .76 + slot * .026, .87 + slot * .026)),
  };
}

export type ReadingRect = { left: number; top: number; right: number; bottom: number };

export function gravityReadingVisibility(x: number, y: number, radius: number, width: number, height: number, reading: ReadingRect[], readingFloor = 0) {
  const frame = smooth(Math.min(x, y, width - x, height - y) - radius, 0, 24);
  let clearance = Infinity;
  for (const rect of reading) {
    const dx = Math.max(rect.left - x, 0, x - rect.right);
    const dy = Math.max(rect.top - y, 0, y - rect.bottom);
    clearance = Math.min(clearance, Math.hypot(dx, dy) - radius - 8);
  }
  // A moving body should recede behind the copy, not disappear and respawn past it.
  const floor = Math.max(0, Math.min(1, readingFloor));
  return Math.min(frame, floor + (1 - floor) * smooth(clearance, 0, floor > 0 ? 80 : 24));
}

export function gravityApproachAngle(entryAngle: number, progress: number) {
  // Approach the cropped horizon from its visible upper-left quadrant on every aspect ratio.
  return entryAngle + (Math.PI * .58 - entryAngle) * Math.pow(Math.max(0, Math.min(1, progress)), 1.5);
}

export function gravityBirth(age: number) {
  const safeAge = Number.isFinite(age) ? age : 0;
  const fraction = Math.max(0, Math.min(1, safeAge / GRAVITY_BIRTH_SECONDS));
  return { growth: fraction * fraction * (3 - 2 * fraction), ready: fraction >= 1 };
}

export function gravitySequence(age: number) {
  const safeAge = Math.max(0, Number.isFinite(age) ? age : 0);
  const period = GRAVITY_INTAKE_SECONDS + GRAVITY_REST_SECONDS;
  const index = Math.floor(safeAge / period);
  const local = safeAge - index * period;
  const infalling = local < GRAVITY_INTAKE_SECONDS;
  const fraction = Math.min(1, local / GRAVITY_INTAKE_SECONDS);
  const progress = fraction * fraction * (3 - 2 * fraction);
  return {
    index, progress, phase: infalling ? "infall" : "rest",
    fieldPull: index === 0 ? progress : 1,
    visitorVisible: infalling,
    wait: infalling ? GRAVITY_REST_SECONDS : period - local,
  };
}

export function advanceGravityAge(age: number, delta: number, active: boolean) {
  // A resumed or stalled frame must not catch up a hidden multi-minute interval.
  return age + (active && Number.isFinite(delta) ? Math.max(0, Math.min(delta, .25)) : 0);
}
