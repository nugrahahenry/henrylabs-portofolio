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
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
    .replace('from "three"', `from ${JSON.stringify(pathToFileURL(require.resolve("three")).href)}`)
    .replace('from "three/addons/math/ImprovedNoise.js"', `from ${JSON.stringify(pathToFileURL(require.resolve("three/addons/math/ImprovedNoise.js")).href)}`);
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { techOrbitRadius, sampleTechOrbit, resolveTechOwner } = await loadModule("tech-orbit");
const { createProjectSculpture } = await loadModule("project-sculptures");
const { sampleOrbit, orbitalSpeed } = await loadModule("orbital-path");
const { createStellarCore } = await loadModule("stellar-core");
const { createDeepSpace } = await loadModule("deep-space");
const { infallPoint, gravityMaterial } = await loadModule("gravity-field");
const { createSpacecraft, spacecraftPose } = await loadModule("spacecraft");

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
  assert.equal(resolveTechOwner([0, 9], 8, [8, 9]), 9);
  assert.equal(resolveTechOwner([0, 9], 9, [8, 9]), 9);
  assert.equal(resolveTechOwner([0, 1], 8, [8, 9]), -1);
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

test("focus-centered elliptical paths close and have real depth at every radius", () => {
  const u = sampleOrbit(1, 0, 0);
  const v = sampleOrbit(1, Math.PI / 2, 0);
  for (const radius of [1.45, 1.98, 2.35, 3.46, 4.01]) for (const e of [.06, .1, .14]) {
    for (let i = 0; i < 160; i++) {
      const point = sampleOrbit(radius, i / 160 * Math.PI * 2, e);
      const ellipse = ((point.dot(u) + radius * e) / radius) ** 2 + (point.dot(v) / (radius * Math.sqrt(1 - e * e))) ** 2;
      assert.ok(Math.abs(ellipse - 1) < 1e-10);
      assert.ok(point.length() >= radius * (1 - e) - 1e-10);
    }
    assert.ok(sampleOrbit(radius, 0, e).distanceTo(sampleOrbit(radius, Math.PI * 2, e)) < 1e-10);
  }
  assert.ok(Math.abs(sampleOrbit(2, Math.PI / 2).z) > .5);
  assert.ok(orbitalSpeed(1.45) > orbitalSpeed(4.01), "outer planets must orbit more slowly");
  assert.ok(Math.abs(orbitalSpeed(4) / orbitalSpeed(2) - Math.pow(.5, 1.5)) < 1e-12);
});

test("the stellar core has a textured physical surface and a separate limb-only corona", () => {
  const star = createStellarCore(.42);
  assert.equal(star.group.children.length, 2);
  assert.match(star.material.fragmentShader, /noise\(flow/);
  assert.match(star.material.fragmentShader, /sqrt\(facing\)/);
  assert.equal(star.aura.material.depthWrite, false);
  assert.match(star.aura.material.fragmentShader, /pow\(1\.0 - facing, 3\.2\)/);
  star.group.traverse((object) => { object.geometry?.dispose(); object.material?.dispose(); });
});

test("deep space is a bounded real density volume with deterministic cached voxels", () => {
  const a = createDeepSpace(32), b = createDeepSpace(32);
  assert.equal(a.texture.isData3DTexture, true);
  assert.equal(a.texture.image.data.length, 32 ** 3);
  assert.deepEqual(a.texture.image.data, b.texture.image.data);
  assert.ok(new Set(a.texture.image.data).size > 50);
  assert.match(a.material.fragmentShader, /uniform sampler3D uVolume/);
  assert.match(a.material.fragmentShader, /i < 16/);
  assert.equal(a.material.depthWrite, false);
  for (const item of [a, b]) { item.texture.dispose(); item.material.dispose(); item.volume.geometry.dispose(); }
});

test("dust spirals only inward and terminates at the actual horizon center", () => {
  const target = new THREE.Vector3(3, -2, -4.8);
  for (const source of [new THREE.Vector3(-5, 3, -7), new THREE.Vector3(1, 6, -9)]) for (const seed of [0, .4, .9]) {
    let distance = Infinity;
    for (let i = 0; i <= 100; i++) {
      const current = infallPoint(source, target, i / 100, seed).distanceTo(target);
      assert.ok(current <= distance + 1e-10);
      distance = current;
    }
    assert.equal(distance, 0);
  }
  const material = gravityMaterial(target, .027, false, true);
  assert.match(material.vertexShader, /horizonFade/);
  assert.doesNotMatch(material.vertexShader, /- uTime \*|travel \* \.2/);
  assert.match(material.vertexShader, /smoothstep\(0\.0, \.10, travel\)/);
  material.dispose();
});

test("one bounded dimensional spacecraft has a quiet repeat and still alternative", () => {
  const craft = createSpacecraft();
  assert.equal(craft.group.children.length, 4);
  assert.equal(craft.group.children[3].count, 6);
  assert.equal(spacecraftPose(3, true).visible, true);
  assert.equal(spacecraftPose(40, true).visible, false);
  assert.deepEqual(spacecraftPose(3, false), spacecraftPose(40, false));
  craft.group.traverse((object) => { object.geometry?.dispose(); });
  craft.hull.dispose(); craft.glass.dispose(); craft.light.dispose(); craft.group.children[3].dispose();
});
