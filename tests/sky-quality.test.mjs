import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../components/sky-quality.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { SKY_PIXEL_BUDGET, skyPixelRatio, createSkyQuality, resetSkySample, sampleSkyQuality, createPaintClock, paintDue } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const run = (state, count, delta, active = true) => {
  let now = state.last || 1;
  let changes = 0;
  for (let i = 0; i < count; i++) changes += Number(sampleSkyQuality(state, now += delta, active));
  return changes;
};

test("sky resolution bounds pixel cost without classifying phones as weak hardware", () => {
  assert.equal(skyPixelRatio(1440, 900, 2, 1), 1);
  assert.equal(skyPixelRatio(390, 844, 3, 1), 1);
  assert.equal(skyPixelRatio(390, 844, 3, .75), .75);
  assert.equal(skyPixelRatio(390, 844, .8, 1), .8);
  for (const [width, height] of [[2560, 1440], [3840, 2160], [900, 1600]]) {
    const ratio = skyPixelRatio(width, height, 3, 1);
    assert.ok(width * height * ratio ** 2 <= SKY_PIXEL_BUDGET + .01);
  }
  assert.ok(Number.isFinite(skyPixelRatio(NaN, 0, Infinity, -1)));
});

test("healthy 60/120Hz frames and isolated hitches retain full quality", () => {
  for (const interval of [1000 / 60, 1000 / 120]) {
    const state = createSkyQuality();
    run(state, 300, interval);
    sampleSkyQuality(state, state.last + 180, true);
    run(state, 300, interval);
    assert.equal(state.tier, 0);
  }
});

test("sustained pressure steps down twice with a bounded floor and no oscillation", () => {
  const state = createSkyQuality();
  run(state, 60, 40);
  assert.equal(state.tier, 0, "short work must not lower quality");
  assert.equal(run(state, 50, 40), 1);
  assert.equal(state.tier, 1);
  assert.equal(run(state, 110, 40), 1);
  assert.equal(state.tier, 2);
  assert.equal(run(state, 1000, 40), 0);
  assert.equal(run(state, 1000, 16), 0);
  assert.equal(state.tier, 2);
  assert.equal(skyPixelRatio(1440, 900, 1, 1, 2), .7);
});

test("hidden/Still/intro, long gaps and resize discard pressure without undoing the tier", () => {
  const state = createSkyQuality();
  run(state, 110, 40);
  assert.equal(state.tier, 1);
  run(state, 200, 40, false);
  assert.equal(state.tier, 1);
  assert.equal(state.frames, 0);
  run(state, 60, 40);
  sampleSkyQuality(state, state.last + 10_000, true);
  assert.equal(state.frames, 0);
  resetSkySample(state);
  assert.equal(state.tier, 1);
  run(state, 100, 16);
  assert.equal(state.tier, 1);
});

test("paint pacing retains a stable 30fps across 60/90/120Hz without slowing elapsed time", () => {
  for (const hz of [60, 90, 120]) {
    const clock = createPaintClock();
    let paints = 0, last = 0, elapsed = 0;
    for (let i = 0; i <= hz * 10; i++) {
      const now = i * 1000 / hz;
      if (!paintDue(clock, now, 30)) continue;
      paints++;
      elapsed += now - last; last = now;
    }
    assert.ok(paints >= 299 && paints <= 302, `${hz}Hz: ${paints} paints`);
    assert.ok(elapsed > 9950);
  }
  const clock = createPaintClock();
  assert.equal(paintDue(clock, 100, 30), true);
  assert.equal(paintDue(clock, 105, 30), false);
  assert.equal(paintDue(clock, 106, 30, true), true, "Still updates must not wait");
  assert.equal(paintDue(clock, 10000, 30), true, "resume starts a new cadence");
});

test("mobile universe bounds rendering and leaves vertical scroll and browser pinch available", () => {
  const canvas = readFileSync(new URL("../components/cosmic-canvas.tsx", import.meta.url), "utf8");
  assert.ok(canvas.indexOf("sampleSkyQuality(quality, time") < canvas.indexOf("if (!paintDue("));
  assert.match(canvas, /skyPixelRatio\(viewWidth, viewHeight/);
  assert.match(canvas, /Math\.abs\(dy\) > 8 && Math\.abs\(dy\) >= Math\.abs\(dx\)/);
  const page = readFileSync(new URL("../components/portfolio-experience.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /className="cosmic-frame-wrap"[^>]*data-lenis-prevent/);
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.worldline-backdrop \{[^}]*height: 100dvh/);
  assert.match(css, /html \{[^}]*background: #03060c/);
  assert.match(css, /body \{[^}]*background: #03060c/);
  assert.match(css, /\.cosmic-canvas \{[^}]*touch-action: pan-y pinch-zoom/);
  assert.doesNotMatch(css, /\.cosmic-frame-wrap \{[^}]*overflow-y: auto/);
  assert.match(css, /grid-template-rows: minmax\(0, 1fr\) auto; height: calc\(100svh - 142px\)/);
  const maker = readFileSync(new URL("../app/maker.css", import.meta.url), "utf8");
  for (const selector of ["maker-scene", "portrait-reveal"]) {
    assert.match(maker, new RegExp(`\\.${selector} \\{[^}]*touch-action: pan-y pinch-zoom`));
  }
});

test("open document viewers pause expensive sky work before quality sampling", () => {
  for (const file of ["worldline-backdrop.tsx", "reading-sky.tsx"]) {
    const source = readFileSync(new URL(`../components/${file}`, import.meta.url), "utf8");
    const guard = source.indexOf('document.querySelector("dialog[open]")');
    assert.ok(guard > 0);
    assert.ok(guard < source.indexOf("sampleSkyQuality(quality,"));
    assert.match(source.slice(guard, guard + 240), /requestAnimationFrame\(render\);\s+return;/);
  }
});
