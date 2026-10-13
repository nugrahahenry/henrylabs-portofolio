import type { OrbitId } from "./cosmic-canvas";
import { UNIVERSE_CHAPTER as chapter } from "./universe-chapter";

export type OrbitPose = { angle: number; pitch: number; zoom: number; elapsed: number; universeAngle: number };
export type OrbitBookmark = { world: OrbitId; pose: OrbitPose; progress: number };
export type OrbitHandle = { capture: () => { world: OrbitId; pose: OrbitPose } | null };

// Tab-memory only: no storage permission, URL payload or cross-tab restoration.
const bookmarks = new Map<OrbitId, OrbitBookmark>();
export function rememberOrbit(world: OrbitId, pose: OrbitPose, progress: number) {
  if (!Object.values(pose).every(Number.isFinite) || pose.elapsed < 0 || pose.zoom < 0 || pose.zoom > .45) return;
  const safeProgress = progress >= chapter.settled && progress <= chapter.departure - .02 ? progress : chapter.landing;
  bookmarks.delete(world);
  bookmarks.set(world, { world, pose: { ...pose }, progress: safeProgress });
  if (bookmarks.size > 10) bookmarks.delete(bookmarks.keys().next().value!);
}

export function recallOrbit(world: OrbitId): OrbitBookmark | null {
  const bookmark = bookmarks.get(world);
  return bookmark ? { ...bookmark, pose: { ...bookmark.pose } } : null;
}
