import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";
import * as THREE from "three";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../components/arrival-field.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText.replace("from \"three\"", `from ${JSON.stringify(pathToFileURL(require.resolve("three")).href)}`);
const arrival = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("arrival camera remains continuous through the cosmic scale waypoints", () => {
  const sample = arrival.createArrivalCameraPath();
  const eye = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const previousEye = new THREE.Vector3();
  let previousDistance = 0;

  for (let i = 0; i <= 1000; i++) {
    const progress = i / 1000;
    sample(progress, eye, aim);
    assert.ok(Number.isFinite(eye.length()) && Number.isFinite(aim.length()));
    if (i > 0) {
      const distance = eye.distanceTo(previousEye);
      assert.ok(distance < .6, `camera step too large at ${progress.toFixed(3)}: ${distance}`);
      assert.ok(Math.abs(distance - previousDistance) < .12, `camera velocity jumps at ${progress.toFixed(3)}`);
      previousDistance = distance;
    }
    previousEye.copy(eye);
  }

  sample(.96, eye, aim);
  const lockEye = eye.clone();
  for (const progress of [.965, .97, 1]) {
    sample(progress, eye, aim);
    assert.ok(eye.distanceTo(lockEye) < .001, "final camera lock must hold after the approach");
  }
});

test("the nested atlas has many superclusters and galaxies, with a persistent selected destination", () => {
  const field = arrival.createArrivalField();
  assert.equal(field.scene.getObjectByName("other-superclusters").userData.structures, 16);
  assert.equal(field.scene.getObjectByName("local-galaxies").userData.structures, 30);
  assert.equal(field.scene.getObjectByName("universe-candidates").count, 128);
  for (const [progress, name] of [[44, "laniakea"], [68, "local-galaxies"], [94, "henrylabs-galaxy"]]) {
    field.update(progress, 1440 / 900, 900);
    assert.ok(field.scene.getObjectByName(name).material.uniforms.uOpacity.value > .5, `${name} must be readable in its chapter`);
  }
  assert.deepEqual([.1, .44, .68, .94].map(arrival.arrivalChapter), [0, 1, 2, 3]);
  assert.deepEqual([.1, .18, .22, .7].map(arrival.arrivalCandidate), [17, 61, 89, 89]);
  assert.equal(arrival.arrivalPhase(.28), "selected");
  assert.equal(arrival.arrivalPhase(.97), "ready");
  const sample = arrival.createArrivalCameraPath(), eye = new THREE.Vector3(), aim = new THREE.Vector3();
  let distance = Infinity;
  for (let p = .301; p <= 1; p += .001) {
    sample(p, eye, aim);
    assert.ok(eye.length() <= distance + .00001, "nested approach must not jump back out");
    assert.ok(eye.z > .1, "camera must not overshoot the chosen galaxy");
    distance = eye.length();
  }
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
    field.update(94, width / height, height);
    for (const label of field.labels.slice(4)) {
      assert.equal(label.visible, true);
      assert.ok(label.opacity > .95);
      assert.ok(label.x > 30 && label.x < width - 30 && label.y > 30 && label.y < height * .7);
    }
  }
  field.dispose();
});

test("near-camera passage geometry is bounded and distributed across the approach", () => {
  const field = arrival.createArrivalField();
  const flybys = field.scene.getObjectByName("arrival-flybys");
  const trails = field.scene.getObjectByName("arrival-trails");
  assert.ok(flybys && trails);
  assert.equal(flybys.geometry.getAttribute("position").count, arrival.ARRIVAL_FLYBYS);
  assert.equal(trails.geometry.getAttribute("position").count, arrival.ARRIVAL_FLYBYS * 2);
  assert.equal(flybys.geometry.getAttribute("aPass").count, arrival.ARRIVAL_FLYBYS);

  const passes = flybys.geometry.getAttribute("aPass");
  const seen = new Set();
  for (let i = 0; i < passes.count; i++) {
    const progress = passes.getX(i);
    const scale = passes.getY(i);
    assert.ok(progress >= .09 && progress <= .83);
    assert.ok(scale > .025 && scale < 20, "flyby scale must stay bounded");
    seen.add(Math.floor(progress * 10));
  }
  assert.ok(seen.size >= 7, "flybys must cover the full camera approach");

  const before = new THREE.Vector3();
  const atPass = new THREE.Vector3();
  const after = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const passAim = new THREE.Vector3();
  const viewDirection = new THREE.Vector3();
  const point = new THREE.Vector3();
  const positions = flybys.geometry.getAttribute("position");
  const sample = arrival.createArrivalCameraPath();
  for (let i = 0; i < passes.count; i++) {
    const progress = passes.getX(i);
    sample(progress - .022, before, aim);
    sample(progress, atPass, passAim);
    sample(progress + .022, after, aim);
    assert.ok(before.distanceTo(after) > .025);
    assert.ok(atPass.distanceTo(before) < 20 && atPass.distanceTo(after) < 20, "passage samples must remain spatially bounded");
    point.fromBufferAttribute(positions, i);
    viewDirection.copy(passAim).sub(atPass).normalize();
    const forwardDepth = point.clone().sub(atPass).dot(viewDirection);
    assert.ok(forwardDepth > 0, `flyby ${i} at ${progress.toFixed(3)} must sit in front of the camera lens (${forwardDepth})`);
    assert.ok(forwardDepth < passes.getY(i) * .2, `flyby ${i} must stay close to the lens`);
  }
  field.dispose();
});
