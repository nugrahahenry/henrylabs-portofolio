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
    .replace('from "three/addons/math/ImprovedNoise.js"', `from ${JSON.stringify(pathToFileURL(require.resolve("three/addons/math/ImprovedNoise.js")).href)}`)
    .replace('from "three/addons/utils/BufferGeometryUtils.js"', `from ${JSON.stringify(pathToFileURL(require.resolve("three/addons/utils/BufferGeometryUtils.js")).href)}`);
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}
const { techOrbitRadius, sampleTechOrbit, resolveTechOwner, techOrbitMotion } = await loadModule("tech-orbit");
const { companionCounts, createCompanionOrbit, sampleCompanionOrbit, advanceCompanionTime } = await loadModule("companion-orbit");
const { createProjectSculpture } = await loadModule("project-sculptures");
const { sampleOrbit, orbitalSpeed } = await loadModule("orbital-path");
const { createStellarCore } = await loadModule("stellar-core");
const { advanceGalaxyFlight, sampleGalaxyFlight } = await loadModule("galaxy-flight");
const { createDeepSpace } = await loadModule("deep-space");
const { makerGroupAt, makerEvidenceAt, makerReadingProgress, advanceMakerRotation, portraitCoversSatellite, MAKER_RETREAT_START, MAKER_PROOF_START } = await loadModule("maker-motion");
const { infallPoint, gravityMaterial, dustWarmth } = await loadModule("gravity-field");
const { blackHoleFrame } = await loadModule("black-hole-frame");
const { createSpacecraft, spacecraftPose, routeSpacecraft, flightPresence, pursuitPulse, pursuitShotTime, pursuitShotSide, pursuitMiss, createPursuitBolts, wormholePresence, createWormhole, clearShot, advancePursuit, pursuitEnd, pursuitPeriod, PURSUIT_DELAY, PURSUIT_REST, PURSUIT_SHOTS, PURSUIT_SHOT_SECONDS } = await loadModule("spacecraft");
const { distantStarPoint, dustStreamSource, stellarTwinkle, createDistantStarMaterial, DISTANT_STAR_COUNT, COMPACT_STAR_COUNT, FEEDING_DUST_COUNT } = await loadModule("ambient-field");
const { PASSAGE_COUNT, COMPACT_PASSAGE_COUNT, advancePassage, passagePoint, passageReadingGuard, createCameraPassage } = await loadModule("camera-passage");

test("maker reading positions preserve the chapter across spatial and linear layouts", () => {
  for (const [progress, group] of [[.06, 0], [.2, 1], [.35, 2], [.52, 3]]) {
    assert.equal(makerReadingProgress(progress, group, false), progress);
    assert.equal(makerReadingProgress(1, group, false), progress);
  }
  assert.equal(makerReadingProgress(.35, 1, false), .2, "manual group selection wins over old scroll phase");
  assert.equal(makerReadingProgress(.9, 3, true), .9);
  assert.equal(makerReadingProgress(.4, 0, true), .87, "proof returns after all five cards have arrived");
  assert.equal(makerReadingProgress(1, 3, true), .97);
  assert.equal(makerReadingProgress(NaN, 3, true), .87);
  assert.equal(makerReadingProgress(NaN, 0, false), .06);
});

test("same spatial layout preserves in-flight exchanges and manual groups during resize", () => {
  for (const progress of [.06, .2, .35, .52, .65, .7, .74, .79, .9, 1]) {
    assert.equal(makerReadingProgress(progress, makerGroupAt(progress), progress > MAKER_PROOF_START, true), progress);
  }
  assert.equal(makerReadingProgress(.2, 3, false, true), .2, "manually choosing All must not move the timeline on resize");
  assert.equal(makerReadingProgress(-1, 0, false, true), 0);
  assert.equal(makerReadingProgress(2, 3, true, true), 1);
  assert.equal(makerReadingProgress(NaN, 3, true, true), .87);
});

