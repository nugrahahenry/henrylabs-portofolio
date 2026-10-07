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
const { advanceGalaxyFlight, sampleGalaxyFlight } = await loadModule("galaxy-flight");
const { createDeepSpace } = await loadModule("deep-space");
const { infallPoint, gravityMaterial, dustWarmth } = await loadModule("gravity-field");
const { createSpacecraft, spacecraftPose } = await loadModule("spacecraft");
const { distantStarPoint, dustStreamSource, stellarTwinkle, createDistantStarMaterial, DISTANT_STAR_COUNT, COMPACT_STAR_COUNT, FEEDING_DUST_COUNT } = await loadModule("ambient-field");

test("galaxy approach centers first and reveals the local system without a visibility jump", () => {
  const pose = { pan: 0, approach: 0, orbitScale: 0, selectedVisibility: 1, otherVisibility: 1 };
  assert.equal(sampleGalaxyFlight(0, pose), pose);
  assert.deepEqual(pose, { pan: 0, approach: 0, orbitScale: 0, selectedVisibility: 1, otherVisibility: 1 });
  sampleGalaxyFlight(.45, pose);
  assert.ok(pose.pan > .7 && pose.approach < .3);
  assert.equal(pose.orbitScale, 0);
  assert.ok(pose.selectedVisibility > .98 && pose.otherVisibility < .2);
  const previous = { ...pose };
  for (let p = .46; p <= 1; p += .01) {
    sampleGalaxyFlight(p, pose);
    for (const value of Object.values(pose)) assert.ok(value >= 0 && value <= 1);
    assert.ok(pose.pan >= previous.pan && pose.approach >= previous.approach && pose.orbitScale >= previous.orbitScale);
    assert.ok(pose.selectedVisibility <= previous.selectedVisibility && pose.otherVisibility <= previous.otherVisibility);
    assert.ok(pose.orbitScale - previous.orbitScale < .04);
    Object.assign(previous, pose);
  }
  sampleGalaxyFlight(1, pose);
  assert.deepEqual(pose, { pan: 1, approach: 1, orbitScale: 1, selectedVisibility: 0, otherVisibility: 0 });
});

test("galaxy flight has a bounded faster return and can reverse at any frame", () => {
  assert.equal(advanceGalaxyFlight(0, true, 1.1), 1);
  assert.equal(advanceGalaxyFlight(1, false, .7), 0);
  assert.equal(advanceGalaxyFlight(.5, true, 0), .5);
  assert.equal(advanceGalaxyFlight(.5, false, -1), .5);
  let progress = 0;
  for (let i = 0; i < 11; i++) progress = advanceGalaxyFlight(progress, true, .03);
  assert.ok(Math.abs(progress - .3) < 1e-12);
  const returning = advanceGalaxyFlight(progress, false, .03);
  assert.ok(returning < progress && progress - returning < .05);
  assert.ok(advanceGalaxyFlight(returning, true, .03) > returning);
});

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
  assert.match(material.vertexShader, /smoothstep\(0\.0, \.10, phase\)/);
  material.dispose();
});

