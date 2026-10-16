export const SKY_PIXEL_BUDGET = 1_500_000;
const scales = [1, .85, .7] as const;
export const skyQualityNames = ["full", "balanced", "economy"] as const;

export function createPaintClock() { return { last: -1 }; }

// Carry the fractional remainder so a 30fps scene does not slip to 20fps on 60Hz screens.
// Quality sampling must happen before this gate, against the browser's actual RAF cadence.
export function paintDue(clock: ReturnType<typeof createPaintClock>, now: number, fps: number, force = false) {
  const interval = 1000 / fps;
  const delta = now - clock.last;
  if (force || clock.last < 0 || delta < 0 || delta > 250) { clock.last = now; return true; }
  if (delta < interval - .5) return false;
  clock.last = now - Math.max(0, delta % interval);
  if (delta < interval) clock.last = now;
  return true;
}

export function skyPixelRatio(width: number, height: number, dpr: number, cap: number, tier = 0) {
  const positive = (value: number) => Number.isFinite(value) && value > 0 ? value : 1;
  const pixels = positive(width) * positive(height);
  return Math.min(positive(dpr), positive(cap), Math.sqrt(SKY_PIXEL_BUDGET / pixels))
    * scales[Math.max(0, Math.min(2, Math.trunc(tier) || 0))];
}

export function createSkyQuality() {
  return { tier: 0, last: 0, warmup: 1200, duration: 0, frames: 0, slow: 0 };
}

export type SkyQuality = ReturnType<typeof createSkyQuality>;

export function resetSkySample(state: SkyQuality) {
  state.last = 0;
  state.warmup = 1200;
  state.duration = 0;
  state.frames = 0;
  state.slow = 0;
}

// Observe the existing RAF, not a new loop or the library's intentional 24fps paint cadence.
// Hold a lower tier for this scene lifetime to avoid repeated sharpening/softening.
export function sampleSkyQuality(state: SkyQuality, now: number, active: boolean) {
  if (!active || !Number.isFinite(now)) { resetSkySample(state); return false; }
  const delta = state.last ? now - state.last : 0;
  state.last = now;
  if (delta <= 0 || delta > 250) { resetSkySample(state); state.last = now; return false; }
  if (state.warmup > 0) { state.warmup -= delta; return false; }
  state.duration += delta;
  state.frames++;
  if (delta > 28) state.slow++;
  if (state.duration < 2400 || state.frames < 24) return false;
  const lower = state.tier < 2 && state.slow / state.frames >= .6;
  if (lower) state.tier++;
  state.duration = 0;
  state.frames = 0;
  state.slow = 0;
  state.warmup = lower ? 1200 : 0;
  return lower;
}