test("near-camera passages accelerate gently, settle, and ignore suspended frames", () => {
  const clock = { distance: 0, speed: .48, opacity: 0 };
  for (let i = 0; i < 120; i++) advancePassage(clock, 1 / 60, 0, 900, true, false);
  assert.ok(clock.opacity > .7 && clock.distance > .9);
  const idle = clock.speed;
  for (let i = 0; i < 60; i++) advancePassage(clock, 1 / 60, i % 2 ? -100 : 100, 900, true, false);
  assert.ok(clock.speed > idle * 4 && clock.speed < 2.88);
  const snapshot = { ...clock };
  advancePassage(clock, 30, 5000, 900, true, false);
  assert.deepEqual(clock, snapshot);
  for (let i = 0; i < 180; i++) advancePassage(clock, 1 / 60, 0, 900, true, false);
  assert.ok(Math.abs(clock.speed - idle) < .002);
  for (let i = 0; i < 120; i++) advancePassage(clock, 1 / 60, 100, 900, true, true);
  assert.ok(clock.opacity < .001);
  const stopped = clock.distance;
  advancePassage(clock, 1 / 60, 200, 900, false, false);
  assert.equal(clock.distance, stopped);
  assert.equal(clock.opacity, 0);
  assert.equal(clock.speed, 0);
});

test("passages move in depth, expand in perspective and fade before recycling", () => {
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let index = 0; index < PASSAGE_COUNT; index++) {
    let wrapped = false;
    for (let distance = 0; distance < 36; distance += .05) {
      const opacity = passagePoint(index, distance, 1.6, a);
      const next = passagePoint(index, distance + .05, 1.6, b);
      assert.ok(opacity >= 0 && opacity <= 1 && a.z <= -1 && a.z >= -27);
      assert.equal(a.x, b.x);
      assert.equal(a.y, b.y);
      if (b.z < a.z) {
        wrapped = true;
        assert.ok(opacity < .001 && next < .001, "recycle happens with no visible pop");
      } else assert.ok(Math.abs(b.x / b.z) > Math.abs(a.x / a.z), "nearer stars expand away from the vanishing point");
    }
    assert.ok(wrapped);
  }
});

test("near stars retire progressively with the map approach before the interaction gate", () => {
  const clock = { distance: 0, speed: .48, opacity: .76 };
  for (let i = 0; i < 180; i++) advancePassage(clock, 1 / 60, 0, 900, true, false, .2);
  assert.ok(clock.opacity > .15 && clock.opacity < .16);
  for (let i = 0; i < 180; i++) advancePassage(clock, 1 / 60, 0, 900, true, false, 0);
  assert.ok(clock.opacity < .001);
});

test("passages protect copy and share one bounded point batch", () => {
  const rect = { left: 100, top: 200, right: 800, bottom: 600 };
  assert.equal(passageReadingGuard(450, 300, rect), 0);
  assert.equal(passageReadingGuard(92, 300, rect), 0);
  assert.equal(passageReadingGuard(20, 300, rect), 1);
  assert.ok(passageReadingGuard(70, 300, rect) > 0 && passageReadingGuard(70, 300, rect) < 1);
  assert.equal(passageReadingGuard(450, 300, null), 1);
  const batch = createCameraPassage();
  assert.equal(batch.geometry.getAttribute("position").count, PASSAGE_COUNT);
  assert.ok(COMPACT_PASSAGE_COUNT <= PASSAGE_COUNT / 2);
  assert.equal(batch.points.isPoints, true);
  assert.equal(batch.material.depthWrite, false);
  assert.equal(batch.material.uniforms.uOpacity.value, 0);
  batch.geometry.dispose(); batch.material.dispose();
});

test("galaxy approach centers first and reveals the local system without a visibility jump", () => {
  const pose = { pan: 0, approach: 0, orbitScale: 0, selectedVisibility: 1, otherVisibility: 1, arc: 0 };
  assert.equal(sampleGalaxyFlight(0, pose), pose);
  assert.deepEqual(pose, { pan: 0, approach: 0, orbitScale: 0, selectedVisibility: 1, otherVisibility: 1, arc: 0 });
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
  assert.deepEqual(pose, { pan: 1, approach: 1, orbitScale: 1, selectedVisibility: 0, otherVisibility: 0, arc: 0 });
});

