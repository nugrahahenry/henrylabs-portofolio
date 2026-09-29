import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("portfolio surface keeps its core experience contracts", () => {
  const experience = read("components/portfolio-experience.tsx");
  const canvas = read("components/cosmic-canvas.tsx");
  const styles = read("app/globals.css");

  assert.match(experience, /I build things I actually see\./);
  assert.match(experience, /Aku membangun hal yang benar-benar kulihat\./);
  assert.match(experience, /certificate shelf/);
  assert.match(canvas, /WebGLRenderer/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /html\[data-motion="off"\]/);
  assert.equal(existsSync(new URL("public/assets/background/cosmic-nebula.png", root)), true);
});
