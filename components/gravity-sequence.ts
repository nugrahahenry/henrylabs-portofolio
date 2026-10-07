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