test("galaxy camera arc retraces the same path and settles without endpoint velocity", () => {
  const pose = {};
  for (let p = 0; p <= 1; p += .01) {
    const forward = sampleGalaxyFlight(p, pose).arc;
    assert.ok(forward >= 0 && forward <= 1);
    assert.ok(Math.abs(forward - sampleGalaxyFlight(1 - p, pose).arc) < 1e-12);
  }
  assert.equal(sampleGalaxyFlight(.5, pose).arc, 1);
  assert.ok(sampleGalaxyFlight(.001, pose).arc < .00002);
  assert.ok(sampleGalaxyFlight(.999, pose).arc < .00002);
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

test("every companion clears its owner and rings on a bounded independent orbit", () => {
  const radii = [.2, .24, .19, .32, .22];
  const records = radii.flatMap((radius, owner) => Array.from({ length: companionCounts[owner] }, (_, slot) => createCompanionOrbit(owner, slot, radius, owner === 3)));
  assert.equal(records.length, 11);
  assert.equal(new Set(records.map(record => record.speed)).size, 11);
  for (const orbit of records) {
    const radius = radii[orbit.ownerIndex];
    assert.ok(Math.PI * 2 / orbit.speed >= 24 && Math.PI * 2 / orbit.speed <= 43);
    assert.ok(orbit.spin > 0 && orbit.size < radius * .25);
    const a = sampleCompanionOrbit(orbit, orbit.phase);
    const b = sampleCompanionOrbit(orbit, orbit.phase + orbit.speed * 2);
    assert.ok(a.distanceTo(b) > .13, "each companion visibly moves within two seconds");
    assert.ok(a.distanceTo(sampleCompanionOrbit(orbit, orbit.phase + Math.PI * 2)) < 1e-12);
    for (let i = 0; i < 128; i++) {
      const point = sampleCompanionOrbit(orbit, i / 128 * Math.PI * 2);
      assert.ok(point.length() - orbit.size > radius * (orbit.ownerIndex === 3 ? 1.93 : 1.035));
      assert.ok(point.length() + orbit.size < radius * 4.2);
    }
    assert.notEqual(sampleCompanionOrbit(orbit, Math.PI / 2).z, 0);
    assert.deepEqual(sampleCompanionOrbit(orbit, orbit.phase), a, "Still pose is deterministic");
  }
});

test("companion motion preserves real time on low-FPS devices without hidden-tab catchup", () => {
  for (const fps of [5, 10, 20, 30, 60]) {
    let age = 0;
    for (let i = 0; i < fps * 2; i++) age = advanceCompanionTime(age, 1 / fps, true);
    assert.ok(Math.abs(age - 2) < 1e-10);
  }
  for (const delta of [2, 500, NaN, -1]) assert.equal(advanceCompanionTime(12, delta, true), 12);
  assert.equal(advanceCompanionTime(12, .1, false), 12);
});

test("technology planets have distinct readable periods and axial spin", () => {
  const motion = Array.from({ length: 25 }, (_, index) => techOrbitMotion(index));
  assert.equal(new Set(motion.map(item => item.speed)).size, 25);
  assert.equal(new Set(motion.map(item => item.phase)).size, 25);
  for (const item of motion) {
    assert.ok(Math.PI * 2 / item.speed >= 44 && Math.PI * 2 / item.speed < 86);
    assert.ok(item.spin > 0 && item.spin < .22);
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
  assert.equal(star.material.uniforms.uReadStrength.value, 0);
  assert.equal(star.material.uniforms.uOpening.value, 0, "shared stars retain their established material by default");
  assert.equal(star.aura.material.uniforms.uOpening.value, 0);
  assert.equal(star.material.uniforms.uReadRects.value.length, 3);
  assert.match(star.material.fragmentShader, /heat \* 1\.7 \* exposure, uOpacity/, "reading protection changes local radiance, never the whole star's alpha");
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
  assert.equal(a.material.uniforms.uOpening.value, 0, "reading libraries and Contact do not opt into opening art direction");
  assert.equal(a.material.depthWrite, false);
  for (const item of [a, b]) { item.texture.dispose(); item.material.dispose(); item.volume.geometry.dispose(); }
});

test("maker scroll has four reversible tech chapters followed by a separate proof exchange", () => {
  for (const [progress, group] of [[0,0],[.13,0],[.14,1],[.27,1],[.28,2],[.42,2],[.43,3],[.61,3]]) assert.equal(makerGroupAt(progress), group);
  assert.ok(MAKER_RETREAT_START > .6 && MAKER_PROOF_START > MAKER_RETREAT_START);
});

test("proof cards arrive together early enough for a reading hold, and reverse on the same path", () => {
  for (let index = 0; index < 5; index++) {
    assert.equal(makerEvidenceAt(MAKER_PROOF_START, index).travel, 0);
    assert.equal(makerEvidenceAt(.87, index).arrived, true);
    let last = 0;
    const trace = [];
    for (let step = 0; step <= 100; step++) {
      const state = makerEvidenceAt(step / 100, index);
      assert.ok(state.eased >= last && state.eased <= 1);
      assert.equal(state.arrived, state.travel >= .95);
      trace.push(state); last = state.eased;
    }
    for (let step = 100; step >= 0; step--) assert.deepEqual(makerEvidenceAt(step / 100, index), trace[step]);
  }
});

test("maker swipes retain bounded momentum without fighting a live drag or pause", () => {
  const state = { angle: 0, velocity: 5, dragging: true };
  advanceMakerRotation(state, 1, false); assert.equal(state.angle, 0);
  state.dragging = false;
  advanceMakerRotation(state, 1, true); assert.equal(state.angle, .25);
  assert.ok(state.velocity < 5);
  for (let i=0; i<120; i++) advanceMakerRotation(state, 1/60, true);
  assert.ok(state.velocity < .01 && state.angle < 2);
  state.velocity = 0; const angle = state.angle;
  advanceMakerRotation(state, .04, true); assert.equal(state.angle, angle);
  advanceMakerRotation(state, .04, false); assert.ok(state.angle > angle);
});

test("portrait hit occlusion follows alpha, including visible crescents beside the ear", () => {
  const mask = { data: new Uint8ClampedArray(100*100*4).fill(255), width:100, height:100 };
  const bounds = {left:0,right:100,top:0,bottom:100};
  assert.equal(portraitCoversSatellite(mask,bounds,50,50,10),true);
  assert.equal(portraitCoversSatellite(mask,bounds,97,50,10),false);
  assert.equal(portraitCoversSatellite(undefined,bounds,50,50,10),false);
  mask.data[(50*100+50)*4+3]=0;
  assert.equal(portraitCoversSatellite(mask,bounds,50,50,10),false);
  mask.data.fill(255); mask.data[(50*100+65)*4+3]=0;
  assert.equal(portraitCoversSatellite(mask,bounds,50,50,20),false);
});

test("the closing frame keeps the dark center onscreen while allowing the outer disk to crop", () => {
  for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 800], [844, 390]]) {
    const frame = blackHoleFrame(width, height);
    assert.ok(frame.x > .7 && frame.x < .9 && frame.y < .9);
    assert.ok(frame.diameter >= Math.min(width, height) * .7);
    assert.ok(width * (1 - frame.x) >= frame.diameter * .19, "a substantial part of the far side must remain visible");
    assert.ok(height * (1 - frame.y) >= frame.diameter * .19);
    const frames = Array.from({ length: 101 }, (_, i) => blackHoleFrame(width, height, i / 100));
    for (let i = 100; i >= 0; i--) assert.deepEqual(blackHoleFrame(width, height, i / 100), frames[i]);
    assert.equal(blackHoleFrame(width, height, -1).scale, .08);
    assert.equal(blackHoleFrame(width, height, 2).scale, 1);
  }
});