test("upper dust remains visible until horizon absorption instead of curling past the right edge", () => {
  for (const [width, height] of [[1440, 900], [390, 844], [360, 800], [844, 390]]) {
    const camera = new THREE.PerspectiveCamera(44, width / height, .1, 100);
    camera.position.z = 6.8;
    camera.updateMatrixWorld();
    const target = new THREE.Vector3(1.02, -.8, .5).unproject(camera).sub(camera.position);
    target.multiplyScalar((-4.8 - camera.position.z) / target.z).add(camera.position);
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(22)) * 11.6;
    const horizon = viewHeight * Math.min(width * .95, height * .8) / height * .5;
    for (let i = 0; i < FEEDING_DUST_COUNT; i++) {
      if (i % 4 >= 2) continue;
      const normalized = dustStreamSource(i);
      const source = new THREE.Vector3(normalized.x, normalized.y, .5).applyMatrix4(camera.projectionMatrixInverse);
      source.multiplyScalar(normalized.z / source.z).applyMatrix4(camera.matrixWorld);
      let distance = Infinity;
      for (let step = 1; step <= 90; step++) {
        const point = infallPoint(source, target, step / 100, ((i + .5) * .618033989) % 1, new THREE.Vector3(), true);
        const current = point.distanceTo(target);
        assert.ok(current < distance, "the upper stream must always contract");
        distance = current;
        if (current < horizon * 1.2) continue;
        point.project(camera);
        assert.ok(Math.abs(point.x) <= 1.02 && Math.abs(point.y) <= 1.02, `upper dust escaped before absorption at ${width}x${height}`);
      }
    }
  }
  const material = gravityMaterial(new THREE.Vector3(), 0, true, true);
  assert.match(material.vertexShader, /clamp\(startAngle - 1\.72, 0\.0, \.55\)/);
  assert.match(material.vertexShader, /phase - aTail \* \.014/);
  assert.match(material.vertexShader, /smoothstep\(\.78, \.96, phase \* uTravelScale\)/);
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

test("distant stars form a deterministic depth layer without increasing compact density", () => {
  assert.equal(DISTANT_STAR_COUNT, 1800);
  assert.equal(COMPACT_STAR_COUNT, 1000);
  const points = Array.from({ length: DISTANT_STAR_COUNT }, (_, i) => distantStarPoint(i));
  assert.ok(points.every((point) => point.z <= -18 && point.z >= -40));
  assert.ok(points.some((point) => point.z < -38) && points.some((point) => point.z > -20));
  assert.ok(points.some((point) => point.x > 15) && points.some((point) => point.x < -15));
  assert.deepEqual(distantStarPoint(88), points[88]);
});

test("distant stars shimmer gently without gravity or a reduced-motion brightness clock", () => {
  for (const seed of [0, .3, .7, 1]) for (let time = 0; time < 120; time++) {
    assert.ok(stellarTwinkle(seed, time) >= .84 && stellarTwinkle(seed, time) <= 1);
    assert.equal(stellarTwinkle(seed, time, false), .92);
  }
  assert.notEqual(stellarTwinkle(.3, 3), stellarTwinkle(.3, 8));
  const material = createDistantStarMaterial();
  assert.doesNotMatch(material.vertexShader, /uPull|uTarget|spiral/);
  assert.match(material.vertexShader, /uMotion \* \.08/);
  assert.match(material.vertexShader, /1\.0, 3\.0/);
  assert.equal(material.depthWrite, false);
  material.dispose();
});

test("dust warms only near the horizon while the reading guard never hides its flow", () => {
  assert.equal(dustWarmth(100, 2), 0);
  assert.equal(dustWarmth(1, 2), 1);
  assert.equal(dustWarmth(1, 0), 0);
  assert.ok(dustWarmth(3, 2) > dustWarmth(5, 2));
  const material = gravityMaterial(new THREE.Vector3(), .027, false, true);
  assert.match(material.vertexShader, /mix\(color, vec3\(1\.0, \.76, \.44\)/);
  assert.match(material.fragmentShader, /mix\(\.72, 1\.0, outerField\)/);
  assert.ok(material.uniforms.uResolution);
  material.dispose();
});

test("feeding grains and wisps can retrace their cached spiral without reversing recycle clocks", () => {
  for (const streak of [false, true]) {
    const material = gravityMaterial(new THREE.Vector3(), streak ? 0 : .027, streak, true);
    assert.equal(material.uniforms.uTravelScale.value, 1);
    assert.match(material.vertexShader, /float travel = max\(0\.0, phase.*\) \* uTravelScale/);
    assert.match(material.vertexShader, /float phase = fract\(uTime \* \.05 \+ seed\)/);
    material.dispose();
  }
});

test("the bounded feeding stream includes visible upper, side and lower sources at every aspect ratio", () => {
  assert.equal(FEEDING_DUST_COUNT, 240);
  const sources = Array.from({ length: FEEDING_DUST_COUNT }, (_, i) => dustStreamSource(i));
  assert.equal(sources.filter((_, i) => i % 4 < 2).length, 120);
  for (const aspect of [1440 / 900, 390 / 844, 844 / 390]) {
    const camera = new THREE.PerspectiveCamera(44, aspect, .1, 100);
    camera.position.set(.3, -.1, 6.4);
    camera.lookAt(0, 0, -3.8);
    camera.updateMatrixWorld();
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const ray = new THREE.Vector3(source.x, source.y, .5).applyMatrix4(camera.projectionMatrixInverse);
      ray.multiplyScalar(source.z / ray.z).applyMatrix4(camera.matrixWorld).project(camera);
      assert.ok(Math.abs(ray.x - source.x) < 1e-10 && Math.abs(ray.y - source.y) < 1e-10);
      assert.ok(Math.abs(ray.x) < 1 && Math.abs(ray.y) < 1, "sources must start inside the visible sky");
      if (i % 4 < 2) assert.ok(ray.y > .63, "half of the pool must enter from the upper sky");
    }
  }
  const material = gravityMaterial(new THREE.Vector3(), .027, false, true);
  assert.match(material.vertexShader, /uInverseProjection \* vec4\(position.xy/);
  assert.match(material.vertexShader, /float seed = aSeed/);
  material.dispose();
});
