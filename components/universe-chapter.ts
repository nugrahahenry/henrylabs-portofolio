// DOM reveal, camera travel and navigation share the same exploration window.
export const UNIVERSE_CHAPTER = {
  entry: .18,
  visible: .32,
  settled: .4,
  landing: .57,
  departure: .88,
  hidden: .995,
} as const;

export function universeLanding(top: number, height: number, viewport: number, progress: number = UNIVERSE_CHAPTER.landing) {
  return top + Math.max(0, height - viewport) * progress;
}

export function chapterBlend(progress: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}

export function chapterEase(progress: number, start: number, end: number) {
  const t = chapterBlend(progress, start, end);
  return t * t * (3 - 2 * t);
}

export function universeHeroOpacity(progress: number) {
  return 1 - chapterEase(progress, .04, UNIVERSE_CHAPTER.entry);
}

export function universePresence(progress: number) {
  return chapterEase(progress, .12, UNIVERSE_CHAPTER.settled)
    * (1 - chapterEase(progress, UNIVERSE_CHAPTER.departure, UNIVERSE_CHAPTER.hidden));
}

// Opening-only lighting returns to the established reading sky on departure.
export function universeLighting(progress: number, introActive = false) {
  return introActive || !Number.isFinite(progress) ? 0 : 1 - chapterEase(progress, UNIVERSE_CHAPTER.departure, 1);
}