test("nebula refraction is local to the horizon and disabled outside Contact", () => {
  const space = createDeepSpace(16);
  assert.equal(space.material.uniforms.uLensStrength.value, 0);
  assert.match(space.material.fragmentShader, /exp\(-pow\(\(impact - 1\.08\)/);
  assert.match(space.material.fragmentShader, /bend \* \.045/);
  space.texture.dispose(); space.material.dispose(); space.volume.geometry.dispose();
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
  assert.doesNotMatch(material.vertexShader, /- uTime \*|travel \* \.2\b/);
  assert.match(material.vertexShader, /smoothstep\(0\.0, \.10, phase\)/);
  material.dispose();
});

test("all dust lanes circle through multiple horizon quadrants while contracting", () => {
  for (const [width, height] of [[1440, 900], [390, 844], [360, 800], [844, 390]]) {
    const camera = new THREE.PerspectiveCamera(44, width / height, .1, 100);
    camera.position.z = 6.8;
    camera.updateMatrixWorld();
    const frame = blackHoleFrame(width, height);
    const target = new THREE.Vector3(frame.x * 2 - 1, 1 - frame.y * 2, .5).unproject(camera).sub(camera.position);
    target.multiplyScalar((-4.8 - camera.position.z) / target.z).add(camera.position);
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(22)) * 11.6;
    const horizon = viewHeight * frame.diameter / height * .5;
    let paintedCandidates = 0;
    const quadrants = new Set();
    for (let i = 0; i < FEEDING_DUST_COUNT; i++) {
      const normalized = dustStreamSource(i);
      const source = new THREE.Vector3(normalized.x, normalized.y, .5).applyMatrix4(camera.projectionMatrixInverse);
      source.multiplyScalar(normalized.z / source.z).applyMatrix4(camera.matrixWorld);
      let distance = Infinity;
      for (let step = 1; step <= 90; step++) {
        const point = infallPoint(source, target, step / 100, ((i + .5) * .618033989) % 1);
        const current = point.distanceTo(target);
        assert.ok(current < distance, "orbital movement must not fling dust outward");
        distance = current;
        if (current < horizon * 1.2) continue;
        const offset = point.clone().sub(target);
        quadrants.add(Math.floor((Math.atan2(offset.y, offset.x) + Math.PI) / (Math.PI / 2)) % 4);
        point.project(camera);
        if (Math.abs(point.x) < .98 && Math.abs(point.y) < .98) paintedCandidates++;
      }
    }
    assert.equal(quadrants.size, 4, "the paths must wrap around all sides, including the cropped disk");
    assert.ok(paintedCandidates > 200, `spiral paths must retain a visible stream at ${width}x${height}`);
  }
  const material = gravityMaterial(new THREE.Vector3(), 0, true, true);
  assert.match(material.vertexShader, /6\.2831853 \* \(1\.15 \+ seed \* \.35\)/);
  assert.match(material.vertexShader, /phase - aTail \* \.014/);
  assert.match(material.vertexShader, /smoothstep\(\.78, \.96, phase \* uTravelScale\)/);
  material.dispose();
});

test("a bounded metallic UFO and scout share a delayed pursuit and still alternative", () => {
  for (const kind of ["ufo", "scout"]) {
    const craft = createSpacecraft(kind);
    assert.ok(craft.group.children.length <= 7);
    assert.ok(craft.span > .5 && craft.radius > .3);
    assert.ok(craft.hull.metalness >= .4 && craft.glass.clearcoat === 1);
    let vertices = 0;
    craft.group.traverse((object) => {
      if (object.geometry) { vertices += object.geometry.getAttribute("position").count; object.geometry.dispose(); }
      if (object.isInstancedMesh) object.dispose();
    });
    assert.ok(vertices > 1500 && vertices < 20000, "mechanical detail must remain bounded and cached");
    for (const material of [craft.hull, craft.trim, craft.glass, craft.light, craft.flame]) material.dispose();
    assert.deepEqual(spacecraftPose(3, false, kind), spacecraftPose(40, false, kind));
  }
  assert.equal(spacecraftPose(3, true).visible, true);
  assert.ok(spacecraftPose(3, true).x > -1, "the first UFO must reach the viewport within three seconds");
  assert.equal(spacecraftPose(3, true, "scout").visible, false);
  assert.equal(spacecraftPose(8, true, "scout").visible, true);
  assert.equal(spacecraftPose(40, true).visible, false);
  assert.equal(PURSUIT_REST, 30);
  assert.equal(PURSUIT_DELAY, 4.8);
  for (let t = 6; t < 18; t += .25) assert.ok(spacecraftPose(t, true).x > spacecraftPose(t, true, "scout").x);
  const first = spacecraftPose(8, true), repeat = spacecraftPose(8 + pursuitPeriod(), true);
  for (const key of Object.keys(first)) typeof first[key] === "number" ? assert.ok(Math.abs(first[key] - repeat[key]) < 1e-10) : assert.equal(first[key], repeat[key]);
});

test("flight opacity retreats over multiple frames even after a long tab suspension", () => {
  let opacity = 1, frames = 0;
  while (opacity > 0 && frames++ < 100) {
    const next = flightPresence(opacity, 0, frames === 1 ? 100 : 1 / 60);
    assert.ok(next <= opacity && opacity - next < .1);
    opacity = next;
  }
  assert.equal(opacity, 0);
  assert.ok(frames > 15 && frames < 30);
  assert.equal(flightPresence(.5, 0, 0), .5);
});

test("paired salvos alternate above and below, reversing their preference on the next encounter", () => {
  for (let cycle = 0; cycle < 4; cycle++) {
    const sides = Array.from({ length: 8 }, (_, id) => pursuitShotSide(id, cycle));
    assert.equal(sides.filter(side => side === 1).length, 4);
    for (let id = 0; id < 8; id += 2) {
      assert.equal(sides[id], sides[id + 1], "twin barrels keep the same near-miss side");
      assert.equal(sides[id], -pursuitShotSide(id, cycle + 1));
      if (id > 0) assert.equal(sides[id], -sides[id - 2]);
    }
  }
});

test("pursuit shots travel in bounded bursts and respect intervening planet silhouettes", () => {
  assert.equal(pursuitPulse(5, 0), -1);
  assert.equal(pursuitPulse(30, 0), -1);
  assert.equal(PURSUIT_SHOTS, 8);
  for (const delay of [4.8, 10]) for (let i = 0; i < PURSUIT_SHOTS; i++) {
    const launch = pursuitShotTime(i, delay), age = launch + .2;
    assert.ok(pursuitPulse(age, i, delay) > 0 && pursuitPulse(age, i, delay) < 1);
    assert.equal(pursuitPulse(launch - .001, i, delay), -1);
    assert.equal(pursuitPulse(launch + PURSUIT_SHOT_SECONDS + .001, i, delay), -1);
    assert.ok(Math.abs(pursuitPulse(age, i, delay) - pursuitPulse(age + pursuitPeriod(delay), i, delay)) < 1e-10);
    if (i % 2) assert.ok(Math.abs(launch - pursuitShotTime(i - 1, delay) - .045) < 1e-10);
    else if (i > 0) assert.ok(launch - pursuitShotTime(i - 2, delay) > .9);
    assert.ok(launch >= delay + 1.8 && launch + PURSUIT_SHOT_SECONDS < 15.5);
  }
  const bolts = createPursuitBolts();
  assert.equal(bolts.count, 8);
  bolts.dispose(); bolts.geometry.dispose(); bolts.material.dispose();
  const start = { x: -1, y: .5 }, end = { x: 1, y: .5 };
  assert.equal(clearShot(start, end, [{ x: 0, y: .5, radius: .2 }]), false);
  assert.equal(clearShot(start, end, [{ x: 0, y: -.5, radius: .2 }]), true);
  assert.equal(clearShot(start, start, []), false);
});

test("flight lanes clear overlapping projected planet/ring exclusions or hide safely", () => {
  const obstacles = [{ x: -.5, y: .58, radius: .14 }, { x: .2, y: .68, radius: .24 }, { x: .45, y: .46, radius: .12 }];
  const point = { x: 0, y: .64, visible: false, clearance: 0 };
  for (const aspect of [.46, .69, 1.3, 2.2]) for (let i = 0; i < 160; i++) {
    const x = (-1.1 + i / 159 * 2.2) * aspect;
    assert.equal(routeSpacecraft(x, point.y, .1, obstacles, .18, .74, point), point);
    if (point.visible) {
      assert.ok(point.y >= .18 && point.y <= .74);
      for (const obstacle of obstacles) assert.ok(Math.hypot(point.x - obstacle.x, point.y - obstacle.y) - obstacle.radius - .1 >= .0349);
    }
  }
  routeSpacecraft(0, .6, .1, [{ x: 0, y: .5, radius: 1 }], .18, .74, point);
  assert.equal(point.visible, false);
  routeSpacecraft(0, .6, .1, [], .8, .2, point);
  assert.equal(point.visible, false);
});

test("the portal opens before the UFO enters, waits for the scout, then closes", () => {
  assert.equal(wormholePresence(8, true), 0);
  assert.ok(wormholePresence(16, true) > .99);
  assert.ok(spacecraftPose(17.5, true).entry > .6);
  assert.equal(spacecraftPose(17.5, true, "scout").entry, 0);
  assert.ok(spacecraftPose(22.3, true, "scout").entry > .6);
  assert.equal(wormholePresence(23.4, true), 1);
  assert.equal(wormholePresence(26, true), 0);
  assert.equal(wormholePresence(17, false), 0);
  assert.ok(spacecraftPose(18.2, true).scale < spacecraftPose(16, true).scale);
  const portal = createWormhole();
  assert.equal(portal.group.children.length, 2);
  portal.group.children.forEach(mesh => mesh.geometry.dispose());
  portal.material.dispose(); portal.rimMaterial.dispose();
});

test("every pursuit tracer misses the entire UFO silhouette, not just its center", () => {
  for (const aspect of [.46, .7, 1.6, 2.2]) for (let age = 7.3; age < 14; age += .2) for (let shot = 0; shot < 8; shot++) {
    const lead = spacecraftPose(age, true), scout = spacecraftPose(age, true, "scout");
    const start = { x: scout.x * aspect, y: scout.y };
    const target = { x: lead.x * aspect, y: lead.y, radius: .13 };
    const end = pursuitMiss(start, target, shot);
    const dx = end.x - start.x, dy = end.y - start.y;
    const t = Math.max(0, Math.min(1, ((target.x-start.x)*dx + (target.y-start.y)*dy)/(dx*dx+dy*dy)));
    const distance = Math.hypot(target.x-start.x-dx*t, target.y-start.y-dy*t);
    // Very narrow lanes may suppress the shot rather than grazing the craft.
    if (clearShot(start, end, [target], 1, .006)) {
      assert.ok(distance >= target.radius + .0079);
      assert.ok(distance <= target.radius + .0101, "near miss must stay tight, not fan out");
    }
  }
});

test("paired aim follows a tight flattened UFO outline rather than its oversized flight bubble", () => {
  const from = { x: -.55, y: .65 }, target = { x: -.15, y: .64, radius: .15, radiusX: .08, radiusY: .035 };
  for (const side of [-1, 1]) for (let id = 0; id < 8; id++) {
    const end = pursuitMiss(from, target, id, undefined, side, .006);
    const ax = (from.x - target.x) / target.radiusX, ay = (from.y - target.y) / target.radiusY;
    const dx = (end.x - from.x) / target.radiusX, dy = (end.y - from.y) / target.radiusY;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy)));
    const gap = (Math.hypot(ax + dx * t, ay + dy * t) - 1) * target.radiusY;
    assert.ok(gap >= .0059 && gap <= .0076);
    assert.ok(Math.abs(Math.atan2(end.y - from.y, end.x - from.x)) < .2);
  }
});

