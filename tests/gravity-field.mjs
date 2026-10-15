import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import ts from "typescript";

// Render the production shaders in isolation so surviving near-field pixels
// cannot be mistaken for the intentionally independent distant stars.
const modules = new Map(["three.module.js", "three.core.js"].map(name => [
  `/${name}`, readFileSync(new URL(`../node_modules/three/build/${name}`, import.meta.url), "utf8"),
]));
for (const name of ["gravity-field", "ambient-field"]) {
  const source = readFileSync(new URL(`../components/${name}.ts`, import.meta.url), "utf8");
  modules.set(`/${name}.js`, ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText.replace('from "three"', 'from "/three.module.js"'));
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("http://gravity.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill(modules.has(path)
      ? { contentType: "text/javascript", body: modules.get(path) }
      : { contentType: "text/html", body: "<!doctype html><title>Gravity shader regression</title>" });
  });
  await page.goto("http://gravity.test/");
  const result = await page.evaluate(async () => {
    const THREE = await import("/three.module.js");
    const { gravityMaterial } = await import("/gravity-field.js");
    const { createDistantStarMaterial, dustStreamSource } = await import("/ambient-field.js");
    const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
    renderer.setSize(320, 240);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 4 / 3, .1, 100);
    camera.position.z = 5;
    camera.updateMatrixWorld();
    const target = new THREE.Vector3(.7, -.6, -4);
    const gl = renderer.getContext();
    const pixels = () => {
      renderer.render(scene, camera);
      const data = new Uint8Array(320 * 240 * 4);
      gl.readPixels(0, 0, 320, 240, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return data;
    };
    const lit = data => data.reduce((count, value, index) => count + (index % 4 < 3 && value > 4 ? 1 : 0), 0);
    const same = (a, b) => a.every((value, index) => value === b[index]);
    const results = [];
    for (const kind of ["stars", "bright", "streaks", "stream", "stream-streaks", "distant"]) {
      const stream = kind.startsWith("stream"), streak = kind.endsWith("streaks"), distant = kind === "distant";
      const material = distant ? createDistantStarMaterial() : gravityMaterial(target, .14, streak, stream, kind === "bright");
      material.uniforms.uScale.value = 240;
      if (!distant) material.uniforms.uHorizon.value = .2;
      if (stream) {
        material.uniforms.uCameraWorld.value.copy(camera.matrixWorld);
        material.uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);
        material.uniforms.uResolution.value.set(320, 240);
      }
      const positions = [], colors = [], seeds = [], tails = [];
      const point = new THREE.Vector3();
      for (let i = 0; i < 1000; i++) {
        if (stream) dustStreamSource(i, point);
        else point.set(((i * .618033989) % 1 - .5) * 6, ((i * .438579) % 1 - .5) * 4, -4 - i % 9 * .1);
        for (let end = 0; end < (streak ? 2 : 1); end++) {
          positions.push(...point); colors.push(.7, .8, 1);
          seeds.push(((i + .5) * .618033989) % 1); tails.push(end);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      if (stream) geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
      if (streak) geometry.setAttribute("aTail", new THREE.Float32BufferAttribute(tails, 1));
      const object = streak ? new THREE.LineSegments(geometry, material) : new THREE.Points(geometry, material);
      object.frustumCulled = false;
      scene.add(object);
      const sample = (pull, time = 10) => {
        if (!distant) material.uniforms.uPull.value = pull;
        material.uniforms.uTime.value = time;
        return pixels();
      };
      const middle = sample(.35), later = sample(.65), complete = sample(1), rest = sample(1, 12), rewind = sample(.35);
      results.push({ kind, middle: lit(middle), complete: lit(complete), rest: lit(rest), moves: !same(middle, later), restMoves: !same(complete, rest), reversible: same(middle, rewind), glError: gl.getError() });
      scene.remove(object); geometry.dispose(); material.dispose();
    }
    renderer.dispose();
    return results;
  });
  console.log(JSON.stringify(result, null, 2));
  assert.deepEqual(errors, []);
  for (const frame of result) {
    assert.equal(frame.glError, 0, `${frame.kind}: WebGL error`);
    assert.ok(frame.middle > 0, `${frame.kind}: shader must paint real pixels`);
    assert.equal(frame.reversible, true, `${frame.kind}: reversing must retrace the same field`);
    if (["stars", "bright", "streaks"].includes(frame.kind)) {
      assert.equal(frame.moves, true, `${frame.kind}: capture must move`);
      assert.equal(frame.complete, 0, `${frame.kind}: no partially captured stars may remain parked at full pull`);
      assert.equal(frame.rest, 0, `${frame.kind}: captured stars must not respawn during rest`);
    } else {
      assert.ok(frame.complete > 0 && frame.rest > 0, `${frame.kind}: continuous dust and distant stars must remain`);
      if (frame.kind.startsWith("stream")) assert.equal(frame.restMoves, true, `${frame.kind}: dust must circulate during rest`);
      else assert.equal(frame.moves, false, "distant stars must be independent of local capture");
    }
  }
  console.log("near-field capture, reversible paths, recycled dust and distant-star isolation passed on real WebGL");
} finally { await browser.close(); }
