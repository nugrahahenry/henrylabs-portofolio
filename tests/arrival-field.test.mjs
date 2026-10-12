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
  const previousAim = new THREE.Vector3();
  let previousDistance = 0;

  for (let i = 0; i <= 930; i++) {
    const progress = i / 1000;
    sample(progress, eye, aim);
    assert.ok(Number.isFinite(eye.length()) && Number.isFinite(aim.length()));
    if (i > 0) {
      const distance = eye.distanceTo(previousEye);
      assert.ok(distance < .35, `camera step too large at ${progress.toFixed(3)}: ${distance}`);
      assert.ok(Math.abs(distance - previousDistance) < .12, `camera velocity jumps at ${progress.toFixed(3)}`);
      previousDistance = distance;
    }
    previousEye.copy(eye);
    previousAim.copy(aim);
  }

  sample(.93, eye, aim);
  const lockEye = eye.clone();
  for (const progress of [.94, .97, 1]) {
    sample(progress, eye, aim);
    assert.ok(eye.distanceTo(lockEye) < .001, "final camera lock must hold after the approach");
  }
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