test("portrait pursuit spacing keeps the portal open for the delayed scout", () => {
  for (const delay of [4.8, 10, 12.5]) {
    const end = .6 + 18 + delay;
    assert.equal(spacecraftPose(delay, true, "scout", undefined, delay).visible, false);
    assert.ok(spacecraftPose(end - .4, true, "scout", undefined, delay).entry > .95);
    assert.equal(wormholePresence(end, true, delay), 1);
    assert.equal(wormholePresence(end + 3, true, delay), 0);
    assert.equal(wormholePresence(end, false, delay), 0);
  }
});

test("each completed pursuit has exactly thirty seconds of empty sky before the next UFO", () => {
  for (const delay of [4.8, 10, 12.5]) {
    const end = pursuitEnd(delay), period = pursuitPeriod(delay);
    assert.ok(Math.abs(period + .6 - end - 30) < 1e-10);
    for (let age = end; age < end + 30; age += .13) {
      assert.equal(wormholePresence(age, true, delay), 0);
      for (const kind of ["ufo", "scout"]) assert.equal(spacecraftPose(age, true, kind, undefined, delay).visible, false);
    }
    assert.equal(spacecraftPose(end + 30.01, true, "ufo", undefined, delay).visible, true);
    const clock = { age: 0, cycle: 0, delay, interrupted: false };
    for (let i = 0; i < 10000; i++) advancePursuit(clock, .04, true, true, delay, true);
    assert.ok(clock.cycle >= 6 && clock.age >= 0 && clock.age < period);
  }
});

