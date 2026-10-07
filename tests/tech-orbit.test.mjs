import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";
import * as THREE from "three";

const require = createRequire(import.meta.url);
async function loadModule(name) {
  const source = readFileSync(new URL(`../components/${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText.replace('from "three"', `from ${JSON.stringify(pathToFileURL(require.resolve("three")).href)}`);
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { techOrbitRadius, sampleTechOrbit, resolveTechOwner } = await loadModule("tech-orbit");
const { createProjectSculpture } = await loadModule("project-sculptures");

test("every tech lane is a true 3D circle outside its moving owner", () => {
  for (const body of [.34, .83, 1.01]) for (const lane of [0, 1, 2]) {
    const radius = techOrbitRadius(body, lane);
    assert.ok(radius - body > .3, "tools must clear the shell at every angle");
    for (let i = 0; i < 128; i++) {
      const point = sampleTechOrbit(radius, lane, i / 128 * Math.PI * 2);
      assert.ok(Math.abs(point.length() - radius) < 1e-12);
    }
    assert.ok(sampleTechOrbit(radius, lane, 0).distanceTo(sampleTechOrbit(radius, lane, Math.PI * 2)) < 1e-12);
    assert.ok(Math.abs(sampleTechOrbit(radius, lane, Math.PI / 2).z) > .1, "the lane must have actual depth");
  }
});

test("shared tools prefer the selected verified owner and unmapped tools stay unassigned", () => {
  assert.equal(resolveTechOwner([0, 1, 4], 1), 1);
  assert.equal(resolveTechOwner([0, 1], 3), 0);
  assert.equal(resolveTechOwner([], 0), -1);
});

test("all ten worlds have bounded dimensional identity sculptures", () => {
  for (const id of ["catmoji", "nalira", "canox", "hengs", "polara", "rental", "pos", "labq", "yventures", "soreva"]) {
    const root = createProjectSculpture(id);
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    assert.equal(root.name, `sculpture-${id}`);
    assert.ok(size.x > .1 && size.y > .1 && size.z > .1, `${id} must not be a flat image`);
    assert.ok(Math.max(size.x, size.y, size.z) < 2.2, `${id} must fit its shell`);
    root.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
  }
});
