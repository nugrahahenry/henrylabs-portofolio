import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../components/header-scroll.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { createHeaderScroll, advanceHeaderScroll } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const step = (state, y, pinned = false) => advanceHeaderScroll(state, y, 2000, pinned);

test("header stays present near the top, hides on descent, and reveals sooner on ascent", () => {
  let state = step(createHeaderScroll(), 96);
  assert.equal(state.hidden, false);
  state = step(state, 127);
  assert.equal(state.hidden, false);
  state = step(state, 128);
  assert.equal(state.hidden, true);
  state = step(state, 117);
  assert.equal(state.hidden, true);
  assert.equal(step(state, 116).hidden, false);
});

test("small reversing motions do not flicker or accumulate across changes of direction", () => {
  let state = step(createHeaderScroll(), 500);
  for (const y of [496, 501, 494, 499, 495, 500]) {
    state = step(state, y);
    assert.equal(state.hidden, true);
  }
  state = step(state, 488);
  assert.equal(state.hidden, false);
  for (const y of [491, 490, 496, 493, 500]) {
    state = step(state, y);
    assert.equal(state.hidden, false);
  }
});

test("slow continuous motion accumulates, while menu and keyboard pinning reset the baseline", () => {
  let state = createHeaderScroll(300);
  for (let y = 301; y <= 332; y++) state = step(state, y);
  assert.equal(state.hidden, true);
  state = step(state, 700, true);
  assert.equal(state.hidden, false);
  state = step(state, 731);
  assert.equal(state.hidden, false);
  assert.equal(step(state, 732).hidden, true);
});

test("rubber-band overscroll is clamped at both document edges", () => {
  const bottom = step(createHeaderScroll(), 2000);
  assert.equal(step(bottom, 2080), bottom);
  assert.equal(step(bottom, 2000), bottom);
  assert.equal(step(bottom, 1988).hidden, false);
  const top = step(bottom, -60);
  assert.equal(top.y, 0);
  assert.equal(top.hidden, false);
  assert.equal(advanceHeaderScroll(createHeaderScroll(), 20, 0).hidden, false);
});
