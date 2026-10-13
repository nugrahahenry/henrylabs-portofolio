import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const module = { exports: {} };
new Function("module", "exports", ts.transpileModule(readFileSync("components/spatial-type.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(module, module.exports);
const { titleTilt, galaxyLetterScale } = module.exports;

test("title perspective is neutral at rest and bounded even beyond the lettering", () => {
  assert.equal(Math.abs(titleTilt(0, 0).x), 0);
  assert.equal(Math.abs(titleTilt(0, 0).y), 0);
  for (const x of [-10, -1, 0, 1, 10]) for (const y of [-10, -1, 0, 1, 10]) {
    const tilt = titleTilt(x, y);
    assert.ok(Math.abs(tilt.x) <= 1.6 && Math.abs(tilt.y) <= 2.4);
    assert.equal(tilt.x, -titleTilt(-x, -y).x);
    assert.equal(tilt.y, -titleTilt(-x, -y).y);
  }
});

test("galaxy lettering follows camera depth without shrinking its independent touch target", () => {
  assert.equal(galaxyLetterScale(14.5, 14.5, 0, true), 1);
  assert.ok(galaxyLetterScale(14.5, 12, 0, true) > galaxyLetterScale(14.5, 18, 0, true));
  for (const depth of [.1, 8, 14.5, 22, 100]) for (const emphasis of [-1, 0, .5, 1, 2]) {
    const scale = galaxyLetterScale(14.5, depth, emphasis, true);
    assert.ok(scale >= .94 && scale <= 1.055);
    assert.equal(galaxyLetterScale(14.5, depth, emphasis, false), 1);
  }
  for (const invalid of [0, -1, NaN, Infinity]) assert.equal(galaxyLetterScale(14.5, invalid, 1, true), 1);
});

test("spatial titles keep a single semantic heading, pointer-only depth and a still fallback", () => {
  const title = readFileSync("components/spatial-title.tsx", "utf8");
  const css = readFileSync("app/typography.css", "utf8");
  assert.match(title, /<h1 id="hero-title"/);
  assert.equal((title.match(/\{children\}/g) || []).length, 1);
  assert.match(title, /event.pointerType !== "mouse"/);
  assert.match(title, /event.buttons/);
  assert.match(title, /visibilitychange/);
  assert.doesNotMatch(title, /requestAnimationFrame|WebGLRenderer|setInterval/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.galaxy-label-plate[^}]+transform: scale\(var\(--letter-scale, 1\)\)/);
});
