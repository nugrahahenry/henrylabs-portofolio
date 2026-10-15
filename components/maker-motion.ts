export const MAKER_RETREAT_START = .62;
export const MAKER_PROOF_START = .71;

export function makerEvidenceAt(progress: number, index: number) {
  const travel = Math.min(1, Math.max(0, (progress - MAKER_PROOF_START - .005 - index * .012) / .105));
  return { travel, eased: 1 - Math.pow(1 - travel, 3), arrived: travel >= .95 };
}

export function makerGroupAt(progress: number) {
  return progress < .14 ? 0 : progress < .28 ? 1 : progress < .43 ? 2 : 3;
}

// A linear reading layout has no orbit timeline; return to the same semantic chapter.
export function makerReadingProgress(progress: number, group: number, proof: boolean, continuous = false) {
  if (continuous && Number.isFinite(progress)) return Math.min(1, Math.max(0, progress));
  if (proof) return Math.min(.97, Math.max(.87, Number.isFinite(progress) ? progress : .87));
  const chapter = Math.min(3, Math.max(0, Math.trunc(group) || 0));
  return Number.isFinite(progress) && progress >= 0 && progress < MAKER_RETREAT_START && makerGroupAt(progress) === chapter
    ? progress : [.06, .2, .35, .52][chapter];
}

export type OrbitRotation = { angle: number; velocity: number; dragging: boolean };

export type MakerOrbitLayout = { radius: number; depthRadius: number; verticalRadius: number; verticalBias: number; lanes: number };
type OrbitPoint = { x: number; y: number; z: number };

// Satellites and their tracks share one curve in the portrait's depth space.
export function makerOrbitPoint(theta: number, laneIndex: number, layout: MakerOrbitLayout, out: OrbitPoint) {
  const lane = layout.lanes === 3 ? 1 - laneIndex * .1 : laneIndex ? .79 : 1;
  const y = layout.lanes === 3
    ? Math.sin(theta) * layout.verticalRadius * .38 + (laneIndex - 1) * layout.verticalRadius * .6
    : Math.sin(theta) * layout.verticalRadius * lane;
  out.x = Math.cos(theta) * layout.radius * lane;
  out.y = -layout.verticalBias - y;
  out.z = Math.sin(theta) * layout.depthRadius;
  return out;
}

export function advanceMakerRotation(rotation: OrbitRotation, delta: number, paused: boolean) {
  const dt = Math.min(.05, Math.max(0, delta));
  if (rotation.dragging) return;
  rotation.angle += (rotation.velocity + (paused ? 0 : .14)) * dt;
  rotation.velocity *= Math.exp(-3.4 * dt);
}

export type PortraitAlpha = { data: Uint8ClampedArray; width: number; height: number };
export type PortraitBounds = { left: number; right: number; top: number; bottom: number };

// A visible crescent through transparent hair must retain its native HTML hit target.
export function portraitCoversSatellite(mask: PortraitAlpha | undefined, bounds: PortraitBounds, x: number, y: number, radius: number) {
  if (!mask) return false;
  for (let i = 0; i < 9; i++) {
    const angle = (i - 1) * Math.PI / 4;
    const px = x + (i ? Math.cos(angle) * radius * .75 : 0);
    const py = y + (i ? Math.sin(angle) * radius * .75 : 0);
    const u = (px - bounds.left) / (bounds.right - bounds.left);
    const v = (py - bounds.top) / (bounds.bottom - bounds.top);
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    const alpha = mask.data[(Math.floor(v * mask.height) * mask.width + Math.floor(u * mask.width)) * 4 + 3];
    if (alpha < 26) return false;
  }
  return true;
}

const labelSamples = [[0, 0], [-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]] as const;

export function portraitOverlapsLabel(mask: PortraitAlpha | undefined, bounds: PortraitBounds, x: number, y: number, width: number, height: number) {
  for (const [dx, dy] of labelSamples) {
    if (portraitCoversSatellite(mask, bounds, x + width * dx, y + height * dy, 0)) return true;
  }
  return false;
}
