const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function titleTilt(x: number, y: number) {
  return { x: -clamp(y, -1, 1) * 1.6, y: clamp(x, -1, 1) * 2.4 };
}

// Perspective affects lettering, never the outer keyboard/touch target.
export function galaxyLetterScale(referenceDepth: number, depth: number, emphasis: number, motionOn: boolean) {
  if (!motionOn || !Number.isFinite(depth) || depth <= 0) return 1;
  return clamp(referenceDepth / depth, .94, 1.04) + clamp(emphasis, 0, 1) * .015;
}
