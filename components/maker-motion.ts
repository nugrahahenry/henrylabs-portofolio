export const MAKER_RETREAT_START = .62;
export const MAKER_PROOF_START = .71;

export function makerEvidenceAt(progress: number, index: number) {
  const travel = Math.min(1, Math.max(0, (progress - MAKER_PROOF_START - .005 - index * .012) / .105));
  return { travel, eased: 1 - Math.pow(1 - travel, 3), arrived: travel >= .95 };
}

export function makerGroupAt(progress: number) {
  return progress < .14 ? 0 : progress < .28 ? 1 : progress < .43 ? 2 : 3;
}

export type OrbitRotation = { angle: number; velocity: number; dragging: boolean };

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