test("interrupted pursuit fades out before a clean cooldown, without resuming a retired encounter", () => {
  const clock = { age: 10, cycle: 0, delay: 4.8, interrupted: false };
  advancePursuit(clock, .04, false, true, 4.8, false);
  assert.equal(clock.age, 10); assert.equal(clock.interrupted, true);
  advancePursuit(clock, .04, false, true, 4.8, true);
  assert.equal(clock.age, pursuitEnd()); assert.equal(clock.interrupted, false);
  for (let i = 0; i < 100; i++) advancePursuit(clock, .04, false, true, 4.8, true);
  assert.equal(clock.age, pursuitEnd(), "protected chapters do not consume the rest period");
  for (let i = 0; i < 750; i++) advancePursuit(clock, .04, true, true, 4.8, true);
  assert.equal(clock.cycle, 1);
  assert.ok(clock.age >= .59 && clock.age < .61);
});

test("resize waits for the visible craft to fade, while reduced motion freezes the pursuit clock", () => {
  const clock = { age: 9, cycle: 2, delay: 4.8, interrupted: false };
  advancePursuit(clock, .04, true, true, 12.5, false);
  assert.equal(clock.delay, 4.8); assert.equal(clock.age, 9); assert.equal(clock.interrupted, true);
  advancePursuit(clock, .04, true, true, 12.5, true);
  assert.equal(clock.delay, 12.5); assert.ok(clock.age >= pursuitEnd(12.5));
  const still = { ...clock };
  advancePursuit(clock, 300, true, false, 4.8, true);
  assert.deepEqual(clock, still);
  advancePursuit(clock, 300, true, true, 12.5, true);
  assert.ok(clock.age - still.age <= .04000001, "a resumed tab cannot skip the encounter");
});

test("flight reveals changing depth, yaw and bank instead of a fixed-size side-on translation", () => {
  const points = [7, 11, 16, 21].map(age => spacecraftPose(age, true, "scout"));
  for (const key of ["depth", "yaw", "roll", "pitch"]) assert.ok(new Set(points.map(p => p[key].toFixed(2))).size >= 3, key);
  const sizes = points.map(p => (6.4 + 2.8) / (6.4 - p.depth));
  assert.ok(Math.max(...sizes) / Math.min(...sizes) > 1.15);
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
  for (let lane = 0; lane < 4; lane++) assert.equal(sources.filter((_, i) => i % 4 === lane).length, 60);
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
      if (i % 4 === 0) assert.ok(ray.y > .63);
      if (i % 4 === 1) assert.ok(ray.x < -.85);
      if (i % 4 === 2) assert.ok(ray.y < -.73);
      if (i % 4 === 3) assert.ok(ray.x > .63);
    }
  }
  const material = gravityMaterial(new THREE.Vector3(), .027, false, true);
  assert.match(material.vertexShader, /uInverseProjection \* vec4\(position.xy/);
  assert.match(material.vertexShader, /float seed = aSeed/);
  material.dispose();
});
