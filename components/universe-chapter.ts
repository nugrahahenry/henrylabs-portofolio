// DOM reveal, camera travel and navigation share the same exploration window.
export const UNIVERSE_CHAPTER = {
  entry: .18,
  visible: .32,
  settled: .4,
  landing: .57,
  departure: .88,
  hidden: .995,
} as const;

export function universeLanding(top: number, height: number, viewport: number) {
  return top + Math.max(0, height - viewport) * UNIVERSE_CHAPTER.landing;
}

export function chapterBlend(progress: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}
