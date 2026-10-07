export type GalaxyFlightPose = {
  pan: number;
  approach: number;
  orbitScale: number;
  selectedVisibility: number;
  otherVisibility: number;
};

function ease(value: number, start: number, end: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function advanceGalaxyFlight(value: number, entering: boolean, dt: number) {
  const step = Math.max(0, dt) / (entering ? 1.1 : .7);
  return entering ? Math.min(1, value + step) : Math.max(0, value - step);
}

// Pan to the chosen nucleus before trading its dust for the local project system.
export function sampleGalaxyFlight(progress: number, out: GalaxyFlightPose) {
  out.pan = ease(progress, 0, .72);
  out.approach = ease(progress, .12, 1);
  out.orbitScale = ease(progress, .46, 1);
  out.selectedVisibility = 1 - ease(progress, .38, .96);
  out.otherVisibility = 1 - ease(progress, .04, .62);
  return out;
}
