import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function compile(name) {
  return ts.transpileModule(readFileSync(new URL(`../components/${name}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
}
const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const chapter = asModule(compile("universe-chapter"));
const { rememberOrbit, recallOrbit } = await import(asModule(compile("orbit-bookmark").replace('"./universe-chapter"', JSON.stringify(chapter))));
const { universeLanding } = await import(chapter);
const { placeOrbitLabel } = await import(asModule(compile("orbit-labels")));
const pose = { angle: 1.4, pitch: .36, zoom: .24, elapsed: 42, universeAngle: .2 };

test("orbit bookmarks copy the scene pose and keep project ownership", () => {
  assert.equal(recallOrbit("nalira"), null);
  const input = { ...pose };
  rememberOrbit("nalira", input, .73);
  input.zoom = 0;
  const stored = recallOrbit("nalira");
  assert.deepEqual(stored, { world: "nalira", pose, progress: .73 });
  stored.pose.pitch = 5;
  assert.equal(recallOrbit("nalira").pose.pitch, .36);
  assert.equal(recallOrbit("soreva"), null);
});

test("unsafe camera data cannot replace a valid bookmark", () => {
  rememberOrbit("soreva", pose, .68);
  for (const invalid of [{ angle: NaN }, { pitch: Infinity }, { elapsed: -1 }, { zoom: 1 }]) {
    rememberOrbit("soreva", { ...pose, ...invalid }, .8);
    assert.equal(recallOrbit("soreva").progress, .68);
  }
});

test("off-map reading returns to a safe plateau and landing adapts to new viewport geometry", () => {
  for (const progress of [-1, 0, .18, .9, 1, NaN, Infinity]) {
    rememberOrbit("pos", pose, progress);
    assert.equal(recallOrbit("pos").progress, .57);
  }
  rememberOrbit("pos", pose, .73);
  assert.equal(universeLanding(20, 2400, 900, recallOrbit("pos").progress), 1115);
  assert.equal(universeLanding(20, 2400, 390, .73), 1487.3);
  assert.equal(universeLanding(0, 100, 900), 0);
});

test("tab memory has a bounded ten-world working set", () => {
  for (let index = 0; index < 11; index++) rememberOrbit(`test-${index}`, pose, .6);
  assert.equal(recallOrbit("test-0"), null);
  assert.equal(recallOrbit("test-1").progress, .6);
  assert.equal(recallOrbit("test-10").pose.zoom, .24);
});

test("crowded landscape labels retain bounded non-overlapping targets", () => {
  const placed = [];
  for (const [x, y, width] of [[390, 140, 100], [420, 134, 80], [372, 147, 130], [399, 127, 85], [405, 142, 90]]) {
    const box = placeOrbitLabel(x, y, width, 44, 800, 210, placed);
    assert.ok(box.x >= 4 && box.x + box.width <= 796 && box.y >= 4 && box.y + box.height <= 206);
    assert.ok(placed.every(other => box.x + box.width <= other.x || other.x + other.width <= box.x || box.y + box.height <= other.y || other.y + other.height <= box.y));
    placed.push(box);
  }
});
