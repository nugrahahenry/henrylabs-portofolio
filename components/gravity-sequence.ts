export const GRAVITY_INTAKE_SECONDS = 32;
export const GRAVITY_REST_SECONDS = 195;

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
